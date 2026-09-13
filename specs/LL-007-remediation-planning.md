# LL-007 — Remediation Planning

**Status:** Approved for implementation  
**Phase:** 0 contract / 1 implementation  
**Implements in:** `linuxlens-assessment`, `linuxlens-api`, `linuxlens-web`

## Intent

Turn findings into a sequenced, capability-first remediation plan with impact, downtime, and purpose.

## Pipeline

```text
Raw inventory → Normalisation → Enrichment → Findings → Risk scoring → Remediation options → Prioritisation
```

## Option shape

Each option MUST include:

- `capability` (closed set in recommendation policy)
- `impact` (`low`, `medium`, `high`)
- `downtime` (`none`, `brief`, `required`, `extended`)
- `purpose` (`immediate_risk_reduction`, `durable_fix`, `migration_runway`, `compensating`, `acceptance`)
- `long_term_value` (`low`, `medium`, `high`) when relevant

Providers are attached only in LL-009, after options exist.

## Default pairing

If a host is EOL or approaching EOL **and** reboot feasibility is `low`/`none` **and** kernel or patch exposure exists:

1. Immediate: `live_patch` and/or `patch` (whichever applies)
2. Runway: `extended_support` if already EOL and migration is not immediate
3. Durable: `upgrade` or `migrate`

Primary recommendation text:

> Apply non-disruptive mitigation immediately, then schedule operating system migration as the long-term remediation.

## Acceptance criteria

Given host prod-db-03, RHEL 7.9, uptime 428 days, PostgreSQL, criticality Critical, window Quarterly  
When remediation is planned  
Then options include upgrade, live kernel patching, and extended lifecycle support as runway, and the primary recommendation sequences non-disruptive mitigation before OS migration.

Given a fully supported, fully patched host with no operational findings  
When remediation is planned  
Then the plan MAY be empty or `accept_risk` is absent; no vendor product is listed.

Given no provider mappings are loaded  
When remediation is planned  
Then options still exist using `generic-linux`.

Given two options with the same capability  
When they differ only by provider  
Then they are one capability option with multiple `compatible_products`, not two competing recommendations.

## Prioritisation

See `scoring/remediation-priority.yaml`. Business criticality raises priority of the same technical finding.

## Contracts

- `contracts/remediation.schema.json`
- `contracts/assessment.schema.json`
- [policies/recommendation-policy.md](../policies/recommendation-policy.md)
