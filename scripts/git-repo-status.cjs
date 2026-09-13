/**
 * Local git state for sibling LinuxLens repos — used by `npm run ci`.
 * Adapted from formiva-control-plane.
 */

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

function git(repoRoot, args) {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    return { ok: false, stdout: "", stderr: (result.stderr || "").trim() };
  }
  return { ok: true, stdout: result.stdout || "", stderr: "" };
}

function porcelainFilePath(line) {
  const payload = line.slice(3).trim();
  if (!payload) return "";
  const parts = payload.split(" -> ");
  return parts[parts.length - 1].trim();
}

function readRepoGitStatus(repoRoot) {
  if (!fs.existsSync(path.join(repoRoot, ".git"))) {
    return {
      ok: false,
      error: "not a git repository",
      headSha: null,
      headShort: "—",
      branch: null,
      uncommitted: false,
      uncommittedCount: 0,
      uncommittedFiles: [],
      unpushed: 0,
    };
  }

  const head = git(repoRoot, ["rev-parse", "HEAD"]);
  const branch = git(repoRoot, ["rev-parse", "--abbrev-ref", "HEAD"]);
  const porcelain = git(repoRoot, ["-c", "color.ui=never", "status", "--porcelain=v1"]);
  const unpushed = git(repoRoot, ["rev-list", "--count", "@{u}..HEAD"]);

  const uncommittedLines = porcelain.ok
    ? porcelain.stdout.split("\n").filter((line) => line.length > 0)
    : [];

  const unpushedCount =
    unpushed.ok && unpushed.stdout && /^\d+$/.test(unpushed.stdout.trim())
      ? Number.parseInt(unpushed.stdout.trim(), 10)
      : 0;

  const headSha = head.ok ? head.stdout.trim() : null;

  return {
    ok: head.ok,
    error: head.ok ? null : head.stderr || "git rev-parse failed",
    headSha,
    headShort: headSha ? headSha.slice(0, 7) : "—",
    branch: branch.ok ? branch.stdout.trim() : null,
    uncommitted: uncommittedLines.length > 0,
    uncommittedCount: uncommittedLines.length,
    uncommittedFiles: uncommittedLines.map((line) => ({
      code: line.slice(0, 2),
      path: porcelainFilePath(line) || line.slice(3).trim(),
    })),
    unpushed: unpushedCount,
  };
}

module.exports = {
  readRepoGitStatus,
  porcelainFilePath,
};
