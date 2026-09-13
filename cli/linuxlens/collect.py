"""Read-only host evidence collection (LL-002)."""

from __future__ import annotations

import hashlib
import json
import os
import platform
import re
import socket
import subprocess
import tarfile
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from . import __version__


def _run(cmd: list[str], timeout: int = 30) -> str | None:
    try:
        r = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
        if r.returncode != 0:
            return None
        return (r.stdout or "").strip()
    except (OSError, subprocess.TimeoutExpired):
        return None


def _read_text(path: Path) -> str | None:
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return None


def _parse_os_release() -> dict[str, str]:
    data: dict[str, str] = {}
    raw = _read_text(Path("/etc/os-release")) or _read_text(Path("/usr/lib/os-release"))
    if not raw:
        return data
    for line in raw.splitlines():
        if "=" not in line or line.startswith("#"):
            continue
        key, value = line.split("=", 1)
        data[key] = value.strip().strip('"')
    return data


def _normalise_family(os_id: str, id_like: str) -> str:
    blob = f"{os_id} {id_like}".lower()
    if "ubuntu" in blob:
        return "ubuntu"
    if "debian" in blob:
        return "debian"
    if any(x in blob for x in ("rhel", "centos", "rocky", "alma", "oracle", "fedora")):
        return "rhel"
    if "suse" in blob or "sles" in blob:
        return "suse"
    if "amzn" in blob or "amazon" in blob:
        return "amazon"
    return "other"


def _version_major_minor(version: str) -> str:
    m = re.match(r"(\d+(?:\.\d+)?)", version or "")
    return m.group(1) if m else (version or "")


def _uptime_days() -> float | None:
    raw = _read_text(Path("/proc/uptime"))
    if raw:
        try:
            seconds = float(raw.split()[0])
            return round(seconds / 86400.0, 1)
        except (ValueError, IndexError):
            pass
    out = _run(["sysctl", "-n", "kern.boottime"])
    if out and "sec =" in out:
        try:
            sec = int(re.search(r"sec\s*=\s*(\d+)", out).group(1))  # type: ignore[union-attr]
            now = int(datetime.now(tz=timezone.utc).timestamp())
            return round((now - sec) / 86400.0, 1)
        except (AttributeError, ValueError):
            return None
    return None


def _reboot_required() -> bool:
    if Path("/var/run/reboot-required").exists():
        return True
    if Path("/run/reboot-required").exists():
        return True
    # RHEL-like: needs-restarting -r
    out = _run(["needs-restarting", "-r"])
    if out is not None:
        # exit code path: needs-restarting returns 1 if reboot needed; we only get stdout here.
        # Check via returncode separately.
        pass
    try:
        r = subprocess.run(
            ["needs-restarting", "-r"],
            capture_output=True,
            text=True,
            timeout=20,
            check=False,
        )
        if r.returncode == 1:
            return True
    except (OSError, subprocess.TimeoutExpired):
        pass
    return False


def _machine_id() -> str | None:
    for p in (Path("/etc/machine-id"), Path("/var/lib/dbus/machine-id")):
        text = _read_text(p)
        if text:
            return text.strip()
    return None


def _hardware() -> dict[str, Any]:
    hw: dict[str, Any] = {}
    cpuinfo = _read_text(Path("/proc/cpuinfo"))
    if cpuinfo:
        models = [ln.split(":", 1)[1].strip() for ln in cpuinfo.splitlines() if ln.startswith("model name")]
        if models:
            hw["cpu_model"] = models[0]
        hw["cpu_count"] = max(1, cpuinfo.count("\nprocessor"))
    elif platform.processor():
        hw["cpu_model"] = platform.processor()
        hw["cpu_count"] = os.cpu_count() or 1
    meminfo = _read_text(Path("/proc/meminfo"))
    if meminfo:
        for ln in meminfo.splitlines():
            if ln.startswith("MemTotal:"):
                kb = int(ln.split()[1])
                hw["memory_bytes"] = kb * 1024
                break
    virt = _run(["systemd-detect-virt"])
    if virt and virt != "none":
        hw["virtualization"] = virt
    return hw


