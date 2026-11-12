import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { checkOutfit, normalisePieces } from "@/domain/outfitRules";
import { fieldErrors, itemInputSchema, outfitInputSchema } from "@/domain/schemas";
import type { ClothingItem, ImageRef, ImageUrls, Outfit } from "@/domain/types";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { RepositoryError, type Repository, type CreateItemArgs, type UpdateItemArgs, type SaveOutfitArgs } from "../repository";
import { itemColumns, mapItem, mapOutfit } from "./mapping";

type Failure = { code?: string; message?: string };
function databaseError(error: Failure): RepositoryError {
  if (error.code === "PGRST202")
    return new RepositoryError("invalid", "Outfit saving is not ready yet. Migration 004 must be applied before saving looks.");
  if (["PGRST301", "PGRST302", "42501", "bad_jwt"].includes(error.code ?? ""))
    return new RepositoryError("unauthenticated", "Your session may have expired. Please sign in again.");
  if (error.code === "P0002")
    return new RepositoryError("not_found", "That look no longer exists in your account.");
  if (["22023", "22P02", "23503", "23505", "23514", "23502"].includes(error.code ?? ""))
    return new RepositoryError("invalid", "These details could not be saved. Check your pieces and try again.");
  if (!error.code || /fetch|network/i.test(error.message ?? ""))
    return new RepositoryError("network", "We couldn’t reach your wardrobe. Check your connection and try again.");
  return new RepositoryError("unknown", "Your account data could not be loaded or saved. Please try again.");
}
function checked<T>(response: { data: T; error: Failure | null }): T {
  if (response.error) throw databaseError(response.error);
  return response.data;
}
function required<T>(value: T | null): T {
  if (value === null) throw new RepositoryError("not_found", "That piece or look no longer exists in your account.");
  return value;
}
async function pages<T>(read: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: Failure | null }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const page = checked(await read(from, from + 999)) ?? [];
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

/** A repository instance is permanently bound to ONE verified account. RLS remains authoritative. */
export class SupabaseRepository implements Repository {
  readonly kind = "supabase" as const;
  constructor(
    readonly userId: string,
    private readonly client: SupabaseClient<Database> = getSupabaseClient(),
  ) { z.uuid().parse(userId); }

