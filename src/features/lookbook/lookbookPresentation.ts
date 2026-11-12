import type { ClothingItem, Outfit, OutfitPiece } from "@/domain/types";

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
