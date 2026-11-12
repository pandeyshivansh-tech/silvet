/**
 * DemoRepository — the sample wardrobe used before sign-up (D3).
 *
 * - Clothing changes and outfits are session-only. Photos cannot be uploaded in demo mode.
 * - Outfits are fully functional but session-only: saved to sessionStorage when available,
 *   otherwise in memory. They disappear when the tab closes, and the UI says so.
 */
import { itemInputSchema, outfitInputSchema, fieldErrors } from "@/domain/schemas";
import { checkOutfit, normalisePieces } from "@/domain/outfitRules";
import type { ClothingItem, ImageRef, ImageUrls, Outfit } from "@/domain/types";
import { RepositoryError, type CreateItemArgs, type UpdateItemArgs, type Repository, type SaveOutfitArgs } from "../repository";
import { DEMO_ITEMS, DEMO_OUTFITS } from "./demoWardrobe";

const STORAGE_KEY = "silvet.demo.outfits.v1";
const ITEMS_STORAGE_KEY = "silvet.demo.items.v1";
const STATE_STORAGE_KEY = "silvet.demo.state.v1";

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

function newId(prefix = "demo-look"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
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

  private readonly itemsById: Map<string, ClothingItem>;
  private readonly store: KeyValueStore | null;
  private readonly assetBase: string;
  private outfits: Outfit[];

  constructor(options: DemoRepositoryOptions = {}) {
    this.store = options.store === undefined ? safeSessionStorage() : options.store;
    const snapshot = this.loadSnapshot();
    const items = snapshot?.items ?? this.loadItems(options.items ?? DEMO_ITEMS);
    this.itemsById = new Map(items.map((i) => [i.id, i]));
    this.assetBase = options.assetBase ?? "/";
    this.outfits = snapshot?.outfits ?? this.load(options.outfits ?? DEMO_OUTFITS);
  }

  /* ---------------- items ---------------- */

  async listItems(): Promise<ClothingItem[]> {
    return [...this.itemsById.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getItem(id: string): Promise<ClothingItem | null> {
    return this.itemsById.get(id) ?? null;
  }

  async createItem({ input, image }: CreateItemArgs): Promise<ClothingItem> {
    const parsed = itemInputSchema.safeParse(input);
    if (!parsed.success) throw new RepositoryError("invalid", "Please check the piece details.", fieldErrors(parsed.error));
    if (image) throw new RepositoryError("storage", "Photos cannot be stored in the demo. Save this piece without a photo.");
    const now = new Date().toISOString();
    const created: ClothingItem = { ...parsed.data, id: newId("demo-item"), image: null, createdAt: now, updatedAt: now };
    this.itemsById.set(created.id, created);
    this.persistState();
    return created;
  }

  async updateItem({ id, input, image }: UpdateItemArgs): Promise<ClothingItem> {
    const existing = this.itemsById.get(id);
    if (!existing) throw new RepositoryError("not_found", "That piece no longer exists.");
    const parsed = itemInputSchema.safeParse(input);
    if (!parsed.success) throw new RepositoryError("invalid", "Please check the piece details.", fieldErrors(parsed.error));
    if (image) throw new RepositoryError("storage", "Photos cannot be stored in the demo. Save this piece without a photo.");
    const updated: ClothingItem = {
      ...existing, ...parsed.data, image: image === null ? null : existing.image, updatedAt: new Date().toISOString(),
    };
    this.itemsById.set(id, updated);
    this.persistState();
    return updated;
  }

  async deleteItem(id: string): Promise<void> {
    if (!this.itemsById.has(id)) throw new RepositoryError("not_found", "That piece no longer exists.");
    const nextItems = new Map(this.itemsById);
    nextItems.delete(id);
    const nextOutfits = this.outfits.map((outfit) => ({
      ...outfit,
      pieces: outfit.pieces.map((piece) => piece.itemId === id ? { ...piece, itemId: null } : piece),
    }));
    if (!this.persistState([...nextItems.values()], nextOutfits)) {
      throw new RepositoryError("storage", "This piece could not be removed because the demo changes could not be saved. Try again.");
    }
    this.itemsById.delete(id);
    this.outfits = nextOutfits;
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
      this.persistState();
      return updated;
    }

    const created: Outfit = { id: newId(), ...parsed.data, pieces, createdAt: now, updatedAt: now };
    this.outfits = [created, ...this.outfits];
    this.persistState();
    return created;
  }

  async deleteOutfit(id: string): Promise<void> {
    const before = this.outfits.length;
    this.outfits = this.outfits.filter((o) => o.id !== id);
    if (this.outfits.length === before) throw new RepositoryError("not_found", "That outfit no longer exists.");
    this.persistState();
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

  private loadSnapshot(): { items: ClothingItem[]; outfits: Outfit[] } | null {
    if (!this.store) return null;
    try {
      const raw = this.store.getItem(STATE_STORAGE_KEY);
      if (!raw) return null;
      const value: unknown = JSON.parse(raw);
      if (!value || typeof value !== "object") return null;
      const snapshot = value as Record<string, unknown>;
      if (snapshot.version !== 1) return null;
      const items = this.parseItems(snapshot.items);
      if (!items) return null;
      const outfits = this.parseOutfits(snapshot.outfits, new Set(items.map((item) => item.id)));
      return outfits ? { items, outfits } : null;
    } catch {
      return null;
    }
  }

  private parseItems(data: unknown): ClothingItem[] | null {
    if (!Array.isArray(data)) return null;
    const loaded: ClothingItem[] = [];
    for (const value of data) {
      if (!value || typeof value !== "object") return null;
      const row = value as Record<string, unknown>;
      const parsed = itemInputSchema.safeParse(row);
      if (!parsed.success || typeof row.id !== "string" || !row.id ||
        typeof row.createdAt !== "string" || typeof row.updatedAt !== "string") return null;
      let image: ImageRef | null = null;
      if (row.image !== null) {
        if (!row.image || typeof row.image !== "object") return null;
        const ref = row.image as Record<string, unknown>;
        if (typeof ref.path !== "string" || typeof ref.thumbPath !== "string") return null;
        image = { path: ref.path, thumbPath: ref.thumbPath };
      }
      loaded.push({ ...parsed.data, id: row.id, image, createdAt: row.createdAt, updatedAt: row.updatedAt });
    }
    return loaded;
  }

  private parseOutfits(data: unknown, itemIds: ReadonlySet<string>): Outfit[] | null {
    if (!Array.isArray(data)) return null;
    const loaded: Outfit[] = [];
    for (const value of data) {
      if (!value || typeof value !== "object") return null;
      const row = value as Record<string, unknown>;
      const parsed = outfitInputSchema.safeParse(row);
      if (!parsed.success || typeof row.id !== "string" || !row.id ||
        typeof row.createdAt !== "string" || typeof row.updatedAt !== "string") return null;
      const pieces = parsed.data.pieces.map((piece) =>
        piece.itemId !== null && !itemIds.has(piece.itemId) ? { ...piece, itemId: null } : piece,
      );
      loaded.push({ ...parsed.data, id: row.id, createdAt: row.createdAt, updatedAt: row.updatedAt, pieces });
    }
    return loaded;
  }

  private loadItems(seed: readonly ClothingItem[]): ClothingItem[] {
    if (!this.store) return [...seed];
    try {
      const raw = this.store.getItem(ITEMS_STORAGE_KEY);
      if (!raw) return [...seed];
      return this.parseItems(JSON.parse(raw)) ?? [...seed];
    } catch {
      return [...seed];
    }
  }

  private load(seed: readonly Outfit[]): Outfit[] {
    if (!this.store) return [...seed];
    try {
      const raw = this.store.getItem(STORAGE_KEY);
      if (!raw) return [...seed];
      // Keep legacy saved looks, converting references lost by the old two-key
      // persistence flow into the same placeholders used for explicit item deletes.
      return this.parseOutfits(JSON.parse(raw), new Set(this.itemsById.keys())) ?? [...seed];
    } catch {
      return [...seed];
    }
  }

  private persistState(
    items: readonly ClothingItem[] = [...this.itemsById.values()],
    outfits: readonly Outfit[] = this.outfits,
  ): boolean {
    if (!this.store) return true;
    try {
      // A single storage write keeps wardrobe changes and removed-item references
      // in one atomic snapshot. A failed write leaves the previous snapshot intact.
      this.store.setItem(STATE_STORAGE_KEY, JSON.stringify({
        version: 1,
        items,
        outfits,
      }));
      return true;
    } catch {
      return false;
    }
  }
}
