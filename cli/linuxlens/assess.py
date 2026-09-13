"""Deterministic assessment engine (LL-003 … LL-007)."""

from __future__ import annotations

import re
from datetime import date, datetime
from pathlib import Path
from typing import Any

import yaml

from .paths import knowledge_path, providers_dir, scoring_dir


def _load_yaml(path: Path) -> dict[str, Any]:
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {}


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    return datetime.strptime(value, "%Y-%m-%d").date()


def _match_distribution(knowledge: dict[str, Any], evidence: dict[str, Any]) -> dict[str, Any] | None:
    os_info = evidence.get("os") or {}
    family = (os_info.get("family") or "").lower()
    name = (os_info.get("name") or "").lower()
    version = str(os_info.get("version") or "")
    major = version.split(".")[0]
    candidates = knowledge.get("distributions") or []

    def score_row(row: dict[str, Any]) -> int:
        s = 0
        if row.get("family") == family:
            s += 10
        if row.get("name") == name:
            s += 20
        rv = str(row.get("version") or "")
        if rv == version or rv == major:
            s += 30
        elif version.startswith(rv + ".") or rv.startswith(major):
            s += 15
        return s

    best = None
    best_score = 0
    for row in candidates:
        sc = score_row(row)
        if sc > best_score:
            best = row
            best_score = sc
    if best_score < 20:
        return None
    return best


def _lifecycle_phase(row: dict[str, Any] | None, today: date, extended_evidenced: bool = False) -> dict[str, Any]:
    if not row:
        return {"phase": "unknown", "days_to_standard_eol": None, "standard_support_ends": None}

    end = _parse_date(row.get("standard_support_ends"))
    if not end:
        return {"phase": "unknown", "days_to_standard_eol": None, "standard_support_ends": None}

    days = (end - today).days
    if days < 0:
        if extended_evidenced or row.get("extended_support_ends"):
            # Extended available does not mean evidenced; only evidenced flips to extended.
            if extended_evidenced:
                phase = "extended"
            else:
                phase = "end_of_life"
        else:
            phase = "end_of_life"
    elif days <= 180:
        phase = "approaching_eol"
    else:
        phase = "standard"

    return {
        "phase": phase,
        "days_to_standard_eol": days,
        "standard_support_ends": end.isoformat(),
        "extended_support_ends": row.get("extended_support_ends"),
        "knowledge_ref": f"{row.get('name')}:{row.get('version')}",
    }


def _band(score: int) -> str:
    if score <= 19:
        return "healthy"
    if score <= 39:
        return "watch"
    if score <= 59:
        return "elevated"
    if score <= 79:
        return "high"
    return "critical"


def _rule_matches(when: dict[str, Any], ctx: dict[str, Any]) -> bool:
    for key, expected in when.items():
        actual = ctx.get(key)
        if isinstance(expected, dict):
            if "gte" in expected and not (actual is not None and actual >= expected["gte"]):
                return False
            if "lte" in expected and not (actual is not None and actual <= expected["lte"]):
                return False
            if "gt" in expected and not (actual is not None and actual > expected["gt"]):
                return False
            if "lt" in expected and not (actual is not None and actual < expected["lt"]):
                return False
            if "in" in expected and actual not in expected["in"]:
                return False
            if "neq" in expected and actual == expected["neq"]:
                return False
        else:
            if actual != expected:
                return False
    return True


def _score_component(rules_doc: dict[str, Any], ctx: dict[str, Any]) -> tuple[int, list[dict[str, Any]]]:
    findings: list[dict[str, Any]] = []
    score = 0
    floors: list[int] = []
    for rule in rules_doc.get("rules") or []:
        when = rule.get("when") or {}
        if not _rule_matches(when, ctx):
            continue
        if "score" in rule:
            score = max(score, int(rule["score"]))
        if "score_floor" in rule:
            floors.append(int(rule["score_floor"]))
        if rule.get("finding_code"):
            findings.append(
                {
                    "code": rule["finding_code"],
                    "class": rules_doc.get("component", "assessment").split("_")[0]
                    if "lifecycle" in (rules_doc.get("component") or "")
                    else rules_doc.get("component", "assessment"),
                    "severity": rule.get("finding_severity", "watch"),
                    "title": rule.get("title") or rule["finding_code"],
                    "required_capability": rule.get("required_capability"),
                    "evidence": {k: ctx.get(k) for k in when.keys()},
                }
            )
    for floor in floors:
        score = max(score, floor)
    return min(100, max(0, score)), findings


