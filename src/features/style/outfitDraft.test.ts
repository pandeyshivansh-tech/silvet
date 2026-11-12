import { describe, expect, it } from "vitest";
import { DEMO_ITEMS, DEMO_OUTFITS } from "@/data/demo/demoWardrobe";
import { OUTFIT_NAME_MAX } from "@/domain/schemas";
import { MAX_ACCESSORIES, slotOf } from "@/domain/taxonomy";
import {
  createDraft, draftInput, removeDraftPiece, selectDraftPiece,
  switchDraftMode, switchWouldDiscard, validateDraft, type OutfitDraft,
} from "./outfitDraft";

const top = DEMO_ITEMS.find((item) => slotOf(item) === "top")!;
const otherTop = DEMO_ITEMS.find((item) => slotOf(item) === "top" && item.id !== top.id)!;
const bottom = DEMO_ITEMS.find((item) => slotOf(item) === "bottom")!;
const onePiece = DEMO_ITEMS.find((item) => slotOf(item) === "one_piece")!;
const layer = DEMO_ITEMS.find((item) => slotOf(item) === "outerwear")!;
const footwear = DEMO_ITEMS.find((item) => slotOf(item) === "footwear")!;
const accessories = DEMO_ITEMS.filter((item) => slotOf(item) === "accessory");
const separates = () => selectDraftPiece(selectDraftPiece(createDraft(), { slot: "top" }, top), { slot: "bottom" }, bottom);

