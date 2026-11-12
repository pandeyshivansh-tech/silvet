import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, OutfitItemRow, SavedOutfitRow, WardrobeItemRow } from "@/lib/supabase/database.types";
import { itemInputSchema } from "@/domain/schemas";
import { SupabaseRepository } from "./SupabaseRepository";
import { mapItem, mapOutfit } from "./mapping";

const A = "00000000-0000-4000-8000-000000000001";
const B = "00000000-0000-4000-8000-000000000002";
const garmentId = "00000000-0000-4000-8000-000000000101";
const lookId = "00000000-0000-4000-8000-000000000201";
const now = "2026-11-12T00:00:00+00:00";
const item: WardrobeItemRow = {
  id: garmentId, user_id: A, name: "Saree", category_slug: "one-piece", subcategory_slug: "sarees",
  primary_color: null, secondary_color: null, pattern: null, style_tags: ["traditional"],
  occasion_tags: [], season_tags: [], image_path: null, image_thumb_path: null, created_at: now, updated_at: now,
};
const look: SavedOutfitRow = { id: lookId, user_id: A, name: null, notes: null, source: "manual", created_at: now, updated_at: now };
const piece: OutfitItemRow = { id: "00000000-0000-4000-8000-000000000301", outfit_id: lookId, user_id: A, slot: "one_piece", item_id: garmentId, position: 0 };
type Response = { data: unknown; error: { code: string; message?: string } | null; count?: number };
function fixture() {
  const responses: Response[] = [];
  const calls: { table: string; filters: unknown[][]; values?: unknown; method: string }[] = [];
  const api = {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: A, email_confirmed_at: now } }, error: null })),
      getSession: vi.fn(async () => ({ data: { session: { user: { id: A } } }, error: null })),
    },
    from: vi.fn((table: string) => {
      const call = { table, filters: [] as unknown[][], method: "select", values: undefined as unknown };
      calls.push(call);
      const chain = {
        select: vi.fn(() => chain), order: vi.fn(() => chain), range: vi.fn(() => chain), single: vi.fn(() => chain), maybeSingle: vi.fn(() => chain),
        eq: vi.fn((...args: unknown[]) => { call.filters.push(args); return chain; }),
        insert: vi.fn((values: unknown) => { call.method = "insert"; call.values = values; return chain; }),
        update: vi.fn((values: unknown) => { call.method = "update"; call.values = values; return chain; }),
        delete: vi.fn(() => { call.method = "delete"; return chain; }),
        then: (resolve: (value: Response) => unknown) => Promise.resolve(responses.shift() ?? { data: null, error: null }).then(resolve),
      };
      return chain;
    }),
    rpc: vi.fn(async () => ({ data: lookId, error: null as Response["error"] })),
  };
  return { api, responses, calls, repo: new SupabaseRepository(A, api as unknown as SupabaseClient<Database>) };
}
let f: ReturnType<typeof fixture>;
beforeEach(() => { f = fixture(); });
const ok = (data: unknown): Response => ({ data, error: null });
const input = { pieces: [{ slot: "one_piece" as const, itemId: garmentId, position: 0 }] };

