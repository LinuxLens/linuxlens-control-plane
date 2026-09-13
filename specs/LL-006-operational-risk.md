# LL-006 — Operational Risk

**Status:** Approved for implementation  
**Phase:** 0 contract / 1 implementation  
**Implements in:** `linuxlens-assessment`, `linuxlens-api` (business context)

## Intent

Capture constraints that make conventional remediation impractical: uptime, reboot feasibility, workload criticality, and maintenance windows.

## Inputs

| Field | Source |
|---|---|
| `uptime_days` | Collector |
| `reboot_required` | Collector |
| `workload` | Collector hints + operator declaration |
| `business_criticality` | Operator (`low`, `standard`, `high`, `critical`); default `standard` |
| `maintenance_window` | Operator (`weekly`, `monthly`, `quarterly`, `annual`, `none`) |
| `internet_exposed` | Operator or enrichment |
| `reboot_feasibility` | Derived (see below) unless operator overrides |

## Derived reboot feasibility

| Condition | Feasibility |
|---|---|
| `maintenance_window` in `weekly`, `monthly` and criticality ≠ `critical` | `high` |
| Database/payment/identity workload **or** criticality `critical` **or** window `quarterly`/`annual` | `low` |
| Window `none` | `none` |
| No context (snapshot) | `unknown` → treat as `low` for scoring conservatism, labelled inferred |

## Outputs

- `operational_constraints` score
- Findings: `excessive_uptime`, `reboot_infeasible`, `pending_reboot_blocked`
- Fields consumed by LL-007 (`reboot_feasibility`, `migration_urgency` inputs)

## Acceptance criteria

Given uptime_days = 487 and a production-critical database  
When operational risk is evaluated  
Then operational risk is Critical or High per `scoring/operational-risk.yaml`, and reboot feasibility is `low` or `none`.

Given uptime_days = 12, weekly window, standard criticality  
When operational risk is evaluated  
Then operational_constraints is Healthy or Watch.

Given no business context in Snapshot  
When operational risk is evaluated  
Then defaults apply and `context_inferred: true` is set on the assessment.

Given reboot_required and feasibility `none`  
When operational risk is evaluated  
Then a finding states that applied updates are inactive and conventional reboot-based patching is not currently viable.

## Contracts and rules

- `contracts/assessment.schema.json`
- `scoring/operational-risk.yaml`
