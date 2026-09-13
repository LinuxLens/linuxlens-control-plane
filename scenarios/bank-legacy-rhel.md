# Scenario: bank legacy RHEL

**Audience:** regulated bank, deep assessment  
**Specs exercised:** LL-003, LL-005, LL-006, LL-007, LL-008, LL-009

## Situation

A payments database estate still runs RHEL 7.9. Standard support has ended. Hosts have long uptime, quarterly change windows, and cannot reboot without a payment-service outage.

## Representative host

| Field | Value |
|---|---|
| host_id | prod-payment-db-01 |
| os | RHEL 7.9 |
| kernel | 3.10.0-1160 |
| uptime_days | 487 |
| reboot_required | true |
| security updates | 17 |
| workload | PostgreSQL (payments) |
| business_criticality | critical |
| maintenance_window | quarterly |
| internet_exposed | false |

## Expected assessment shape

| Component | Band (approx.) |
|---|---|
| Lifecycle | Critical (EOL) |
| Patch | High / Critical |
| Security exposure | High |
| Operational | Critical |
| Reboot feasibility | low |
| Migration urgency | high |
| LinuxLens Risk | Critical (example 91) |

Reasons that MUST appear:

- Operating system outside standard lifecycle
- Outstanding security updates
- Kernel security exposure (if knowledge marks 3.10 as exposed)
- Extreme uptime
- Production-critical database
- Reboot would require payment service outage

## Expected remediation

1. Immediate: `live_patch` (and `patch` where reboot is not required)
2. Runway: `extended_support`
3. Durable: `migrate` or `upgrade` to a supported RHEL

Primary recommendation: non-disruptive mitigation now, OS migration as the long-term fix.

If TuxCare mapping is loaded, KernelCare Enterprise and ELS are compatible products — never the finding titles.

## Offline

Banks in this scenario typically use offline mode: collector → `linuxlens-assessment.tar.gz` → import or LinuxLens Desktop. Nothing requires host outbound Internet.