describe("Supabase repository operations (SDK fixtures, not hosted verification)", () => {
  it("lists own wardrobe and preserves actual null metadata", async () => {
    f.responses.push(ok([item]));
    expect(await f.repo.listItems()).toEqual([mapItem(item, A)]);
    expect(f.calls[0]?.filters).toContainEqual(["user_id", A]);
  });
  it("gets a wardrobe item", async () => {
    f.responses.push(ok(item)); expect((await f.repo.getItem(garmentId))?.name).toBe("Saree");
  });
  it("paginates rather than silently truncating large wardrobes", async () => {
    f.responses.push(ok(Array.from({ length: 1000 }, () => item)), ok([item]));
    expect(await f.repo.listItems()).toHaveLength(1001);
    expect(f.calls).toHaveLength(2);
  });
  it("returns null for an absent wardrobe item", async () => {
    f.responses.push(ok(null)); expect(await f.repo.getItem(garmentId)).toBeNull();
  });
  it("creates validated wardrobe metadata with explicit ownership", async () => {
    f.responses.push(ok(item));
    await f.repo.createItem({ input: itemInputSchema.parse({ name: "Saree", categorySlug: "one-piece" }) });
    expect(f.calls[0]?.values).toMatchObject({ name: "Saree", user_id: A, category_slug: "one-piece" });
  });
  it("updates own wardrobe without changing image refs", async () => {
    f.responses.push(ok({ ...item, name: "Blue saree" }));
    expect((await f.repo.updateItem({ id: garmentId, input: itemInputSchema.parse({ name: "Blue saree", categorySlug: "one-piece" }) })).name).toBe("Blue saree");
    expect(f.calls[0]?.values).not.toHaveProperty("image_path");
    expect(f.calls[0]?.filters).toContainEqual(["user_id", A]);
  });
  it("deletes a wardrobe row using the existing placeholder-preserving FK", async () => {
    f.responses.push(ok({ id: garmentId })); await f.repo.deleteItem(garmentId);
    expect(f.calls[0]?.method).toBe("delete"); expect(f.calls).toHaveLength(1);
  });
  it("does not claim a delete succeeded if no owned row was deleted", async () => {
    f.responses.push(ok(null)); await expect(f.repo.deleteItem(garmentId)).rejects.toMatchObject({ code: "not_found" });
  });
  it("counts saved outfits using a garment", async () => {
    f.responses.push({ ...ok(null), count: 3 }); expect(await f.repo.countOutfitsUsingItem(garmentId)).toBe(3);
  });
  it("does not invent a zero usage count when count information is unavailable", async () => {
    f.responses.push({ ...ok(null), count: undefined });
    await expect(f.repo.countOutfitsUsingItem(garmentId)).rejects.toThrow();
  });
  it("lists saved looks with sorted pieces and removed placeholders", async () => {
    f.responses.push(ok([look]), ok([{ ...piece, position: 4, item_id: null }, piece]));
    expect((await f.repo.listOutfits())[0]?.pieces.map((p) => p.itemId)).toEqual([garmentId, null]);
  });
  it("gets an outfit with its pieces", async () => {
    f.responses.push(ok(look), ok([piece])); expect((await f.repo.getOutfit(lookId))?.pieces).toHaveLength(1);
  });
  it("returns null when a saved outfit is not found", async () => {
    f.responses.push(ok(null)); expect(await f.repo.getOutfit(lookId)).toBeNull();
  });
  it("creates a complete outfit using only the atomic RPC", async () => {
    f.responses.push(ok([item]), ok(look), ok([piece]));
    expect((await f.repo.saveOutfit({ input })).id).toBe(lookId);
    expect(f.api.rpc).toHaveBeenCalledWith("silvet_save_outfit", { _id: null, _input: { name: null, notes: null, source: "manual", pieces: input.pieces } });
    expect(f.calls.every((c) => c.method === "select")).toBe(true);
  });
  it("updates a saved outfit using the same atomic RPC", async () => {
    f.responses.push(ok([item]), ok({ ...look, name: "Updated" }), ok([piece]));
    await f.repo.saveOutfit({ id: lookId, input: { ...input, name: "Updated" } });
    expect(f.api.rpc.mock.calls[0]).toMatchObject(["silvet_save_outfit", { _id: lookId }]);
  });
  it("rejects incomplete outfits without invoking SQL", async () => {
    f.responses.push(ok([item]));
    await expect(f.repo.saveOutfit({ input: { pieces: [{ slot: "one_piece", itemId: null, position: 0 }] } })).rejects.toMatchObject({ code: "invalid" });
    expect(f.api.rpc).not.toHaveBeenCalled();
  });
  it("deletes only an owned outfit", async () => {
    f.responses.push(ok({ id: lookId })); await f.repo.deleteOutfit(lookId);
    expect(f.calls[0]).toMatchObject({ table: "saved_outfits", method: "delete" });
  });
  it.each(["23503", "23505", "22023", "42501", "PGRST301", "PGRST202", "unexpected"])("propagates database failure %s without a fake successful save", async (code) => {
    f.responses.push(ok([item])); f.api.rpc.mockResolvedValue({ data: lookId, error: { code, message: "sensitive database detail" } });
    await expect(f.repo.saveOutfit({ input })).rejects.not.toThrow("sensitive database detail");
    expect(f.calls).toHaveLength(1);
  });
  it("reports network rejection explicitly", async () => {
    f.api.auth.getUser.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(f.repo.listItems()).rejects.toMatchObject({ code: "network" });
  });
  it("rejects writes from a stale repository after account switching", async () => {
    f.api.auth.getUser.mockResolvedValue({ data: { user: { id: B, email_confirmed_at: now } }, error: null });
    await expect(f.repo.deleteItem(garmentId)).rejects.toMatchObject({ code: "unauthenticated" });
    expect(f.api.from).not.toHaveBeenCalled();
  });
  it("does not return previous-account data after an in-flight account change", async () => {
    f.responses.push(ok([item]));
    f.api.auth.getSession.mockResolvedValue({ data: { session: { user: { id: B } } }, error: null });
    await expect(f.repo.listItems()).rejects.toMatchObject({ code: "unauthenticated" });
  });
  it("rejects expired sessions returned by auth", async () => {
    f.api.auth.getUser.mockRejectedValue(Object.assign(new Error("expired"), { code: "bad_jwt" }));
    await expect(f.repo.listItems()).rejects.toMatchObject({ code: "unauthenticated" });
  });
  it("rejects photo mutations and returns honest unavailable image URLs", async () => {
    const photo = { full: new Blob(), thumb: new Blob(), mimeType: "image/webp" };
    await expect(f.repo.createItem({ input: itemInputSchema.parse({ name: "Saree", categorySlug: "one-piece" }), image: photo })).rejects.toMatchObject({ code: "storage" });
    await expect(f.repo.updateItem({ id: garmentId, input: itemInputSchema.parse({ name: "Saree", categorySlug: "one-piece" }), image: null })).rejects.toMatchObject({ code: "storage" });
    expect(await f.repo.getImageUrls([{ path: "private/full.webp", thumbPath: "private/thumb.webp" }])).toEqual({});
  });
});

describe("database/domain mapping trust boundaries", () => {
  it("retains paired storage references without inventing display URLs", () => {
    expect(mapItem({ ...item, image_path: `${A}/${garmentId}/full.webp`, image_thumb_path: `${A}/${garmentId}/thumb.webp` }, A).image?.path).toContain(A);
  });
  it("rejects wrong owners rather than filtering leaked rows silently", () => {
    expect(() => mapItem(item, B)).toThrow();
    expect(() => mapOutfit(look, [piece], B)).toThrow();
  });
  it("rejects malformed metadata, image pairs and duplicate positions", () => {
    expect(() => mapItem({ ...item, category_slug: "invented" }, A)).toThrow();
    expect(() => mapItem({ ...item, image_path: "only-one-ref" }, A)).toThrow();
    expect(() => mapOutfit(look, [piece, piece], A)).toThrow();
  });
});
