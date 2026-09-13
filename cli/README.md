# LinuxLens CLI

Read-only collector and deterministic assessment for a single Linux host.

```bash
# Install (from this repository)
pip install -e ./cli

# Collect facts only
linuxlens collect

# Collect and assess
linuxlens assess localhost

# Offline archive for regulated environments
linuxlens collect --archive ./linuxlens-assessment.tar.gz
linuxlens assess --from-archive ./linuxlens-assessment.tar.gz
```

Does **not** collect passwords, keys, secrets, or customer data.
Does **not** change packages, kernels, users, or services.
Assessment is rule-based using contracts in this control-plane repository.
