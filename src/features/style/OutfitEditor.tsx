import { useImperativeHandle, useMemo, useRef, useState, type Ref } from "react";
import { useNavigate } from "react-router";
import { ArrowLeftRight, Check, Plus, RefreshCw, Trash2 } from "lucide-react";
import type { ClothingItem, Outfit } from "@/domain/types";
import { MAX_ACCESSORIES, SLOT_LABELS, itemTypeLabel, type Slot } from "@/domain/taxonomy";
import { OUTFIT_NAME_MAX } from "@/domain/schemas";
import { errorMessage, useSaveOutfit } from "@/data";
import { paths, type Base } from "@/app/paths";
import { Button, Chip, ConfirmDialog, PageHeader, TextField, useToast } from "@/ui";
import { createDraft, draftInput, removeDraftPiece, selectDraftPiece, switchDraftMode, switchWouldDiscard, validateDraft, type BaseMode, type DraftTarget, type OutfitDraft } from "./outfitDraft";
import { OutfitPickerSheet } from "./OutfitPickerSheet";
import { OutfitPreview } from "./OutfitPreview";

interface Props {
  outfit?: Outfit;
  seed?: OutfitDraft;
  ref?: Ref<EditorGuard>;
  items: readonly ClothingItem[];
  imageByItem: Map<string, { thumb: string; full: string }>;
  base: Base;
}

export interface EditorGuard {
  isDirty: () => boolean;
  isSaving: () => boolean;
}

