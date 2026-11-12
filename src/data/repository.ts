/**
 * The Repository contract. Every screen talks to data ONLY through this interface
 * (usually via the hooks in ./hooks.ts), so the same screens run on the demo wardrobe
 * and on a signed-in user's Supabase data without changes.
 *
 * Implementations:
 *   - DemoRepository     (./demo)     — bundled sample wardrobe, read-only items, session-only outfits
 *   - SupabaseRepository (./supabase) — WS6
 */
import type { ItemInput, OutfitInputValues } from "@/domain/schemas";
import type { ClothingItem, ImageRef, ImageUrls, Outfit, PreparedImage } from "@/domain/types";

export type RepositoryKind = "demo" | "supabase";

export type RepositoryErrorCode =
  | "demo_read_only"
  | "not_found"
  | "invalid"
  | "unauthenticated"
  | "network"
  | "storage"
  | "unknown";

export class RepositoryError extends Error {
  readonly code: RepositoryErrorCode;
  readonly fieldErrors?: Record<string, string>;

  constructor(code: RepositoryErrorCode, message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = "RepositoryError";
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export const isRepositoryError = (e: unknown): e is RepositoryError => e instanceof RepositoryError;

/** Friendly copy for any error a screen might show. */
export function errorMessage(e: unknown): string {
  if (isRepositoryError(e)) return e.message;
  if (e instanceof Error && /fetch|network/i.test(e.message)) return "You seem to be offline. Check your connection and try again.";
  return "Something went wrong. Please try again.";
}

export interface SaveOutfitArgs {
  /** Omit to create; pass to update an existing outfit. */
  id?: string;
  input: OutfitInputValues;
}

export interface CreateItemArgs {
  input: ItemInput;
  /** Photos are optional (D4). */
  image?: PreparedImage | null;
}

export interface UpdateItemArgs {
  id: string;
  input: ItemInput;
  /** undefined = keep current photo · null = remove photo · PreparedImage = replace photo */
  image?: PreparedImage | null;
}

export interface Repository {
  readonly kind: RepositoryKind;

  listItems(): Promise<ClothingItem[]>;
  getItem(id: string): Promise<ClothingItem | null>;
  createItem(args: CreateItemArgs): Promise<ClothingItem>;
  updateItem(args: UpdateItemArgs): Promise<ClothingItem>;
  /** Deletes the item and its photos. Outfits keep a placeholder for it (D5). */
  deleteItem(id: string): Promise<void>;
  /** How many saved outfits use this item — powers the delete warning. */
  countOutfitsUsingItem(id: string): Promise<number>;

  listOutfits(): Promise<Outfit[]>;
  getOutfit(id: string): Promise<Outfit | null>;
  saveOutfit(args: SaveOutfitArgs): Promise<Outfit>;
  deleteOutfit(id: string): Promise<void>;

  /** Batch-resolve displayable URLs for image refs, keyed by ref.path. */
  getImageUrls(refs: readonly ImageRef[]): Promise<Record<string, ImageUrls>>;
}
