# Policy: recommendation

**Status:** Binding  
**Applies to:** assessment, remediations, web, reporting, integrations, Ask LinuxLens

## Capability-first sequence

```text
Finding
  → required capability
  → remediation strategy
  → compatible products / providers
```

Forbidden sequence:

```text
Server → vendor product
```

## Capabilities

LinuxLens MAY recommend these capabilities (closed set for MVP):

| Capability | Intent |
|---|---|
| `patch` | Apply available vendor/security updates |
| `live_patch` | Reduce kernel (or designated runtime) exposure without reboot |
| `upgrade` | Move to a supported release of the same distribution family |
| `migrate` | Move to a supported distribution or platform |
| `extended_support` | Buy time with extended lifecycle support while planning exit |
| `compensating_control` | Network, isolation, or monitoring control when change is blocked |
| `accept_risk` | Explicit, time-bounded acceptance with owner |

## When to recommend what

Rules of thumb encoded in `scoring/remediation-priority.yaml` and provider files:

- Outstanding security updates and a feasible maintenance window → `patch`.
- Kernel security exposure and reboot feasibility `low` or `none` → `live_patch` as immediate mitigation.
- OS in extended support or ≤180 days to end of standard support → `upgrade` or `migrate` as the durable fix.
- OS already end of life and migration is not immediate → `extended_support` as **runway**, never as the permanent recommendation unless the customer declares that constraint.
- Business-critical workload + quarterly/never window → pair a non-disruptive mitigation with a scheduled durable fix.

Default narrative when both immediate and durable actions exist:

> Apply non-disruptive mitigation immediately, then schedule operating system migration or upgrade as the long-term remediation.

## Provider mentions

- Recommend the capability in the primary action text.
- List compatible providers only after the capability, labelled “Available provider” / “Compatible product”.
- Generic Linux (vendor repos, reboot, in-place upgrade) is always a valid fulfilment path.
- TuxCare, Canonical, Red Hat, and SUSE mappings are optional fulfilment, not required for a complete assessment.

## Independence

An assessment with zero commercial providers configured MUST still produce a complete remediation plan using `generic-linux` capabilities.
