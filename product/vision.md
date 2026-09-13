# Product vision

LinuxLens is a vendor-neutral Linux infrastructure security, lifecycle, patching, and remediation assessment platform.

Its purpose is to answer:

> Which Linux systems are at risk, why are they at risk, and what is the most practical way to remediate them?

## The problem

Linux estates accumulate risk that vulnerability scanners only partially describe:

- Operating systems leave standard support while still running production workloads.
- Patch lag and reboot constraints make conventional remediation impractical.
- Kernel exposure persists on systems that cannot tolerate downtime.
- Executives receive CVE lists instead of a remediation decision.
- Remediation advice is often a vendor product pitch rather than an independent assessment.

LinuxLens exists to turn estate evidence into a traceable risk judgement and a practical remediation plan.

## What LinuxLens is

- An independent assessment of Linux lifecycle, patching, vulnerability exposure, and operational constraint.
- A decision layer that recommends remediation *capabilities* before products.
- A source of executive and technical evidence for consulting and continuous posture management.

## What LinuxLens is not

- A TuxCare sales tool. TuxCare may fulfil a recommended capability; it must never be the default conclusion.
- A replacement for a vulnerability scanner. CVE data may enrich an assessment; it is not the risk model.
- An agent that remediates production systems. Collection and assessment are read-only.
- An LLM that decides whether a host is secure. Assessment is deterministic.

## Long-term product

The long-term product is a Linux estate intelligence and remediation decision platform:

1. Collect facts from the customer environment.
2. Assess risk with explicit, testable rules.
3. Recommend the required remediation capability.
4. Map compatible providers only after the capability is chosen.
5. Explain the result to engineers and executives with evidence.

## Customer journey

| Stage | Outcome |
|---|---|
| 1. Linux Risk Snapshot | Low-friction estate snapshot from `linuxlens collect` |
| 2. Deep Assessment | Business context, roadmap, and investment plan |
| 3. Remediation | Capability-first options, then compatible providers |
| 4. Continuous LinuxLens | Scheduled reassessment, drift, alerts, tracking |
