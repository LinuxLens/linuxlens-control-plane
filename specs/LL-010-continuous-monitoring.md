# LL-010 — Continuous Monitoring

**Status:** Approved for implementation  
**Phase:** 0 contract / 5 implementation  
**Implements in:** `linuxlens-api`, `linuxlens-collector`, `linuxlens-web`, `linuxlens-integrations`

## Intent

Move from one-off assessment to recurring posture:

```text
Scheduled collector run
        ↓
Estate changes detected
        ↓
Reassessment
        ↓
Risk score changes
        ↓
New finding
        ↓
Alert / ticket
        ↓
Remediation tracking
```

## Requirements

1. A schedule is defined per Estate (Professional+).
2. Each run creates a new Scan; Hosts are updated in place.
3. Assessment history is retained per edition retention policy.
4. Drift includes: new hosts, disappeared hosts, os/kernel change, score-band change, new Critical/High findings.
5. Alerts and tickets describe capability-first actions. They do not apply changes (read-only policy).
6. Snapshot edition has no scheduler; import/re-run is manual.

## Acceptance criteria

Given a Professional estate with a daily schedule  
When the collector completes a subsequent scan  
Then a new Scan and Assessment exist and the previous score remains queryable.

Given a host moves from High (67) to Watch (31) after patching  
When reassessment completes  
Then history records the transition and the current band is Watch.

Given a new Critical finding on a previously Healthy host  
When integrations are configured  
Then an alert or ticket is opened with host_id, score, findings, and recommended capabilities.

Given offline-only Enterprise  
When a new archive is imported  
Then the same drift rules apply without connected collectors.

## Contracts

- `contracts/scan.schema.json`
- `contracts/assessment.schema.json`
- `contracts/finding.schema.json`

## Out of scope for MVP

Real-time eBPF sensors, kernel telemetry streaming, and auto-remediation.
