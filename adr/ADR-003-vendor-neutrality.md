# ADR-003 — Vendor neutrality

**Status:** Accepted  
**Date:** 2026-09-13

## Context

TuxCare is a natural remediation partner (live kernel patching, extended lifecycle support). If LinuxLens is positioned as a TuxCare sales tool, the assessment loses credibility and cannot become an independent estate-intelligence platform.

## Decision

LinuxLens assesses Linux infrastructure risk independently of any specific remediation vendor.

TuxCare is one remediation provider. Canonical, Red Hat, SUSE, and generic distribution tooling are modelled the same way: optional fulfilment of a capability.

Findings and scores MUST be computable with only collector evidence, knowledge facts, and `providers/generic-linux.yaml`.

## Consequences

- UI, reports, and evals lead with capability and LinuxLens risk.
- Partner editions must not change scores to favour a vendor.
- The long-term product can be a Linux estate intelligence and remediation decision platform rather than a presales scanner.
