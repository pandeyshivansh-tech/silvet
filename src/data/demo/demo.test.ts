import { describe, expect, it } from "vitest";
import { itemInputSchema } from "@/domain/schemas";
import { checkOutfit } from "@/domain/outfitRules";
import { isIndianWear } from "@/domain/taxonomy";
import { DEMO_ITEMS, DEMO_OUTFITS } from "./demoWardrobe";
import { DemoRepository } from "./DemoRepository";

function memoryStore() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}

describe("demo wardrobe data", () => {
  it("only contains items that pass the real item schema", () => {
    for (const item of DEMO_ITEMS) {
      const r = itemInputSchema.safeParse(item);
      expect(r.success).toBe(true);
    }
  });

  it("mixes Indian and Western wear", () => {
    const indian = DEMO_ITEMS.filter(isIndianWear).length;
    expect(indian).toBeGreaterThan(8);
    expect(DEMO_ITEMS.length - indian).toBeGreaterThan(15);
  });

  it("ships starter looks that are all valid and complete", () => {
    const byId = new Map(DEMO_ITEMS.map((i) => [i.id, i]));
    for (const outfit of DEMO_OUTFITS) {
      const r = checkOutfit(outfit.pieces, (id) => byId.get(id));
      expect(r.issues).toEqual([]);
    }
  });
});

