# LL-001 — Estate Discovery

**Status:** Approved for implementation  
**Phase:** 0 contract / 2 implementation  
**Implements in:** `linuxlens-collector`, `linuxlens-api`, `linuxlens-web`

## Intent

Discover and register the Linux estate under the Organisation → Workspace → Estate model so hosts are never parented directly to a user.

## Requirements

1. An Estate belongs to exactly one Workspace; a Workspace belongs to exactly one Organisation.
2. A collector registration is scoped to an Estate (connected mode) or to an offline import job (offline mode).
3. Discovery records collector mode: `connected`, `offline`, or `relay`.
4. Duplicate host identity within an Estate updates the existing Host; it does not create a second Host.
5. Snapshot edition MAY use a single implicit Organisation/Workspace/Estate.
6. Enterprise and MSP editions MUST support multiple Estates (and MSP: multiple Organisations). See LL-011.

## Identity

A Host is unique within an Estate by, in order of preference:

1. Operator-supplied `host_id`
2. Collector `machine_id` (or equivalent)
3. Hostname + architecture + os.family fallback, flagged as `identity_weak`

## Acceptance criteria

Given a new organisation with one workspace  
When the first collector registers  
Then an Estate is created or selected and the collector is bound to it.

Given two collector runs from the same `host_id` in the same Estate  
When inventory is ingested  
Then one Host exists and `last_seen_at` is updated.

Given the same hostname in two Estates  
When inventory is ingested  
Then two Host records exist and are not merged.

Given offline mode  
When `linuxlens-assessment.tar.gz` is imported  
Then hosts are attached to the import’s target Estate without requiring outbound connectivity from the source hosts.

Given relay mode  
When collectors deliver to a relay  
Then the API sees the relay as the ingress and still attributes each Host to the correct Estate.

## Contracts

- `contracts/collector.schema.json`
- `contracts/host.schema.json`
- `contracts/scan.schema.json`

## Out of scope

Application service-map discovery beyond host-level workload hints. Kubernetes cluster inventory as a first-class Estate type.
