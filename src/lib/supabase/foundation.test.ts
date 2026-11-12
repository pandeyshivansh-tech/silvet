import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CATEGORIES, COLORS, OCCASIONS, PATTERNS, SEASONS, STYLES, SUBCATEGORIES } from "@/domain/taxonomy";
import { validateSupabaseConfig } from "./config";
import { wardrobeImagePaths, WARDROBE_BUCKET } from "./storagePaths";

const createClient = vi.hoisted(() => vi.fn(() => ({ testClient: true })));
vi.mock("@supabase/supabase-js", () => ({ createClient }));
const env = { VITE_SUPABASE_URL: "https://example.supabase.co", VITE_SUPABASE_ANON_KEY: "sb_publishable_test_only" };
const legacy = (role: string) => `e30.${btoa(JSON.stringify({ role })).replace(/=+$/, "")}.test`;
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); createClient.mockClear(); });

describe("public Supabase environment validation", () => {
  it("accepts the modern publishable key under the existing ANON_KEY name", () => {
    expect(validateSupabaseConfig(env)).toEqual({ url: env.VITE_SUPABASE_URL, publicKey: env.VITE_SUPABASE_ANON_KEY });
  });
  it("supports a legacy anon key without requiring one", () => {
    expect(validateSupabaseConfig({ ...env, VITE_SUPABASE_ANON_KEY: legacy("anon") }).publicKey).toBe(legacy("anon"));
  });
  it.each(["sb_secret_test", legacy("service_role"), legacy("authenticated"), "invalid", "e30.bad.test"])("rejects elevated or invalid key type %# without echoing input", (key) => {
    let message = "";
    try { validateSupabaseConfig({ ...env, VITE_SUPABASE_ANON_KEY: key }); }
    catch (error) { message = (error as Error).message; }
    expect(message).toContain("forbidden");
    expect(message).not.toContain(key);
  });
  it.each([
    {}, { VITE_SUPABASE_URL: "" }, { VITE_SUPABASE_ANON_KEY: "" },
    { VITE_SUPABASE_URL: undefined }, { VITE_SUPABASE_ANON_KEY: 123 },
  ])("fails explicitly on missing configuration %#", (override) => {
    const input = Object.keys(override).length ? { ...env, ...override } : {};
    expect(() => validateSupabaseConfig(input)).toThrow(/requires/);
  });
  it.each([
    "not-a-url", "http://example.supabase.co", "ftp://example.supabase.co",
    "https://example.supabase.co/anything", "https://example.supabase.co?key=no",
    "https://example.supabase.co#token", "https://user:password@example.supabase.co",
  ])("rejects unsafe or malformed project URLs %#", (url) => {
    expect(() => validateSupabaseConfig({ ...env, VITE_SUPABASE_URL: url })).toThrow(/VITE_SUPABASE_URL/);
  });
  it("normalizes whitespace/trailing slash and permits an explicit local development URL", () => {
    expect(validateSupabaseConfig({ ...env, VITE_SUPABASE_URL: " https://example.supabase.co/ " }).url).toBe(env.VITE_SUPABASE_URL);
    expect(validateSupabaseConfig({ ...env, VITE_SUPABASE_URL: "http://127.0.0.1:54321" }).url).toBe("http://127.0.0.1:54321");
  });
  it("does not initialize on import, then lazily creates a typed singleton with no auth-header override", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", env.VITE_SUPABASE_URL);
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", env.VITE_SUPABASE_ANON_KEY);
    const { getSupabaseClient } = await import("./client");
    expect(createClient).not.toHaveBeenCalled();
    expect(getSupabaseClient()).toBe(getSupabaseClient());
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledWith(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
      auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: "silvet.auth.v1" },
    });
  });
  it("does not construct a client with an elevated key", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", env.VITE_SUPABASE_URL);
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "sb_secret_test_only");
    const { getSupabaseClient } = await import("./client");
    expect(() => getSupabaseClient()).toThrow(/forbidden/);
    expect(createClient).not.toHaveBeenCalled();
  });
});

describe("storage object keys", () => {
  const userId = "00000000-0000-4000-8000-000000000001";
  const itemId = "00000000-0000-4000-8000-000000000101";
  it("creates owner/item-scoped object keys, not signed or public URLs", () => {
    expect(WARDROBE_BUCKET).toBe("wardrobe-images");
    expect(wardrobeImagePaths(userId, itemId)).toEqual({
      path: `${userId}/${itemId}/full.webp`, thumbPath: `${userId}/${itemId}/thumb.webp`,
    });
  });
  it.each(["../other", "https://example.com", "not-a-user", "", "user/other"])("rejects path injection %#", (id) => {
    expect(() => wardrobeImagePaths(id, itemId)).toThrow(/UUID/);
    expect(() => wardrobeImagePaths(userId, id)).toThrow(/UUID/);
  });
});

describe("schema/domain parity (SQL execution is verified separately)", () => {
  const seed = readFileSync("supabase/migrations/202611120002_clothing_metadata.sql", "utf8");
  const documents = [...seed.matchAll(/'(\{[^']*\})'::jsonb/g)].map((match) => JSON.parse(match[1]!) as Record<string, unknown>);
  it("keeps category slots identical to the current taxonomy", () => {
    expect(documents[0]).toEqual(Object.fromEntries(CATEGORIES.map((category) => [category.slug, category.defaultSlot])));
  });
  it("keeps all Indian, Western and accessory subcategories under their real categories", () => {
    expect(documents[1]).toEqual(Object.fromEntries(CATEGORIES.map((category) => [
      category.slug, SUBCATEGORIES.filter((sub) => sub.categorySlug === category.slug).map((sub) => sub.slug),
    ])));
    for (const sub of SUBCATEGORIES) expect(sub.slot).toBe(CATEGORIES.find((category) => category.slug === sub.categorySlug)!.defaultSlot);
  });
  it("keeps every colour, pattern, style, occasion and season in sync", () => {
    expect(documents[2]).toEqual({
      color: COLORS.map((value) => value.slug), pattern: PATTERNS.map((value) => value.slug),
      style: STYLES.map((value) => value.slug), occasion: OCCASIONS.map((value) => value.slug),
      season: SEASONS.map((value) => value.slug),
    });
  });
  it("keeps the demo independent of live data and preserves explicit callback handling", () => {
    expect(readFileSync("src/app/layouts.tsx", "utf8")).toContain("new DemoRepository()");
    expect(readFileSync("src/app/layouts.tsx", "utf8")).not.toContain("new SupabaseRepository");
    expect(readFileSync("src/lib/supabase/client.ts", "utf8")).toContain("detectSessionInUrl: false");
  });
});
