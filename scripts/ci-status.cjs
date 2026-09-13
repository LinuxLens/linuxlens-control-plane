#!/usr/bin/env node
/**
 * LinuxLens live dashboard — sibling git dirtiness + public endpoints.
 * Follows formiva-control-plane `npm run ci`.
 *
 * Usage:
 *   npm run ci
 *   npm run ci -- --once
 *   npm run ci -- --interval 10
 */

const {
  STACK_GIT_REPOS,
  PRODUCTION_SERVICES,
  WORKSPACE_ROOT,
  repoExists,
} = require("./stack-config.cjs");
const { readRepoGitStatus } = require("./git-repo-status.cjs");

/** @typedef {{ once: boolean; intervalMs: number }} CiOptions */

/** @type {CiOptions} */
let ciOptions = {
  once: false,
  intervalMs: Number.parseInt(process.env.LINUXLENS_CI_INTERVAL || "10", 10) * 1000,
};

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const wrap =
  (open) =>
  (t) =>
    useColor ? `${open}${t}\x1b[0m` : t;
const green = wrap("\x1b[32m");
const red = wrap("\x1b[31m");
const yellow = wrap("\x1b[33m");
const cyan = wrap("\x1b[36m");
const dim = wrap("\x1b[2m");
const bold = wrap("\x1b[1m");
const boldGreen = (t) => bold(green(t));

const FILE_LIST_CAP = 18;