def _map_finding_class(component: str) -> str:
    if component.startswith("lifecycle"):
        return "lifecycle"
    if component.startswith("patch"):
        return "patch"
    if component.startswith("vulnerability") or component.startswith("external"):
        return "vulnerability"
    if component.startswith("operational"):
        return "operational"
    return "remediation"


def _reboot_feasibility(context: dict[str, Any] | None) -> tuple[str, bool]:
    if not context:
        return "unknown", True
    window = context.get("maintenance_window")
    criticality = context.get("business_criticality", "standard")
    workload = (context.get("workload") or "").lower()
    if window == "none":
        return "none", False
    if criticality == "critical" or window in ("quarterly", "annual") or any(
        w in workload for w in ("postgres", "database", "payment", "identity")
    ):
        return "low", False
    if window in ("weekly", "monthly") and criticality != "critical":
        return "high", False
    return "unknown", True


def _business_criticality_score(level: str | None) -> int:
    return {"low": 10, "standard": 40, "high": 70, "critical": 100}.get(level or "standard", 40)


def _kernel_security_exposure(lifecycle: dict[str, Any], evidence: dict[str, Any]) -> bool:
    if lifecycle.get("phase") in ("end_of_life", "extended"):
        return True
    # Heuristic: very old kernel major on Linux
    kv = (evidence.get("kernel") or {}).get("version") or ""
    m = re.match(r"(\d+)\.(\d+)", kv)
    if m:
        major, minor = int(m.group(1)), int(m.group(2))
        if major < 4 or (major == 3):
            return True
        if major == 4 and minor < 15 and lifecycle.get("phase") != "standard":
            return True
    return False


def _remediation_options(
    lifecycle: dict[str, Any],
    ctx: dict[str, Any],
    findings: list[dict[str, Any]],
) -> tuple[str, list[dict[str, Any]]]:
    options: list[dict[str, Any]] = []
    phase = lifecycle.get("phase")
    feasibility = ctx.get("reboot_feasibility")
    kernel_exp = ctx.get("kernel_security_exposure")
    sec_count = ctx.get("security_update_count") or 0

    if sec_count >= 1 and feasibility in ("high", "unknown"):
        options.append(
            {
                "id": "opt-patch",
                "capability": "patch",
                "title": "Apply outstanding security updates",
                "impact": "low",
                "downtime": "brief",
                "purpose": "immediate_risk_reduction",
                "long_term_value": "medium",
            }
        )
    if kernel_exp and feasibility in ("low", "none", "unknown"):
        options.append(
            {
                "id": "opt-live-patch",
                "capability": "live_patch",
                "title": "Live kernel patching is recommended",
                "impact": "low",
                "downtime": "none",
                "purpose": "immediate_risk_reduction",
                "long_term_value": "medium",
            }
        )
    if phase in ("approaching_eol", "extended"):
        options.append(
            {
                "id": "opt-upgrade",
                "capability": "upgrade",
                "title": "Upgrade to a supported release",
                "impact": "high",
                "downtime": "required",
                "purpose": "durable_fix",
                "long_term_value": "high",
            }
        )
    if phase == "end_of_life":
        options.append(
            {
                "id": "opt-migrate",
                "capability": "migrate",
                "title": "Migrate to a supported Linux distribution or release",
                "impact": "high",
                "downtime": "required",
                "purpose": "durable_fix",
                "long_term_value": "high",
            }
        )
        options.append(
            {
                "id": "opt-els",
                "capability": "extended_support",
                "title": "Extended lifecycle support can create migration runway",
                "impact": "low",
                "downtime": "none",
                "purpose": "migration_runway",
                "long_term_value": "low",
            }
        )

    # Attach generic-linux fulfilment only (capability-first)
    generic = _load_yaml(providers_dir() / "generic-linux.yaml")
    products = generic.get("products") or []
    for opt in options:
        opt["compatible_products"] = [
            {
                "provider": "generic-linux",
                "product_id": p["id"],
                "name": p["name"],
            }
            for p in products
            if opt["capability"] in (p.get("capabilities") or [])
        ]

    if not options:
        primary = "No immediate remediation required. Continue routine monitoring."
    elif any(o["capability"] in ("live_patch", "patch") for o in options) and any(
        o["capability"] in ("migrate", "upgrade") for o in options
    ):
        primary = (
            "Apply non-disruptive mitigation immediately, then schedule operating system "
            "migration as the long-term remediation."
        )
    else:
        primary = options[0]["title"]

    return primary, options


