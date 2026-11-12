/**
 * Foundation row types derive from the existing domain, not a second app model.
 * Row fields and public-schema relationships are derived from migrations 001–004.
 * Cross-schema auth.users references are not selectable public-schema relationships.
 * Text allowlists are enforced by SQL checks and validated against domain schemas.
 */
import type { ClothingItem, Outfit, OutfitPiece, UserProfile } from "@/domain/types";
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json | undefined };
type Snake<S extends string> = S extends `${infer A}${infer B}` ?
  A extends Lowercase<A> ? `${A}${Snake<B>}` : `_${Lowercase<A>}${Snake<B>}` : S;
type Columns<T> = { [K in keyof T as K extends string ? Snake<K> : never]: T[K] };
type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};
type Table<Row, Required extends keyof Row, Relations extends Relationship[] = []> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>;
  Update: Partial<Row>;
  Relationships: Relations;
};
type OutfitItemRelationships = [
  {
    foreignKeyName: "outfit_items_outfit_id_user_id_fkey";
    columns: ["outfit_id", "user_id"];
    isOneToOne: false;
    referencedRelation: "saved_outfits";
    referencedColumns: ["id", "user_id"];
  },
  {
    foreignKeyName: "outfit_items_item_id_user_id_fkey";
    columns: ["item_id", "user_id"];
    isOneToOne: false;
    referencedRelation: "wardrobe_items";
    referencedColumns: ["id", "user_id"];
  },
];
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
      outfit_items: Table<OutfitItemRow, "outfit_id" | "slot" | "position", OutfitItemRelationships>;
      clothing_metadata: Table<MetadataRow, "kind" | "slug">;
    };
    Views: Record<string, never>;
    Functions: {
      silvet_save_outfit: { Args: { _input: Json; _id?: string | null }; Returns: string };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
