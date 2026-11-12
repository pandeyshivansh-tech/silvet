import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { createApiHandler, createVerifier } from "./api.js";

const root = resolve("dist");
const api = createApiHandler({ verify: createVerifier(process.env) });
const types: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp",
  ".jpg": "image/jpeg", ".ico": "image/x-icon", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json" };
const server = createServer({ maxHeaderSize: 16384, requestTimeout: 25000, headersTimeout: 10000 }, async (req, res) => {
  try {
    if (await api(req, res)) return;
    if (!["GET", "HEAD"].includes(req.method ?? "")) { res.writeHead(405); res.end(); return; }
    const pathname = decodeURIComponent(new URL(req.url ?? "/", "http://app").pathname);
    let file = resolve(root, `.${pathname}`);
    if ((file !== root && !file.startsWith(`${root}${sep}`)) || pathname.split("/").some((part) => part.startsWith("."))) {
      res.writeHead(404); res.end(); return;
    }
    let info = await stat(file).catch(() => null);
    if (!info?.isFile()) {
      // Missing assets are never rewritten to HTML. Only extensionless SPA routes.
      if (extname(pathname)) { res.writeHead(404); res.end(); return; }
      file = resolve(root, "index.html"); info = await stat(file);
    }
    res.writeHead(200, { "Content-Type": types[extname(file)] ?? "application/octet-stream",
      "Content-Length": info.size, "X-Content-Type-Options": "nosniff",
      "Cache-Control": file.includes(`${sep}assets${sep}`) ? "public,max-age=31536000,immutable" : "no-cache" });
    if (req.method === "HEAD") res.end();
    else createReadStream(file).on("error", () => res.destroy()).pipe(res);
  } catch { if (!res.headersSent) res.writeHead(500); res.end("Request failed"); }
});
server.listen(Number(process.env.PORT ?? 5000), "0.0.0.0", () => console.info("SILVET frontend and API server ready."));
