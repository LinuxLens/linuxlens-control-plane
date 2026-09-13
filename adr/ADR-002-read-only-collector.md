# ADR-002 — Read-only collector

**Status:** Accepted  
**Date:** 2026-09-13

## Context

The collector runs inside the customer environment, including banks, government, and production databases. Any write or secret collection would block adoption.

## Decision

The collector is a read-only fact gatherer. It produces structured evidence, not conclusions.

Supported modes: connected, offline (`linuxlens-assessment.tar.gz`), and relay.

It MUST NOT collect passwords, private keys, database contents, application payloads, customer documents, API keys, secrets, or user data.

The first local interface is:

```text
linuxlens collect
linuxlens assess localhost
```

Assessment and remediation planning happen after evidence is written.

## Consequences

- Security teams can approve a small, inspectable binary.
- Offline and desktop flows are possible without cloud upload.
- Remediation remains a plan, not an actuation, until a future ADR explicitly allows consented actuation.
