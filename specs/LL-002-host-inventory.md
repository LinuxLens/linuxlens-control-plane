# LL-002 — Host Inventory

**Status:** Approved for implementation  
**Phase:** 0 contract / 1 implementation  
**Implements in:** `linuxlens-collector`, `linuxlens-assessment` (normalisation), `linuxlens-api`

## Intent

Capture a normalised, secret-free inventory of each Linux host so later specs can assess without re-probing.

## Required facts

The collector MUST attempt:

- Hostname, host_id, architecture
- Distribution family, name, version
- Kernel version
- CPU and memory totals
- Installed packages and versions
- Security updates and available updates
- Repository configuration (no credentials)
- Uptime, last reboot, reboot-required
- Running services (names)
- Containers (runtime + names/images if present)
- Detectable runtime versions
- SELinux / AppArmor state
- Optional cloud metadata when enabled

See [policies/data-collection.md](../policies/data-collection.md) for the prohibition list.

## Normalisation

`linuxlens-assessment` (or the API ingest path that calls it) MUST map distro strings to a canonical `os.family`:

| family | examples |
|---|---|
| `rhel` | RHEL, CentOS, AlmaLinux, Rocky, Oracle Linux |
| `debian` | Debian |
| `ubuntu` | Ubuntu, Ubuntu Pro/LTS variants |
| `suse` | SLES, openSUSE Leap |
| `amazon` | Amazon Linux |
| `other` | Recognised Linux that does not match above |

Unknown distros remain `other` with the raw string preserved.

## Acceptance criteria

Given a RHEL 7.9 host  
When the collector runs  
Then evidence includes `os.family=rhel`, `os.version` starting `7.9`, kernel version, and uptime_days.

Given a host with reboot-required marker (e.g. Debian/Ubuntu `/var/run/reboot-required` or equivalent)  
When inventory is collected  
Then `reboot_required` is `true`.

Given package metadata is readable  
When inventory is collected  
Then installed packages include name and version, and available security updates are listed when the package manager exposes them.

Given `/etc/shadow` or an SSH private key is present  
When the collector runs  
Then those files are not copied into evidence.

Given cloud metadata collection is disabled  
When the collector runs  
Then `cloud` is omitted or `enabled=false` and no metadata service is queried.

## Contracts

- `contracts/collector.schema.json`
- `contracts/host.schema.json`

## Example evidence (facts only)

```json
{
  "host_id": "prod-db-01",
  "os": { "family": "rhel", "version": "7.9" },
  "kernel": { "version": "3.10.0-1160" },
  "uptime_days": 487,
  "reboot_required": true
}
```
