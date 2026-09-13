# Scenario: mixed Linux estate

**Audience:** Snapshot → Professional conversion  
**Specs exercised:** LL-001, LL-002, LL-008, estate aggregation

## Situation

284 servers across Ubuntu, RHEL, CentOS, and SUSE. Some collectors are connected; a regulated subnet uses offline import. The customer wants a single Overview.

## Example Overview (target UX)

```text
Linux Estate
284 Servers
Healthy       149
Watch          53
High           49
Critical       33

Immediate attention
33 critical systems
18 end-of-life systems
24 systems cannot easily tolerate traditional reboot-based patching
12 operating systems reach lifecycle milestones within 180 days
```

Lifecycle view:

```text
Supported            193
Ending <12 months     39
Extended support      31
End of life           21
```

Remediation view:

```text
Immediate patch           31
Live patch candidate      24
Upgrade recommended       41
Migration required        17
Extended lifecycle        12
Accept / mitigate risk     4
```

## Expected behaviour

- One Estate (or several rolled up to a Workspace) with consistent scoring.
- Offline-imported hosts use the same schemas and bands.
- Provider columns are optional; capability counts are the primary remediation view.
- Snapshot language matches Stage 1 of the customer journey (`linuxlens collect`).