  private async operation<T>(run: () => Promise<T>): Promise<T> {
    try {
      const auth = await this.client.auth.getUser();
      if (auth.error) throw databaseError(auth.error);
      const user = auth.data.user;
      if (user?.id !== this.userId || !user.email_confirmed_at)
        throw new RepositoryError("unauthenticated", "Please sign in again before using your wardrobe.");
      const result = await run();
      // A request started by A must not report success or return A's data after
      // logout/account switching. The keyed product subtree also resets local drafts.
      const session = await this.client.auth.getSession();
      if (session.error) throw databaseError(session.error);
      const current = session.data.session;
      if (current?.user.id !== this.userId)
        throw new RepositoryError("unauthenticated", "The signed-in account changed. Please try again.");
      return result;
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      if (error instanceof z.ZodError)
        throw new RepositoryError("invalid", "Some wardrobe data is invalid. Please check the details and retry.", fieldErrors(error));
      throw databaseError(error instanceof Error ? error : {});
    }
  }
  private async items(): Promise<ClothingItem[]> {
    return (await pages((from, to) => this.client.from("wardrobe_items").select("*").eq("user_id", this.userId)
      .order("updated_at", { ascending: false }).order("id").range(from, to))).map((row) => mapItem(row, this.userId));
  }
  private async outfit(id: string): Promise<Outfit | null> {
    const row = checked(await this.client.from("saved_outfits").select("*").eq("user_id", this.userId).eq("id", id).maybeSingle());
    if (!row) return null;
    const pieces = await pages((from, to) => this.client.from("outfit_items").select("*").eq("user_id", this.userId)
      .eq("outfit_id", id).order("position").range(from, to));
    return mapOutfit(row, pieces, this.userId);
  }
  listItems() { return this.operation(() => this.items()); }
  getItem(id: string) {
    return this.operation(async () => {
      const row = checked(await this.client.from("wardrobe_items").select("*").eq("user_id", this.userId).eq("id", id).maybeSingle());
      return row ? mapItem(row, this.userId) : null;
    });
  }
  createItem({ input, image }: CreateItemArgs) {
    return this.operation(async () => {
      if (image) throw new RepositoryError("storage", "Image uploads are not available yet. Save clothing details without an image.");
      const values = itemColumns(itemInputSchema.parse(input));
      return mapItem(required(checked(await this.client.from("wardrobe_items")
        .insert({ ...values, user_id: this.userId }).select("*").single())), this.userId);
    });
  }
  updateItem({ id, input, image }: UpdateItemArgs) {
    return this.operation(async () => {
      if (image !== undefined)
        throw new RepositoryError("storage", "Image replacement and removal are not available yet. Your existing image is unchanged.");
      return mapItem(required(checked(await this.client.from("wardrobe_items")
        .update(itemColumns(itemInputSchema.parse(input))).eq("user_id", this.userId).eq("id", id)
        .select("*").maybeSingle())), this.userId);
    });
  }
  deleteItem(id: string) {
    return this.operation(async () => {
      // Migration 001's composite FK SET NULL retains outfit slot/position.
      required(checked(await this.client.from("wardrobe_items").delete().eq("user_id", this.userId)
        .eq("id", id).select("id").maybeSingle()));
    });
  }
  countOutfitsUsingItem(id: string) {
    return this.operation(async () => {
      const response = await this.client.from("outfit_items").select("outfit_id", { count: "exact", head: true })
        .eq("user_id", this.userId).eq("item_id", id);
      checked(response);
      // The live-item unique index guarantees each matching row is a distinct outfit.
      if (typeof response.count !== "number") throw new RepositoryError("unknown", "We couldn’t count the saved looks using this piece. Please retry.");
      return response.count;
    });
  }
  listOutfits() {
    return this.operation(async () => {
      const [outfits, pieces] = await Promise.all([
        pages((from, to) => this.client.from("saved_outfits").select("*").eq("user_id", this.userId)
          .order("updated_at", { ascending: false }).order("id").range(from, to)),
        pages((from, to) => this.client.from("outfit_items").select("*").eq("user_id", this.userId)
          .order("outfit_id").order("position").range(from, to)),
      ]);
      return outfits.map((outfit) => mapOutfit(outfit, pieces.filter((p) => p.outfit_id === outfit.id), this.userId));
    });
  }
  getOutfit(id: string) { return this.operation(() => this.outfit(id)); }
  saveOutfit({ id, input }: SaveOutfitArgs) {
    return this.operation(async () => {
      const parsed = outfitInputSchema.parse(input);
      const pieces = normalisePieces(parsed.pieces);
      const items = new Map((await this.items()).map((item) => [item.id, item]));
      const check = checkOutfit(pieces, (key) => items.get(key));
      if (!check.valid || !check.complete)
        throw new RepositoryError("invalid", check.issues[0]?.message ?? "Complete your outfit before saving.");
      const savedId = required(checked(await this.client.rpc("silvet_save_outfit", {
        _input: { ...parsed, pieces: pieces.map((p) => ({ ...p })) }, _id: id ?? null,
      })));
      return required(await this.outfit(savedId));
    });
  }
  deleteOutfit(id: string) {
    return this.operation(async () => {
      required(checked(await this.client.from("saved_outfits").delete().eq("user_id", this.userId)
        .eq("id", id).select("id").maybeSingle()));
    });
  }
  async getImageUrls(_refs: readonly ImageRef[]): Promise<Record<string, ImageUrls>> {
    // No signed URL generation, uploads, object URLs, or invented persistent images
    // in this milestone. Ref metadata is retained; screens use existing placeholders.
    return {};
  }
}