describe("outfit draft", () => {
  it("starts empty, incomplete, and not saveable", () => {
    const result = validateDraft(createDraft(), DEMO_ITEMS);
    expect(result.check.complete).toBe(false);
    expect(result.canSave).toBe(false);
  });

  it("selects separates and allows a complete base with optional footwear", () => {
    expect(validateDraft(separates(), DEMO_ITEMS).canSave).toBe(true);
    const withShoes = selectDraftPiece(separates(), { slot: "footwear" }, footwear);
    expect(validateDraft(withShoes, DEMO_ITEMS).canSave).toBe(true);
  });

  it("replaces rather than duplicates the selected top, without mutating the old draft", () => {
    const original = separates();
    const replacement = selectDraftPiece(original, { slot: "top" }, otherTop);
    expect(replacement.pieces.filter((piece) => piece.slot === "top")).toHaveLength(1);
    expect(replacement.pieces.find((piece) => piece.slot === "top")?.itemId).toBe(otherTop.id);
    expect(original.pieces.find((piece) => piece.slot === "top")?.itemId).toBe(top.id);
  });

  it("replaces a removed garment in its exact slot and original position", () => {
    const draft: OutfitDraft = { ...separates(), pieces: [
      { slot: "top", itemId: null, position: 4 },
      { slot: "bottom", itemId: bottom.id, position: 7 },
    ] };
    expect(validateDraft(draft, DEMO_ITEMS).canSave).toBe(false);
    const replaced = selectDraftPiece(draft, { slot: "top" }, top);
    expect(replaced.pieces[0]).toEqual({ slot: "top", itemId: top.id, position: 4 });
    expect(validateDraft(replaced, DEMO_ITEMS).canSave).toBe(true);
  });

  it("removes only the addressed garment and makes missing bases unsaveable", () => {
    const draft = removeDraftPiece(separates(), { slot: "top" });
    expect(draft.pieces.map((piece) => piece.itemId)).toEqual([bottom.id]);
    expect(validateDraft(draft, DEMO_ITEMS).canSave).toBe(false);
    expect(removeDraftPiece(draft, { slot: "footwear" })).toBe(draft);
  });

  it("refuses a mismatched slot", () => {
    const draft = createDraft();
    expect(selectDraftPiece(draft, { slot: "top" }, bottom)).toBe(draft);
  });

  it("requires confirmation before discarding separates and preserves optional pieces", () => {
    const draft = selectDraftPiece(separates(), { slot: "outerwear" }, layer);
    expect(switchWouldDiscard(draft, "one_piece")).toBe(true);
    expect(switchDraftMode(draft, "one_piece")).toBe(draft);
    const switched = switchDraftMode(draft, "one_piece", true);
    expect(switched.mode).toBe("one_piece");
    expect(switched.pieces.map((piece) => piece.itemId)).toEqual([layer.id]);
    expect(validateDraft(switched, DEMO_ITEMS).canSave).toBe(false);
    expect(validateDraft(selectDraftPiece(switched, { slot: "one_piece" }, onePiece), DEMO_ITEMS).canSave).toBe(true);
  });

  it("requires confirmation in the other direction, including removed one-piece markers", () => {
    let draft = switchDraftMode(createDraft(), "one_piece");
    draft = selectDraftPiece(draft, { slot: "one_piece" }, onePiece);
    expect(switchDraftMode(draft, "separates")).toBe(draft);
    expect(switchDraftMode(draft, "separates", true).pieces).toEqual([]);
    const removed = { ...draft, pieces: [{ slot: "one_piece" as const, itemId: null, position: 0 }] };
    expect(switchWouldDiscard(removed, "separates")).toBe(true);
    expect(switchDraftMode(removed, "separates")).toBe(removed);
  });

  it("addresses accessory occurrences independently, including removed placeholders", () => {
    const first = accessories[0]!;
    const second = accessories.find((item) => item.subcategorySlug !== first.subcategorySlug)!;
    const draft = { ...separates(), pieces: [
      ...separates().pieces,
      { slot: "accessory" as const, itemId: null, position: 2 },
      { slot: "accessory" as const, itemId: second.id, position: 3 },
    ] };
    const replaced = selectDraftPiece(draft, { slot: "accessory", index: 0 }, first);
    expect(replaced.pieces[2]?.itemId).toBe(first.id);
    expect(replaced.pieces[3]?.itemId).toBe(second.id);
    expect(validateDraft(replaced, DEMO_ITEMS).canSave).toBe(true);
    expect(removeDraftPiece(replaced, { slot: "accessory", index: 1 }).pieces[2]?.itemId).toBe(first.id);
  });

  it("delegates duplicate accessory and capacity validation to the domain rules", () => {
    let draft = separates();
    const uniqueTypes = [...new Map(accessories.map((item) => [item.subcategorySlug, item])).values()];
    for (let index = 0; index <= MAX_ACCESSORIES; index++) {
      draft = selectDraftPiece(draft, { slot: "accessory", index }, uniqueTypes[index]!);
    }
    expect(validateDraft(draft, DEMO_ITEMS).check.issues.some((issue) => issue.code === "too_many_accessories")).toBe(true);
    const duplicate = selectDraftPiece(
      selectDraftPiece(separates(), { slot: "accessory", index: 0 }, accessories[0]!),
      { slot: "accessory", index: 1 }, accessories[0]!,
    );
    expect(validateDraft(duplicate, DEMO_ITEMS).canSave).toBe(false);
  });

  it("supports every taxonomy slot and Indian one-piece outfits", () => {
    for (const item of DEMO_ITEMS) {
      const mode = slotOf(item) === "one_piece" ? "one_piece" : "separates";
      const draft = selectDraftPiece(switchDraftMode(createDraft(), mode), { slot: slotOf(item) }, item);
      expect(validateDraft(draft, DEMO_ITEMS).check.valid).toBe(true);
    }
    const saree = DEMO_ITEMS.find((item) => item.subcategorySlug === "sarees")!;
    expect(validateDraft(selectDraftPiece(switchDraftMode(createDraft(), "one_piece"), { slot: "one_piece" }, saree), DEMO_ITEMS).canSave).toBe(true);
  });

  it("copies an edit without mutating stored pieces and retains metadata", () => {
    const outfit = { ...DEMO_OUTFITS[0]!, notes: "Keep these notes", source: "suggestion" as const };
    const draft = createDraft(outfit);
    expect(draft.pieces).not.toBe(outfit.pieces);
    expect(draft.pieces[0]).not.toBe(outfit.pieces[0]);
    expect(draftInput(draft)).toMatchObject({ name: outfit.name, notes: outfit.notes, source: outfit.source });
  });

  it("uses the schema to validate an optional name", () => {
    expect(validateDraft({ ...separates(), name: "" }, DEMO_ITEMS).canSave).toBe(true);
    const result = validateDraft({ ...separates(), name: "x".repeat(OUTFIT_NAME_MAX + 1) }, DEMO_ITEMS);
    expect(result.nameError).toBeTruthy();
    expect(result.canSave).toBe(false);
  });
});
