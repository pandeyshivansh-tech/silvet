import { useId, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from "react";
import { ChevronDown, Shuffle } from "lucide-react";
import { motion } from "motion/react";
import { transition } from "@/motion/presets";
import { OCCASIONS, SEASONS, STYLES, SLOT_LABELS, itemTypeLabel, labelOf, type OccasionSlug, type StyleSlug } from "@/domain/taxonomy";
import type { ClothingItem, OutfitPiece } from "@/domain/types";
import { errorMessage, useRepository, useSaveOutfit } from "@/data";
import { useProfile } from "@/data/profiles/hooks";
import { paths, type Base } from "@/app/paths";
import { Button, ButtonLink, OutfitSlot, PageHeader, ReasonPanel, StickyActionBar, cn, useToast } from "@/ui";
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
const noPreferences: readonly StyleSlug[] = [];
export function IdeasPanel({ items, images, base, onOpen, ref }: Props) {
  const repository = useRepository();
  const profile = useProfile(repository.kind === "supabase");
  const ideas = useIdeaSession(items, repository.kind === "demo" ? base : `supabase:${repository.userId}`,
    { occasion: "everyday" }, repository.kind === "supabase" ? profile.data?.stylePreferences ?? noPreferences : noPreferences);
  const mutation = useSaveOutfit();
  const saving = useRef(false);
  const toast = useToast();
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState<{ fingerprint: string; id: string } | null>(null);
  // A new idea is dealt slot by slot; a swap changes one piece at once.
  const [dealt, setDealt] = useState(false);
  const current = ideas.result?.status === "ready" ? ideas.result.recommendation : null;
  const savedCurrent = saved?.fingerprint === current?.fingerprint ? saved : null;
  useImperativeHandle(ref, () => ({ isDirty: () => false, isSaving: () => saving.current }), []);
  const change = (context: RecommendationContext) => {
    if (saving.current) return;
    setSaveError("");
    setDealt(true);
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
  const occasion = labelOf.occasion(ideas.context.occasion);
  return (
    <>
      <PageHeader title="Find your next look" lede="Ideas from your own wardrobe. Indian, Western and fusion pieces belong here equally." />

      {/* The brief: three quiet choices set like a sentence, not a form. Native selects keep keyboard and screen-reader behaviour. */}
      <section aria-label="What you're dressing for" className="border-y border-line py-5">
        <div className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3 sm:gap-x-8">
          <BriefSelect className="col-span-2 sm:col-span-1" label="Occasion" value={ideas.brief.occasion} disabled={mutation.isPending}
            options={OCCASIONS.map((occasion) => ({ value: occasion.slug, label: occasion.label }))}
            onChange={(value) => change({ ...ideas.brief, occasion: value as OccasionSlug })} />
          <BriefSelect label="Style" optional value={ideas.brief.style ?? ""} disabled={mutation.isPending}
            placeholder="Any style" options={STYLES.map((style) => ({ value: style.slug, label: style.label }))}
            onChange={(value) => change({ ...ideas.brief, style: (value || undefined) as StyleSlug | undefined })} />
          <BriefSelect label="Season" optional value={ideas.brief.season ?? ""} disabled={mutation.isPending}
            placeholder="Any season" options={SEASONS.filter((season) => season.slug !== "all-season").map((season) => ({ value: season.slug, label: season.label }))}
            onChange={(value) => change({ ...ideas.brief, season: (value || undefined) as RecommendationContext["season"] })} />
        </div>
        <p className="mt-4 max-w-3xl text-caption text-graphite-deep">The styles you saved get a small head start here, but every style can still turn up. Ideas never guesses what you haven’t tagged, like fabric.</p>
        {ideas.historyWarning && <p role="status" className="mt-3 text-caption text-graphite-deep">Session storage is unavailable for idea history. Repetition protection lasts only while this screen stays open.</p>}
      </section>

      {current ? (
        // Look left, reasons and actions right (1024 px+). The action bar is a direct grid item so on phones it
        // stays above the tab bar while the whole idea is on screen.
        <section className="mt-8 grid items-start gap-x-12 gap-y-8 lg:mt-10 lg:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.8fr)] lg:grid-rows-[auto_auto_1fr]"
          aria-label="Recommended outfit" aria-busy={ideas.pending} data-fingerprint={current.fingerprint}>
          {/* While the next idea is found the look on screen steps back; it never blanks. */}
          <div className={cn("min-w-0 transition-opacity duration-200 ease-editorial lg:row-span-3", ideas.pending && "opacity-50")}>
            <h2 className="mb-5 font-display text-section text-midnight lg:text-section-lg">Your {occasion.toLocaleLowerCase()} look</h2>
            <LookBoard pieces={current.pieces} render={(piece, index) => {
              const item = items.find((candidate) => candidate.id === piece.itemId);
              if (!item) return <OutfitSlot key={`${piece.slot}-${index}`} label={SLOT_LABELS[piece.slot]} removed />;
              return (
                <OutfitSlot
                  key={`${piece.slot}-${index}`}
                  label={SLOT_LABELS[piece.slot]}
                  item={item}
                  imageUrl={images.get(item.id)?.full}
                  detail={itemTypeLabel(item)}
                  enterDelay={dealt ? index * 0.06 : 0}
                  action={
                    <Button variant="quiet" className="-mb-2 min-h-11 px-0" aria-label={`Swap ${item.name}`} disabled={mutation.isPending || ideas.pending}
                      leadingIcon={<Shuffle aria-hidden="true" className="size-3.5" strokeWidth={1.5} />}
                      onClick={() => { if (!saving.current) { setSaveError(""); setDealt(false); ideas.swap(index); } }}>Swap</Button>
                  }
                />
              );
            }} />
          </div>
          <ReasonPanel key={current.fingerprint} reasons={current.explanations.map((reason) => ({ key: reason.kind, message: reason.message }))} />
          <div className="min-w-0 space-y-4">
            {saveError && <p role="alert" className="text-body text-danger">{saveError}</p>}
            <StickyActionBar label="Idea actions">
              <Button className="flex-1" loading={mutation.isPending} loadingLabel="Saving" disabled={Boolean(savedCurrent)} onClick={() => void save()}>
                {savedCurrent ? "Look saved" : "Save look"}
              </Button>
              <Button variant="secondary" className="flex-1" disabled={mutation.isPending || ideas.pending} onClick={() => { setSaveError(""); setDealt(true); ideas.next(); }}>Another idea</Button>
            </StickyActionBar>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 lg:-mt-4">
            <Button variant="quiet" className="min-h-11" disabled={mutation.isPending} onClick={() => { if (!saving.current) onOpen(current.pieces); }}>Open in Build</Button>
            {savedCurrent && <ButtonLink variant="quiet" className="min-h-11" to={paths.outfit(base, savedCurrent.id)}>View saved look</ButtonLink>}
          </div>
        </section>
      ) : !ideas.result ? (
        <IdeaLoading />
      ) : (
        <section className="mt-8 py-4" aria-label="Idea availability">
          <h2 className="font-display text-section text-midnight">{ideas.result.status === "exhausted" ? "You’ve seen these ideas" : "A complete look needs a little more"}</h2>
          <ul className="my-4 max-w-prose space-y-2 text-body text-graphite-deep">
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
        : "Saved looks belong to your account. Ideas filters don’t change your saved style preferences. Photos are private and can be added in Wardrobe."}</p>
    </>
  );
}

/**
 * Before the first idea arrives (a moment on a phone): the look's shape in quiet skeletons. It fades in only if the
 * wait is long enough to notice, so a fast device never flashes it.
 */
function IdeaLoading() {
  return (
    <motion.section aria-label="Finding a look" aria-busy="true" className="mt-8 lg:mt-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ ...transition.select, delay: 0.25 }}>
      <div className="skeleton mb-5 h-9 w-56 rounded-xs" />
      <div className="grid grid-cols-2 gap-x-3 sm:grid-cols-3 sm:gap-x-5">
        {[0, 1, 2].map((slot) => <div key={slot} className={cn("skeleton aspect-[4/5] rounded-xs", slot === 2 && "hidden sm:block")} />)}
      </div>
    </motion.section>
  );
}

/** Same order as the Build board: base, then layer. */
const BASE_ORDER: readonly OutfitPiece["slot"][] = ["one_piece", "top", "bottom", "outerwear"];

/** The base and layer lead at full size; footwear and accessories follow, so a look reads top to toe. Indexes stay the engine's. */
function LookBoard({ pieces, render }: { pieces: readonly OutfitPiece[]; render: (piece: OutfitPiece, index: number) => ReactNode }) {
  const indexed = pieces.map((piece, index) => ({ piece, index }));
  const main = BASE_ORDER.flatMap((slot) => indexed.filter(({ piece }) => piece.slot === slot));
  const finishing = indexed.filter(({ piece }) => !BASE_ORDER.includes(piece.slot));
  return (
    <div className="space-y-8">
      <div className={cn("grid grid-cols-2 items-start gap-x-3 gap-y-8 sm:gap-x-5", main.length > 2 && "sm:grid-cols-3")}>
        {main.map(({ piece, index }) => render(piece, index))}
      </div>
      {finishing.length > 0 && (
        <div className="grid grid-cols-2 items-start gap-x-3 gap-y-8 border-t border-line pt-6 sm:grid-cols-3 sm:gap-x-5 xl:grid-cols-4">
          {finishing.map(({ piece, index }) => render(piece, index))}
        </div>
      )}
    </div>
  );
}

function BriefSelect({ className, label, optional = false, value, placeholder, options, disabled, onChange }: {
  className?: string;
  label: string;
  optional?: boolean;
  value: string;
  placeholder?: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="flex items-baseline justify-between gap-2 text-caption text-graphite-deep">
        <span>{label}</span>{optional && <span>optional</span>}
      </label>
      <div className="relative mt-1">
        <select id={id} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}
          className="h-12 w-full cursor-pointer appearance-none border-b border-line-strong bg-transparent pr-8 font-display text-look text-midnight transition-colors duration-120 ease-editorial hover:border-midnight focus-visible:border-midnight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-midnight disabled:cursor-not-allowed disabled:text-graphite">
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 right-0 size-5 -translate-y-1/2 text-midnight" strokeWidth={1.5} />
      </div>
    </div>
  );
}
