/**
 * Build the static marketing site image, push to GHCR, deploy Cloud Run.
 */
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.join(__dirname, "..");
const websiteDir = path.join(root, "website");

function fail(message) {
  console.error(`deploy:website: ${message}`);
  process.exit(1);
}

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null) process.env[key] = value;
  }
}

function requireGhcrDeploy() {
  const candidates = [
    process.env.SUHERMAN_NET_INFRA_ROOT?.trim(),
    path.join(os.homedir(), "src", "personal", "suherman-net-infra"),
  ].filter(Boolean);
  for (const infraRoot of candidates) {
    const helper = path.join(infraRoot, "scripts", "lib", "ghcr-cloudrun-deploy.cjs");
    if (fs.existsSync(helper)) {
      loadDotEnv(path.join(infraRoot, ".env"));
      return require(helper);
    }
  }
  fail("suherman-net-infra not found. Set SUHERMAN_NET_INFRA_ROOT.");
}

function main() {
  const { buildAndPushImage, deployCloudRunImage } = requireGhcrDeploy();
  const { spawnSync } = require("node:child_process");
  const projectId = process.env.GCP_PROJECT_ID?.trim() || "personal-suherman";
  const region = process.env.GCP_LOCATION?.trim() || "australia-southeast1";
  const serviceName = process.env.WEBSITE_SERVICE?.trim() || "linuxlens-website";
  process.env.GHCR_OWNER = process.env.GHCR_OWNER?.trim() || "iman-suherman";
  const tag = process.env.GHCR_IMAGE_TAG?.trim() || `ll-${Date.now()}`;
  process.env.GHCR_IMAGE_TAG = tag;

  try {
    const ghcrImage = buildAndPushImage({
      cwd: root,
      contextDir: websiteDir,
      imageName: "linuxlens-website",
      tag,
      logPrefix: "deploy:website",
    });
    const arImage = `${region}-docker.pkg.dev/${projectId}/cloudrun/linuxlens-website:${tag}`;
    const login = spawnSync(
      "gcloud",
      ["auth", "print-access-token"],
      { encoding: "utf8" },
    );
    if (login.status !== 0) fail("gcloud auth print-access-token failed");
    const cli = process.env.CONTAINER_CLI?.trim() || "podman";
    // Tag locally then push to Artifact Registry so Cloud Run can pull without public GHCR.
    const tagResult = spawnSync(cli, ["tag", ghcrImage, arImage], { stdio: "inherit" });
    if (tagResult.status !== 0) fail(`${cli} tag failed`);
    const loginAr = spawnSync(
      cli,
      ["login", "-u", "oauth2accesstoken", "--password-stdin", `${region}-docker.pkg.dev`],
      { input: login.stdout, stdio: ["pipe", "inherit", "inherit"] },
    );
    if (loginAr.status !== 0) fail(`${cli} login to Artifact Registry failed`);
    const arPush = spawnSync(cli, ["push", arImage], { stdio: "inherit" });
    if (arPush.status !== 0) fail(`${cli} push to Artifact Registry failed`);

    deployCloudRunImage({
      serviceName,
      image: arImage,
      projectId,
      region,
      gcloudArgs: ["--allow-unauthenticated", "--quiet", "--port", "8080"],
      logPrefix: "deploy:website",
    });
    console.log(`deploy:website: done ${serviceName} ← ${arImage}`);
    console.log("deploy:website: map DNS with: cd ~/src/personal/suherman-net-infra && npm run cloudflare:linuxlens");
  } catch (error) {
    fail(error.message || String(error));
  }
}

main();
