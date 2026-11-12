import { useImperativeHandle, useRef, useState, type Ref } from "react";
import { OCCASIONS, SEASONS, STYLES, SLOT_LABELS, type OccasionSlug, type StyleSlug } from "@/domain/taxonomy";
import type { ClothingItem, OutfitPiece } from "@/domain/types";
import { errorMessage, useRepository, useSaveOutfit } from "@/data";
import { useProfile } from "@/data/profiles/hooks";
import { paths, type Base } from "@/app/paths";
import { Button, ButtonLink, ItemCard, PageHeader, SelectField, useToast } from "@/ui";
import { useIdeaSession } from "./useIdeaSession";
import type { EditorGuard } from "./OutfitEditor";
import type { RecommendationContext } from "@/engine/types";

interface Props {
  items: readonly ClothingItem[];
  images: Map<string, { thumb: string; full: string }>;
  base: Base;
  onOpen: (pieces: readonly OutfitPiece[]) => void;
  ref?: Ref<EditorGuard>;
}
export function IdeasPanel({ items, images, base, onOpen, ref }: Props) {
  const repository = useRepository();
  const profile = useProfile(repository.kind === "supabase");
  const initialStyle = repository.kind === "supabase" ? profile.data?.stylePreferences[0] : undefined;
  const ideas = useIdeaSession(items, repository.kind === "demo" ? base : `supabase:${repository.userId}`,
    { occasion: "everyday", ...(initialStyle ? { style: initialStyle } : {}) });
  const mutation = useSaveOutfit();
  const saving = useRef(false);
  const toast = useToast();
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState<{ fingerprint: string; id: string } | null>(null);
  const current = ideas.result.status === "ready" ? ideas.result.recommendation : null;
  const savedCurrent = saved?.fingerprint === current?.fingerprint ? saved : null;
  useImperativeHandle(ref, () => ({ isDirty: () => false, isSaving: () => saving.current }), []);
  const change = (context: RecommendationContext) => {
    if (saving.current) return;
    setSaveError("");
    ideas.next(context);
  };
  const save = async () => {
    if (saving.current || !current || savedCurrent) return;
    saving.current = true;
    setSaveError("");
    try {
      const outfit = await mutation.mutateAsync({ input: { name: null, source: "suggestion", pieces: current.pieces } });
      setSaved({ fingerprint: current.fingerprint, id: outfit.id });
      toast.success("Your idea is saved in Lookbook.");
    } catch (error) {
      setSaveError(errorMessage(error));
    } finally {
      saving.current = false;
    }
  };
  return (
    <>
      <PageHeader title="Find your next look" lede="Ideas from your own wardrobe. Indian, Western and fusion pieces belong here equally." />
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField label="Occasion" value={ideas.context.occasion} disabled={mutation.isPending}
          options={OCCASIONS.map((occasion) => ({ value: occasion.slug, label: occasion.label }))}
          onChange={(event) => change({ ...ideas.context, occasion: event.target.value as OccasionSlug })} />
        <SelectField label="Style" optional value={ideas.context.style ?? ""} disabled={mutation.isPending}
          placeholder="Any style" options={STYLES.map((style) => ({ value: style.slug, label: style.label }))}
          onChange={(event) => change({ ...ideas.context, style: (event.target.value || undefined) as StyleSlug | undefined })} />
        <SelectField label="Season" optional value={ideas.context.season ?? ""} disabled={mutation.isPending}
          placeholder="Any season" options={SEASONS.filter((season) => season.slug !== "all-season").map((season) => ({ value: season.slug, label: season.label }))}
          onChange={(event) => change({ ...ideas.context, season: (event.target.value || undefined) as RecommendationContext["season"] })} />
      </div>
      <p className="mt-3 text-caption text-graphite-deep">Style is a preference, not a requirement. Untagged details stay unknown; we never infer fabric.</p>
      {ideas.historyWarning && <p role="status" className="mt-3 text-caption text-graphite-deep">Session storage is unavailable for idea history. Repetition protection lasts only while this screen stays open.</p>}
      {current ? (
        <section className="mt-8" aria-label="Recommended outfit" data-fingerprint={current.fingerprint}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
            {current.pieces.map((piece, index) => {
              const item = items.find((item) => item.id === piece.itemId)!;
              return (
                <div key={`${piece.slot}-${piece.itemId}`} className="min-w-0">
                  <p className="mb-2 text-caption text-graphite-deep">{SLOT_LABELS[piece.slot]}</p>
                  <ItemCard item={item} imageUrl={images.get(item.id)?.thumb} />
                  <Button variant="quiet" className="mt-2 min-h-11" aria-label={`Swap ${item.name}`} disabled={mutation.isPending}
                    onClick={() => { if (!saving.current) { setSaveError(""); ideas.swap(index); } }}>Swap</Button>
                </div>
              );
            })}
          </div>
          <div className="mt-8 border-t border-line pt-6">
            <h2 className="font-display text-look text-midnight">Why this works</h2>
            <ul className="mt-3 space-y-2 text-body text-graphite-deep">
              {current.explanations.map((reason) => <li key={reason.kind}>{reason.message}</li>)}
            </ul>
          </div>
          {saveError && <p role="alert" className="mt-4 text-body text-danger">{saveError}</p>}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button loading={mutation.isPending} loadingLabel="Saving" disabled={Boolean(savedCurrent)} onClick={() => void save()}>
              {savedCurrent ? "Look saved" : "Save look"}
            </Button>
            <Button variant="secondary" disabled={mutation.isPending} onClick={() => { setSaveError(""); ideas.next(); }}>Another idea</Button>
            <Button variant="quiet" disabled={mutation.isPending} onClick={() => { if (!saving.current) onOpen(current.pieces); }}>Open in Build</Button>
            {savedCurrent && <ButtonLink variant="quiet" to={paths.outfit(base, savedCurrent.id)}>View saved look</ButtonLink>}
          </div>
        </section>
      ) : (
        <section className="mt-8 border-t border-line py-8" aria-label="Idea availability">
          <h2 className="font-display text-look text-midnight">{ideas.result.status === "exhausted" ? "You’ve seen these ideas" : "A complete look needs a little more"}</h2>
          <ul className="my-4 space-y-2 text-body text-graphite-deep">
            {ideas.result.status !== "ready" && ideas.result.suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}
          </ul>
          {ideas.result.status === "exhausted"
            ? <Button variant="secondary" onClick={() => ideas.next(ideas.context, true)}>Restart ideas</Button>
            : <ButtonLink variant="secondary" to={paths.wardrobe(base)}>Visit wardrobe</ButtonLink>}
        </section>
      )}
      <p role="status" aria-live="polite" className="mt-4 text-caption text-graphite-deep">{ideas.notice}</p>
      <p className="mt-6 border-t border-line pt-5 text-caption text-graphite-deep">{base === "/demo"
        ? "Demo pieces, saved looks and idea history stay in this tab only. Photos are not stored."
        : "Saved looks belong to your account. Ideas filters don’t change your saved style preferences. Image uploads are not available yet."}</p>
    </>
  );
}
