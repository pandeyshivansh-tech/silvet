import { describe, expect, it } from "vitest";
import { checkOutfit } from "@/domain/outfitRules";
import { getSubcategory, MAX_ACCESSORIES, slotOf } from "@/domain/taxonomy";
import type { ClothingItem } from "@/domain/types";
import { eligible } from "./compatibility";
import { fingerprint, makeRecommendation, piecesFor, recommend } from "./recommend";
import { swapPiece } from "./swap";
import type { Recommendation, RecommendationContext, Wardrobe } from "./types";

function garment(id: string, subcategory: string, extras: Partial<ClothingItem> = {}): ClothingItem {
  const sub = getSubcategory(subcategory)!;
  return {
    id, name: id, categorySlug: sub.categorySlug, subcategorySlug: sub.slug,
    primaryColor: null, secondaryColor: null, pattern: null,
    occasionTags: [], styleTags: [], seasonTags: [], image: null,
    createdAt: "", updatedAt: "", ...extras,
  };
}
const everyday: RecommendationContext = { occasion: "everyday" };
function ready(items: Wardrobe, context = everyday, seen: string[] = []): Recommendation {
  const result = recommend(items, context, seen);
  expect(result.status).toBe("ready");
  if (result.status !== "ready") throw new Error(JSON.stringify(result));
  const check = checkOutfit(result.recommendation.pieces, (id) => items.find((item) => item.id === id));
  expect(check).toMatchObject({ valid: true, complete: true, issues: [] });
  expect(result.recommendation.explanations.length).toBeGreaterThanOrEqual(1);
  expect(result.recommendation.explanations.length).toBeLessThanOrEqual(3);
  return result.recommendation;
}

describe("first-class outfit structures", () => {
  it("uses every saved style preference as a soft, metadata-backed boost", () => {
    const top = garment("top", "shirts", { styleTags: ["minimal"] });
    const bottom = garment("bottom", "jeans", { styleTags: ["fusion"] });
    const plain = makeRecommendation(piecesFor([top, bottom]), [top, bottom], everyday)!;
    const boosted = makeRecommendation(piecesFor([top, bottom]), [top, bottom], { ...everyday, preferredStyles: ["minimal", "fusion"] })!;
    expect(boosted.score - plain.score).toBe(4);
    const explanation = boosted.explanations.find((reason) => reason.kind === "style")!;
    expect(explanation.itemIds).toEqual(["top", "bottom"]);
    expect(explanation.message).toContain("Minimal");
    expect(explanation.message).toContain("fusion");
  });
  it("deduplicates saved preferences and does not double-count the explicit style", () => {
    const items = [garment("top", "shirts", { styleTags: ["minimal"] }), garment("bottom", "jeans")];
    const explicit = makeRecommendation(piecesFor(items), items, { ...everyday, style: "minimal" })!;
    const repeated = makeRecommendation(piecesFor(items), items, { ...everyday, style: "minimal", preferredStyles: ["minimal", "minimal"] })!;
    expect(repeated.score).toBe(explicit.score);
  });
  it("does not exclude untagged outfits or mutate saved garments or preferences", () => {
    const items = [garment("top", "kurtas"), garment("bottom", "jeans")];
    const snapshot = JSON.stringify(items);
    const preferredStyles = Object.freeze(["minimal", "fusion"] as const);
    for (const item of items) { Object.freeze(item.styleTags); Object.freeze(item); }
    const result = ready(Object.freeze(items), { ...everyday, preferredStyles });
    expect(result.explanations.some((reason) => reason.kind === "style")).toBe(false);
    expect(JSON.stringify(items)).toBe(snapshot);
  });
  it.each([
    ["kurta + jeans", ["kurtas", "jeans"], "everyday"],
    ["kurta + churidar", ["kurtas", "churidars-salwars"], "festive"],
    ["kurti + palazzos", ["short-kurtis", "palazzos"], "everyday"],
    ["saree", ["sarees"], "wedding"],
    ["lehenga", ["lehenga-sets"], "wedding"],
    ["co-ord set", ["co-ord-sets"], "work"],
    ["kurta set", ["kurta-sets"], "festive"],
    ["sherwani", ["sherwani-sets"], "wedding"],
    ["hoodie + jeans", ["hoodies", "jeans"], "everyday"],
    ["Western shirt + trousers", ["shirts", "trousers"], "work"],
    ["dress", ["dresses"], "date"],
    ["jumpsuit", ["jumpsuits"], "work"],
    ["fusion shirt + palazzo", ["shirts", "palazzos"], "everyday"],
  ] as const)("supports %s", (_name, subs, occasion) => {
    const items = subs.map((sub, i) => garment(`piece-${i}`, sub));
    ready(items, { occasion });
  });
  it("allows a formal Western layer to lift smart separates for a wedding", () => {
    const items = ["shirts", "trousers", "blazers", "formal-shoes"].map((sub) => garment(sub, sub));
    const result = ready(items, { occasion: "wedding" });
    expect(result.pieces.some((piece) => piece.itemId === "blazers")).toBe(true);
  });
  it("never mixes a one-piece and separate base or duplicates an item", () => {
    const items = ["sarees", "kurtas", "jeans", "watches", "bags"].map((sub) => garment(sub, sub));
    let seen: string[] = [];
    for (let i = 0; i < 4; i++) {
      const result = recommend(items, { occasion: "festive" }, seen);
      if (result.status !== "ready") break;
      expect(checkOutfit(result.recommendation.pieces, (id) => items.find((item) => item.id === id))).toMatchObject({ valid: true, complete: true });
      seen = [...seen, result.recommendation.fingerprint];
    }
  });
});

