#!/usr/bin/env node
/**
 * List LinuxLens sibling git repos that need commit/push: uncommitted and/or unpushed.
 *
 *   npm run git:dirty
 *   node scripts/list-dirty-stack-repos.cjs --json
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { STACK_GIT_REPOS } = require("./stack-config.cjs");
const { readRepoGitStatus } = require("./git-repo-status.cjs");

const asJson = process.argv.includes("--json");

function listDirtyStackRepos() {
  const dirty = [];
  for (const { id, root, label } of STACK_GIT_REPOS) {
    const resolved = path.resolve(root);
    if (!fs.existsSync(resolved)) continue;
    const status = readRepoGitStatus(resolved);
    if (!status.ok) continue;
    if (!status.uncommitted && !(status.unpushed > 0)) continue;
    dirty.push({
      id,
      label,
      root: resolved,
      branch: status.branch,
      headShort: status.headShort,
      uncommitted: status.uncommitted,
      uncommittedCount: status.uncommittedCount,
      uncommittedFiles: status.uncommittedFiles,
      unpushed: status.unpushed,
    });
  }
  return dirty;
}

const dirty = listDirtyStackRepos();

if (asJson) {
  process.stdout.write(`${JSON.stringify({ dirty, count: dirty.length }, null, 2)}\n`);
  process.exit(0);
}

if (dirty.length === 0) {
  console.log("No dirty LinuxLens repos (clean and up to date with upstream).");
  process.exit(0);
}

console.log(`${dirty.length} dirty LinuxLens repo(s) for /push:\n`);
for (const row of dirty) {
  const bits = [];
  if (row.uncommitted) bits.push(`${row.uncommittedCount} uncommitted`);
  if (row.unpushed > 0) bits.push(`${row.unpushed} unpushed`);
  console.log(`- ${row.id}  ${row.branch || "?"}@${row.headShort}  (${bits.join(", ")})`);
  console.log(`  ${row.root}`);
  for (const file of row.uncommittedFiles.slice(0, 20)) {
    console.log(`    ${file.code} ${file.path}`);
  }
  if (row.uncommittedFiles.length > 20) {
    console.log(`    … ${row.uncommittedFiles.length - 20} more`);
  }
}

module.exports = { listDirtyStackRepos };
