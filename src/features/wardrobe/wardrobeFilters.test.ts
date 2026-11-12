import { describe, expect, it } from "vitest";
import { countActiveWardrobeFilters, filterWardrobeItems } from "./wardrobeFilters";
import type { WardrobeFilters } from "./wardrobeFilters";

const pieces = [
  { name: "Indigo Kurta", categorySlug: "tops", subcategorySlug: "kurtas", primaryColor: "blue", secondaryColor: "cream" },
  { name: "Everyday denim", categorySlug: "bottoms", subcategorySlug: "jeans", primaryColor: "denim", secondaryColor: null },
  { name: "Silk saree", categorySlug: "one-piece", subcategorySlug: "sarees", primaryColor: "maroon", secondaryColor: null },
  { name: "Cream shirt", categorySlug: "tops", subcategorySlug: "shirts", primaryColor: "cream", secondaryColor: null },
];

const clear: WardrobeFilters = { query: "", category: "", subcategory: "", color: "", indianWear: false };

describe("filterWardrobeItems", () => {
  it("matches names without case sensitivity and ignores surrounding whitespace", () => {
    expect(filterWardrobeItems(pieces, { ...clear, query: "  INDIGO " }).map((piece) => piece.name)).toEqual(["Indigo Kurta"]);
  });

  it("applies category and subcategory together", () => {
    expect(filterWardrobeItems(pieces, { ...clear, category: "tops", subcategory: "kurtas" }).map((piece) => piece.name)).toEqual(["Indigo Kurta"]);
  });

  it("matches either the primary or secondary colour", () => {
    expect(filterWardrobeItems(pieces, { ...clear, color: "cream" }).map((piece) => piece.name)).toEqual(["Indigo Kurta", "Cream shirt"]);
  });

  it("uses taxonomy tradition for Indian wear across categories", () => {
    expect(filterWardrobeItems(pieces, { ...clear, indianWear: true }).map((piece) => piece.name)).toEqual(["Indigo Kurta", "Silk saree"]);
  });

  it("combines search and taxonomy filters", () => {
    expect(filterWardrobeItems(pieces, { ...clear, query: "silk", indianWear: true, color: "maroon" }).map((piece) => piece.name)).toEqual(["Silk saree"]);
    expect(filterWardrobeItems(pieces, { ...clear, query: "silk", category: "tops" })).toEqual([]);
  });
});

describe("countActiveWardrobeFilters", () => {
  it("counts each active filter once and treats whitespace-only search as inactive", () => {
    expect(countActiveWardrobeFilters({ ...clear, query: "  ", category: "tops" })).toBe(1);
    expect(countActiveWardrobeFilters({ query: "shirt", category: "tops", subcategory: "shirts", color: "cream", indianWear: true })).toBe(5);
    expect(countActiveWardrobeFilters(clear)).toBe(0);
  });
});
