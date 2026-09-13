# Positioning

## Category

LinuxLens is a **Linux estate risk and remediation decision platform**.

It sits between inventory/vulnerability tools and the work of actually remediating Linux infrastructure.

## The question we own

Vulnerability scanners answer: *which CVEs exist?*

Configuration tools answer: *is the host configured as expected?*

LinuxLens answers: *which Linux systems are at risk, why, and what is the most practical remediation?*

## Differentiation

| Alternative | Typical output | LinuxLens difference |
|---|---|---|
| CVE scanner | CVSS-ranked vulnerability list | Composite LinuxLens risk with lifecycle, patch lag, and operational constraint |
| OS vendor console | Support status for that vendor’s estate | Vendor-neutral mixed-estate view |
| Live-patch vendor tool | Product eligibility | Capability first, then optional provider mapping |
| Consulting spreadsheet | One-off narrative | Repeatable, deterministic, contract-driven assessment |

## Positioning constraints

1. **Independent assessment.** Recommendations must remain valid if no commercial provider is configured.
2. **Capability before product.** “Live kernel patching is recommended” precedes “Available provider: TuxCare KernelCare Enterprise.”
3. **Never “buy KernelCare.”** Provider mentions are fulfilment options, not the finding.
4. **Explainable scores.** Every Critical/High judgement must cite evidence fields from the collector or declared business context.
5. **Useful to both audiences.** Engineers get host-level actions; executives get estate risk, runway, and investment priority.

## Language

Prefer:

- “Unsupported operating system”
- “Live kernel patching is recommended”
- “Extended lifecycle support can create migration runway”
- “Compatible provider: …”

Avoid:

- “TuxCare recommends”
- “You should buy …”
- “This host is insecure because CVSS is 9.8” as the sole explanation

## Competitive posture

LinuxLens can ingest or sit beside Tenable, Qualys, Rapid7, CrowdStrike, and cloud inventory. Those tools are evidence or workflow sources. They do not replace the LinuxLens risk model or remediation policy.
