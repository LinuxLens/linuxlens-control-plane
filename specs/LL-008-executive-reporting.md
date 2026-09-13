# LL-008 — Executive Reporting

**Status:** Approved for implementation  
**Phase:** 0 contract / 3 implementation  
**Implements in:** `linuxlens-reporting`, `linuxlens-api`, `linuxlens-web`, `linuxlens-desktop`

## Intent

Produce at least two report types from the same assessment objects: executive and technical. Reporting must not re-score hosts.

## Executive report

**Audience:** CIO, CISO, CTO, Head of Infrastructure, risk leadership.

MUST include:

- Customer / estate name
- Systems assessed
- Counts: Critical, High, Elevated/Watch, Healthy (or the band set in force)
- End-of-life system count
- Immediate remediation count
- Top risks (evidence-backed)
- Business impact narrative grounded in findings
- 90-day remediation priorities
- Lifecycle outlook
- Operational constraints summary
- Recommended investment (capabilities and effort, not SKUs)

## Technical report

**Audience:** platform and security teams.

Per host MUST include:

- Host identity
- Operating system and kernel
- Lifecycle status
- CVE / security exposure summary
- Patch lag
- Uptime and reboot requirement
- LinuxLens risk score and band
- Recommended actions (capabilities)

## Formats

PDF, CSV, XLSX, JSON. JSON MUST validate against `contracts/report.schema.json`.

## Acceptance criteria

Given an estate assessment with 482 systems, 37 Critical, 91 High, 54 EOL, 72 immediate remediations  
When an executive report is generated  
Then those figures appear and match the assessment aggregates exactly.

Given the same assessment  
When a technical report is generated  
Then each assessed host appears with score, lifecycle status, and recommended capability.

Given Ask LinuxLens or an LLM writes narrative sections  
When the report is generated  
Then numeric counts and host scores are copied from the assessment engine, not from the model.

Given vendor-neutrality policy  
When either report lists fulfilment  
Then capability text precedes any provider product.

## Contracts

- `contracts/report.schema.json`
- `contracts/assessment.schema.json`