def _packages_and_updates() -> tuple[list[dict[str, str]], dict[str, Any], list[dict[str, str]]]:
    packages: list[dict[str, str]] = []
    notes: list[dict[str, str]] = []
    updates: dict[str, Any] = {
        "metadata_available": False,
        "available_count": 0,
        "security_count": 0,
        "items": [],
    }

    # dpkg / apt
    if Path("/usr/bin/dpkg-query").exists():
        out = _run(["dpkg-query", "-W", "-f=${Package}\t${Version}\t${Architecture}\n"], timeout=60)
        if out:
            for ln in out.splitlines()[:5000]:
                parts = ln.split("\t")
                if len(parts) >= 2:
                    packages.append(
                        {
                            "name": parts[0],
                            "version": parts[1],
                            **({"arch": parts[2]} if len(parts) > 2 else {}),
                        }
                    )
        # apt list --upgradable (may need network; do not fail hard)
        apt = _run(["apt", "list", "--upgradable"], timeout=45)
        if apt is not None:
            updates["metadata_available"] = True
            items = []
            for ln in apt.splitlines():
                if "/" not in ln or ln.startswith("Listing"):
                    continue
                name = ln.split("/", 1)[0]
                security = "security" in ln.lower() or "-security" in ln.lower()
                items.append({"name": name, "security": security})
            updates["items"] = items[:200]
            updates["available_count"] = len(items)
            updates["security_count"] = sum(1 for i in items if i.get("security"))
        else:
            notes.append({"code": "apt_unavailable", "message": "Could not query apt upgradable list"})

    # rpm / dnf / yum
    elif Path("/usr/bin/rpm").exists():
        out = _run(["rpm", "-qa", "--qf", "%{NAME}\t%{VERSION}-%{RELEASE}\t%{ARCH}\n"], timeout=60)
        if out:
            for ln in out.splitlines()[:5000]:
                parts = ln.split("\t")
                if len(parts) >= 2:
                    packages.append(
                        {
                            "name": parts[0],
                            "version": parts[1],
                            **({"arch": parts[2]} if len(parts) > 2 else {}),
                        }
                    )
        checker = "dnf" if Path("/usr/bin/dnf").exists() else ("yum" if Path("/usr/bin/yum").exists() else None)
        if checker:
            sec = _run([checker, "updateinfo", "list", "security"], timeout=60)
            avail = _run([checker, "check-update"], timeout=60)
            # check-update returns 100 when updates exist
            try:
                r = subprocess.run(
                    [checker, "check-update"],
                    capture_output=True,
                    text=True,
                    timeout=60,
                    check=False,
                )
                lines = [
                    ln
                    for ln in (r.stdout or "").splitlines()
                    if ln.strip() and not ln.startswith("Last metadata") and "Obsoleting" not in ln
                ]
                if r.returncode in (0, 100):
                    updates["metadata_available"] = True
                    items = []
                    for ln in lines:
                        cols = ln.split()
                        if not cols or cols[0].startswith("="):
                            continue
                        name = cols[0].split(".")[0]
                        items.append({"name": name, "security": False})
                    updates["items"] = items[:200]
                    updates["available_count"] = len(items)
            except (OSError, subprocess.TimeoutExpired):
                notes.append({"code": "rpm_updates_unavailable", "message": f"Could not query {checker} updates"})
            if sec:
                updates["metadata_available"] = True
                sec_items = [
                    ln.split()[0]
                    for ln in sec.splitlines()
                    if ln.strip() and not ln.lower().startswith(("loaded", "last", "updateinfo"))
                ]
                updates["security_count"] = max(updates.get("security_count", 0), len(sec_items))
        else:
            notes.append({"code": "no_update_tool", "message": "rpm present but dnf/yum not found"})

    else:
        notes.append({"code": "package_manager_unknown", "message": "No dpkg or rpm package manager detected"})

    return packages, updates, notes


def _services() -> list[dict[str, str]]:
    out = _run(["systemctl", "list-units", "--type=service", "--state=running", "--no-pager", "--no-legend"])
    if not out:
        return []
    services = []
    for ln in out.splitlines()[:200]:
        name = ln.split()[0] if ln.split() else ""
        if name.endswith(".service"):
            services.append({"name": name, "state": "running"})
    return services


