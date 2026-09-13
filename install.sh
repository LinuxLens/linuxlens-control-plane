#!/usr/bin/env bash
# Install the LinuxLens open-source CLI (collect + assess).
# Usage:
#   curl -fsSL https://linuxlens.suherman.net/install.sh | bash
#   LINUXLENS_DIR=$HOME/linuxlens bash install.sh
set -euo pipefail

REPO_URL="${LINUXLENS_REPO:-https://github.com/LinuxLens/linuxlens-control-plane.git}"
INSTALL_DIR="${LINUXLENS_DIR:-${HOME}/linuxlens}"
PYTHON="${LINUXLENS_PYTHON:-python3}"

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "error: missing required command: $1" >&2
    exit 1
  }
}

need git
need "$PYTHON"

echo "==> LinuxLens open-source installer"
echo "    repo: ${REPO_URL}"
echo "    dir:  ${INSTALL_DIR}"

if [[ -d "${INSTALL_DIR}/.git" ]]; then
  echo "==> updating existing clone"
  git -C "${INSTALL_DIR}" pull --ff-only
else
  echo "==> cloning"
  mkdir -p "$(dirname "${INSTALL_DIR}")"
  git clone --depth 1 "${REPO_URL}" "${INSTALL_DIR}"
fi

VENV="${INSTALL_DIR}/.venv"
echo "==> creating virtualenv at ${VENV}"
"$PYTHON" -m venv "${VENV}"
# shellcheck disable=SC1091
source "${VENV}/bin/activate"
python -m pip install --upgrade pip -q
python -m pip install -e "${INSTALL_DIR}/cli" -q

MARKER="${HOME}/.linuxlens_env"
cat >"${MARKER}" <<EOF
# LinuxLens environment — source this file before running linuxlens
export LINUXLENS_CONTROL_PLANE="${INSTALL_DIR}"
# shellcheck disable=SC1091
source "${VENV}/bin/activate"
EOF

echo ""
echo "==> installed"
echo "    Activate:"
echo "      source ${MARKER}"
echo ""
echo "    Quick start (read-only on this host):"
echo "      source ${MARKER}"
echo "      linuxlens assess localhost"
echo ""
echo "    Offline archive:"
echo "      linuxlens collect --archive ./linuxlens-assessment.tar.gz"
echo ""
echo "    Docs: https://linuxlens.suherman.net/#get-started"
echo "    Nothing is uploaded. No packages or services are changed."
