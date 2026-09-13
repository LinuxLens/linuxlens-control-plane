# LL-011 — MSP Multitenancy

**Status:** Approved for implementation  
**Phase:** 0 contract / 2 (model) / 4–5 (partner UX)  
**Implements in:** `linuxlens-api`, `linuxlens-web`, `linuxlens-reporting`

## Intent

Start with Organisation → Workspace → Estate so enterprises, consultants, MSPs, and partners do not force a later redesign.

```text
Organisation
 └── Workspace
      └── Estate
           ├── Hosts
           ├── Workloads
           ├── Assessments
           └── Reports
```

Not:

```text
User
 └── Servers
```

## Requirements

1. Every Host, Scan, Finding, Assessment, Remediation, and Report is scoped to an Estate.
2. Users are members of Organisations (and optionally Workspaces) with roles.
3. MSP edition allows one operating user to access many Organisations via delegated grants.
4. Data from Estate A MUST NOT appear in Estate B queries.
5. White-labelled reports may replace LinuxLens product chrome; they MUST NOT alter scores.
6. Licensing / capacity recommendations (e.g. how many hosts need live patch) are capability counts, not vendor quotes.

## Roles (minimum)

| Role | Scope |
|---|---|
| `org_admin` | Organisation settings, members, workspaces |
| `workspace_admin` | Estates in a workspace |
| `operator` | Run scans, view hosts, create reports |
| `reader` | Read-only assessments and reports |
| `delegate` | MSP/partner access to a granted Organisation or Workspace |

Enterprise SSO/RBAC maps onto these roles.

## Acceptance criteria

Given two Organisations each with one Estate  
When an operator of Org A lists hosts  
Then no Org B host is returned.

Given an MSP delegate grant to Workspace W  
When the delegate lists estates  
Then only estates in W are visible.

Given the same `host_id` string in two customer estates  
When both are assessed  
Then records remain distinct and reports cannot merge them.

Given a white-label executive report  
When generated  
Then band counts still match the assessment engine.

## Contracts

- `contracts/host.schema.json` (`organisation_id`, `workspace_id`, `estate_id`)
- [product/editions.md](../product/editions.md)
