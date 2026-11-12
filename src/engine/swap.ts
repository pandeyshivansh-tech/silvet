import { slotOf } from "@/domain/taxonomy";
import { makeRecommendation } from "./recommend";
import type { Recommendation, RecommendationContext, Wardrobe } from "./types";

/** Replace exactly one addressed piece. Everything else is locked. */
export function swapPiece(
  current: Recommendation, index: number, wardrobe: Wardrobe,
  context: RecommendationContext, seen: readonly string[] = [],
): Recommendation | null {
  const target = current.pieces[index];
  if (!target) return null;
  let best: Recommendation | null = null;
  for (const item of [...wardrobe].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)) {
    if (item.id === target.itemId || slotOf(item) !== target.slot) continue;
    const pieces = current.pieces.map((piece, i) => ({ ...piece, itemId: i === index ? item.id : piece.itemId }));
    const next = makeRecommendation(pieces, wardrobe, context);
    if (!next || seen.includes(next.fingerprint)) continue;
    if (!best || next.score > best.score || (next.score === best.score && next.fingerprint < best.fingerprint)) best = next;
  }
  return best;
}
