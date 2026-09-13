# ADR-005 — Deterministic assessment

**Status:** Accepted  
**Date:** 2026-09-13

## Context

LLMs are useful for explanation and executive narrative. They are not reliable sources of lifecycle dates, risk scores, or “is this host secure?” judgements. Hiding business logic in prompts would make evals impossible.

## Decision

Assessment is deterministic.

```text
Collector evidence
       ↓
Deterministic rules
       ↓
Knowledge
       ↓
Findings
       ↓
Risk engine
       ↓
Grounded assessment
       ↓
LLM (optional)
```

The LLM MAY explain, summarise, compare, answer questions, and generate executive narratives. It MUST NOT determine whether a host is secure, change a score, or invent lifecycle facts.

Every answer to “Why is prod-db-03 Critical?” MUST be traceable to evidence fields.

Ask LinuxLens, when built, queries grounded assessment objects.

## Consequences

- `evals/` are the acceptance suite for `linuxlens-assessment`.
- Knowledge belongs in curated records (`linuxlens-knowledge`), not model weights.
- API and web must treat scores as assessment-engine outputs, not as generated text.
