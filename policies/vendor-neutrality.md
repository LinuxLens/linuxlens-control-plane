# Policy: vendor neutrality

**Status:** Binding  
**Applies to:** product language, scoring, remediations, UI, reports, integrations

LinuxLens assesses Linux infrastructure risk independently of any specific remediation vendor.

## Rules

1. Findings and scores MUST be computable with only collector evidence, knowledge facts, and generic-linux capabilities.
2. Provider directories under `providers/` are mappings, not scoring inputs.
3. TuxCare is modelled identically to Canonical, Red Hat, and SUSE: products that may fulfil a capability.
4. UI and reports MUST lead with capability and LinuxLens risk, not a vendor logo or SKU.
5. Sales or partner editions MUST NOT change scores to favour a provider.
6. Knowledge records may note that a vendor offers extended support or live patching. That is a fact about the market, not a recommendation to buy.

## Required phrasing

**Do:** “Live kernel patching is recommended. Available provider: TuxCare KernelCare Enterprise.”

**Do not:** “Buy KernelCare.” / “TuxCare finds this host critical.”

## Tests

Eval cases in `evals/remediation-cases.yaml` MUST include at least one case where the recommended capability is `live_patch` or `extended_support` and **no** provider is configured, and the assessment is still complete.