describe("DemoRepository", () => {
  it("lists items and finds one by id", async () => {
    const repo = new DemoRepository({ store: null });
    const items = await repo.listItems();
    expect(items.length).toBe(DEMO_ITEMS.length);
    const first = items[0];
    expect(first && (await repo.getItem(first.id))?.id).toBe(first?.id);
    expect(await repo.getItem("nope")).toBe(null);
  });

  it("creates, edits and deletes items across repository instances in the same session", async () => {
    const store = memoryStore();
    const repo = new DemoRepository({ store });
    const input = itemInputSchema.parse({ name: "  My kurta  ", categorySlug: "tops", subcategorySlug: "kurtas", primaryColor: "white" });
    const created = await repo.createItem({ input });
    expect(created.name).toBe("My kurta");
    expect(created.image).toBeNull();
    const reopened = new DemoRepository({ store });
    expect(await reopened.getItem(created.id)).toEqual(created);
    const updated = await reopened.updateItem({ id: created.id, input: { ...input, name: "Favourite kurta" } });
    expect(updated.createdAt).toBe(created.createdAt);
    expect((await new DemoRepository({ store }).getItem(created.id))?.name).toBe("Favourite kurta");
    await reopened.deleteItem(created.id);
    expect(await reopened.getItem(created.id)).toBeNull();
    expect(await new DemoRepository({ store }).getItem(created.id)).toBeNull();
    expect(await new DemoRepository({ store: memoryStore() }).getItem(created.id)).toBeNull();
  });

  it("validates writes and reports field errors without changing the wardrobe", async () => {
    const repo = new DemoRepository({ store: null });
    const input = itemInputSchema.parse({ name: "Valid", categorySlug: "tops" });
    await expect(repo.createItem({ input: { ...input, name: "" } })).rejects.toMatchObject({
      code: "invalid", fieldErrors: { name: "Give this piece a name." },
    });
    await expect(repo.createItem({ input: { ...input, subcategorySlug: "jeans" } })).rejects.toMatchObject({
      code: "invalid", fieldErrors: { subcategorySlug: "That type doesn't belong to the chosen category." },
    });
    expect(await repo.listItems()).toHaveLength(DEMO_ITEMS.length);
    await expect(repo.updateItem({ id: DEMO_ITEMS[0]!.id, input: { ...input, name: "" } })).rejects.toMatchObject({ code: "invalid" });
    await expect(repo.updateItem({ id: "missing", input })).rejects.toMatchObject({ code: "not_found" });
    await expect(repo.deleteItem("missing")).rejects.toMatchObject({ code: "not_found" });
  });

  it("rejects demo photo uploads honestly, preserving the existing item", async () => {
    const repo = new DemoRepository({ store: null });
    const original = DEMO_ITEMS[0]!;
    const input = itemInputSchema.parse(original);
    const image = { full: new Blob(["photo"]), thumb: new Blob(["thumb"]), mimeType: "image/webp" };
    await expect(repo.createItem({ input, image })).rejects.toMatchObject({ code: "storage" });
    await expect(repo.updateItem({ id: original.id, input, image })).rejects.toMatchObject({ code: "storage" });
    expect(await repo.getItem(original.id)).toEqual(original);
  });

  it("keeps or removes an existing photo according to update semantics", async () => {
    const item = { ...DEMO_ITEMS[0]!, image: { path: "demo/photo.webp", thumbPath: "demo/thumb.webp" } };
    const repo = new DemoRepository({ items: [item], store: null });
    const input = itemInputSchema.parse(item);
    expect((await repo.updateItem({ id: item.id, input })).image).toEqual(item.image);
    expect((await repo.updateItem({ id: item.id, input, image: null })).image).toBeNull();
  });

  it("preserves saved outfits with removed-piece placeholders after deleting a garment", async () => {
    const store = memoryStore();
    const repo = new DemoRepository({ store });
    const outfit = DEMO_OUTFITS[0]!;
    const id = outfit.pieces.find((piece) => piece.itemId)?.itemId;
    expect(id).toBeTruthy();
    await repo.deleteItem(id!);
    const saved = await repo.getOutfit(outfit.id);
    expect(saved?.pieces.some((piece) => piece.itemId === null)).toBe(true);
    expect(await repo.countOutfitsUsingItem(id!)).toBe(0);
    const reopened = new DemoRepository({ store });
    expect(await reopened.getItem(id!)).toBeNull();
    expect(await reopened.getOutfit(outfit.id)).toEqual(saved);
    // The bundled seed remains untouched.
    expect(DEMO_ITEMS.some((item) => item.id === id)).toBe(true);
    expect(DEMO_OUTFITS[0]!.pieces.some((piece) => piece.itemId === id)).toBe(true);
  });

  it("keeps writes available in memory when browser storage is blocked or full", async () => {
    const repo = new DemoRepository({
      store: { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("full"); } },
    });
    const created = await repo.createItem({ input: itemInputSchema.parse({ name: "In memory", categorySlug: "tops" }) });
    expect(await repo.getItem(created.id)).toEqual(created);
    await repo.deleteItem(created.id);
    expect(await repo.getItem(created.id)).toBeNull();
  });

  it("persists an empty wardrobe instead of reseeding it on refresh", async () => {
    const store = memoryStore();
    const repo = new DemoRepository({ items: [DEMO_ITEMS[0]!], outfits: [], store });
    await repo.deleteItem(DEMO_ITEMS[0]!.id);
    expect(await new DemoRepository({ store }).listItems()).toEqual([]);
  });

  it("creates, updates and deletes outfits and persists them for the session", async () => {
    const store = memoryStore();
    const repo = new DemoRepository({ store });
    const created = await repo.saveOutfit({
      input: {
        name: "Test look",
        pieces: [
          { slot: "top", itemId: "demo-white-oversized-tee", position: 0 },
          { slot: "bottom", itemId: "demo-straight-blue-jeans", position: 1 },
        ],
      },
    });
    expect(created.name).toBe("Test look");

    const reopened = new DemoRepository({ store });
    expect((await reopened.getOutfit(created.id))?.name).toBe("Test look");

    const updated = await reopened.saveOutfit({
      id: created.id,
      input: { name: "Renamed", pieces: created.pieces },
    });
    expect(updated.name).toBe("Renamed");
    expect(await reopened.countOutfitsUsingItem("demo-white-oversized-tee")).toBe(1);

    await reopened.deleteOutfit(created.id);
    expect(await reopened.getOutfit(created.id)).toBe(null);
  });

  it("rejects incomplete or invalid outfits", async () => {
    const repo = new DemoRepository({ store: null });
    await expect(repo.saveOutfit({ input: { pieces: [{ slot: "footwear", itemId: "demo-white-sneakers", position: 0 }] } })).rejects.toThrow();
    await expect(
      repo.saveOutfit({
        input: {
          pieces: [
            { slot: "one_piece", itemId: "demo-teal-silk-saree", position: 0 },
            { slot: "top", itemId: "demo-black-boxy-tee", position: 1 },
          ],
        },
      }),
    ).rejects.toThrow();
  });
});
