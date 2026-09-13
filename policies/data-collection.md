# Policy: data collection

**Status:** Binding  
**Applies to:** `linuxlens-collector`, relay, offline export, API ingest

The collector gathers **facts**, not conclusions. Assessment, scoring, and recommendations happen after evidence is produced.

## Allowed evidence

The collector MAY gather:

| Class | Examples |
|---|---|
| Identity | Hostname, host_id, machine-id analogue, inventory tags |
| Operating system | Family, distro, version, variant, architecture |
| Kernel | Version, release, flavour, tainted state if exposed without privilege abuse |
| Hardware | CPU model/count, memory totals, virtualisation hint |
| Packages | Installed package names and versions |
| Updates | Available updates, security-update flags, repo metadata |
| Repositories | Configured repo IDs, URLs hostnames, enabled state — not credentials |
| Runtime | Uptime, last boot, reboot-required flag, selected runtime versions (java, python, node, php, ruby, go) when detectable |
| Services | Running systemd units / equivalent names |
| Isolation | Container runtimes and running container names/images **without** filesystem payloads |
| MAC | SELinux / AppArmor mode and profile names |
| Cloud (optional) | Provider, region, instance type, instance id — only from standard metadata services the operator enables |

## Prohibited evidence

The collector MUST NOT gather:

- Passwords, password hashes, shadow files
- SSH private keys or other private key material
- API keys, tokens, cookies, `.env` contents, cloud credential files
- Database contents, query results, or application payloads
- Customer documents, home-directory files, or mail
- User-generated data, PII stores, or secrets-manager payloads
- Process command lines when they commonly contain secrets (prefer unit names)
- Full filesystem walks of `/home`, `/root`, `/var/lib/docker` volumes, or application data dirs

If a probe would require reading a prohibited class to obtain an allowed fact, skip the fact and record `collection_note: skipped_sensitive_source`.

## Operating modes

| Mode | Data path | Constraint |
|---|---|---|
| Connected | Host → Collector → HTTPS → LinuxLens API | TLS required; collector authenticates |
| Offline | Host → Collector → `linuxlens-assessment.tar.gz` → manual import | Archive contains evidence + collector metadata only |
| Relay | Hosts → Collectors → Relay → LinuxLens Cloud | Only the relay needs outbound connectivity |

## Minimisation

- Collect the minimum fields required by LL-002 through LL-007.
- Cloud metadata is **opt-in**.
- Package file lists and binary hashes are optional and off by default.
- Do not collect user login history beyond last reboot / uptime facts.

## Integrity

Every evidence bundle MUST include:

- `schema_version`
- `collected_at`
- `collector.version`
- `collector.mode`
- A content digest of the evidence payload

The collector MUST NOT mutate the assessed system except for writing its own local work directory or the operator-requested export file.
