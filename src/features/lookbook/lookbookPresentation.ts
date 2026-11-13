import type { ClothingItem, Outfit, OutfitPiece, OutfitSource } from "@/domain/types";
import { OCCASIONS, type OccasionSlug } from "@/domain/taxonomy";

export interface ResolvedOutfitPiece {
  piece: OutfitPiece;
  item: ClothingItem | null;
  key: string;
}

export function outfitTitle(outfit: Pick<Outfit, "name">): string {
  return outfit.name?.trim() || "Untitled look";
}

/** Resolve every saved slot, never silently dropping a missing wardrobe reference. */
export function resolveOutfitPieces(
  outfit: Pick<Outfit, "pieces">,
  items: readonly ClothingItem[],
): ResolvedOutfitPiece[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  return outfit.pieces
    .map((piece, index) => ({
      piece,
      item: piece.itemId === null ? null : byId.get(piece.itemId) ?? null,
      key: `${piece.slot}-${piece.position}-${index}`,
    }))
    .sort((a, b) => a.piece.position - b.piece.position);
}

export function outfitCounts(rows: readonly ResolvedOutfitPiece[]) {
  const available = rows.filter((row) => row.item !== null).length;
  return { total: rows.length, available, removed: rows.length - available };
}

/** Don't claim newest-first ordering when timestamps are missing or malformed. */
export function orderOutfits(outfits: readonly Outfit[]): { outfits: Outfit[]; newestFirst: boolean } {
  const timestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
  const reliable = outfits.every((outfit) =>
    timestamp.test(outfit.updatedAt) && Number.isFinite(Date.parse(outfit.updatedAt)),
  );
  return {
    outfits: reliable
      ? [...outfits].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      : [...outfits],
    newestFirst: outfits.length > 0 && reliable,
  };
}

/** How the look was made, in the words the Lookbook uses ("4 pieces · from Ideas"). */
export function sourceLabel(source: OutfitSource): string {
  return source === "suggestion" ? "from Ideas" : "built in Studio";
}

/**
 * Occasions every tagged piece in the look shares, in taxonomy order. Needs at least two tagged pieces,
 * so one garment's tags are never presented as the look's context. Untagged pieces don't veto.
 */
export function sharedOccasions(rows: readonly ResolvedOutfitPiece[]): OccasionSlug[] {
  const tagged = rows.flatMap((row) => (row.item && row.item.occasionTags.length > 0 ? [row.item.occasionTags] : []));
  if (tagged.length < 2) return [];
  return OCCASIONS.map((occasion) => occasion.slug).filter((slug) => tagged.every((tags) => tags.includes(slug)));
}

const BASE_ORDER: readonly OutfitPiece["slot"][] = ["one_piece", "top", "bottom", "outerwear"];

/** Flat-lay order: the base and layer first (top to toe), then footwear and accessories. Saved order breaks ties. */
export function flatLay(rows: readonly ResolvedOutfitPiece[]) {
  return {
    main: BASE_ORDER.flatMap((slot) => rows.filter((row) => row.piece.slot === slot)),
    finishing: [...rows.filter((row) => row.piece.slot === "footwear"), ...rows.filter((row) => row.piece.slot === "accessory")],
  };
}
