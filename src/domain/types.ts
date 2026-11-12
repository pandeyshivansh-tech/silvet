/**
 * Domain types shared by the UI, the repositories (demo + Supabase), the suggestion engine and tests.
 * Field names are camelCase here; the Supabase repository maps them to snake_case columns
 * (see Strategy v2 §6 — e.g. categorySlug ↔ category_slug).
 */
import type { OccasionSlug, PatternSlug, SeasonSlug, Slot, StyleSlug } from "./taxonomy";

/**
 * A reference to a stored image. These are storage keys, never public URLs —
 * the repository turns them into displayable URLs (signed URLs for Supabase, static paths for the demo).
 */
export interface ImageRef {
  path: string;
  thumbPath: string;
}

export interface ClothingItem {
  id: string;
  name: string;
  categorySlug: string;
  subcategorySlug: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  pattern: PatternSlug | null;
  styleTags: StyleSlug[];
  occasionTags: OccasionSlug[];
  seasonTags: SeasonSlug[];
  /** Photos are optional (D4). null → the UI shows the designed placeholder. */
  image: ImageRef | null;
  createdAt: string;
  updatedAt: string;
}

export interface OutfitPiece {
  slot: Slot;
  /** null when the referenced item was deleted — the UI shows a "removed item" placeholder (D5). */
  itemId: string | null;
  position: number;
}

export type OutfitSource = "manual" | "suggestion";

export interface Outfit {
  id: string;
  name: string | null;
  notes: string | null;
  source: OutfitSource;
  pieces: OutfitPiece[];
  createdAt: string;
  updatedAt: string;
}

/** Displayable URLs for an item image. */
export interface ImageUrls {
  thumb: string;
  full: string;
}

/** An image prepared on-device (cropped, resized, re-encoded) and ready to upload. Produced by lib/images (WS6). */
export interface PreparedImage {
  full: Blob;
  thumb: Blob;
  /** e.g. "image/webp" */
  mimeType: string;
}

export interface UserProfile {
  id: string;
  displayName: string | null;
  stylePreferences: StyleSlug[];
  onboardingCompletedAt: string | null;
}