describe("compatibility, missing pieces and metadata", () => {
  it.each([
    [[], "top"],
    [[garment("bottom", "jeans")], "top"],
    [[garment("top", "kurtas")], "bottom"],
    [[garment("layer", "jackets"), garment("bottom", "jeans")], "top"],
    [[garment("shoe", "sneakers")], "bottom"],
  ] as const)("explains incomplete wardrobes without inventing a base (%#)", (items, missing) => {
    const result = recommend(items, everyday);
    expect(result.status).toBe("incomplete");
    if (result.status !== "ready") expect(result.suggestions.join(" ")).toContain(missing);
  });
  it("rejects casual sportswear at a wedding rather than colour-matching it", () => {
    expect(recommend([garment("tee", "t-shirts", { primaryColor: "white" }), garment("jogger", "joggers", { primaryColor: "white" })], { occasion: "wedding" }).status).toBe("incompatible");
  });
  it("rejects a casual hoodie layered over ceremonial wear for a wedding", () => {
    const items = [garment("saree", "sarees"), garment("hoodie", "hoodies")];
    expect(makeRecommendation(piecesFor(items), items, { occasion: "wedding" })).toBeNull();
    const result = ready(items, { occasion: "wedding" });
    expect(result.pieces.map((piece) => piece.itemId)).toEqual(["saree"]);
  });
  it("prefers a simpler outfit over an untagged layer that adds no match", () => {
    const items = [garment("dress", "dresses"), garment("a-jacket", "jackets")];
    expect(ready(items).pieces.map((piece) => piece.itemId)).toEqual(["dress"]);
  });
  it("does not turn unknown metadata into exclusion or matching claims", () => {
    const items = [garment("top", "shirts", { subcategorySlug: null }), garment("bottom", "trousers", { subcategorySlug: null })];
    const result = ready(items, { occasion: "work", style: "minimal", season: "summer" });
    expect(result.explanations.map((reason) => reason.kind)).toEqual(["structure"]);
  });
  it("uses explicit occasion tags rather than overriding them with coarse formality", () => {
    ready([garment("everyday-saree", "sarees", { occasionTags: ["everyday"] })]);
  });
  it("requires Active tags, including on optional garments", () => {
    const items = [garment("tee", "t-shirts"), garment("joggers", "joggers", { occasionTags: ["active"] })];
    expect(recommend(items, { occasion: "active" }).status).toBe("incomplete");
    const active = items.map((item) => ({ ...item, occasionTags: ["active"] as ClothingItem["occasionTags"] }));
    ready(active, { occasion: "active" });
    expect(eligible(garment("watch", "watches"), { occasion: "active" })).toBe(false);
  });
  it("respects season restrictions but accepts all-season and unknown seasons", () => {
    const top = garment("top", "shirts", { seasonTags: ["winter"] });
    const bottom = garment("bottom", "trousers", { seasonTags: ["all-season"] });
    expect(recommend([top, bottom], { occasion: "work", season: "summer" }).status).toBe("incomplete");
    ready([top, bottom], { occasion: "work", season: "winter" });
    ready([{ ...top, seasonTags: [] }, bottom], { occasion: "work", season: "summer" });
  });
  it("does not ban bold colours, mixed patterns or fusion arbitrarily", () => {
    ready([garment("kurta", "kurtas", { primaryColor: "red", pattern: "printed" }), garment("jeans", "jeans", { primaryColor: "green", pattern: "striped" })]);
  });
  it("limits accessories and never repeats an accessory type", () => {
    const items = [garment("dress", "dresses"), ...["a", "b", "c"].map((id) => garment(id, "watches", { occasionTags: ["everyday"] })), garment("bag", "bags", { occasionTags: ["everyday"] })];
    const result = ready(items);
    const accessories = result.pieces.filter((piece) => piece.slot === "accessory");
    expect(accessories.length).toBeLessThanOrEqual(MAX_ACCESSORIES);
    expect(new Set(accessories.map((piece) => items.find((item) => item.id === piece.itemId)!.subcategorySlug)).size).toBe(accessories.length);
  });
  it("rejects null, unknown, wrong-slot, duplicate and incomplete candidate pieces", () => {
    const items = [garment("top", "shirts"), garment("bottom", "trousers")];
    for (const pieces of [
      [{ slot: "top" as const, itemId: null, position: 0 }],
      [{ slot: "one_piece" as const, itemId: "missing", position: 0 }],
      [{ slot: "bottom" as const, itemId: "top", position: 0 }, { slot: "top" as const, itemId: "bottom", position: 1 }],
      [...piecesFor(items), ...piecesFor(items)],
    ]) expect(makeRecommendation(pieces, items, everyday)).toBeNull();
  });
});