def assess_evidence(
    evidence: dict[str, Any],
    *,
    business_context: dict[str, Any] | None = None,
    as_of: date | None = None,
) -> dict[str, Any]:
    today = as_of or date.today()
    knowledge = _load_yaml(knowledge_path())
    row = _match_distribution(knowledge, evidence)
    extended_evidenced = bool((business_context or {}).get("extended_coverage_evidenced"))
    lifecycle = _lifecycle_phase(row, today, extended_evidenced=extended_evidenced)

    updates = evidence.get("updates") or {}
    security_count = int(updates.get("security_count") or 0)
    available_count = int(updates.get("available_count") or 0)
    metadata_available = bool(updates.get("metadata_available"))
    reboot_required = bool(evidence.get("reboot_required"))
    uptime_days = evidence.get("uptime_days")
    if uptime_days is None:
        uptime_days = 0

    feasibility, inferred = _reboot_feasibility(business_context)
    if business_context and business_context.get("reboot_feasibility"):
        feasibility = business_context["reboot_feasibility"]
        inferred = False

    criticality = (business_context or {}).get("business_criticality") or "standard"
    kernel_exposure = _kernel_security_exposure(lifecycle, evidence)
    mac = evidence.get("mac") or {}
    mac_enforcing = mac.get("selinux") == "enforcing" or mac.get("apparmor") == "enforcing"
    internet_exposed = (business_context or {}).get("internet_exposed")
    if internet_exposed is None:
        internet_exposed = "unknown"

    lifecycle_doc = _load_yaml(scoring_dir() / "lifecycle.yaml")
    patch_doc = _load_yaml(scoring_dir() / "patching.yaml")
    vuln_doc = _load_yaml(scoring_dir() / "vulnerability.yaml")
    ops_doc = _load_yaml(scoring_dir() / "operational-risk.yaml")

    lc_score, lc_findings = _score_component(
        lifecycle_doc,
        {
            "support_phase": lifecycle["phase"],
            "days_to_standard_eol": lifecycle.get("days_to_standard_eol"),
        },
    )
    patch_score, patch_findings = _score_component(
        patch_doc,
        {
            "security_update_count": security_count,
            "available_update_count": available_count,
            "reboot_required": reboot_required,
            "updates.metadata_available": metadata_available,
        },
    )
    vuln_score, vuln_findings = _score_component(
        vuln_doc,
        {
            "kernel_security_exposure": kernel_exposure,
            "security_update_count": security_count,
            "mac_enforcing": mac_enforcing,
            "enriched_exploitable_critical": False,
            "vulnerability_signals_available": True,
        },
    )
    # External exposure
    if internet_exposed is True:
        external = 70
    elif internet_exposed is False:
        external = 10
    else:
        external = 30

    ops_score, ops_findings = _score_component(
        ops_doc,
        {
            "uptime_days": uptime_days,
            "reboot_feasibility": feasibility if feasibility != "unknown" else "low",
            "reboot_required": reboot_required,
        },
    )
    biz = _business_criticality_score(criticality)

    composite = int(
        round(
            0.30 * vuln_score
            + 0.25 * lc_score
            + 0.15 * patch_score
            + 0.15 * ops_score
            + 0.10 * external
            + 0.05 * biz
        )
    )
    composite = max(0, min(100, composite))
    band = _band(composite)

    findings: list[dict[str, Any]] = []
    for group, component in (
        (lc_findings, "lifecycle"),
        (patch_findings, "patch"),
        (vuln_findings, "vulnerability"),
        (ops_findings, "operational"),
    ):
        for f in group:
            f["class"] = _map_finding_class(component)
            f["host_id"] = evidence.get("host_id")
            findings.append(f)

    reasons = []
    for f in findings:
        if f.get("severity") in ("high", "critical") and f.get("title"):
            reasons.append(f["title"])
    if uptime_days and uptime_days >= 180:
        reasons.append(f"{uptime_days}-day uptime")
    if criticality == "critical":
        reasons.append("Production-critical workload")

    ctx = {
        "security_update_count": security_count,
        "kernel_security_exposure": kernel_exposure,
        "reboot_feasibility": feasibility,
        "support_phase": lifecycle["phase"],
    }
    primary, options = _remediation_options(lifecycle, ctx, findings)

    coverage_gaps = [f["code"] for f in findings if f.get("code", "").endswith("UNKNOWN") or "UNKNOWN" in f.get("code", "")]

    return {
        "schema_version": "1.0.0",
        "scope": "host",
        "host_id": evidence.get("host_id"),
        "assessed_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "context_inferred": inferred,
        "risk": {
            "score": composite,
            "band": band,
            "components": {
                "vulnerability_exposure": vuln_score,
                "lifecycle_exposure": lc_score,
                "patch_lag": patch_score,
                "operational_constraints": ops_score,
                "external_exposure": external,
                "business_criticality": biz,
            },
            "weights": {
                "vulnerability_exposure": 0.30,
                "lifecycle_exposure": 0.25,
                "patch_lag": 0.15,
                "operational_constraints": 0.15,
                "external_exposure": 0.10,
                "business_criticality": 0.05,
            },
            "reasons": reasons[:8],
        },
        "lifecycle": lifecycle,
        "operational": {
            "reboot_feasibility": feasibility,
            "migration_urgency": "high"
            if lifecycle["phase"] == "end_of_life"
            else ("medium" if lifecycle["phase"] in ("approaching_eol", "extended") else "low"),
            "uptime_days": uptime_days,
        },
        "findings": findings,
        "remediation": {
            "primary_recommendation": primary,
            "options": options,
            "priority": "immediate"
            if composite >= 80
            else ("high" if composite >= 60 else ("medium" if composite >= 40 else "low")),
        },
        "coverage_gaps": coverage_gaps,
        "evidence_digest": evidence.get("content_digest"),
    }


