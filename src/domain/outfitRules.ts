/**
 * Outfit structure rules shared by the builder, the repositories and the suggestion engine.
 * One implementation, so a saved outfit, a built outfit and a suggested outfit can never disagree.
 *
 * Valid base (Strategy v2 §7):
 *   (top OR outerwear-that-can-be-worn-alone) + bottom
 *   OR one-piece/set
 * Plus: ≤1 outerwear (not counted twice when it acts as the top), ≤1 footwear,
 *       ≤2 accessories with at most one per subcategory. No duplicates.
 *       A one-piece never combines with a top or bottom.
 */
import type { ClothingItem, OutfitPiece } from "./types";
import { MAX_ACCESSORIES, SINGLE_ITEM_SLOTS, canBeWornAlone, slotOf, type Slot } from "./taxonomy";

export type OutfitIssueCode =
  | "duplicate_item"
  | "slot_occupied"
  | "too_many_accessories"
  | "duplicate_accessory_type"
  | "one_piece_with_separates"
  | "slot_mismatch"
  | "missing_base"
  | "unknown_item";

export interface OutfitIssue {
  code: OutfitIssueCode;
  message: string;
  slot?: Slot;
}

export interface OutfitCheck {
  /** Structure has no conflicts (it may still be incomplete). */
  valid: boolean;
  /** Has a wearable base: separates or a one-piece. Required to save. */
  complete: boolean;
  issues: OutfitIssue[];
}

type ItemLookup = (id: string) => Pick<ClothingItem, "id" | "categorySlug" | "subcategorySlug"> | undefined;

export function checkOutfit(pieces: readonly OutfitPiece[], lookup: ItemLookup): OutfitCheck {
  const issues: OutfitIssue[] = [];
  const seen = new Set<string>();
  const bySlot = new Map<Slot, OutfitPiece[]>();

  for (const piece of pieces) {
    // Deleted garments remain in saved outfits as visual placeholders, but they are
    // not selections and must not affect capacity, conflicts, or completeness.
    if (piece.itemId === null) continue;

    const list = bySlot.get(piece.slot) ?? [];
    list.push(piece);
    bySlot.set(piece.slot, list);

    if (seen.has(piece.itemId)) {
      issues.push({ code: "duplicate_item", message: "The same piece is in this outfit twice.", slot: piece.slot });
    }
    seen.add(piece.itemId);

    const item = lookup(piece.itemId);
    if (!item) {
      issues.push({ code: "unknown_item", message: "One of these pieces is no longer in the wardrobe.", slot: piece.slot });
      continue;
    }
    if (slotOf(item) !== piece.slot) {
      issues.push({ code: "slot_mismatch", message: "A piece is in the wrong slot.", slot: piece.slot });
    }
  }

  for (const slot of SINGLE_ITEM_SLOTS) {
    if ((bySlot.get(slot)?.length ?? 0) > 1) {
      issues.push({ code: "slot_occupied", message: `Only one ${slot.replace("_", "-")} fits in an outfit.`, slot });
    }
  }

  const accessories = bySlot.get("accessory") ?? [];
  if (accessories.length > MAX_ACCESSORIES) {
    issues.push({ code: "too_many_accessories", message: `Keep it to ${MAX_ACCESSORIES} accessories.`, slot: "accessory" });
  }
  const accessoryTypes = new Set<string>();
  for (const piece of accessories) {
    const sub = piece.itemId ? lookup(piece.itemId)?.subcategorySlug : null;
    if (!sub) continue;
    if (accessoryTypes.has(sub)) {
      issues.push({ code: "duplicate_accessory_type", message: "Two accessories of the same type.", slot: "accessory" });
    }
    accessoryTypes.add(sub);
  }

  const has = (slot: Slot) => (bySlot.get(slot)?.length ?? 0) > 0;
  if (has("one_piece") && (has("top") || has("bottom"))) {
    issues.push({
      code: "one_piece_with_separates",
      message: "A one-piece or set is a complete look — remove the top/bottom or the set.",
      slot: "one_piece",
    });
  }

  const outerwearPiece = bySlot.get("outerwear")?.[0];
  const outerwearItem = outerwearPiece?.itemId ? lookup(outerwearPiece.itemId) : undefined;
  const outerwearActsAsTop = !has("top") && outerwearItem !== undefined && canBeWornAlone(outerwearItem);

  const separatesBase = (has("top") || outerwearActsAsTop) && has("bottom");
  const complete = has("one_piece") || separatesBase;
  if (!complete) {
    issues.push({ code: "missing_base", message: "Add a top and a bottom, or a one-piece." });
  }

  const blocking = issues.filter((i) => i.code !== "missing_base");
  return { valid: blocking.length === 0, complete, issues };
}

/** Normalises positions so they are 0..n-1 in a stable slot order. */
const SLOT_ORDER: Slot[] = ["outerwear", "top", "one_piece", "bottom", "footwear", "accessory"];
export function normalisePieces(pieces: readonly OutfitPiece[]): OutfitPiece[] {
  return [...pieces]
    .sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot) || a.position - b.position)
    .map((p, i) => ({ ...p, position: i }));
}