export function OutfitEditor({ outfit, seed, ref, items, imageByItem, base }: Props) {
  const initialDraft = useMemo(() => outfit ? createDraft(outfit) : seed ?? createDraft(), [outfit, seed]);
  const initialRef = useRef<OutfitDraft | null>(null);
  if (!initialRef.current) initialRef.current = initialDraft;
  const baselineRef = useRef<string | null>(null);
  if (baselineRef.current === null) baselineRef.current = JSON.stringify(draftInput(initialRef.current));
  const [draft, setDraft] = useState<OutfitDraft>(() => initialRef.current ?? createDraft(outfit));
  const [target, setTarget] = useState<DraftTarget | null>(null);
  const [pendingMode, setPendingMode] = useState<BaseMode | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const savingLock = useRef(false);
  const savedId = useRef(outfit?.id);
  const navigate = useNavigate();
  const toast = useToast();
  const saveOutfit = useSaveOutfit();
  const validation = useMemo(() => validateDraft(draft, items), [draft, items]);
  const hasChanges = JSON.stringify(draftInput(draft)) !== baselineRef.current;
  const isSaving = saveOutfit.isPending;
  useImperativeHandle(ref, () => ({
    isDirty: () => hasChanges || (!savedId.current && (draft.pieces.length > 0 || draft.name.length > 0)),
    isSaving: () => savingLock.current,
  }), [hasChanges, draft.pieces.length, draft.name]);
  const accessorySlots = Array.from({
    length: Math.max(MAX_ACCESSORIES, draft.pieces.filter((piece) => piece.slot === "accessory").length),
  }, (_, index) => index);

  const currentPiece = (slot: Slot, index = 0) => {
    let occurrence = 0;
    return draft.pieces.find((piece) => piece.slot === slot && occurrence++ === index);
  };
  const showPicker = (next: DraftTarget) => { if (!savingLock.current) setTarget(next); };
  const applySelection = (item: ClothingItem) => {
    if (!target || savingLock.current) return;
    setDraft((current) => selectDraftPiece(current, target, item));
    setTarget(null);
  };
  const remove = (slot: Slot, index = 0) => {
    if (!savingLock.current) setDraft((current) => removeDraftPiece(current, { slot, index }));
  };
  const chooseMode = (mode: BaseMode) => {
    if (savingLock.current || mode === draft.mode) return;
    if (switchWouldDiscard(draft, mode)) {
      setPendingMode(mode);
      return;
    }
    setDraft((current) => switchDraftMode(current, mode));
  };
  const confirmMode = () => {
    if (!pendingMode || savingLock.current) return;
    setDraft((current) => switchDraftMode(current, pendingMode, true));
    setPendingMode(null);
  };
  const save = async () => {
    if (savingLock.current || !validation.canSave || (!hasChanges && savedId.current)) return;
    savingLock.current = true;
    try {
      const saved = await saveOutfit.mutateAsync({ id: savedId.current, input: draftInput(draft) });
      savedId.current = saved.id;
      const savedDraft = createDraft(saved);
      baselineRef.current = JSON.stringify(draftInput(savedDraft));
      setDraft(savedDraft);
      toast.success(outfit ? "Your look is updated." : "Your look is saved.");
      navigate(paths.style(base, { outfitId: saved.id }), { replace: true });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      savingLock.current = false;
    }
  };

  const issues = validation.check.issues.filter((issue) => issue.code !== "missing_base");
  const modeDescription = draft.mode === "separates" ? "A top and a bottom make the base." : "One garment or set is the base.";

  return (
    <>
      <PageHeader
        eyebrow={outfit ? "Editing a saved look" : "Studio"}
        title={outfit ? "Make it yours" : "Build a look"}
        lede="Western, Indian, or somewhere between. Start with what you want to wear."
      />

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.18fr)_minmax(19rem,0.82fr)] lg:gap-12">
        <section aria-label="Outfit preview" className="min-w-0">
          <div className="mb-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-look text-midnight">Choose your base</h2>
                <p className="mt-1 text-caption text-graphite-deep">{modeDescription}</p>
              </div>
              <ArrowLeftRight aria-hidden="true" className="mt-1 size-5 text-graphite" strokeWidth={1.5} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Outfit base">
              <Chip selected={draft.mode === "separates"} disabled={isSaving} onClick={() => chooseMode("separates")}>Top + bottom</Chip>
              <Chip selected={draft.mode === "one_piece"} disabled={isSaving} onClick={() => chooseMode("one_piece")}>One-piece / set</Chip>
            </div>
          </div>
          <OutfitPreview
            draft={draft}
            items={items}
            imageByItem={imageByItem}
            onChoose={showPicker}
            onRemove={remove}
            disabled={isSaving}
          />
        </section>

        <aside className="min-w-0 lg:sticky lg:top-8">
          <div className="border-t border-line pt-5 lg:border-t-0 lg:pt-0">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="mb-2 text-caption text-graphite-deep">Look composition</p>
                <h2 className="font-display text-section text-midnight">Your choices</h2>
              </div>
              {(draft.pieces.length > 0 || draft.name) && (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setConfirmClear(true)}
                  className="inline-flex min-h-11 items-center gap-2 text-ui text-graphite-deep underline decoration-line-strong underline-offset-4 hover:text-midnight disabled:text-graphite"
                >
                  <RefreshCw className="size-4" strokeWidth={1.5} /> Clear look
                </button>
              )}
            </div>

            <div className="mt-5 hidden space-y-2 lg:block">
              {draft.mode === "separates" ? (
                <>
                  <SlotLine label="Top" slot="top" piece={currentPiece("top")} items={items} onChoose={() => showPicker({ slot: "top" })} onRemove={() => remove("top")} disabled={isSaving} />
                  <SlotLine label="Bottom" slot="bottom" piece={currentPiece("bottom")} items={items} onChoose={() => showPicker({ slot: "bottom" })} onRemove={() => remove("bottom")} disabled={isSaving} />
                </>
              ) : (
                <SlotLine label="One-piece / set" slot="one_piece" piece={currentPiece("one_piece")} items={items} onChoose={() => showPicker({ slot: "one_piece" })} onRemove={() => remove("one_piece")} disabled={isSaving} />
              )}
              <SlotLine label="Layer" slot="outerwear" piece={currentPiece("outerwear")} items={items} onChoose={() => showPicker({ slot: "outerwear" })} onRemove={() => remove("outerwear")} disabled={isSaving} optional />
              <SlotLine label="Footwear" slot="footwear" piece={currentPiece("footwear")} items={items} onChoose={() => showPicker({ slot: "footwear" })} onRemove={() => remove("footwear")} disabled={isSaving} optional />
              {accessorySlots.map((index) => (
                <SlotLine key={index} label={`Accessory ${index + 1}${index >= MAX_ACCESSORIES ? " · saved slot" : ` · up to ${MAX_ACCESSORIES}`}`} slot="accessory" index={index} piece={currentPiece("accessory", index)} items={items} onChoose={() => showPicker({ slot: "accessory", index })} onRemove={() => remove("accessory", index)} disabled={isSaving} optional />
              ))}
            </div>

            <div className="mt-6 border-t border-line pt-5">
              <TextField
                label="Name this look"
                optional
                placeholder="e.g. Friday at the gallery"
                maxLength={OUTFIT_NAME_MAX}
                value={draft.name}
                disabled={isSaving}
                error={validation.nameError}
                onChange={(event) => {
                  setDraft((current) => ({ ...current, name: event.target.value }));
                }}
              />
            </div>

            <div className="mt-5" aria-live="polite">
              {issues.length > 0 ? (
                <ul className="space-y-2 text-caption text-danger" role="alert">
                  {issues.map((issue, index) => <li key={`${issue.code}-${index}`} className="flex gap-2"><span aria-hidden="true">!</span><span>{issue.message}</span></li>)}
                </ul>
              ) : validation.check.complete ? (
                <p className="flex items-center gap-2 text-caption text-graphite-deep"><Check aria-hidden="true" className="size-4 text-midnight" /> The base is complete. Add anything else you want.</p>
              ) : (
                <p className="text-caption text-graphite-deep">{draft.mode === "separates" ? "Add a top and bottom, or choose a one-piece." : "Choose a one-piece or set to complete this base."}</p>
              )}
            </div>

            <Button
              className="mt-6 w-full"
              loading={isSaving}
              loadingLabel="Saving"
              disabled={!validation.canSave || Boolean(outfit && !hasChanges)}
              onClick={() => void save()}
            >
              {outfit ? "Save changes" : "Save this look"}
            </Button>
            <p className="mt-3 text-center text-caption text-graphite-deep">
              {outfit ? "Your notes and source stay with this look." : base === "/demo"
                ? "Saved looks stay in this demo session only." : "Saved looks are stored in your account."}
            </p>
          </div>
        </aside>
      </div>

      <OutfitPickerSheet
        open={Boolean(target)}
        onOpenChange={(open) => { if (!open) setTarget(null); }}
        target={target}
        items={items}
        draft={draft}
        images={imageByItem}
        onSelect={applySelection}
      />
      <ConfirmDialog
        open={pendingMode !== null}
        onOpenChange={(open) => { if (!open) setPendingMode(null); }}
        title={pendingMode === "one_piece" ? "Switch to a one-piece base?" : "Switch to separates?"}
        body={pendingMode === "one_piece"
          ? "Your selected top and bottom will be removed from this draft. Layers, footwear and accessories will stay."
          : "Your selected one-piece or set will be removed from this draft. Layers, footwear and accessories will stay."}
        confirmLabel="Switch base"
        cancelLabel="Keep current"
        onConfirm={confirmMode}
      />
      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Clear this draft?"
        body="The pieces and name in this editor will be cleared. A saved look stays unchanged until you save."
        confirmLabel="Clear draft"
        cancelLabel="Keep this look"
        onConfirm={() => {
          setDraft((current) => ({ ...current, pieces: [], name: "" }));
          setConfirmClear(false);
        }}
      />
    </>
  );
}

