# Scenario: no-reboot database

**Audience:** any industry, operational-risk first  
**Specs exercised:** LL-004, LL-005, LL-006, LL-007

## Situation

A supported OS (for example RHEL 8 or Ubuntu 22.04) runs a business-critical database. Security updates including kernel updates are available. The service owner cannot reboot except annually.

## Representative host

| Field | Value |
|---|---|
| host_id | prod-db-03 |
| os | RHEL 8.10 (standard or maintenance) |
| uptime_days | 428 |
| reboot_required | true |
| workload | PostgreSQL |
| business_criticality | critical |
| maintenance_window | annual |

## Expected assessment shape

- Lifecycle may be Healthy or Watch (not the driver).
- Patch: Elevated+ because updates are not fully active.
- Operational: High/Critical (uptime + reboot feasibility `low`/`none`).
- Reboot feasibility: `low` or `none`.

## Expected remediation

- Immediate: `live_patch` for kernel exposure; userspace patch where reboot is not required.
- Durable: schedule a maintenance window; do not pretend conventional kernel patching is complete.
- Do not recommend `extended_support` solely because reboot is hard.
- Primary narrative: apply non-disruptive mitigation now; plan the reboot/upgrade window.