describe("grounded explanations", () => {
  it.each(["occasion", "style", "season", "colour", "pattern", "tradition"] as const)("grounds %s claims in the referenced metadata", (kind) => {
    const items = [
      garment("kurta", "kurtas", { primaryColor: kind === "pattern" ? null : "cream", pattern: "embroidered", occasionTags: kind === "occasion" ? ["everyday"] : [], styleTags: kind === "style" ? ["fusion"] : [], seasonTags: kind === "season" ? ["summer"] : [] }),
      garment("jeans", "jeans", { primaryColor: kind === "pattern" ? null : "denim", pattern: "solid" }),
    ];
    const result = ready(items, { ...everyday, style: "fusion", season: "summer" });
    // Evaluate isolated metadata combinations; explanations are capped at three.
    for (const reason of result.explanations) {
      expect(reason.itemIds.every((id) => items.some((item) => item.id === id))).toBe(true);
      if (reason.kind === "occasion") for (const id of reason.itemIds) expect(items.find((item) => item.id === id)!.occasionTags).toContain("everyday");
      if (reason.kind === "style") for (const id of reason.itemIds) expect(items.find((item) => item.id === id)!.styleTags).toContain("fusion");
      if (reason.kind === "season") for (const id of reason.itemIds) expect(items.find((item) => item.id === id)!.seasonTags).toContain("summer");
    }
    expect(result.explanations.some((reason) => reason.kind === kind)).toBe(true);
    expect(result.explanations.map((reason) => reason.message).join(" ")).not.toMatch(/fabric|breathable|cotton|silk|linen|weather/i);
  });
});

