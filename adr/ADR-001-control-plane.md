# ADR-001 — Control plane as source of truth

**Status:** Accepted  
**Date:** 2026-09-13

## Context

LinuxLens will be implemented across several repositories. If assessment rules, risk bands, and API shapes live only in application code or prompts, sibling systems will diverge and the product will be unexplained.

## Decision

`linuxlens-control-plane` is the product control plane. It is **not** a runtime application.

It defines specifications, contracts, policies, scoring, provider mappings, evaluation scenarios, and architecture decisions that every sibling repository must implement.

Dependency direction:

```text
linuxlens-control-plane
        │
        ▼
collector / assessment / api / …
```

This repository MUST NOT import runtime code from sibling repositories.

A feature starts as an `LL-*` spec here. Sibling PRs reference `Implements LL-00N`.

## Consequences

- Product behaviour is reviewable without reading Python or TypeScript.
- Agents and humans can implement against the same contracts.
- Changing a score band or capability set is a control-plane change first.
- Runtime repos may add implementation detail but may not silently override policy.
