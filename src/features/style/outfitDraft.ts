import { checkOutfit } from "@/domain/outfitRules";
import { outfitInputSchema, type OutfitInputValues } from "@/domain/schemas";
import { slotOf, type Slot } from "@/domain/taxonomy";
import type { ClothingItem, Outfit, OutfitPiece, OutfitSource } from "@/domain/types";

export type BaseMode = "separates" | "one_piece";
export interface DraftTarget {
  slot: Slot;
  /** Occurrence within this slot, including removed placeholders. */
  index?: number;
}
export interface OutfitDraft {
  name: string;
  notes: string | null;
  source: OutfitSource;
  mode: BaseMode;
  pieces: OutfitPiece[];
}

export function createDraft(outfit?: Outfit): OutfitDraft {
  const pieces = outfit?.pieces.map((piece) => ({ ...piece })) ?? [];
  const hasSeparates = pieces.some((piece) => piece.slot === "top" || piece.slot === "bottom");
  return {
    name: outfit?.name ?? "",
    notes: outfit?.notes ?? null,
    source: outfit?.source ?? "manual",
    mode: pieces.some((piece) => piece.slot === "one_piece" && piece.itemId !== null) ||
      (!hasSeparates && pieces.some((piece) => piece.slot === "one_piece")) ? "one_piece" : "separates",
    pieces,
  };
}

/** An idea starts a NEW unsaved look, never an edit of an existing saved outfit. */
export function createSuggestionDraft(pieces: readonly OutfitPiece[]): OutfitDraft {
  const cloned = pieces.map((piece) => ({ ...piece }));
  return {
    name: "", notes: null, source: "suggestion",
    mode: cloned.some((piece) => piece.slot === "one_piece" && piece.itemId) ? "one_piece" : "separates",
    pieces: cloned,
  };
}

function targetIndex(pieces: readonly OutfitPiece[], target: DraftTarget): number {
  let occurrence = 0;
  return pieces.findIndex((piece) =>
    piece.slot === target.slot && occurrence++ === (target.index ?? 0),
  );
}

/** This edits the draft; checkOutfit remains the authority for whether it can be saved. */
export function selectDraftPiece(draft: OutfitDraft, target: DraftTarget, item: ClothingItem): OutfitDraft {
  if (slotOf(item) !== target.slot) return draft;
  const index = targetIndex(draft.pieces, target);
  const pieces = draft.pieces.map((piece, i) => i === index ? { ...piece, itemId: item.id } : piece);
  if (index < 0) {
    const position = Math.max(-1, ...pieces.map((piece) => piece.position)) + 1;
    pieces.push({ slot: target.slot, itemId: item.id, position });
  }
  return { ...draft, pieces };
}

export function removeDraftPiece(draft: OutfitDraft, target: DraftTarget): OutfitDraft {
  const index = targetIndex(draft.pieces, target);
  if (index < 0) return draft;
  return { ...draft, pieces: draft.pieces.filter((_, i) => i !== index) };
}

function discardedByMode(piece: OutfitPiece, mode: BaseMode): boolean {
  return mode === "one_piece"
    ? piece.slot === "top" || piece.slot === "bottom"
    : piece.slot === "one_piece";
}

export function switchWouldDiscard(draft: OutfitDraft, mode: BaseMode): boolean {
  return mode !== draft.mode && draft.pieces.some((piece) => discardedByMode(piece, mode));
}

/** A mode switch that discards anything must explicitly be confirmed by the caller. */
export function switchDraftMode(draft: OutfitDraft, mode: BaseMode, confirmed = false): OutfitDraft {
  if (mode === draft.mode || (switchWouldDiscard(draft, mode) && !confirmed)) return draft;
  return { ...draft, mode, pieces: draft.pieces.filter((piece) => !discardedByMode(piece, mode)) };
}

export function draftInput(draft: OutfitDraft): OutfitInputValues {
  return { name: draft.name, notes: draft.notes, source: draft.source, pieces: draft.pieces };
}

export function validateDraft(draft: OutfitDraft, items: readonly ClothingItem[]) {
  const byId = new Map(items.map((item) => [item.id, item]));
  const check = checkOutfit(draft.pieces, (id) => byId.get(id));
  const parsed = outfitInputSchema.safeParse(draftInput(draft));
  const nameError = parsed.success ? null :
    parsed.error.issues.find((issue) => issue.path[0] === "name")?.message ?? null;
  return { check, nameError, canSave: check.valid && check.complete && parsed.success };
}
