import { z } from "zod";
import { itemInputSchema, outfitInputSchema } from "@/domain/schemas";
import type { ClothingItem, Outfit } from "@/domain/types";
import type { OutfitItemRow, SavedOutfitRow, WardrobeItemRow } from "@/lib/supabase/database.types";
import { RepositoryError } from "../repository";

const identity = z.uuid();
const timestamp = z.iso.datetime({ offset: true });

/** Treat database responses as a trust boundary, even with a typed SDK. */
export function mapItem(row: WardrobeItemRow, userId: string): ClothingItem {
  if (row.user_id !== userId) throw new RepositoryError("unauthenticated", "Please sign in to the correct account.");
  const input = itemInputSchema.parse({
    name: row.name, categorySlug: row.category_slug, subcategorySlug: row.subcategory_slug,
    primaryColor: row.primary_color, secondaryColor: row.secondary_color, pattern: row.pattern,
    styleTags: row.style_tags, occasionTags: row.occasion_tags, seasonTags: row.season_tags,
  });
  if ((row.image_path === null) !== (row.image_thumb_path === null))
    throw new RepositoryError("invalid", "This piece has incomplete image information.");
  return {
    ...input, id: identity.parse(row.id), createdAt: timestamp.parse(row.created_at), updatedAt: timestamp.parse(row.updated_at),
    image: row.image_path && row.image_thumb_path ? { path: row.image_path, thumbPath: row.image_thumb_path } : null,
  };
}

export function mapOutfit(row: SavedOutfitRow, pieces: OutfitItemRow[], userId: string): Outfit {
  if (row.user_id !== userId || pieces.some((p) => p.user_id !== userId || p.outfit_id !== row.id))
    throw new RepositoryError("unauthenticated", "Please sign in to the correct account.");
  const positions = new Set<number>();
  const input = outfitInputSchema.parse({
    name: row.name, notes: row.notes, source: row.source,
    pieces: pieces.map((p) => {
      if (positions.has(p.position)) throw new RepositoryError("invalid", "This look has conflicting piece positions.");
      positions.add(p.position);
      return { slot: p.slot, position: p.position, itemId: p.item_id === null ? null : identity.parse(p.item_id) };
    }).sort((a, b) => a.position - b.position),
  });
  return { ...input, id: identity.parse(row.id), createdAt: timestamp.parse(row.created_at), updatedAt: timestamp.parse(row.updated_at) };
}

export function itemColumns(input: z.infer<typeof itemInputSchema>) {
  return {
    name: input.name, category_slug: input.categorySlug, subcategory_slug: input.subcategorySlug,
    primary_color: input.primaryColor, secondary_color: input.secondaryColor, pattern: input.pattern,
    style_tags: input.styleTags, occasion_tags: input.occasionTags, season_tags: input.seasonTags,
  };
}
