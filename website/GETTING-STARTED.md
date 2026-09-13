# Getting started — open-source LinuxLens

LinuxLens answers:

> Which Linux systems are at risk, why are they at risk, and what is the most practical way to remediate them?

This repository is the **control plane** (contracts and policies) plus an open-source **CLI** you can run on a Linux server.

## What it does

| Command | Effect |
|---|---|
| `linuxlens collect` | Read-only facts: OS, kernel, packages, updates, uptime, reboot flag |
| `linuxlens assess localhost` | Collect + deterministic risk score and remediation capabilities |

## What it never does

- Does not collect passwords, SSH keys, secrets, database contents, or documents
- Does not patch, reboot, or change services
- Does not upload data unless you choose a connected mode later

## Install

```bash
curl -fsSL https://linuxlens.suherman.net/install.sh | bash
source ~/.linuxlens_env
```

The installer clones this repository, creates a Python virtualenv, and installs the CLI. Or clone manually:

```bash
git clone https://github.com/LinuxLens/linuxlens-control-plane.git
cd linuxlens-control-plane
python3 -m venv .venv
source .venv/bin/activate
pip install -e ./cli
export LINUXLENS_CONTROL_PLANE="$PWD"
```

## Assess one host

On the server you want to assess:

```bash
linuxlens assess localhost
```

Example output:

```text
LinuxLens Assessment
OS               Ubuntu 22.04.5 LTS
Kernel           5.15.0-xxx
Lifecycle        standard
LinuxLens Risk
28 / WATCH
Recommended Actions
1. …
```

With business context:

```bash
linuxlens assess localhost \
  --criticality critical \
  --maintenance-window quarterly \
  --workload postgresql
```

## Offline / regulated mode

```bash
linuxlens collect --archive ./linuxlens-assessment.tar.gz
# copy the archive out of the environment, then:
linuxlens assess --from-archive ./linuxlens-assessment.tar.gz
```

## Estate of many servers

1. Run `linuxlens collect --archive host-$(hostname).tar.gz` on each host (or via Ansible/SSH).
2. Copy archives to an assessment workstation.
3. Assess each archive. Estate SaaS aggregation is a later edition.

## Safety review for security teams

```bash
# Inspect what will be collected (source is open)
less cli/linuxlens/collect.py

# Run as a low-privilege user when package metadata allows
linuxlens collect -o /tmp/evidence.json
```

## License

Apache-2.0. See [LICENSE](LICENSE).

## Product principles

- Vendor-neutral assessment ([ADR-003](adr/ADR-003-vendor-neutrality.md))
- Capability-first remediation ([ADR-004](adr/ADR-004-capability-first-remediation.md))
- Deterministic scoring ([ADR-005](adr/ADR-005-deterministic-assessment.md))
