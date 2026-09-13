"""Locate control-plane assets relative to this package or env override."""

from __future__ import annotations

import os
from pathlib import Path


def control_plane_root() -> Path:
    env = os.environ.get("LINUXLENS_CONTROL_PLANE")
    if env:
        return Path(env).expanduser().resolve()
    # cli/linuxlens/paths.py → cli/ → repo root
    return Path(__file__).resolve().parents[2]


def knowledge_path() -> Path:
    return control_plane_root() / "knowledge" / "distributions.yaml"


def scoring_dir() -> Path:
    return control_plane_root() / "scoring"


def providers_dir() -> Path:
    return control_plane_root() / "providers"