describe("swaps, variety, determinism and immutability", () => {
  const items = [garment("kurta-a", "kurtas"), garment("kurta-b", "kurtas"), garment("jeans", "jeans"), garment("palazzo", "palazzos")];
  it("returns identical results regardless of wardrobe input order", () => {
    expect(ready(items)).toEqual(ready([...items].reverse()));
  });
  it("does not mutate frozen items, metadata, wardrobe, seen history or pieces", () => {
    const frozen = items.map((item) => Object.freeze({ ...item, styleTags: Object.freeze([]), occasionTags: Object.freeze([]), seasonTags: Object.freeze([]) })) as unknown as ClothingItem[];
    Object.freeze(frozen);
    const snapshot = JSON.stringify(frozen);
    const result = ready(frozen);
    Object.freeze(result.pieces);
    const seen = Object.freeze([result.fingerprint]);
    swapPiece(result, 0, frozen, everyday, seen);
    recommend(frozen, everyday, seen);
    expect(JSON.stringify(frozen)).toBe(snapshot);
  });
  it("uses canonical fingerprints independent of positions and accessory ordering", () => {
    const pieces = piecesFor(items.slice(0, 1).concat(items[2]!));
    expect(fingerprint(pieces)).toBe(fingerprint(pieces.toReversed().map((piece) => ({ ...piece, position: 20 }))));
  });
  it("never repeats a seen recommendation and reports exhaustion", () => {
    const seen: string[] = [];
    for (let i = 0; i < 4; i++) {
      const result = ready(items, everyday, seen);
      expect(seen).not.toContain(result.fingerprint);
      seen.push(result.fingerprint);
    }
    expect(recommend(items, everyday, seen).status).toBe("exhausted");
    expect(recommend(items, everyday).status).toBe("ready");
  });
  it("holds every other piece fixed when swapping", () => {
    const current = ready(items);
    const index = current.pieces.findIndex((piece) => piece.slot === "top");
    const swapped = swapPiece(current, index, items, everyday, [current.fingerprint])!;
    expect(swapped).not.toBeNull();
    current.pieces.forEach((piece, i) => {
      if (i !== index) expect(swapped.pieces[i]).toEqual(piece);
      else expect(swapped.pieces[i]!.itemId).not.toBe(piece.itemId);
    });
    expect(checkOutfit(swapped.pieces, (id) => items.find((item) => item.id === id))).toMatchObject({ valid: true, complete: true });
  });
  it("returns no swap for unavailable, already seen, wrong-slot or incompatible alternatives", () => {
    const single = [garment("saree", "sarees")];
    const current = ready(single, { occasion: "wedding" });
    expect(swapPiece(current, 0, single, { occasion: "wedding" })).toBeNull();
    expect(swapPiece(current, 99, single, { occasion: "wedding" })).toBeNull();
    const alt = garment("romper", "rompers");
    expect(swapPiece(current, 0, [...single, alt], { occasion: "wedding" })).toBeNull();
    const lehenga = garment("lehenga", "lehenga-sets");
    expect(swapPiece(current, 0, [...single, lehenga], { occasion: "wedding" }, [fingerprint(piecesFor([lehenga]))])).toBeNull();
  });
  it("can swap a one-piece without turning it into separates", () => {
    const choices = [garment("saree", "sarees"), garment("lehenga", "lehenga-sets")];
    const current = ready(choices, { occasion: "wedding" });
    const swapped = swapPiece(current, 0, choices, { occasion: "wedding" })!;
    expect(swapped.pieces).toHaveLength(1);
    expect(slotOf(choices.find((item) => item.id === swapped.pieces[0]!.itemId)!)).toBe("one_piece");
  });
  it("ignores malformed history safely and remains deterministic", () => {
    expect(ready(items, everyday, ["not-json", "{}"])).toEqual(ready(items));
  });
});
