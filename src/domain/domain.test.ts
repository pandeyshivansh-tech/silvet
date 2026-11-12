import { describe, expect, it } from "vitest";
import {
  CATEGORIES,
  COLORS,
  SUBCATEGORIES,
  canBeWornAlone,
  getCategory,
  isIndianWear,
  slotOf,
  subcategoriesOf,
} from "./taxonomy";
import { itemInputSchema, outfitInputSchema } from "./schemas";
import { checkOutfit } from "./outfitRules";
import type { OutfitPiece } from "./types";

describe("taxonomy integrity", () => {
  it("has unique category, subcategory and colour slugs", () => {
    const unique = (xs: string[]) => new Set(xs).size === xs.length;
    expect(unique(CATEGORIES.map((c) => c.slug))).toBe(true);
    expect(unique(SUBCATEGORIES.map((s) => s.slug))).toBe(true);
    expect(unique(COLORS.map((c) => c.slug))).toBe(true);
  });

  it("links every subcategory to an existing category with a matching default slot", () => {
    for (const sub of SUBCATEGORIES) {
      const cat = getCategory(sub.categorySlug);
      expect(cat).toBeTruthy();
      expect(sub.slot).toBe(cat?.defaultSlot);
    }
  });

  it("gives every non-accessory a formality and every accessory none", () => {
    for (const sub of SUBCATEGORIES) {
      if (sub.slot === "accessory") expect(sub.formality).toBe(null);
      else expect(sub.formality === 1 || sub.formality === 2 || sub.formality === 3).toBe(true);
    }
  });

  it("covers Indian and Western wear in every garment category", () => {
    for (const cat of CATEGORIES) {
      const subs = subcategoriesOf(cat.slug);
      expect(subs.some((s) => s.tradition === "indian")).toBe(true);
      expect(subs.some((s) => s.tradition !== "indian")).toBe(true);
    }
  });

  it("only lets outerwear be worn alone", () => {
    for (const sub of SUBCATEGORIES.filter((s) => s.canBeWornAlone)) expect(sub.slot).toBe("outerwear");
  });

  it("classifies items with and without a subcategory", () => {
    expect(slotOf({ categorySlug: "outerwear", subcategorySlug: "hoodies" })).toBe("outerwear");
    expect(slotOf({ categorySlug: "bottoms", subcategorySlug: null })).toBe("bottom");
    expect(canBeWornAlone({ categorySlug: "outerwear", subcategorySlug: "hoodies" })).toBe(true);
    expect(canBeWornAlone({ categorySlug: "outerwear", subcategorySlug: "blazers" })).toBe(false);
    expect(isIndianWear({ categorySlug: "one-piece", subcategorySlug: "sarees" })).toBe(true);
  });
});

describe("item input schema", () => {
  it("accepts the minimum: name + category", () => {
    const r = itemInputSchema.safeParse({ name: "  Black jeans ", categorySlug: "bottoms" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.name).toBe("Black jeans");
      expect(r.data.subcategorySlug).toBe(null);
      expect(r.data.styleTags).toEqual([]);
    }
  });

  it("rejects an empty name and an unknown category", () => {
    expect(itemInputSchema.safeParse({ name: "   ", categorySlug: "bottoms" }).success).toBe(false);
    expect(itemInputSchema.safeParse({ name: "Thing", categorySlug: "spaceships" }).success).toBe(false);
  });

  it("rejects a subcategory from another category", () => {
    const r = itemInputSchema.safeParse({ name: "Jeans", categorySlug: "tops", subcategorySlug: "jeans" });
    expect(r.success).toBe(false);
  });

  it("rejects colours outside the palette", () => {
    expect(itemInputSchema.safeParse({ name: "Tee", categorySlug: "tops", primaryColor: "#ff00ff" }).success).toBe(false);
  });
});

describe("outfit input schema", () => {
  it("normalises empty name/notes to null", () => {
    const r = outfitInputSchema.safeParse({ name: "", notes: "  ", pieces: [{ slot: "top", itemId: "a", position: 0 }] });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.name).toBe(null);
      expect(r.data.notes).toBe(null);
      expect(r.data.source).toBe("manual");
    }
  });
});