function SlotLine({
  label, slot, index = 0, piece, items, onChoose, onRemove, disabled, optional = false,
}: {
  label: string;
  slot: Slot;
  index?: number;
  piece?: OutfitDraft["pieces"][number];
  items: readonly ClothingItem[];
  onChoose: () => void;
  onRemove: () => void;
  disabled: boolean;
  optional?: boolean;
}) {
  const selected = piece?.itemId ? items.find((item) => item.id === piece.itemId) : undefined;
  const removed = Boolean(piece && !piece.itemId);
  return (
    <div className="flex min-h-14 items-center gap-3 border-b border-line py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-caption text-graphite-deep">{label}{optional && !selected && !removed ? " · optional" : ""}</p>
        <p className="truncate text-ui font-medium text-midnight">{selected?.name ?? (removed ? "No longer in your wardrobe" : "Choose a piece")}</p>
        {selected && <p className="truncate text-caption text-graphite-deep">{itemTypeLabel(selected)}</p>}
      </div>
      {selected || removed ? (
        <>
          <button type="button" onClick={onChoose} disabled={disabled} className="min-h-11 px-2 text-ui text-midnight underline decoration-line-strong underline-offset-4 disabled:text-graphite">
            Replace
          </button>
          <button type="button" aria-label={`Remove ${SLOT_LABELS[slot].toLowerCase()}${slot === "accessory" ? ` ${index + 1}` : ""}`} onClick={onRemove} disabled={disabled} className="inline-flex size-11 items-center justify-center rounded-xs text-graphite-deep hover:bg-chalk-deep hover:text-danger disabled:text-graphite">
            <Trash2 className="size-4" strokeWidth={1.5} />
          </button>
        </>
      ) : (
        <button type="button" onClick={onChoose} disabled={disabled} className="inline-flex min-h-11 items-center gap-2 px-2 text-ui font-medium text-midnight underline decoration-line-strong underline-offset-4 disabled:text-graphite">
          <Plus className="size-4" strokeWidth={1.75} /> Add
        </button>
      )}
    </div>
  );
}
