# LL-003 — Lifecycle Assessment

**Status:** Approved for implementation  
**Phase:** 0 contract / 1 implementation  
**Implements in:** `linuxlens-assessment`, `linuxlens-api`, `linuxlens-web`

## Intent

Determine the support phase of each operating system and emit lifecycle findings without inventing dates.

## Support phases

| Phase | Meaning |
|---|---|
| `standard` | Vendor standard/maintenance support is current |
| `approaching_eol` | Standard support ends within 180 days |
| `extended` | Standard support has ended; extended/ESM/ELS-style coverage is in use or available |
| `end_of_life` | No standard support; extended coverage not evidenced |
| `unknown` | Knowledge record missing or version not mapped |

Dates come from `linuxlens-knowledge` when that repository exists. Until then, assessment MUST load an equivalent curated table — never an LLM — and MUST fail a host to `unknown` rather than guess.

## Findings

| Condition | Finding |
|---|---|
| `end_of_life` | Lifecycle exposure, severity Critical |
| `extended` | Extended-support runway, severity High |
| `approaching_eol` (≤180 days) | Upcoming lifecycle milestone, severity High |
| `approaching_eol` is not used beyond 180 days | No upcoming-lifecycle finding from this rule |
| `unknown` | Coverage gap, severity Elevated |

## Acceptance criteria

Given a supported Ubuntu release with more than 180 days of standard support remaining  
When lifecycle is evaluated  
Then the support phase is `standard` and no upcoming-lifecycle finding is created.

Given CentOS 7  
When lifecycle is evaluated  
Then lifecycle exposure is reported (`end_of_life` unless the assessment is given evidenced extended coverage).

Given an operating system reaching end of standard support within 180 days  
When lifecycle is evaluated  
Then LinuxLens creates an upcoming lifecycle finding.

Given RHEL 7.9 with no evidenced ELS entitlement  
When lifecycle is evaluated  
Then phase is `end_of_life` and lifecycle_exposure scores per `scoring/lifecycle.yaml`.

Given a distro/version with no knowledge record  
When lifecycle is evaluated  
Then phase is `unknown` and the host is not scored Healthy on the lifecycle component.

## Contracts and rules

- `contracts/finding.schema.json`
- `contracts/assessment.schema.json`
- `scoring/lifecycle.yaml`

## Sibling note

Web Lifecycle view aggregates:

- Supported
- Ending <12 months
- Extended support
- End of life