def format_assessment_text(evidence: dict[str, Any], assessment: dict[str, Any]) -> str:
    os_info = evidence.get("os") or {}
    kernel = evidence.get("kernel") or {}
    risk = assessment["risk"]
    life = assessment.get("lifecycle") or {}
    rem = assessment.get("remediation") or {}
    lines = [
        "LinuxLens Assessment",
        f"Host             {evidence.get('host_id')}",
        f"OS               {os_info.get('pretty_name') or (os_info.get('name') + ' ' + str(os_info.get('version')))}",
        f"Kernel           {kernel.get('version')}",
        f"Lifecycle        {life.get('phase')}",
        f"Patch posture    {risk['components']['patch_lag']}",
        f"Reboot risk      {assessment.get('operational', {}).get('reboot_feasibility')}",
        f"LinuxLens Risk",
        f"{risk['score']} / {risk['band'].upper()}",
        "Reasons",
    ]
    for r in risk.get("reasons") or []:
        lines.append(f"  - {r}")
    lines.append("Recommended Actions")
    for i, opt in enumerate(rem.get("options") or [], 1):
        lines.append(f"{i}. {opt.get('title')} [{opt.get('capability')}]")
    if not rem.get("options"):
        lines.append(f"1. {rem.get('primary_recommendation')}")
    else:
        lines.append("")
        lines.append(rem.get("primary_recommendation") or "")
    lines.append("")
    lines.append("This assessment is deterministic and vendor-neutral. No system changes were made.")
    return "\n".join(lines) + "\n"
