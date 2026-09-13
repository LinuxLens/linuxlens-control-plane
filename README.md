# linuxlens-control-plane

Source of truth for LinuxLens product contracts, risk assessment, remediation policies, and architecture — plus an **open-source CLI** you can run on a Linux server.

**Website:** [https://linuxlens.suherman.net](https://linuxlens.suherman.net)  
**License:** Apache-2.0

LinuxLens answers:

> Which Linux systems are at risk, why are they at risk, and what is the most practical way to remediate them?

## Quick start (open source)

```bash
curl -fsSL https://linuxlens.suherman.net/install.sh | bash
source ~/.linuxlens_env
linuxlens assess localhost
```

Read-only. No uploads. No system changes. Full guide: [GETTING-STARTED.md](GETTING-STARTED.md).

```bash
# Offline / regulated
linuxlens collect --archive ./linuxlens-assessment.tar.gz
linuxlens assess --from-archive ./linuxlens-assessment.tar.gz
```

## This repository is not only a runtime

`linuxlens-control-plane` defines what every sibling repository must implement. The `cli/` package is the Phase‑1 local assessment tool that implements those contracts on a single host.

Sibling repositories implement the same contracts at estate scale. This repository must not import runtime code from them.

```
                  linuxlens-control-plane
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
      collector       assessment           api
                                             │
                                      ┌──────┴──────┐
                                      ▼             ▼
                                     web         reporting
```

## Product family

| Repository | Role | MVP |
|---|---|---|
| `linuxlens-control-plane` | Product contracts, knowledge, open-source CLI | Yes |
| `linuxlens-collector` | Read-only estate evidence collection | Yes (CLI ships here for v0.1) |
| `linuxlens-assessment` | Deterministic assessment engine | Yes (CLI ships here for v0.1) |
| `linuxlens-api` | Estate, scan, finding, and report services | Yes |
| `linuxlens-web` | Operator console | Yes |
| `linuxlens-infrastructure` | Deployment and environments | Yes |
| `linuxlens-knowledge` | Curated lifecycle and support facts | Later (`knowledge/` here for now) |
| `linuxlens-reporting` | Executive and technical reports | Later |
| `linuxlens-integrations` | Provider and workflow adapters | Later |
| `linuxlens-desktop` | Offline consultant workstation | Later |
| `linuxlens-docs` | Public and operator documentation | Later |

## Directory map

```
linuxlens-control-plane/
├── GETTING-STARTED.md
├── install.sh
├── cli/          Open-source collector + assessment CLI
├── knowledge/    Curated lifecycle facts
├── product/      Vision, positioning, personas, editions, roadmap
├── specs/        Feature specifications (LL-001 …)
├── contracts/    JSON Schema contracts
├── policies/     Binding product and assessment policies
├── scoring/      Deterministic risk and priority models
├── providers/    Capability-to-product mappings
├── scenarios/    Reference customer situations
├── evals/        Acceptance cases for assessment behaviour
├── adr/          Architecture decisions
└── website/      Marketing site (linuxlens.suherman.net)
```

## How sibling repositories use this

1. A change starts as a specification in `specs/` (for example `LL-003`).
2. Contracts, scoring rules, and policies are updated in the same change when behaviour changes.
3. Sibling pull requests reference the spec they implement: `Implements LL-003`.
4. Assessment behaviour is proven against `evals/`, not against an LLM judgement.

## Principles

1. **Vendor neutrality** — TuxCare is one remediation provider, not the product. See [ADR-003](adr/ADR-003-vendor-neutrality.md).
2. **Capability-first remediation** — recommend the required capability before any provider product. See [ADR-004](adr/ADR-004-capability-first-remediation.md).
3. **Read-only collection** — the collector gathers facts and never remediates. See [ADR-002](adr/ADR-002-read-only-collector.md).
4. **Deterministic assessment** — rules and knowledge produce findings; AI may only explain them. See [ADR-005](adr/ADR-005-deterministic-assessment.md).

## Domain model

```
Organisation
 └── Workspace
      └── Estate
           ├── Host
           ├── Workload
           ├── Scan
           ├── Finding
           ├── Assessment
           ├── Remediation
           └── Report
```

## Risk bands

| Score | Band |
|---|---|
| 0–19 | Healthy |
| 20–39 | Watch |
| 40–59 | Elevated |
| 60–79 | High |
| 80–100 | Critical |

```text
linuxlens_risk =
    0.30 * vulnerability_exposure
  + 0.25 * lifecycle_exposure
  + 0.15 * patch_lag
  + 0.15 * operational_constraints
  + 0.10 * external_exposure
  + 0.05 * business_criticality
```

## Collector modes

| Mode | Path |
|---|---|
| Connected | Hosts → Collector → HTTPS → LinuxLens API |
| Offline | Host → Collector → `linuxlens-assessment.tar.gz` → manual import |
| Relay | Hosts → Collectors → Relay → LinuxLens Cloud |

## Web navigation (product console, later)

Overview · Estate · Hosts · Risks · Lifecycle · Vulnerabilities · Remediation · Reports · Integrations · Settings
