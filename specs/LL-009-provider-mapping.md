# LL-009 — Provider Mapping

**Status:** Approved for implementation  
**Phase:** 0 contract / 4 implementation  
**Implements in:** `linuxlens-assessment` (mapping), `linuxlens-integrations`

## Intent

Map a required remediation capability to compatible products **after** the capability is chosen.

```text
LinuxLens Finding
       ↓
Required remediation capability
       ↓
Compatible remediation products
       ↓
Provider options
```

Examples:

```text
Kernel exposure → live_patch → TuxCare KernelCare Enterprise
EOL distribution → extended_support → TuxCare ELS
```

## Mapping files

Authoritative mappings live in `providers/*.yaml`. Integrations may refresh availability/entitlement later; they must not invent capabilities.

## Acceptance criteria

Given a kernel exposure finding  
When mapping runs  
Then the recommended capability is `live_patch` and, if TuxCare mapping is loaded, KernelCare Enterprise appears as a compatible product — not as the finding title.

Given an EOL CentOS 7 host  
When mapping runs  
Then capability `extended_support` and/or `migrate` is present; TuxCare ELS is optional fulfilment for `extended_support`.

Given only `providers/generic-linux.yaml` is loaded  
When mapping runs  
Then every capability still has at least one generic fulfilment (vendor updates, reboot, in-place upgrade, distro migration).

Given a partner build that includes TuxCare  
When the host is Healthy  
Then no TuxCare product is suggested.

## Language check

Primary: “Live kernel patching is recommended.”  
Secondary: “Available provider: TuxCare KernelCare Enterprise.”

## Contracts

- `contracts/remediation.schema.json`
- [policies/vendor-neutrality.md](../policies/vendor-neutrality.md)
- [ADR-004](../adr/ADR-004-capability-first-remediation.md)