def _mac() -> dict[str, str]:
    mac: dict[str, str] = {}
    getenforce = _run(["getenforce"])
    if getenforce:
        mac["selinux"] = getenforce.lower()
    else:
        mac["selinux"] = "not_applicable"
    aa = _run(["aa-status", "--enabled"])
    if Path("/sys/module/apparmor").exists() or Path("/sys/kernel/security/apparmor").exists():
        # enabled exit 0 typically
        try:
            r = subprocess.run(["aa-enabled"], capture_output=True, text=True, timeout=5, check=False)
            mac["apparmor"] = "enforcing" if r.returncode == 0 else "disabled"
        except (OSError, subprocess.TimeoutExpired):
            mac["apparmor"] = "unknown"
    else:
        mac["apparmor"] = "not_applicable"
    return mac


def _workload_hints(services: list[dict[str, str]]) -> list[str]:
    names = " ".join(s["name"] for s in services).lower()
    hints = []
    mapping = {
        "postgresql": "postgresql",
        "mysqld": "mysql",
        "mariadb": "mariadb",
        "httpd": "httpd",
        "nginx": "nginx",
        "docker": "docker",
        "containerd": "containerd",
        "kubelet": "kubernetes",
        "redis": "redis",
        "mongod": "mongodb",
    }
    for needle, label in mapping.items():
        if needle in names:
            hints.append(label)
    return hints


def collect_host(*, mode: str = "offline", cloud: bool = False) -> dict[str, Any]:
    os_release = _parse_os_release()
    os_id = (os_release.get("ID") or "").lower()
    id_like = (os_release.get("ID_LIKE") or "").lower()
    family = _normalise_family(os_id, id_like)
    version = _version_major_minor(os_release.get("VERSION_ID") or platform.mac_ver()[0] or "")
    hostname = socket.gethostname()
    machine_id = _machine_id()
    host_id = hostname or machine_id or "localhost"

    packages, updates, notes = _packages_and_updates()
    services = _services()

    evidence: dict[str, Any] = {
        "schema_version": "1.0.0",
        "collected_at": datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "collector": {"version": __version__, "mode": mode},
        "host_id": host_id,
        "hostname": hostname,
        "architecture": platform.machine() or platform.processor() or "unknown",
        "os": {
            "family": family,
            "name": os_id or family,
            "version": version or "unknown",
            "pretty_name": os_release.get("PRETTY_NAME") or platform.platform(),
        },
        "kernel": {
            "version": platform.release(),
            "release": platform.version(),
        },
        "hardware": _hardware(),
        "uptime_days": _uptime_days(),
        "reboot_required": _reboot_required(),
        "packages": packages[:2000],
        "updates": updates,
        "services": services,
        "mac": _mac(),
        "workload_hints": _workload_hints(services),
        "collection_notes": notes,
    }
    if machine_id:
        evidence["machine_id"] = machine_id
    if cloud:
        evidence["cloud"] = {"enabled": True, "provider": "other"}
        notes.append({"code": "cloud_stub", "message": "Cloud metadata opt-in is stubbed in this release"})

    digest_payload = {k: v for k, v in evidence.items() if k != "content_digest"}
    blob = json.dumps(digest_payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    evidence["content_digest"] = hashlib.sha256(blob).hexdigest()
    return evidence


def write_evidence(evidence: dict[str, Any], path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
    return path


def write_archive(evidence: dict[str, Any], archive_path: Path) -> Path:
    archive_path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        evidence_file = Path(tmp) / "evidence.json"
        write_evidence(evidence, evidence_file)
        meta = Path(tmp) / "collector.json"
        meta.write_text(
            json.dumps(
                {
                    "schema_version": "1.0.0",
                    "collector_version": __version__,
                    "created_at": evidence.get("collected_at"),
                    "mode": "offline",
                },
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
        with tarfile.open(archive_path, "w:gz") as tar:
            tar.add(evidence_file, arcname="evidence.json")
            tar.add(meta, arcname="collector.json")
    return archive_path


def load_evidence_from_archive(archive_path: Path) -> dict[str, Any]:
    with tarfile.open(archive_path, "r:gz") as tar:
        member = tar.getmember("evidence.json")
        f = tar.extractfile(member)
        if f is None:
            raise ValueError("evidence.json missing from archive")
        return json.loads(f.read().decode("utf-8"))