describe("checkOutfit", () => {
  const items = new Map([
    ["tee", { id: "tee", categorySlug: "tops", subcategorySlug: "t-shirts" }],
    ["kurta", { id: "kurta", categorySlug: "tops", subcategorySlug: "kurtas" }],
    ["jeans", { id: "jeans", categorySlug: "bottoms", subcategorySlug: "jeans" }],
    ["hoodie", { id: "hoodie", categorySlug: "outerwear", subcategorySlug: "hoodies" }],
    ["blazer", { id: "blazer", categorySlug: "outerwear", subcategorySlug: "blazers" }],
    ["saree", { id: "saree", categorySlug: "one-piece", subcategorySlug: "sarees" }],
    ["sneakers", { id: "sneakers", categorySlug: "footwear", subcategorySlug: "sneakers" }],
    ["watch", { id: "watch", categorySlug: "accessories", subcategorySlug: "watches" }],
    ["watch2", { id: "watch2", categorySlug: "accessories", subcategorySlug: "watches" }],
    ["bag", { id: "bag", categorySlug: "accessories", subcategorySlug: "bags" }],
    ["hoops", { id: "hoops", categorySlug: "accessories", subcategorySlug: "jewellery" }],
  ]);
  const lookup = (id: string) => items.get(id);
  const p = (slot: OutfitPiece["slot"], itemId: string | null, position = 0): OutfitPiece => ({ slot, itemId, position });

  it("accepts top + bottom", () => {
    const r = checkOutfit([p("top", "tee"), p("bottom", "jeans")], lookup);
    expect(r).toEqual({ valid: true, complete: true, issues: [] });
  });

  it("accepts fusion: kurta + jeans", () => {
    expect(checkOutfit([p("top", "kurta"), p("bottom", "jeans")], lookup).complete).toBe(true);
  });

  it("accepts a saree on its own", () => {
    expect(checkOutfit([p("one_piece", "saree")], lookup).complete).toBe(true);
  });

  it("lets a hoodie act as the top, but not a blazer", () => {
    expect(checkOutfit([p("outerwear", "hoodie"), p("bottom", "jeans")], lookup).complete).toBe(true);
    const blazer = checkOutfit([p("outerwear", "blazer"), p("bottom", "jeans")], lookup);
    expect(blazer.valid).toBe(true);
    expect(blazer.complete).toBe(false);
  });

  it("rejects a one-piece combined with separates", () => {
    const r = checkOutfit([p("one_piece", "saree"), p("top", "tee")], lookup);
    expect(r.valid).toBe(false);
    expect(r.issues.some((i) => i.code === "one_piece_with_separates")).toBe(true);
  });

  it("rejects duplicates, two items in one slot and wrong slots", () => {
    expect(checkOutfit([p("top", "tee"), p("top", "tee"), p("bottom", "jeans")], lookup).valid).toBe(false);
    expect(checkOutfit([p("top", "tee"), p("top", "kurta"), p("bottom", "jeans")], lookup).valid).toBe(false);
    expect(checkOutfit([p("bottom", "tee"), p("top", "jeans")], lookup).valid).toBe(false);
  });

  it("limits accessories to two, one per type", () => {
    const base = [p("top", "tee"), p("bottom", "jeans")];
    expect(checkOutfit([...base, p("accessory", "watch"), p("accessory", "bag")], lookup).valid).toBe(true);
    expect(checkOutfit([...base, p("accessory", "watch"), p("accessory", "watch2")], lookup).valid).toBe(false);
    expect(checkOutfit([...base, p("accessory", "watch"), p("accessory", "bag"), p("accessory", "hoops")], lookup).valid).toBe(false);
  });

  it("does not let a removed base placeholder complete separates", () => {
    const r = checkOutfit([p("top", null), p("bottom", "jeans")], lookup);
    expect(r.valid).toBe(true);
    expect(r.complete).toBe(false);
    expect(r.issues.map((issue) => issue.code)).toContain("missing_base");
  });

  it("allows separates alongside a removed one-piece placeholder", () => {
    const r = checkOutfit([p("one_piece", null), p("top", "tee"), p("bottom", "jeans")], lookup);
    expect(r).toEqual({ valid: true, complete: true, issues: [] });
  });

  it("does not count removed accessories against the two available slots", () => {
    const r = checkOutfit([
      p("top", "tee"),
      p("bottom", "jeans"),
      p("accessory", null),
      p("accessory", "watch"),
      p("accessory", "bag"),
    ], lookup);
    expect(r).toEqual({ valid: true, complete: true, issues: [] });
  });

  it("allows a live piece to replace a removed piece in its original slot", () => {
    const r = checkOutfit([
      p("top", null, 0),
      p("top", "tee", 1),
      p("bottom", "jeans", 2),
    ], lookup);
    expect(r).toEqual({ valid: true, complete: true, issues: [] });
  });

  it("still rejects two live garments in one slot when a placeholder is also present", () => {
    const r = checkOutfit([
      p("top", null, 0),
      p("top", "tee", 1),
      p("top", "kurta", 2),
      p("bottom", "jeans", 3),
    ], lookup);
    expect(r.valid).toBe(false);
    expect(r.issues.some((issue) => issue.code === "slot_occupied")).toBe(true);
  });

  it("explains what is missing", () => {
    const r = checkOutfit([p("footwear", "sneakers")], lookup);
    expect(r.complete).toBe(false);
    expect(r.issues[0]?.code).toBe("missing_base");
  });
});
