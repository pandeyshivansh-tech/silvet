import { useImperativeHandle, useMemo, useRef, useState, type Ref } from "react";
import { useNavigate } from "react-router";
import { Check, RefreshCw } from "lucide-react";
import type { ClothingItem, Outfit } from "@/domain/types";
import type { Slot } from "@/domain/taxonomy";
import { OUTFIT_NAME_MAX, OUTFIT_NOTES_MAX } from "@/domain/schemas";
import { errorMessage, useSaveOutfit } from "@/data";
import { paths, type Base } from "@/app/paths";
import { Button, Chip, ConfirmDialog, PageHeader, StickyActionBar, TextAreaField, TextField, useToast } from "@/ui";
import { useUnsavedChanges } from "@/lib/UnsavedChanges";
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
  const dirty = hasChanges || (!savedId.current && (draft.pieces.length > 0 || draft.name.length > 0 || Boolean(draft.notes)));
  const guard = useUnsavedChanges(dirty, ({ currentLocation, nextLocation }) =>
    currentLocation.pathname !== nextLocation.pathname ||
    new URLSearchParams(currentLocation.search).get("outfit") !== new URLSearchParams(nextLocation.search).get("outfit"));
  useImperativeHandle(ref, () => ({
    isDirty: () => dirty,
    isSaving: () => savingLock.current,
  }), [dirty]);
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
      guard.allowNavigation();
      navigate(paths.style(base, { outfitId: saved.id }), { replace: true });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      savingLock.current = false;
    }
  };

  const issues = validation.check.issues.filter((issue) => issue.code !== "missing_base");

  return (
    <>
      {guard.prompt}
      <PageHeader
        eyebrow={outfit ? "Editing a saved look" : "Studio"}
        title={outfit ? "Make it yours" : "Build a look"}
        lede="Western, Indian, or somewhere between. Start with what you want to wear."
      />

      {/* Board left (spans the column); name, notes and Save stack on the right from 1024 px. The Save bar is a
          direct grid item so on phones it stays stuck above the tab bar for the whole workspace. */}
      <div className="grid items-start gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(17rem,0.7fr)] lg:grid-rows-[auto_auto_1fr]">
        <section aria-label="Outfit preview" className="min-w-0 lg:row-span-3">
          <OutfitPreview
            draft={draft}
            items={items}
            imageByItem={imageByItem}
            onChoose={showPicker}
            onRemove={remove}
            active={target}
            disabled={isSaving}
            baseControl={
              <div className="flex flex-wrap gap-2" role="group" aria-label="Outfit base">
                <Chip selected={draft.mode === "separates"} disabled={isSaving} onClick={() => chooseMode("separates")}>Top + bottom</Chip>
                <Chip selected={draft.mode === "one_piece"} disabled={isSaving} onClick={() => chooseMode("one_piece")}>One-piece / set</Chip>
              </div>
            }
          />
        </section>

        <section aria-label="Look details" className="min-w-0 border-t border-line pt-6 lg:border-t-0 lg:pt-1">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-look text-midnight">Name and notes</h2>
            {(draft.pieces.length > 0 || draft.name) && (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setConfirmClear(true)}
                className="inline-flex min-h-11 shrink-0 items-center gap-2 text-caption text-graphite-deep underline decoration-line-strong underline-offset-4 hover:text-midnight disabled:text-graphite"
              >
                <RefreshCw aria-hidden="true" className="size-3.5" strokeWidth={1.5} /> Clear look
              </button>
            )}
          </div>
          <div className="mt-3 space-y-5">
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
            <TextAreaField label="Notes" optional rows={2} maxLength={OUTFIT_NOTES_MAX} value={draft.notes ?? ""}
              disabled={isSaving} error={validation.notesError}
              onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value || null }))} />
          </div>
          <div className="mt-5" aria-live="polite">
            {issues.length > 0 ? (
              <ul className="space-y-2 text-caption text-danger" role="alert">
                {issues.map((issue, index) => <li key={`${issue.code}-${index}`} className="flex gap-2"><span aria-hidden="true">!</span><span>{issue.message}</span></li>)}
              </ul>
            ) : validation.check.complete ? (
              <p className="flex items-center gap-2 text-caption text-graphite-deep"><Check aria-hidden="true" className="size-4 animate-pop text-midnight" /> The base is complete. Add anything else you want.</p>
            ) : (
              <p className="text-caption text-graphite-deep">{draft.mode === "separates" ? "Add a top and bottom, or choose a one-piece." : "Choose a one-piece or set to complete this base."}</p>
            )}
          </div>
        </section>

        <StickyActionBar label="Save" className="lg:-mt-4">
          <Button
            className="flex-1"
            loading={isSaving}
            loadingLabel="Saving"
            disabled={!validation.canSave || Boolean(outfit && !hasChanges)}
            onClick={() => void save()}
          >
            {outfit ? "Save changes" : "Save this look"}
          </Button>
        </StickyActionBar>
        <p className="-mt-6 text-caption text-graphite-deep lg:-mt-8">
          {outfit ? "Your notes and source stay with this look." : base === "/demo"
            ? "Saved looks stay in this demo session only." : "Saved looks are stored in your account."}
        </p>
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
          setDraft((current) => ({ ...current, pieces: [], name: "", notes: null }));
          setConfirmClear(false);
        }}
      />
    </>
  );
}

