import { normalisePieces } from "@/domain/outfitRules";
import { canBeWornAlone, MAX_ACCESSORIES, slotOf } from "@/domain/taxonomy";
import type { ClothingItem, OutfitPiece } from "@/domain/types";
import { eligible, evaluate } from "./compatibility";
import type { Recommendation, RecommendationContext, RecommendationResult, Wardrobe } from "./types";

/** Positions and accessory order cannot disguise the same set of garments. */
export function fingerprint(pieces: readonly OutfitPiece[]): string {
  return JSON.stringify(pieces.map((piece) => piece.itemId).filter((id): id is string => id !== null).sort());
}
export function piecesFor(items: readonly ClothingItem[]): OutfitPiece[] {
  return normalisePieces(items.map((item, position) => ({ slot: slotOf(item), itemId: item.id, position })));
}
export function makeRecommendation(pieces: readonly OutfitPiece[], wardrobe: Wardrobe, context: RecommendationContext): Recommendation | null {
  const evaluated = evaluate(pieces, wardrobe, context);
  return evaluated ? { ...evaluated, pieces: normalisePieces(pieces), fingerprint: fingerprint(pieces) } : null;
}

/** Complete bases are generated equally for Indian, Western and fusion garments. */
export function recommend(wardrobe: Wardrobe, context: RecommendationContext, seen: readonly string[] = []): RecommendationResult {
  const items = [...wardrobe].filter((item) => eligible(item, context)).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const at = (slot: OutfitPiece["slot"]) => items.filter((item) => slotOf(item) === slot);
  const tops = [...at("top"), ...at("outerwear").filter(canBeWornAlone)];
  const bottoms = at("bottom");
  const ones = at("one_piece");
  const outerwear = at("outerwear");
  const footwear = at("footwear");
  const accessories = at("accessory");
  if (!ones.length && (!tops.length || !bottoms.length)) {
    const suggestions = [];
    if (!tops.length) suggestions.push("Add a top or a standalone hoodie/sweater, or a one-piece / set.");
    if (!bottoms.length) suggestions.push("Add a bottom to pair with a top, or a one-piece / set.");
    if (wardrobe.length && !items.length) suggestions.unshift("No garments match these occasion/season restrictions. Try another occasion or season, or add appropriately tagged pieces.");
    return { status: "incomplete", suggestions };
  }
  const seenSet = new Set(seen);
  const wearCount = new Map<string, number>();
  for (const entry of seen) {
    try {
      const ids: unknown = JSON.parse(entry);
      if (Array.isArray(ids)) for (const id of ids) if (typeof id === "string") wearCount.set(id, (wearCount.get(id) ?? 0) + 1);
    } catch { /* Ignore malformed history; no recommendations or metadata are mutated. */ }
  }
  let best: Recommendation | null = null;
  let bestRank = -Infinity;
  let compatible = false;
  const considerBase = (base: ClothingItem[]) => {
    const layers: (ClothingItem | undefined)[] = base.some((item) => slotOf(item) === "outerwear")
      ? [undefined] : [undefined, ...outerwear];
    for (const layer of layers) for (const shoe of [undefined, ...footwear]) {
      const initial = makeRecommendation(piecesFor([...base, ...(layer ? [layer] : []), ...(shoe ? [shoe] : [])]), items, context);
      if (!initial) continue;
      let candidate: Recommendation = initial;
      // Greedy accessories avoid a combinatorial explosion, but only attach
      // pieces that improve the score and remain valid (including accessory types).
      for (let count = 0; count < MAX_ACCESSORIES; count++) {
        let improved: Recommendation = candidate;
        for (const accessory of accessories) {
          const next = makeRecommendation([...candidate.pieces, { slot: "accessory", itemId: accessory.id, position: candidate.pieces.length }], items, context);
          if (next && next.score > improved.score) improved = next;
        }
        if (improved === candidate) break;
        candidate = improved;
      }
      compatible = true;
      if (seenSet.has(candidate.fingerprint)) continue;
      const rank = candidate.score - candidate.pieces.reduce((sum, piece) => sum + (wearCount.get(piece.itemId!) ?? 0) * 3, 0);
      if (rank > bestRank || (rank === bestRank && (!best ||
        candidate.pieces.length < best.pieces.length ||
        (candidate.pieces.length === best.pieces.length && candidate.fingerprint < best.fingerprint)))) {
        best = candidate;
        bestRank = rank;
      }
    }
  };
  for (const one of ones) considerBase([one]);
  for (const top of tops) for (const bottom of bottoms) considerBase([top, bottom]);
  if (best) return { status: "ready", recommendation: best };
  return compatible
    ? { status: "exhausted", suggestions: ["No more unseen ideas for these preferences. Restart ideas, change the occasion/season, or add more pieces."] }
    : { status: "incompatible", suggestions: ["Your wardrobe has base pieces, but no complete combination meets this occasion and season. Try another occasion/season, or add a suitable one-piece / set or matching top and bottom."] };
}