function parseArgs(argv) {
  let once = false;
  let intervalMs =
    Number.parseInt(process.env.LINUXLENS_CI_INTERVAL || "10", 10) * 1000;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--once") once = true;
    else if (argv[i] === "--interval" && argv[i + 1]) {
      intervalMs = Math.max(1, Number.parseInt(argv[++i], 10) || 2) * 1000;
    } else if (argv[i] === "-h" || argv[i] === "--help") {
      console.log(`Usage: npm run ci [-- --once] [--interval <sec>]

  npm run ci                         live dashboard (Ctrl+C to stop)
  npm run ci:local                   same as npm run ci
  npm run ci -- --once               snapshot and exit
  npm run git:dirty                  list dirty sibling repos (files + unpushed)

  LINUXLENS_CI_INTERVAL=10           idle refresh interval in seconds (default 10)

  Progress table lists every sibling checkout (dirty first, then synced).
`);
      process.exit(0);
    }
  }
  return { once, intervalMs };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function stripAnsi(text) {
  return String(text).replace(/\x1b\[[0-9;]*m/g, "");
}

function plainTruncate(text, width) {
  const plain = stripAnsi(String(text));
  if (width <= 0) return "";
  if (plain.length <= width) return plain;
  if (width === 1) return "…";
  return `${plain.slice(0, width - 1)}…`;
}

function padRenderedCell(rendered, plain, width) {
  return rendered + " ".repeat(Math.max(0, width - plain.length));
}

function summaryContentWidth() {
  const cols = process.stdout.columns || 120;
  return Math.max(72, Math.min(cols - 4, 120));
}

function boxBorderTop(colorFn, borderWidth) {
  return colorFn(`╔${"═".repeat(borderWidth)}╗`);
}

function boxBorderMid(colorFn, borderWidth) {
  return colorFn(`╠${"═".repeat(borderWidth)}╣`);
}

function boxBorderBottom(colorFn, borderWidth) {
  return colorFn(`╚${"═".repeat(borderWidth)}╝`);
}

function boxContentRow(content, inner) {
  const plain = stripAnsi(content);
  if (plain.length <= inner) {
    return `║ ${content}${" ".repeat(inner - plain.length)} ║`;
  }
  const clipped = plainTruncate(plain, inner);
  return `║ ${dim(clipped)}${" ".repeat(inner - clipped.length)} ║`;
}

function buildBoxLines(title, bodyLines, { colorFn = green, inner }) {
  const borderWidth = inner + 2;
  const lines = [
    boxBorderTop(colorFn, borderWidth),
    colorFn(boxContentRow(colorFn(bold(title)), inner)),
    colorFn(boxBorderMid(colorFn, borderWidth)),
  ];
  for (const line of bodyLines) {
    if (line === "") {
      lines.push(colorFn(`║${" ".repeat(borderWidth)}║`));
    } else {
      lines.push(colorFn(boxContentRow(line, inner)));
    }
  }
  lines.push(boxBorderBottom(colorFn, borderWidth));
  return lines;
}

class LiveDashboard {
  constructor() {
    this.enabled = Boolean(process.stdout.isTTY);
    this.started = false;
  }

  rows() {
    return Math.max(32, process.stdout.rows || 48);
  }

  start() {
    if (!this.enabled || this.started) return;
    process.stdout.write("\x1b[?1049h\x1b[2J\x1b[H\x1b[?25l");
    this.started = true;
  }

  stop() {
    if (!this.started) return;
    process.stdout.write("\x1b[?25h\x1b[?1049l");
    this.started = false;
  }

  render({ pinned = [], footer = "" } = {}) {
    if (!this.enabled) {
      for (const line of pinned) console.log(line);
      if (footer) console.log(footer);
      return;
    }

    const rows = this.rows();
    const footerRows = footer ? 1 : 0;
    let pinnedLines = pinned;
    const maxPinnedRows = Math.max(8, rows - footerRows);

    if (pinnedLines.length > maxPinnedRows) {
      const hidden = pinnedLines.length - maxPinnedRows + 1;
      pinnedLines = [
        dim(`… ${hidden} earlier summary line(s) hidden`),
        ...pinnedLines.slice(-(maxPinnedRows - 1)),
      ];
    }

    const pinnedRows = pinnedLines.length;
    /** @type {string[]} */
    const frame = new Array(rows).fill("");
    for (let i = 0; i < pinnedRows && i < rows; i += 1) {
      frame[i] = pinnedLines[i];
    }
    if (footer && rows > 0) {
      frame[rows - 1] = footer;
    }

    process.stdout.write("\x1b[H");
    for (let r = 0; r < rows; r += 1) {
      process.stdout.write("\x1b[2K");
      process.stdout.write(frame[r] ?? "");
      if (r < rows - 1) process.stdout.write("\n");
    }
    process.stdout.write("\x1b[1;1H");
  }
}

function formatLastCheck(date) {
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatHeadPlain(git) {
  if (!git?.ok) return "—";
  let plain = git.headShort || "—";
  if (git.uncommitted) plain = `${plain}*`;
  if (git.unpushed > 0) plain = `${plain}+${git.unpushed}`;
  return plain;
}

function resolvePendingReason(git) {
  const uncommitted = Boolean(git?.uncommitted);
  const unpushed = git?.unpushed > 0;
  if (uncommitted && unpushed) return "both";
  if (uncommitted) return "uncommitted";
  if (unpushed) return "unpushed";
  return null;
}

function pendingReasonNeedsAttention(reason) {
  return reason === "uncommitted" || reason === "both" || reason === "unpushed";
}

function inspectStackRepos() {
  return STACK_GIT_REPOS.map((repo) => {
    const exists = repoExists(repo.root);
    const git = exists ? readRepoGitStatus(repo.root) : null;
    const pendingReason = git?.ok ? resolvePendingReason(git) : null;
    return {
      ...repo,
      exists,
      git,
      pendingReason,
      pending: pendingReasonNeedsAttention(pendingReason),
    };
  });
}

function gitByRepoId(rows) {
  /** @type {Map<string, object>} */
  const map = new Map();
  for (const row of rows) map.set(row.id, row);
  return map;
}

function fitColumnWidths(widths, mins, maxWidth, sepCount, sepLen = 2) {
  const sepTotal = sepLen * sepCount;
  const next = [...widths];
  let total = next.reduce((sum, w) => sum + w, 0) + sepTotal;
  if (total <= maxWidth) return next;

  const order = next.map((_, i) => i).sort((a, b) => next[b] - next[a] || a - b);
  while (total > maxWidth) {
    let shrunk = false;
    for (const i of order) {
      if (next[i] > mins[i]) {
        next[i] -= 1;
        total -= 1;
        shrunk = true;
        if (total <= maxWidth) break;
      }
    }
    if (!shrunk) break;
  }
  return next;
}

function renderTableCell(rendered, plain, width) {
  const clipped = plainTruncate(plain, width);
  if (clipped === plain) return padRenderedCell(rendered, plain, width);
  return padRenderedCell(dim(clipped), clipped, width);
}

function buildEndpointTableLines(repoRows, maxWidth) {
  const byId = gitByRepoId(repoRows);
  const sep = "  ";
  const tableRows = PRODUCTION_SERVICES.map((service) => {
    const repo = byId.get(service.repoId);
    const git = repo?.git;
    const urlPlain = service.publicUrl || `Cloud Run ${service.cloudRunService}`;
    const headPlain = formatHeadPlain(git);
    const dirty = Boolean(git?.uncommitted || git?.unpushed);
    const missing = !repo?.exists;
    const statusPlain = missing ? "missing" : dirty ? "dirty" : "synced";

    return {
      servicePlain: service.label,
      serviceRendered: missing ? dim(service.label) : dirty ? yellow(service.label) : green(service.label),
      urlPlain,
      urlRendered: cyan(urlPlain),
      statusPlain,
      statusRendered:
        statusPlain === "synced"
          ? boldGreen(statusPlain)
          : statusPlain === "dirty"
            ? yellow(statusPlain)
            : dim(statusPlain),
      headPlain,
      headRendered: dirty ? yellow(headPlain) : missing ? dim("—") : green(headPlain),
    };
  });

  const mins = [12, 22, 8, 8];
  const natural = [
    Math.max(7, "Service".length, ...tableRows.map((r) => r.servicePlain.length)),
    Math.max(mins[1], "URL".length, ...tableRows.map((r) => r.urlPlain.length)),
    Math.max(mins[2], "Status".length, ...tableRows.map((r) => r.statusPlain.length)),
    Math.max(mins[3], "HEAD".length, ...tableRows.map((r) => r.headPlain.length)),
  ];
  const [serviceW, urlW, statusW, headW] = fitColumnWidths(
    natural,
    mins,
    maxWidth,
    3,
    sep.length,
  );

  const header = [
    bold("Service".padEnd(serviceW)),
    bold("URL".padEnd(urlW)),
    bold("Status".padEnd(statusW)),
    bold("HEAD".padEnd(headW)),
  ].join(sep);
  const divider = [
    dim("-".repeat(serviceW)),
    dim("-".repeat(urlW)),
    dim("-".repeat(statusW)),
    dim("-".repeat(headW)),
  ].join(sep);
  const body = tableRows.map((row) =>
    [
      renderTableCell(row.serviceRendered, row.servicePlain, serviceW),
      renderTableCell(row.urlRendered, row.urlPlain, urlW),
      renderTableCell(row.statusRendered, row.statusPlain, statusW),
      renderTableCell(row.headRendered, row.headPlain, headW),
    ].join(sep),
  );

  return [
    dim("* uncommitted = dirty working tree  ·  +N = unpushed commits"),
    "",
    header,
    divider,
    ...body,
  ];
}

function progressStatusText(row) {
  if (!row.exists) return { text: "not cloned", color: dim, rank: 9 };
  if (!row.git?.ok) return { text: row.git?.error || "git error", color: red, rank: 2 };
  if (row.pendingReason === "both") {
    return {
      text: `uncommitted (${row.git.uncommittedCount} file${row.git.uncommittedCount === 1 ? "" : "s"}) +${row.git.unpushed}`,
      color: yellow,
      rank: 4,
    };
  }
  if (row.pendingReason === "uncommitted") {
    return {
      text: `uncommitted (${row.git.uncommittedCount} file${row.git.uncommittedCount === 1 ? "" : "s"})`,
      color: yellow,
      rank: 5,
    };
  }
  if (row.pendingReason === "unpushed") {
    return {
      text: `unpushed (${row.git.unpushed} commits)`,
      color: yellow,
      rank: 6,
    };
  }
  return { text: "synced", color: green, rank: 99 };
}

function buildProgressTableLines(repoRows, maxWidth) {
  const attention = repoRows
    .map((row) => ({ row, state: progressStatusText(row) }))
    .sort((a, b) => a.state.rank - b.state.rank || a.row.id.localeCompare(b.row.id));

  if (attention.length === 0) {
    return [green("All sibling repos clean and synced.")];
  }

  const sep = "  ";
  const statusW = 36;
  const headW = 12;
  const targetW = Math.max(14, maxWidth - statusW - headW - sep.length * 2);

  const header = [
    bold("Target".padEnd(targetW)),
    bold("Status".padEnd(statusW)),
    bold("HEAD".padEnd(headW)),
  ].join(sep);
  const divider = [
    dim("-".repeat(targetW)),
    dim("-".repeat(statusW)),
    dim("-".repeat(headW)),
  ].join(sep);

  const body = [];
  let filesShown = 0;
  for (const { row, state } of attention) {
    const targetPlain = row.id;
    const headPlain = formatHeadPlain(row.git);
    body.push(
      [
        renderTableCell(state.color(targetPlain), targetPlain, targetW),
        renderTableCell(state.color(state.text), state.text, statusW),
        renderTableCell(state.color(headPlain), headPlain, headW),
      ].join(sep),
    );

    const files = row.git?.uncommittedFiles || [];
    const remaining = Math.max(0, FILE_LIST_CAP - filesShown);
    const shown = files.slice(0, remaining);
    for (const file of shown) {
      const line = `  ${file.code} ${file.path}`;
      body.push(yellow(plainTruncate(line, maxWidth)));
    }
    filesShown += shown.length;
    if (files.length > shown.length) {
      body.push(dim(`  … ${files.length - shown.length} more files`));
    }
  }

  return [header, divider, ...body];
}

function countPending(repoRows) {
  const uncommitted = repoRows.filter((r) => r.git?.uncommitted);
  const unpushed = repoRows.filter((r) => r.git?.unpushed > 0);
  const missing = repoRows.filter((r) => !r.exists);
  return {
    uncommitted: uncommitted.length,
    unpushed: unpushed.length,
    missing: missing.length,
    pending: repoRows.filter((r) => r.pending).length,
  };
}

function statusBoxColor(counts) {
  if (counts.uncommitted > 0 || counts.unpushed > 0) return yellow;
  return green;
}

function buildProgressFooterLines(counts) {
  const lines = [];
  if (counts.uncommitted > 0) {
    lines.push(yellow(`${counts.uncommitted} repo(s) have uncommitted changes`));
    lines.push(cyan("→ commit & push dirty siblings"));
  }
  if (counts.unpushed > 0 && counts.uncommitted === 0) {
    lines.push(yellow(`${counts.unpushed} repo(s) have unpushed commits`));
  }
  if (counts.missing > 0) {
    lines.push(dim(`${counts.missing} expected sibling repo(s) not cloned`));
  }
  return lines;
}

function buildEndpointsBoxLines(repoRows) {
  const inner = summaryContentWidth();
  const counts = countPending(repoRows);
  const bodyLines = [
    dim(`Workspace: ${WORKSPACE_ROOT}`),
    dim(ciOptions.once ? "Snapshot" : "Ctrl+C to stop watching"),
    "",
    ...buildEndpointTableLines(repoRows, inner),
  ];
  return buildBoxLines("LinuxLens — public endpoints", bodyLines, {
    colorFn: statusBoxColor(counts),
    inner,
  });
}

function buildProgressBoxLines(repoRows) {
  const inner = summaryContentWidth();
  const counts = countPending(repoRows);
  const footer = buildProgressFooterLines(counts);
  const bodyLines = [
    dim("▸ * uncommitted = dirty working tree  ·  +N = unpushed commits"),
    "",
    ...buildProgressTableLines(repoRows, inner),
  ];
  if (footer.length > 0) {
    bodyLines.push("");
    bodyLines.push(...footer);
  }
  return buildBoxLines("Deploy progress — sibling repos", bodyLines, {
    colorFn: statusBoxColor(counts),
    inner,
  });
}

function buildPinnedDashboardLines(repoRows) {
  return [...buildEndpointsBoxLines(repoRows), "", ...buildProgressBoxLines(repoRows)];
}

function waitFooterMessage({ counts, remaining, lastCheckLabel }) {
  if (counts.uncommitted > 0) {
    return dim(
      `Watching · ${counts.uncommitted} dirty · recheck in ${remaining}s · last check ${lastCheckLabel} · Ctrl+C to stop`,
    );
  }
  return dim(
    `Watching for git changes · recheck in ${remaining}s · last check ${lastCheckLabel} · Ctrl+C to stop`,
  );
}

async function waitForNextCheck({
  intervalMs,
  dashboard,
  renderFrame,
  lastCheckAt,
  counts,
}) {
  const seconds = Math.max(1, Math.round(intervalMs / 1000));
  const lastCheckLabel = formatLastCheck(lastCheckAt);

  if (!dashboard?.enabled) {
    console.log(waitFooterMessage({ counts, remaining: seconds, lastCheckLabel }));
    await sleep(intervalMs);
    return;
  }

  for (let remaining = seconds; remaining > 0; remaining -= 1) {
    renderFrame(waitFooterMessage({ counts, remaining, lastCheckLabel }));
    await sleep(1000);
  }
}

async function main() {
  ciOptions = parseArgs(process.argv.slice(2));
  const { once, intervalMs } = ciOptions;
  const dashboard = new LiveDashboard();

  const useLive = process.stdout.isTTY && !once;

  process.on("SIGINT", () => {
    dashboard.stop();
    console.log(dim("\nStopped watching. Run npm run ci again anytime."));
    process.exit(0);
  });

  if (useLive) {
    dashboard.start();
    dashboard.render({
      pinned: buildBoxLines(
        "LinuxLens — public endpoints",
        [yellow("⟳ Loading…"), "", dim("Reading git status…")],
        { colorFn: yellow, inner: summaryContentWidth() },
      ),
      footer: dim("Loading · Ctrl+C to stop"),
    });
  }

  let lastCheckAt = new Date();

  while (true) {
    lastCheckAt = new Date();
    const repoRows = inspectStackRepos();
    const counts = countPending(repoRows);

    const renderFrame = (footer = "") => {
      dashboard.render({
        pinned: buildPinnedDashboardLines(repoRows),
        footer,
      });
    };

    if (useLive) {
      const seconds = Math.max(1, Math.round(intervalMs / 1000));
      renderFrame(
        waitFooterMessage({
          counts,
          remaining: seconds,
          lastCheckLabel: formatLastCheck(lastCheckAt),
        }),
      );
    } else {
      for (const line of buildPinnedDashboardLines(repoRows)) {
        console.log(line);
      }
      process.exit(counts.pending > 0 ? 1 : 0);
    }

    await waitForNextCheck({
      intervalMs,
      dashboard: process.stdout.isTTY ? dashboard : null,
      renderFrame,
      lastCheckAt,
      counts,
    });
  }
}

main().catch((err) => {
  console.error(red(`ci-status: ${err.message || err}`));
  process.exit(1);
});
