# Scenario: Ubuntu approaching or past standard support

**Audience:** SaaS / enterprise mixed Ubuntu estate  
**Specs exercised:** LL-003, LL-004, LL-007, LL-009

## Situation

Ubuntu 20.04 LTS hosts remain in production after or near the end of standard support. Some have Ubuntu Pro/ESM; most do not. Patch lag is moderate. Reboot windows are monthly.

## Representative hosts

| host_id | version | ESM evidenced | window |
|---|---|---|---|
| app-api-14 | 20.04 | no | monthly |
| app-api-15 | 20.04 | yes | monthly |
| app-api-22 | 22.04 | n/a | monthly |

## Expected assessment shape

- `app-api-14`: phase `end_of_life` or `approaching_eol` depending on the knowledge as-of date; High lifecycle; upgrade recommended.
- `app-api-15`: phase `extended`; High but lower than EOL; ESM is runway, not the durable fix.
- `app-api-22`: phase `standard` if more than 180 days remain; no upcoming-lifecycle finding.

## Expected remediation

- Capability `upgrade` to a supported Ubuntu LTS for 20.04 hosts.
- `extended_support` only as runway when upgrade is not immediate.
- If Canonical mapping is loaded: Ubuntu Pro / ESM is a compatible product for the runway capability.
- Live patch only if kernel exposure exists and reboot is constrained (not the default here).
