# Policy: privacy

**Status:** Binding  
**Applies to:** collector, API, web, reporting, desktop, infrastructure

## Customer environment first

- Offline and desktop flows MUST be able to complete an assessment with **zero upload** to LinuxLens Cloud.
- Relay mode exists so individual hosts need no outbound Internet.
- What must never leave the customer environment: secrets, private keys, customer documents, database contents, application payloads, and user data. See [data-collection.md](data-collection.md).

## Data that may leave (connected mode)

Only structured evidence that conforms to `contracts/collector.schema.json`, plus operator-declared business context (criticality, maintenance window, regulatory tags).

## Retention

- Snapshot editions SHOULD retain evidence only as long as the engagement requires.
- Professional/Enterprise MAY retain assessment history for trend views; retention is tenant-configurable.
- Reports inherit the same retention class as the assessment they were generated from.

## Access

- Estate data is scoped by Organisation → Workspace → Estate.
- MSP delegated access is explicit and auditable (LL-011).
- Ask LinuxLens and any LLM feature receive **grounded assessment objects**, not raw disk images or prohibited collector classes.

## Human data

The collector does not target personal data. Hostnames and instance metadata may still be identifying. Treat evidence as confidential customer infrastructure data in all editions.
