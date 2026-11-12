/**
 * Foundation row types derive from the existing domain, not a second app model.
 * Regenerate official Supabase CLI database types when live repository work begins.
 */
import type { ClothingItem, Outfit, OutfitPiece, UserProfile } from "@/domain/types";
type Snake<S extends string> = S extends `${infer A}${infer B}` ?
  A extends Lowercase<A> ? `${A}${Snake<B>}` : `_${Lowercase<A>}${Snake<B>}` : S;
type Columns<T> = { [K in keyof T as K extends string ? Snake<K> : never]: T[K] };
type Table<Row, Required extends keyof Row> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>;
  Update: Partial<Row>;
  Relationships: [];
};
export type ProfileRow = Columns<UserProfile> & { created_at: string; updated_at: string };
export type WardrobeItemRow = Omit<Columns<ClothingItem>, "image"> & {
  user_id: string;
  image_path: string | null;
  image_thumb_path: string | null;
};
export type SavedOutfitRow = Omit<Columns<Outfit>, "pieces"> & { user_id: string };
export type OutfitItemRow = Columns<OutfitPiece> & { id: string; user_id: string; outfit_id: string };
export type MetadataRow = {
  kind: "category" | "subcategory" | "color" | "pattern" | "style" | "occasion" | "season";
  slug: string;
  category_slug: string | null;
  slot: OutfitPiece["slot"] | null;
};
export interface Database {
  public: {
    Tables: {
      profiles: Table<ProfileRow, "id">;
      wardrobe_items: Table<WardrobeItemRow, "name" | "category_slug">;
      saved_outfits: Table<SavedOutfitRow, never>;
      outfit_items: Table<OutfitItemRow, "outfit_id" | "slot" | "position">;
      clothing_metadata: Table<MetadataRow, "kind" | "slug">;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
