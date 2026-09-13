# Product editions

Editions are defined early so tenancy, offline mode, and policy hooks are not retrofitted later.

## LinuxLens Snapshot

One-off assessment.

- Small-to-medium estate
- Rapid Linux risk snapshot
- Executive summary
- Technical findings
- Connected or offline collector import

Typical command: `linuxlens collect` / `linuxlens assess`.

## LinuxLens Professional

Continuous Linux posture management.

- Scheduled scans
- Web dashboard
- Assessment history and risk trends
- Reports
- Remediation tracking

## LinuxLens Enterprise

Everything in Professional, plus:

- SSO
- RBAC
- Multiple estates
- Offline assessment
- Private deployment
- ServiceNow (and equivalent ITSM)
- Custom policy
- Compliance evidence exports

## LinuxLens MSP

Everything required to operate many customers:

- Multiple organisations and estates
- Partner dashboard
- White-labelled reporting
- Delegated access
- Licensing / capacity recommendations (capability-first; providers remain optional)

## Edition capability matrix

| Capability | Snapshot | Professional | Enterprise | MSP |
|---|---|---|---|---|
| Local / one-off assess | Yes | Yes | Yes | Yes |
| Offline import | Yes | Limited | Yes | Yes |
| Web console | No | Yes | Yes | Yes |
| Scheduled reassessment | No | Yes | Yes | Yes |
| Multi-estate | No | Limited | Yes | Yes |
| Multi-organisation | No | No | Limited | Yes |
| SSO / RBAC | No | Basic | Yes | Yes |
| Custom scoring policy | No | No | Yes | Yes |
| White-label reports | No | No | Optional | Yes |
| Private deployment | No | No | Yes | Optional |
| ITSM integrations | No | Optional | Yes | Yes |

“Limited” means a single-organisation subset sufficient for one customer, not a partner portfolio.
