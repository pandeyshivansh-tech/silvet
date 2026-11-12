import { describe, expect, it } from "vitest";
import { itemInputSchema } from "@/domain/schemas";
import { checkOutfit } from "@/domain/outfitRules";
import { isIndianWear } from "@/domain/taxonomy";
import { DEMO_ITEMS, DEMO_OUTFITS } from "./demoWardrobe";
import { DemoRepository } from "./DemoRepository";
import { isRepositoryError } from "../repository";

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

  it("refuses item writes with a demo_read_only error", async () => {
    const repo = new DemoRepository({ store: null });
    try {
      await repo.deleteItem();
      expect("should have thrown").toBe("thrown");
    } catch (e) {
      expect(isRepositoryError(e) && e.code).toBe("demo_read_only");
    }
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
