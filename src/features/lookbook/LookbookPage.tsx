import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Pencil, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Link, useNavigate, useViewTransitionState } from "react-router";
import { errorMessage, useBasePath, useDeleteOutfit, useIsDemo, useItemImages, useItems, useOutfits } from "@/data";
import type { Outfit } from "@/domain/types";
import { paths, type Base } from "@/app/paths";
import { ActionMenu, ButtonLink, ConfirmDialog, EmptyState, ErrorState, GarmentGlyph, Page, PageHeader, Skeleton, WARDROBE_GRID, useToast } from "@/ui";
import { fade } from "@/motion/presets";
import { LookFlatLay } from "./LookFlatLay";
import { orderOutfits, outfitCounts, outfitTitle, resolveOutfitPieces, sourceLabel, type ResolvedOutfitPiece } from "./lookbookPresentation";

type Images = Map<string, { thumb: string; full: string }>;

/**
 * Lookbook (SILVET_DESIGN_REFERENCE.pdf p11): the newest look leads on the page's one Midnight panel, the
 * rest follow as flat-lay cards. Every card is one link (stretched over the card) plus a ⋯ menu with the
 * look's existing actions: Edit in Studio and Delete look (same confirmation as the detail page).
 */
function LoadingGrid() {
  return (
    <div role="status" aria-label="Loading saved looks">
      <div className="grid gap-6 rounded-xs border border-line p-3 sm:p-4 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:p-5">
        <Skeleton className="aspect-[5/4] w-full" />
        <div className="space-y-3 md:pt-4">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/5" />
        </div>
      </div>
      <div className={`mt-10 ${WARDROBE_GRID}`}>
        {[0, 1, 2, 3].map((key) => (
          <div key={key}>
            <Skeleton className="aspect-[4/5] w-full" />
            <Skeleton className="mt-3 h-5 w-3/4" />
            <Skeleton className="mt-2 h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

function lookMeta(outfit: Outfit, rows: readonly ResolvedOutfitPiece[]) {
  const { total, removed } = outfitCounts(rows);
  return [`${total} ${total === 1 ? "piece" : "pieces"}`, sourceLabel(outfit.source), removed > 0 ? `${removed} removed` : ""].filter(Boolean).join(" · ");
}

function LookActions({ outfit, base, onDelete, className }: { outfit: Outfit; base: Base; onDelete: (outfit: Outfit) => void; className?: string }) {
  const navigate = useNavigate();
  const title = outfitTitle(outfit);
  return (
    <ActionMenu
      className={className}
      label={`More actions for ${title}`}
      title={title}
      items={[
        { label: "Edit in Studio", icon: <Pencil aria-hidden="true" className="size-4" strokeWidth={1.5} />, onSelect: () => navigate(paths.style(base, { outfitId: outfit.id })) },
        { label: "Delete look…", icon: <Trash2 aria-hidden="true" className="size-4" strokeWidth={1.5} />, destructive: true, onSelect: () => onDelete(outfit) },
      ]}
    />
  );
}

function LeadLook({ outfit, rows, images, base, newestFirst, onDelete }: { outfit: Outfit; rows: ResolvedOutfitPiece[]; images: Images; base: Base; newestFirst: boolean; onDelete: (outfit: Outfit) => void }) {
  const title = outfitTitle(outfit);
  const href = paths.outfit(base, outfit.id);
  const morph = useViewTransitionState(href) ? "look" : undefined;
  return (
    <article aria-label={title} className="surface-midnight grid rounded-xs md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      {/* Pointer shortcut only; keyboard and screen readers use "Open look", so the look has one tab stop. */}
      <Link to={href} viewTransition tabIndex={-1} aria-hidden="true" className="group block p-3 sm:p-4 lg:p-5">
        <LookFlatLay rows={rows} images={images} size="feature" viewTransitionName={morph} />
      </Link>
      <div className="flex min-w-0 flex-col px-5 pt-3 pb-6 sm:px-8 sm:pb-8 md:py-6 md:pr-6 md:pl-2 lg:py-8 lg:pr-8 lg:pl-3">
        <p className="flex items-center gap-2 text-caption text-midnight-muted">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-citron" />
          {newestFirst ? "Latest" : "Saved look"} · {sourceLabel(outfit.source)}
        </p>
        <h2 className="mt-3 font-display text-section text-chalk lg:text-section-lg">{title}</h2>
        <ul className="mt-4 space-y-1 text-body">
          {rows.map(({ item, key }) => (
            <li key={key} className={item ? "text-chalk" : "text-midnight-muted"}>{item ? item.name : "No longer in your wardrobe"}</li>
          ))}
        </ul>
        <div className="mt-8 flex items-center gap-2 md:mt-auto md:pt-8">
          <ButtonLink to={href} variant="secondary" className="min-h-11" leadingIcon={<ArrowUpRight aria-hidden="true" className="size-4" />}>Open look</ButtonLink>
          <LookActions outfit={outfit} base={base} onDelete={onDelete} />
        </div>
      </div>
    </article>
  );
}

function LookCard({ outfit, rows, images, base, onDelete }: { outfit: Outfit; rows: ResolvedOutfitPiece[]; images: Images; base: Base; onDelete: (outfit: Outfit) => void }) {
  const title = outfitTitle(outfit);
  const href = paths.outfit(base, outfit.id);
  const morph = useViewTransitionState(href) ? "look" : undefined;
  return (
    <motion.article layout="position" variants={fade} initial={false} exit="exit"
      className="group relative min-w-0 rounded-xs has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-4 has-[a:focus-visible]:outline-midnight">
      <LookFlatLay rows={rows} images={images} viewTransitionName={morph} />
      {/* Only the title shares a row with the ⋯; the meta line takes the card's full width so it doesn't wrap
          into a narrow column beside the button on phones. Long titles wrap to two lines instead of truncating. */}
      <div className="mt-3 flex items-start justify-between gap-2">
        <h2 className="line-clamp-2 min-w-0 font-display text-lead-lg break-words text-midnight">
          {/* Stretched over the whole card: one link, one tab stop; the ⋯ sits above it. */}
          <Link to={href} viewTransition className="underline-offset-4 group-hover:underline after:absolute after:inset-0 focus-visible:outline-none">{title}</Link>
        </h2>
        <LookActions outfit={outfit} base={base} onDelete={onDelete} className="relative z-10 -mt-1 shrink-0" />
      </div>
      <p className="mt-0.5 text-caption text-graphite-deep">{lookMeta(outfit, rows)}</p>
    </motion.article>
  );
}

function EmptyArt() {
  return (
    <div className="flex h-full items-end justify-center gap-2" aria-hidden="true">
      <GarmentGlyph slot="top" strokeWidth={1} className="h-14 w-auto" />
      <GarmentGlyph slot="bottom" strokeWidth={1} className="h-20 w-auto" />
      <GarmentGlyph slot="footwear" strokeWidth={1} className="h-8 w-auto" />
    </div>
  );
}

function SessionNote() {
  return (
    <aside className="mt-12 flex flex-col gap-2 border-t border-line pt-5 text-caption text-graphite-deep sm:flex-row sm:items-center sm:justify-between">
      <p>Looks saved in the sample disappear when you close this tab.</p>
      <Link to={paths.signUp()} className="inline-flex min-h-11 items-center gap-1 font-medium text-midnight underline underline-offset-4">
        Create your wardrobe to keep yours <ArrowUpRight aria-hidden="true" className="size-3.5" />
      </Link>
    </aside>
  );
}

export default function LookbookPage() {
  const base = useBasePath();
  const isDemo = useIsDemo();
  const toast = useToast();
  const outfitsQuery = useOutfits();
  const itemsQuery = useItems();
  const items = itemsQuery.data;
  const images = useItemImages(items);
  const deleteOutfit = useDeleteOutfit();
  const [deleteTarget, setDeleteTarget] = useState<Outfit | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deleting = useRef(false);

  const askDelete = (outfit: Outfit) => { setDeleteTarget(outfit); setConfirmOpen(true); };
  async function confirmDelete() {
    if (!deleteTarget || deleting.current) return;
    deleting.current = true;
    try {
      await deleteOutfit.mutateAsync(deleteTarget.id);
      toast.success("Look deleted. Your wardrobe is unchanged.");
    } catch (error) {
      toast.error(`${errorMessage(error)} The look is still here.`);
    } finally {
      deleting.current = false;
      setConfirmOpen(false);
    }
  }

  const errorQuery = outfitsQuery.isError ? outfitsQuery : itemsQuery.isError ? itemsQuery : null;
  if (errorQuery) {
    return (
      <Page wide>
        <PageHeader title="Lookbook" lede="The looks you’ve put together, kept in one place." />
        <ErrorState
          error={errorQuery.error}
          title="Your looks didn’t load."
          onRetry={() => {
            void outfitsQuery.refetch();
            void itemsQuery.refetch();
          }}
        />
      </Page>
    );
  }

  if (outfitsQuery.isPending || itemsQuery.isPending || !items) {
    return (
      <Page wide>
        <PageHeader title="Lookbook" lede="The looks you’ve put together, kept in one place." />
        <LoadingGrid />
      </Page>
    );
  }

  const { outfits, newestFirst } = orderOutfits(outfitsQuery.data ?? []);
  const [lead, ...rest] = outfits;
  return (
    <Page wide>
      <PageHeader
        title="Lookbook"
        lede={
          outfits.length
            ? `${outfits.length} saved ${outfits.length === 1 ? "look" : "looks"}${newestFirst && outfits.length > 1 ? " · newest first" : ""}`
            : "The looks you’ve put together, kept in one place."
        }
        actions={outfits.length > 0 && <ButtonLink to={paths.style(base)} variant="secondary" size="sm" className="min-h-11">Build a new look</ButtonLink>}
      />

      {lead ? (
        <>
          <LeadLook outfit={lead} rows={resolveOutfitPieces(lead, items)} images={images.byItem} base={base} newestFirst={newestFirst} onDelete={askDelete} />
          {rest.length > 0 && (
            <section aria-label="More saved looks" className={`mt-10 lg:mt-12 ${WARDROBE_GRID}`}>
              <AnimatePresence initial={false} mode="popLayout">
                {rest.map((outfit) => (
                  <LookCard key={outfit.id} outfit={outfit} rows={resolveOutfitPieces(outfit, items)} images={images.byItem} base={base} onDelete={askDelete} />
                ))}
              </AnimatePresence>
            </section>
          )}
        </>
      ) : (
        <EmptyState
          className="border-y border-line"
          art={<EmptyArt />}
          title="Your first look starts here."
          body="Put pieces together in Studio, or let Ideas suggest one from your wardrobe. Every look you save is kept here."
          action={
            <div className="flex flex-col items-center gap-2">
              <ButtonLink to={paths.style(base)}>Create an outfit</ButtonLink>
              <ButtonLink to={paths.style(base, { mode: "ideas" })} variant="quiet" className="min-h-11">Get an idea</ButtonLink>
            </div>
          }
        />
      )}

      {isDemo && <SessionNote />}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => { if (!deleting.current) setConfirmOpen(open); }}
        title={`Delete “${deleteTarget ? outfitTitle(deleteTarget) : "this look"}”?`}
        body="This removes the saved combination from your Lookbook. The clothing in your wardrobe stays untouched."
        confirmLabel="Delete look"
        cancelLabel="Keep this look"
        destructive
        loading={deleteOutfit.isPending}
        fallbackFocus={() => document.getElementById("main")}
        onConfirm={() => void confirmDelete()}
      />
    </Page>
  );
}
