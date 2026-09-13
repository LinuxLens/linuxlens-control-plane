# Policy: read-only assessment

**Status:** Binding  
**Applies to:** collector, assessment engine, API, desktop, any future agent

LinuxLens observes and judges. It does not remediate production systems.

## Rules

1. The collector is read-only with respect to the assessed host. It may write only its own state directory or an operator-requested export.
2. The assessment engine consumes evidence and produces findings, scores, and remediation *plans*. It never SSHs into a host to apply a change.
3. Provider mappings describe compatible products. They are not an instruction to install those products.
4. Integrations MAY open tickets or send alerts that *describe* a recommended action. They MUST NOT apply patches, live-patch enrolment, or configuration changes unless a future, separately specified, explicitly consented actuation product is approved in its own ADR.
5. “Assess” and “collect” commands MUST remain safe to run on production hosts.

## Operator trust

`linuxlens collect` and `linuxlens assess localhost` must be explainable to a security team in one sentence:

> This tool reads inventory and update metadata and writes a structured evidence file. It does not change packages, kernel, users, or services.

## Privilege

The collector SHOULD run with the least privilege that still allows package, kernel, and update metadata. Root is not a product requirement if equivalent facts are available. Privilege escalation inside the collector is forbidden.
