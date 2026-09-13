# LL-004 — Patch Assessment

**Status:** Approved for implementation  
**Phase:** 0 contract / 1 implementation  
**Implements in:** `linuxlens-assessment`, `linuxlens-web`

## Intent

Measure patch lag and security-update backlog independently of CVE enrichment.

## Inputs

From collector evidence:

- Available updates
- Updates marked security-related
- Reboot required
- Repository health (enabled, reachable if collected)
- Package manager errors recorded as collection notes

## Outputs

- `patch_lag` component score (0–100)
- Findings for outstanding security updates
- Finding when reboot is required after already-applied updates
- Finding when update metadata could not be read (`unknown`)

## Acceptance criteria

Given a host with zero available security updates and reboot_required false  
When patch posture is evaluated  
Then patch_lag is in the Healthy band (0–19) unless repository metadata is missing.

Given a host with 17 outstanding security updates  
When patch posture is evaluated  
Then a High or Critical patch finding is emitted per `scoring/patching.yaml` thresholds.

Given reboot_required is true  
When patch posture is evaluated  
Then the assessment records pending reboot as an operational constraint input (LL-006) and a patch finding that updates are not fully active.

Given the collector could not query the package manager  
When patch posture is evaluated  
Then patch_lag uses the `unknown` rule and a coverage-gap finding is created.

## Rules

See `scoring/patching.yaml`. Security-update count dominates; total update count is secondary.

## Contracts

- `contracts/finding.schema.json`
- `contracts/assessment.schema.json`
