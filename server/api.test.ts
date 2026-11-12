import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createServer, type Server } from "node:http";
import { createApiHandler, createVerifier } from "./api";
import { ImportError } from "./errors";
import type { Resource } from "./safeFetch";

let server: Server;
let origin: string;
const verify = vi.fn(async (token: string) => {
  if (token === "expired") throw new ImportError("unauthenticated", "Please sign in again.", 401);
  return { id: token === "second-user" ? "user-b" : "user-a", verified: token !== "unverified" };
});
const download = vi.fn(async (url: string, kind: "html" | "image"): Promise<Resource> => ({
  url, type: kind === "html" ? "text/html" : "image/png",
  bytes: kind === "html" ? Buffer.from('<meta property="og:title" content="Imported jeans">') : Buffer.from("fixture-image"),
}));
beforeEach(async () => {
  vi.clearAllMocks();
  const handler = createApiHandler({ verify, download });
  server = createServer((req, res) => { void handler(req, res).then((handled) => { if (!handled) { res.writeHead(404); res.end(); } }); });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing test address");
  origin = `http://127.0.0.1:${address.port}`;
});
afterEach(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  vi.restoreAllMocks();
});
function post(path = "extract", token = "valid-token", value: unknown = { url: "https://store.com/p" }) {
  return fetch(`${origin}/api/product-import/${path}`, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(value) });
}
describe("protected same-origin product API", () => {
  it("exposes only a non-sensitive health response without auth", async () => {
    expect(await (await fetch(`${origin}/api/health`)).json()).toEqual({ ok: true });
  });
  it("rejects unauthenticated requests before downloads", async () => {
    expect((await post("extract", "")).status).toBe(401);
    expect(download).not.toHaveBeenCalled(); expect(verify).not.toHaveBeenCalled();
  });
  it.each(["expired", "unverified"])("rejects %s sessions", async (token) => {
    expect((await post("extract", token)).status).toBe(401);
    expect(download).not.toHaveBeenCalled();
  });
  it("verifies bearer credentials server-side before extraction", async () => {
    const result = await post();
    expect(result.status).toBe(200); expect(verify).toHaveBeenCalledWith("valid-token");
    expect(await result.json()).toMatchObject({ title: "Imported jeans", productUrl: "https://store.com/p", brand: null });
    expect(result.headers.get("cache-control")).toBe("no-store");
  });
  it("returns image bytes, not a permanently hotlinked wardrobe record", async () => {
    const result = await post("image");
    expect(result.status).toBe(200); expect(result.headers.get("content-type")).toBe("image/png");
    expect(result.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await result.text()).toBe("fixture-image");
  });
  it("rejects cross-origin browser requests", async () => {
    const result = await fetch(`${origin}/api/product-import/extract`, { method: "POST", headers: { Origin: "https://attacker.com" } });
    expect(result.status).toBe(403); expect(download).not.toHaveBeenCalled();
  });
  it("does not accept cookies instead of a verified bearer token", async () => {
    const result = await fetch(`${origin}/api/product-import/extract`, { method: "POST", headers: { Cookie: "session=forged" } });
    expect(result.status).toBe(401);
  });
  it.each([{}, { url: 42 }, null])("rejects malformed input %j", async (value) => {
    expect((await post("extract", "valid-token", value)).status).toBe(400);
    expect(download).not.toHaveBeenCalled();
  });
  it("bounds input size", async () => {
    expect((await post("extract", "valid-token", { url: "a".repeat(9000) })).status).toBe(413);
    expect(download).not.toHaveBeenCalled();
  });
  it("returns safe structured extraction errors", async () => {
    download.mockRejectedValueOnce(new ImportError("blocked_url", "Private URLs are blocked."));
    expect(await (await post()).json()).toEqual({ code: "blocked_url", message: "Private URLs are blocked." });
  });
  it("does not expose unexpected exception details", async () => {
    download.mockRejectedValueOnce(new Error("sensitive infrastructure exception"));
    const result = await post(); expect(result.status).toBe(503);
    expect(await result.text()).not.toContain("sensitive");
  });
  it("rate-limits one account without blocking another account", async () => {
    for (let n = 0; n < 30; n++) expect((await post()).status).toBe(200);
    expect((await post()).status).toBe(429);
    expect((await post("extract", "second-user")).status).toBe(200);
  });
  it("rejects wrong methods and unknown API routes rather than serving SPA HTML", async () => {
    expect((await fetch(`${origin}/api/product-import/extract`)).status).toBe(405);
    expect((await fetch(`${origin}/api/missing`)).status).toBe(404);
  });
});
describe("Supabase server token verification", () => {
  const env = { VITE_SUPABASE_URL: "https://project.supabase.co", VITE_SUPABASE_ANON_KEY: "sb_publishable_synthetic" };
  it("asks the configured Auth server to verify the token without trusting decoded claims", async () => {
    const request = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ id: "verified-user", email_confirmed_at: "2026-11-12" })));
    expect(await createVerifier(env)("synthetic-access-token")).toEqual({ id: "verified-user", verified: true });
    expect(request).toHaveBeenCalledWith("https://project.supabase.co/auth/v1/user", expect.objectContaining({
      headers: { apikey: "sb_publishable_synthetic", Authorization: "Bearer synthetic-access-token" }, redirect: "error",
    }));
  });
  it("rejects invalid or expired hosted tokens", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 401 }));
    await expect(createVerifier(env)("expired")).rejects.toMatchObject({ status: 401 });
  });
  it("fails closed during auth network failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));
    await expect(createVerifier(env)("token")).rejects.toMatchObject({ status: 503 });
  });
  it("marks an unconfirmed user unverified", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ id: "a", email_confirmed_at: null })));
    expect((await createVerifier(env)("token")).verified).toBe(false);
  });
  it("rejects service-role configuration rather than forwarding it", async () => {
    await expect(createVerifier({ ...env, VITE_SUPABASE_ANON_KEY: "sb_secret_forbidden" })("token")).rejects.toThrow("forbidden");
  });
});
