import type { IncomingMessage, ServerResponse } from "node:http";
import { validateSupabaseConfig } from "../src/lib/supabase/config.js";
import { fetchPublic, type Resource } from "./safeFetch.js";
import { extractMetadata } from "./metadata.js";
import { ImportError } from "./errors.js";

export type Verify = (token: string) => Promise<{ id: string; verified: boolean }>;
export function createVerifier(env: Record<string, unknown>): Verify {
  return async (token) => {
    const config = validateSupabaseConfig(env);
    let response: Response;
    try {
      // Supabase Auth verifies signature, expiry, project and current user. Do not
      // trust locally decoded JWT claims and do not use a service-role credential.
      response = await fetch(`${config.url}/auth/v1/user`, {
        headers: { apikey: config.publicKey, Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(7000), redirect: "error",
      });
    } catch { throw new ImportError("auth_unavailable", "We could not verify your session. Please retry.", 503); }
    if (!response.ok) throw new ImportError("unauthenticated", "Please sign in again before importing.", 401);
    const user: unknown = await response.json();
    if (!user || typeof user !== "object" || !("id" in user) || typeof user.id !== "string")
      throw new ImportError("unauthenticated", "Please sign in again before importing.", 401);
    return { id: user.id, verified: "email_confirmed_at" in user && Boolean(user.email_confirmed_at) };
  };
}

async function body(req: IncomingMessage): Promise<unknown> {
  if (!req.headers["content-type"]?.startsWith("application/json"))
    throw new ImportError("invalid_request", "Send the product URL as JSON.", 415);
  if (Number(req.headers["content-length"]) > 8192) throw new ImportError("invalid_request", "The request is too large.", 413);
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 8192) throw new ImportError("invalid_request", "The request is too large.", 413);
    chunks.push(Buffer.from(chunk));
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new ImportError("invalid_request", "Enter a product URL."); }
}

export function createApiHandler(options: {
  verify: Verify;
  download?: (url: string, kind: "html" | "image", signal?: AbortSignal) => Promise<Resource>;
}) {
  const windows = new Map<string, { start: number; count: number; active: number }>();
  let active = 0;
  let verifying = 0;
  return async (req: IncomingMessage, res: ServerResponse): Promise<boolean> => {
    const path = (req.url ?? "").split("?")[0];
    if (!path?.startsWith("/api/")) return false;
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    const send = (status: number, payload: unknown) => {
      if (res.destroyed) return;
      res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(payload));
    };
    if (path === "/api/health" && req.method === "GET") { send(200, { ok: true }); return true; }
    const controller = new AbortController();
    const disconnect = () => { if (!res.writableEnded) controller.abort(); };
    res.on("close", disconnect);
    const requestTimer = setTimeout(() => {
      controller.abort();
      if (!res.headersSent) send(408, { code: "timeout", message: "The request timed out." });
      if (!req.complete) req.destroy();
    }, 20000);
    let window: { start: number; count: number; active: number } | undefined;
    try {
      if (!["/api/product-import/extract", "/api/product-import/image"].includes(path))
        throw new ImportError("not_found", "API endpoint not found.", 404);
      if (req.method !== "POST") throw new ImportError("method", "Use POST for product imports.", 405);
      if (req.headers.origin) {
        let origin: URL;
        try { origin = new URL(req.headers.origin); } catch { throw new ImportError("origin", "This request origin is not allowed.", 403); }
        if (origin.host !== req.headers.host) throw new ImportError("origin", "This request origin is not allowed.", 403);
      }
      const authorization = req.headers.authorization;
      if (!authorization || !/^Bearer [A-Za-z0-9._~-]+$/.test(authorization) || authorization.length > 8192)
        throw new ImportError("unauthenticated", "Sign in to import a product.", 401);
      if (verifying >= 16) throw new ImportError("rate_limit", "The importer is busy. Please retry shortly.", 429);
      verifying++;
      let user: Awaited<ReturnType<Verify>>;
      try { user = await options.verify(authorization.slice(7)); }
      finally { verifying--; }
      if (!user.verified) throw new ImportError("unauthenticated", "Verify your email before importing.", 401);
      const now = Date.now();
      for (const [id, entry] of windows) if (now - entry.start >= 60000 && entry.active === 0) windows.delete(id);
      const previous = windows.get(user.id);
      if (active >= 8 || (previous?.active ?? 0) >= 2 || (previous?.count ?? 0) >= 30 || (!previous && windows.size >= 5000))
        throw new ImportError("rate_limit", "Too many imports. Please wait a minute and retry.", 429);
      window = previous ?? { start: now, count: 0, active: 0 };
      windows.set(user.id, window); window.count++; window.active++; active++;
      const input = await body(req);
      if (!input || typeof input !== "object" || !("url" in input) || typeof input.url !== "string")
        throw new ImportError("invalid_url", "Enter a valid HTTP or HTTPS product URL.");
      if (controller.signal.aborted) return true;
      const kind = path.endsWith("/image") ? "image" : "html";
      const result = await (options.download ?? ((url, type, signal) => fetchPublic(url, type, { signal })))(input.url, kind, controller.signal);
      // Do not write after disconnect or a request deadline.
      if (controller.signal.aborted || res.destroyed || res.writableEnded) return true;
      if (kind === "html") send(200, extractMetadata(result.bytes.toString("utf8"), result.url));
      else {
        res.writeHead(200, { "Content-Type": result.type, "Content-Length": result.bytes.length, "Content-Disposition": "attachment; filename=product-image" });
        res.end(result.bytes);
      }
    } catch (error) {
      if (!res.headersSent && !res.destroyed) {
        const safe = error instanceof ImportError ? error : new ImportError("unavailable", "Product import is temporarily unavailable. You can still enter details manually.", 503);
        send(safe.status, { code: safe.code, message: safe.message });
      }
      // Never log tokens, request URLs, page bodies or auth responses.
    } finally {
      clearTimeout(requestTimer);
      res.off("close", disconnect);
      if (window) { window.active--; active--; }
    }
    return true;
  };
}
