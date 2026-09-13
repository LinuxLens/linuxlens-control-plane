# ADR-004 — Capability-first remediation

**Status:** Accepted  
**Date:** 2026-09-13

## Context

Vendor tools typically map a host onto a SKU. That produces “Buy KernelCare” instead of a remediation decision. LinuxLens must remain useful when no commercial provider is configured.

## Decision

LinuxLens recommends the required remediation capability before recommending products or providers that can fulfil that capability.

```text
Finding
   ↓
Required capability
   ↓
Remediation strategy
   ↓
Compatible products / providers
```

rather than:

```text
Server
   ↓
TuxCare product
```

Closed capability set for MVP: `patch`, `live_patch`, `upgrade`, `migrate`, `extended_support`, `compensating_control`, `accept_risk`.

Required phrasing: “Live kernel patching is recommended.” Then optionally: “Available provider: TuxCare KernelCare Enterprise.”

## Consequences

- One capability, many products — not one product per finding.
- Extended support is runway, not a silent permanent destination.
- Integrations (TuxCare, Jira, ServiceNow) consume capabilities first.
