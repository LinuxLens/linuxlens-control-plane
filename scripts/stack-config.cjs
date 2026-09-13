/**
 * LinuxLens workspace paths — sibling git repos + public endpoints.
 * GitHub org: LinuxLens
 */

const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");

const CONTROL_PLANE_ROOT = path.resolve(__dirname, "..");
const CONTROL_PLANE_NAME = "linuxlens-control-plane";
const WORKSPACE_ROOT = path.resolve(CONTROL_PLANE_ROOT, "..");
const HOME = os.homedir();

const GCP_PROJECT = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT_ID || "personal-suherman";
const GCP_REGION = process.env.GCLOUD_REGION || process.env.GCP_LOCATION || "australia-southeast1";
const GITHUB_ORG = "LinuxLens";

const INFRA_ROOT =
  process.env.SUHERMAN_NET_INFRA_ROOT?.trim() ||
  path.join(HOME, "src", "personal", "suherman-net-infra");

/** Git checkouts that `npm run ci` / `npm run git:dirty` watch. */
const STACK_GIT_REPOS = [
  {
    id: CONTROL_PLANE_NAME,
    label: "Control plane",
    root: CONTROL_PLANE_ROOT,
    role: "docs+website+cli",
  },
  {
    id: "suherman-net-infra",
    label: "DNS / Cloudflare",
    root: INFRA_ROOT,
    role: "infra",
  },
];

const PRODUCTION_SERVICES = [
  {
    id: "linuxlens-website",
    label: "Website",
    repoId: CONTROL_PLANE_NAME,
    publicUrl: "https://linuxlens.suherman.net/",
    cloudRunService: "linuxlens-website",
  },
];

function repoExists(root) {
  return fs.existsSync(path.join(root, ".git"));
}

module.exports = {
  CONTROL_PLANE_ROOT,
  CONTROL_PLANE_NAME,
  WORKSPACE_ROOT,
  GCP_PROJECT,
  GCP_REGION,
  GITHUB_ORG,
  INFRA_ROOT,
  STACK_GIT_REPOS,
  PRODUCTION_SERVICES,
  repoExists,
};
