import { createHash, randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleContact } from "./lib/contact.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8080);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".md": "text/markdown; charset=utf-8",
  ".sh": "text/x-shellscript; charset=utf-8",
  ".gz": "application/gzip",
  ".txt": "text/plain; charset=utf-8",
};

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store",
  });
  res.end(payload);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

function safePublicPath(urlPath) {
  let decoded = decodeURIComponent(urlPath.split("?")[0] || "/");
  if (decoded === "/") decoded = "/index.html";
  const resolved = path.normalize(path.join(ROOT, decoded));
  if (!resolved.startsWith(ROOT)) return null;
  // Do not serve server source or node_modules
  const rel = path.relative(ROOT, resolved);
  if (
    rel.startsWith("node_modules") ||
    rel.startsWith("lib") ||
    rel === "server.mjs" ||
    rel === "package.json" ||
    rel === "package-lock.json" ||
    rel === "Dockerfile" ||
    rel.startsWith(".")
  ) {
    return null;
  }
  return resolved;
}

function serveStatic(req, res, urlPath) {
  const filePath = safePublicPath(urlPath);
  if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
    sendJson(res, 404, { error: "Not found" });
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";
  const cache =
    ext === ".html" || ext === ".md" || ext === ".sh"
      ? "no-cache"
      : "public, max-age=604800";
  res.writeHead(200, {
    "Content-Type": type,
    "Cache-Control": cache,
  });
  createReadStream(filePath).pipe(res);
}

function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length) {
    return forwarded.split(",")[0].trim();
  }
  return req.headers["x-real-ip"] || req.socket.remoteAddress || null;
}

export function hashIp(ip) {
  if (!ip) return undefined;
  return createHash("sha256").update(String(ip)).digest("hex").slice(0, 32);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (req.method === "OPTIONS" && url.pathname === "/api/contact") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      });
      res.end();
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/contact") {
      let body;
      try {
        body = await readJson(req);
      } catch {
        sendJson(res, 400, { error: "Invalid JSON" });
        return;
      }
      const result = await handleContact({
        body,
        userAgent: req.headers["user-agent"] || undefined,
        ipHash: hashIp(clientIp(req)),
        requestId: randomUUID(),
      });
      sendJson(res, result.status, result.body);
      return;
    }

    if (req.method === "GET" || req.method === "HEAD") {
      if (req.method === "HEAD") {
        const filePath = safePublicPath(url.pathname);
        if (!filePath || !existsSync(filePath)) {
          res.writeHead(404);
          res.end();
          return;
        }
        res.writeHead(200);
        res.end();
        return;
      }
      serveStatic(req, res, url.pathname);
      return;
    }

    sendJson(res, 405, { error: "Method not allowed" });
  } catch (err) {
    console.error("[server] unhandled:", err);
    sendJson(res, 500, { error: "Internal server error" });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`linuxlens-website listening on :${PORT}`);
});
