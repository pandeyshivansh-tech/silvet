import { describe, expect, it } from "vitest";
import { getSubcategory, slotOf } from "@/domain/taxonomy";
import { ACCESSORY_PATHS, FOOTWEAR_PATHS, ONE_PIECE_PATHS, TOP_PATHS } from "./garmentGlyphPaths";

describe("GarmentGlyph accessory silhouettes", () => {
  it("are keyed by real accessory subcategories", () => {
    for (const slug of Object.keys(ACCESSORY_PATHS)) {
      const sub = getSubcategory(slug);
      expect(sub, slug).toBeDefined();
      expect(slotOf({ categorySlug: sub!.categorySlug, subcategorySlug: slug }), slug).toBe("accessory");
    }
  });

  it("one-piece silhouettes are keyed by real one-piece subcategories", () => {
    for (const slug of Object.keys(ONE_PIECE_PATHS)) {
      const sub = getSubcategory(slug);
      expect(sub, slug).toBeDefined();
      expect(slotOf({ categorySlug: sub!.categorySlug, subcategorySlug: slug }), slug).toBe("one_piece");
    }
  });

  it("top and footwear silhouettes are keyed by real subcategories of their slot", () => {
    for (const [paths, slot] of [[TOP_PATHS, "top"], [FOOTWEAR_PATHS, "footwear"]] as const) {
      for (const slug of Object.keys(paths)) {
        const sub = getSubcategory(slug);
        expect(sub, slug).toBeDefined();
        expect(slotOf({ categorySlug: sub!.categorySlug, subcategorySlug: slug }), slug).toBe(slot);
      }
    }
  });
});
