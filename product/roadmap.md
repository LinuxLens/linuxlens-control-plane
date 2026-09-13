# Roadmap

Do not build every sibling repository at once. Delivery follows the contract, then a useful local product, then estate scale.

## Phase 0 — Product contract (this repository)

Define:

- LL-001 Estate Discovery
- LL-002 Host Inventory
- LL-003 Lifecycle Assessment
- LL-004 Patch Assessment
- LL-005 Vulnerability Assessment
- LL-006 Operational Risk
- LL-007 Remediation Planning
- LL-008 Executive Reporting
- LL-009 Provider Mapping
- LL-010 Continuous Monitoring
- LL-011 MSP Multitenancy

Exit criteria: contracts, policies, scoring, ADRs, and eval cases exist and are internally consistent.

## Phase 1 — Local assessment

Build `linuxlens-collector` and `linuxlens-assessment`.

The first meaningful product is:

```text
linuxlens assess localhost
```

Example output:

```text
LinuxLens Assessment
OS               Ubuntu 20.04
Kernel           5.4.x
Lifecycle        Extended Support
Patch Posture    High
Reboot Risk      Low
LinuxLens Risk
67 / HIGH
Recommended Actions
1. Apply outstanding security updates
2. Plan operating system upgrade
3. Evaluate non-disruptive live patching
```

Exit criteria: deterministic assessment of one host from collector evidence; evals in this repo pass.

## Phase 2 — Estate management

Add `linuxlens-api` and `linuxlens-web`.

LinuxLens can assess hundreds of systems and show Overview, Estate, Hosts, Risks, Lifecycle, Vulnerabilities, Remediation, Reports, Integrations, and Settings.

## Phase 3 — Customer reporting

Add `linuxlens-reporting`.

Produce executive and technical assessment packs (PDF, CSV, XLSX, JSON). This is the consulting commercial motion.

## Phase 4 — Provider and workflow integrations

Add `linuxlens-integrations`.

Start with TuxCare (as a capability fulfilment source), Jira, and ServiceNow. Mapping must follow [ADR-004](../adr/ADR-004-capability-first-remediation.md).

## Phase 5 — Continuous posture

Scheduled collector runs, estate drift, reassessment, risk-score history, alerts, tickets, and remediation tracking. LinuxLens becomes a recurring platform rather than a one-off assessment.

## MVP repository set

Actively build only:

- `linuxlens-control-plane`
- `linuxlens-collector`
- `linuxlens-assessment`
- `linuxlens-api`
- `linuxlens-web`
- `linuxlens-infrastructure`

MVP runtime shape:

```text
Cloudflare → Web → FastAPI → PostgreSQL → Object storage
```

Do not start with Kubernetes unless a concrete requirement appears.

## Later repositories

`linuxlens-knowledge`, `linuxlens-reporting`, `linuxlens-integrations`, `linuxlens-desktop`, and `linuxlens-docs` are specified here so later work does not invent a second product model.
