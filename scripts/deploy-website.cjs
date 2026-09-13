/**
 * Build marketing site image, push to Artifact Registry, deploy Cloud Run
 * with the same Nodemailer/Gmail SMTP mechanism as suherman.net.
 */
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const websiteDir = path.join(root, "website");
const home = os.homedir();

const SMTP_DEFAULTS = {
  SMTP_HOST: "smtp.gmail.com",
  SMTP_PORT: "587",
  SMTP_USER: "suherman.fb@gmail.com",
  EMAIL_FROM_NAME: "Iman Suherman",
  EMAIL_FROM_ADDRESS: "suherman.fb@gmail.com",
};

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
    if (
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null) process.env[key] = value;
  }
}

function parseEnvFile(filePath) {
  const values = {};
  if (!fs.existsSync(filePath)) return values;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function resolveAlocareNotificationEnv() {
  const explicit = process.env.ALOCARE_NOTIFICATION_SERVICE_ROOT?.trim();
  if (explicit) return path.join(explicit, ".env");
  return path.join(home, "src", "alocare.ai", "alocare-notification-service", ".env");
}

function resolveSmtpEnv() {
  const websiteEnv = parseEnvFile(path.join(root, ".env"));
  const websiteLocal = parseEnvFile(path.join(websiteDir, ".env.local"));
  const alocareEnv = parseEnvFile(resolveAlocareNotificationEnv());
  const infraEnv = parseEnvFile(
    path.join(home, "src", "personal", "suherman-net-infra", ".env"),
  );

  function pick(key) {
    return (
      process.env[key]?.trim() ||
      websiteLocal[key]?.trim() ||
      websiteEnv[key]?.trim() ||
      alocareEnv[key]?.trim() ||
      infraEnv[key]?.trim() ||
      SMTP_DEFAULTS[key] ||
      ""
    );
  }

  const smtpUser =
    websiteEnv.SMTP_USER?.trim() ||
    websiteLocal.SMTP_USER?.trim() ||
    process.env.SMTP_USER?.trim() ||
    SMTP_DEFAULTS.SMTP_USER;

  return {
    SMTP_HOST: pick("SMTP_HOST") || SMTP_DEFAULTS.SMTP_HOST,
    SMTP_PORT: pick("SMTP_PORT") || SMTP_DEFAULTS.SMTP_PORT,
    SMTP_USER: smtpUser,
    SMTP_PASS: pick("SMTP_PASS").replace(/\s+/g, ""),
    EMAIL_FROM_NAME: SMTP_DEFAULTS.EMAIL_FROM_NAME,
    EMAIL_FROM_ADDRESS:
      websiteEnv.EMAIL_FROM_ADDRESS?.trim() ||
      websiteLocal.EMAIL_FROM_ADDRESS?.trim() ||
      process.env.EMAIL_FROM_ADDRESS?.trim() ||
      SMTP_DEFAULTS.EMAIL_FROM_ADDRESS,
  };
}

function requireGhcrDeploy() {
  const candidates = [
    process.env.SUHERMAN_NET_INFRA_ROOT?.trim(),
    path.join(home, "src", "personal", "suherman-net-infra"),
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

function collectRuntimeEnv(projectId, smtp) {
  const notifyEmail =
    process.env.CONTACT_TO_EMAILS?.trim() ||
    process.env.WEBINAR_NOTIFY_EMAIL?.trim() ||
    "iman.suherman@gmail.com";

  if (!smtp.SMTP_USER || !smtp.SMTP_PASS) {
    fail(
      "SMTP_USER/SMTP_PASS missing — set in website/.env.local or ~/src/alocare.ai/alocare-notification-service/.env",
    );
  }

  return {
    GCP_PROJECT_ID: projectId,
    WEBSITE_BASE_URL: process.env.WEBSITE_BASE_URL?.trim() || "https://linuxlens.suherman.net",
    CONTACT_TO_EMAILS: notifyEmail,
    EMAIL_FROM_NAME: smtp.EMAIL_FROM_NAME,
    EMAIL_FROM_ADDRESS: smtp.EMAIL_FROM_ADDRESS,
    SMTP_HOST: smtp.SMTP_HOST,
    SMTP_PORT: smtp.SMTP_PORT,
    SMTP_USER: smtp.SMTP_USER,
    SMTP_PASS: smtp.SMTP_PASS,
  };
}

function writeEnvFile(envMap) {
  const envFile = path.join(os.tmpdir(), `linuxlens-website-env-${process.pid}.yaml`);
  const yaml = Object.entries(envMap)
    .map(([k, v]) => {
      const escaped = String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      return `${k}: "${escaped}"`;
    })
    .join("\n");
  fs.writeFileSync(envFile, `${yaml}\n`, { mode: 0o600 });
  return envFile;
}

function main() {
  loadDotEnv(path.join(root, ".env"));
  loadDotEnv(path.join(websiteDir, ".env.local"));

  const { buildAndPushImage, deployCloudRunImage } = requireGhcrDeploy();
  const projectId = process.env.GCP_PROJECT_ID?.trim() || "personal-suherman";
  const region = process.env.GCP_LOCATION?.trim() || "australia-southeast1";
  const serviceName = process.env.WEBSITE_SERVICE?.trim() || "linuxlens-website";
  process.env.GHCR_OWNER = process.env.GHCR_OWNER?.trim() || "iman-suherman";
  const tag = process.env.GHCR_IMAGE_TAG?.trim() || `ll-${Date.now()}`;
  process.env.GHCR_IMAGE_TAG = tag;

  const smtp = resolveSmtpEnv();
  console.log(
    `deploy:website: SMTP as ${smtp.EMAIL_FROM_NAME} <${smtp.EMAIL_FROM_ADDRESS}> via ${smtp.SMTP_USER}`,
  );

  try {
    const ghcrImage = buildAndPushImage({
      cwd: root,
      contextDir: websiteDir,
      imageName: "linuxlens-website",
      tag,
      logPrefix: "deploy:website",
    });
    const arImage = `${region}-docker.pkg.dev/${projectId}/cloudrun/linuxlens-website:${tag}`;
    const login = spawnSync("gcloud", ["auth", "print-access-token"], {
      encoding: "utf8",
    });
    if (login.status !== 0) fail("gcloud auth print-access-token failed");
    const cli = process.env.CONTAINER_CLI?.trim() || "podman";
    const tagResult = spawnSync(cli, ["tag", ghcrImage, arImage], {
      stdio: "inherit",
    });
    if (tagResult.status !== 0) fail(`${cli} tag failed`);
    const loginAr = spawnSync(
      cli,
      ["login", "-u", "oauth2accesstoken", "--password-stdin", `${region}-docker.pkg.dev`],
      { input: login.stdout, stdio: ["pipe", "inherit", "inherit"] },
    );
    if (loginAr.status !== 0) fail(`${cli} login to Artifact Registry failed`);
    const arPush = spawnSync(cli, ["push", arImage], { stdio: "inherit" });
    if (arPush.status !== 0) fail(`${cli} push to Artifact Registry failed`);

    const runtimeEnv = collectRuntimeEnv(projectId, smtp);
    const envFile = writeEnvFile(runtimeEnv);
    try {
      deployCloudRunImage({
        serviceName,
        image: arImage,
        projectId,
        region,
        gcloudArgs: [
          "--allow-unauthenticated",
          "--quiet",
          "--port",
          "8080",
          "--env-vars-file",
          envFile,
        ],
        logPrefix: "deploy:website",
      });
    } finally {
      try {
        fs.unlinkSync(envFile);
      } catch {
        /* ignore */
      }
    }
    console.log(`deploy:website: done ${serviceName} ← ${arImage}`);
  } catch (error) {
    fail(error.message || String(error));
  }
}

main();
