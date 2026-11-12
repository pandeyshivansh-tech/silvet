import { describe, expect, it } from "vitest";
import { DEMO_ITEMS, DEMO_OUTFITS } from "@/data/demo/demoWardrobe";
import type { Outfit, OutfitPiece } from "@/domain/types";
import { orderOutfits, outfitCounts, outfitTitle, resolveOutfitPieces } from "./lookbookPresentation";

const outfit = DEMO_OUTFITS[0]!;
const item = DEMO_ITEMS[0]!;

describe("Lookbook presentation", () => {
  it("uses a readable fallback for null, blank, and whitespace names", () => {
    expect(outfitTitle({ name: null })).toBe("Untitled look");
    expect(outfitTitle({ name: "" })).toBe("Untitled look");
    expect(outfitTitle({ name: "  " })).toBe("Untitled look");
    expect(outfitTitle({ name: "  Fusion for campus  " })).toBe("Fusion for campus");
  });

  it("resolves actual wardrobe items in saved position order without mutating the outfit", () => {
    const pieces: OutfitPiece[] = [
      { slot: "bottom", itemId: DEMO_ITEMS[1]!.id, position: 5 },
      { slot: "top", itemId: item.id, position: 0 },
    ];
    const rows = resolveOutfitPieces({ pieces }, DEMO_ITEMS);
    expect(rows.map((row) => row.piece.position)).toEqual([0, 5]);
    expect(rows[0]?.item).toBe(item);
    expect(pieces[0]?.position).toBe(5);
  });

  it("retains both null references and unresolved ids as removed pieces", () => {
    const pieces: OutfitPiece[] = [
      { slot: "top", itemId: null, position: 0 },
      { slot: "bottom", itemId: "missing-id", position: 1 },
      { slot: "accessory", itemId: item.id, position: 2 },
    ];
    const rows = resolveOutfitPieces({ pieces }, DEMO_ITEMS);
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.item)).toEqual([null, null, item]);
    expect(outfitCounts(rows)).toEqual({ total: 3, available: 1, removed: 2 });
  });

  it("preserves removed accessory slots and stable keys even with repeated positions", () => {
    const pieces: OutfitPiece[] = [
      { slot: "accessory", itemId: null, position: 1 },
      { slot: "accessory", itemId: item.id, position: 1 },
      { slot: "accessory", itemId: null, position: 1 },
    ];
    const rows = resolveOutfitPieces({ pieces }, DEMO_ITEMS);
    expect(rows.map((row) => row.piece)).toEqual(pieces);
    expect(new Set(rows.map((row) => row.key)).size).toBe(3);
  });

  it("does not invent absent footwear, accessory, or other optional slots", () => {
    const rows = resolveOutfitPieces({ pieces: [{ slot: "one_piece", itemId: item.id, position: 0 }] }, DEMO_ITEMS);
    expect(rows).toHaveLength(1);
    expect(outfitCounts([])).toEqual({ total: 0, available: 0, removed: 0 });
  });

  it("handles outfits whose entire wardrobe has been removed", () => {
    const rows = resolveOutfitPieces(outfit, []);
    expect(rows).toHaveLength(outfit.pieces.length);
    expect(rows.every((row) => row.item === null)).toBe(true);
    expect(outfitCounts(rows).removed).toBe(outfit.pieces.length);
  });

  it("sorts by reliable updated timestamps, respecting timezone offsets", () => {
    const older = { ...outfit, id: "older", updatedAt: "2026-11-12T10:00:00+05:30" };
    const newer = { ...outfit, id: "newer", updatedAt: "2026-11-12T05:00:00Z" };
    const input = [older, newer];
    expect(orderOutfits(input).outfits.map((row) => row.id)).toEqual(["newer", "older"]);
    expect(orderOutfits(input).newestFirst).toBe(true);
    expect(input[0]).toBe(older);
  });

  it("preserves source order without a newest-first claim if timestamps are unreliable", () => {
    const input: Outfit[] = [outfit, { ...outfit, id: "legacy", updatedAt: "invalid" }];
    expect(orderOutfits(input)).toEqual({ outfits: input, newestFirst: false });
    expect(orderOutfits([])).toEqual({ outfits: [], newestFirst: false });
    expect(orderOutfits([{ ...outfit, updatedAt: "0" }]).newestFirst).toBe(false);
  });

  it("preserves input order for identical timestamps", () => {
    const second = { ...outfit, id: "second" };
    expect(orderOutfits([outfit, second]).outfits.map((row) => row.id)).toEqual([outfit.id, second.id]);
  });
});
