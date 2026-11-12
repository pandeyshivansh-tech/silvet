/**
 * DemoRepository — the sample wardrobe used before sign-up (D3).
 *
 * - Items are read-only: adding/editing/deleting clothes throws `demo_read_only`, and the UI
 *   responds with an honest "create an account to add your own clothes" prompt.
 * - Outfits are fully functional but session-only: saved to sessionStorage when available,
 *   otherwise in memory. They disappear when the tab closes, and the UI says so.
 */
import { outfitInputSchema, fieldErrors } from "@/domain/schemas";
import { checkOutfit, normalisePieces } from "@/domain/outfitRules";
import type { ClothingItem, ImageRef, ImageUrls, Outfit } from "@/domain/types";
import { RepositoryError, type Repository, type SaveOutfitArgs } from "../repository";
import { DEMO_ITEMS, DEMO_OUTFITS } from "./demoWardrobe";

const STORAGE_KEY = "silvet.demo.outfits.v1";

type KeyValueStore = Pick<Storage, "getItem" | "setItem">;

function safeSessionStorage(): KeyValueStore | null {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return null;
    const probe = "__silvet_probe__";
    window.sessionStorage.setItem(probe, "1");
    window.sessionStorage.removeItem(probe);
    return window.sessionStorage;
  } catch {
    return null;
  }
}

const readOnly = () =>
  new RepositoryError("demo_read_only", "This is the sample wardrobe. Create a free account to add your own clothes.");

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `demo-look-${crypto.randomUUID()}`;
  return `demo-look-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface DemoRepositoryOptions {
  items?: readonly ClothingItem[];
  outfits?: readonly Outfit[];
  /** Injectable for tests. Defaults to sessionStorage (or memory when unavailable). */
  store?: KeyValueStore | null;
  /** Base URL for demo images. Defaults to "/". */
  assetBase?: string;
}

export class DemoRepository implements Repository {
  readonly kind = "demo" as const;

  private readonly items: readonly ClothingItem[];
  private readonly itemsById: Map<string, ClothingItem>;
  private readonly store: KeyValueStore | null;
  private readonly assetBase: string;
  private outfits: Outfit[];

  constructor(options: DemoRepositoryOptions = {}) {
    this.items = options.items ?? DEMO_ITEMS;
    this.itemsById = new Map(this.items.map((i) => [i.id, i]));
    this.store = options.store === undefined ? safeSessionStorage() : options.store;
    this.assetBase = options.assetBase ?? "/";
    this.outfits = this.load(options.outfits ?? DEMO_OUTFITS);
  }

  /* ---------------- items ---------------- */

  async listItems(): Promise<ClothingItem[]> {
    return [...this.items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getItem(id: string): Promise<ClothingItem | null> {
    return this.itemsById.get(id) ?? null;
  }

  async createItem(): Promise<ClothingItem> {
    throw readOnly();
  }

  async updateItem(): Promise<ClothingItem> {
    throw readOnly();
  }

  async deleteItem(): Promise<void> {
    throw readOnly();
  }

  async countOutfitsUsingItem(id: string): Promise<number> {
    return this.outfits.filter((o) => o.pieces.some((p) => p.itemId === id)).length;
  }

  /* ---------------- outfits ---------------- */

  async listOutfits(): Promise<Outfit[]> {
    return [...this.outfits].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getOutfit(id: string): Promise<Outfit | null> {
    return this.outfits.find((o) => o.id === id) ?? null;
  }

  async saveOutfit({ id, input }: SaveOutfitArgs): Promise<Outfit> {
    const parsed = outfitInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new RepositoryError("invalid", "Please check the outfit details.", fieldErrors(parsed.error));
    }
    const pieces = normalisePieces(parsed.data.pieces);
    const check = checkOutfit(pieces, (itemId) => this.itemsById.get(itemId));
    if (!check.valid || !check.complete) {
      const first = check.issues[0];
      throw new RepositoryError("invalid", first?.message ?? "This outfit isn't complete yet.");
    }

    const now = new Date().toISOString();
    if (id) {
      const existing = this.outfits.find((o) => o.id === id);
      if (!existing) throw new RepositoryError("not_found", "That outfit no longer exists.");
      const updated: Outfit = { ...existing, ...parsed.data, pieces, updatedAt: now };
      this.outfits = this.outfits.map((o) => (o.id === id ? updated : o));
      this.persist();
      return updated;
    }

    const created: Outfit = { id: newId(), ...parsed.data, pieces, createdAt: now, updatedAt: now };
    this.outfits = [created, ...this.outfits];
    this.persist();
    return created;
  }

  async deleteOutfit(id: string): Promise<void> {
    const before = this.outfits.length;
    this.outfits = this.outfits.filter((o) => o.id !== id);
    if (this.outfits.length === before) throw new RepositoryError("not_found", "That outfit no longer exists.");
    this.persist();
  }

  /* ---------------- images ---------------- */

  async getImageUrls(refs: readonly ImageRef[]): Promise<Record<string, ImageUrls>> {
    const out: Record<string, ImageUrls> = {};
    for (const ref of refs) {
      out[ref.path] = { full: this.assetBase + ref.path, thumb: this.assetBase + ref.thumbPath };
    }
    return out;
  }

  /* ---------------- persistence ---------------- */

  private load(seed: readonly Outfit[]): Outfit[] {
    if (!this.store) return [...seed];
    try {
      const raw = this.store.getItem(STORAGE_KEY);
      if (!raw) return [...seed];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [...seed];
      // Keep only outfits whose pieces still reference known demo items (or removed placeholders).
      return (parsed as Outfit[]).filter(
        (o) => typeof o?.id === "string" && Array.isArray(o.pieces) && o.pieces.every((p) => p.itemId === null || this.itemsById.has(p.itemId)),
      );
    } catch {
      return [...seed];
    }
  }

  private persist(): void {
    if (!this.store) return;
    try {
      this.store.setItem(STORAGE_KEY, JSON.stringify(this.outfits));
    } catch {
      // Storage full or blocked — outfits still live in memory for this session.
    }
  }
}
