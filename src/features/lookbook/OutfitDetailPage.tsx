import { ArrowLeft, ArrowUpRight, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { errorMessage, useBasePath, useDeleteOutfit, useIsDemo, useItemImages, useItems, useOutfit } from "@/data";
import type { Outfit } from "@/domain/types";
import { SLOT_LABELS, labelOf } from "@/domain/taxonomy";
import { paths } from "@/app/paths";
import { ActionMenu, BackLink, Button, ButtonLink, ConfirmDialog, ErrorState, ItemCard, Page, PageHeader, RemovedItemCard, Skeleton, StickyActionBar, useIsPhone, useToast } from "@/ui";
import { LookFlatLay } from "./LookFlatLay";
import { outfitCounts, outfitTitle, resolveOutfitPieces, sharedOccasions, sourceLabel } from "./lookbookPresentation";

function DetailSkeleton() {
  return (
    <div role="status" aria-label="Loading saved look" className="grid items-start gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:gap-10 lg:gap-16">
      <Skeleton className="aspect-[4/5] w-full" />
      <div className="space-y-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-8 h-24 w-full" />
      </div>
    </div>
  );
}

const savedDate = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-4 py-3.5">
      <dt className="text-caption text-graphite-deep">{label}</dt>
      <dd className="text-ui text-midnight">{children}</dd>
    </div>
  );
}

function SessionNote() {
  return (
    <p className="mt-12 border-t border-line pt-5 text-caption text-graphite-deep">
      This saved look lasts for this session. Close the tab and it will be gone.
    </p>
  );
}

export default function OutfitDetailPage() {
  const { outfitId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const base = useBasePath();
  const isDemo = useIsDemo();
  const outfitQuery = useOutfit(outfitId, true);
  const itemsQuery = useItems();
  const deleteOutfit = useDeleteOutfit();
  const images = useItemImages(itemsQuery.data);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<unknown>(null);
  const [lastKnownOutfit, setLastKnownOutfit] = useState<Outfit | null>(null);
  const deletingRef = useRef(false);
  const phone = useIsPhone();

  useEffect(() => {
    if (outfitQuery.data) setLastKnownOutfit(outfitQuery.data);
  }, [outfitQuery.data]);

  const outfit = outfitQuery.data ?? (deletingRef.current ? lastKnownOutfit : null);

  async function removeOutfit() {
    if (!outfitId || deletingRef.current) return;
    deletingRef.current = true;
    setDeletePending(true);
    setDeleteError(null);
    try {
      await deleteOutfit.mutateAsync(outfitId);
      setConfirmOpen(false);
      toast.success("Look deleted. Your wardrobe is unchanged.");
      navigate(paths.lookbook(base), { replace: true });
    } catch (error) {
      setDeleteError(error);
      setConfirmOpen(false);
    } finally {
      deletingRef.current = false;
      setDeletePending(false);
    }
  }

  if (!outfitId) {
    return (
      <Page>
        <PageHeader title="Look not found" lede="This saved look doesn’t have a valid address." />
        <ButtonLink to={paths.lookbook(base)} variant="secondary" leadingIcon={<ArrowLeft className="size-4" />}>
          Back to Lookbook
        </ButtonLink>
      </Page>
    );
  }

  if (outfitQuery.isError || itemsQuery.isError) {
    const failedQuery = outfitQuery.isError ? outfitQuery : itemsQuery;
    return (
      <Page wide>
        <PageHeader title="Saved look" />
        <ErrorState
          error={failedQuery.error}
          title="This look didn’t load."
          onRetry={() => {
            void outfitQuery.refetch();
            void itemsQuery.refetch();
          }}
        />
      </Page>
    );
  }

  if (itemsQuery.isPending || !itemsQuery.data || (outfitQuery.isPending && !outfit)) {
    return (
      <Page wide>
        <PageHeader title="Saved look" />
        <DetailSkeleton />
      </Page>
    );
  }

  if (!outfit) {
    return (
      <Page>
        <div className="mb-8">
          <Link
            to={paths.lookbook(base)}
            className="inline-flex min-h-11 items-center gap-2 text-ui font-medium text-midnight underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-midnight"
          >
            <ArrowLeft aria-hidden="true" className="size-4" /> Back to Lookbook
          </Link>
        </div>
        <div className="max-w-xl border-t border-line pt-7">
          <p className="eyebrow mb-3">Lookbook</p>
          <h1 className="font-display text-page text-midnight lg:text-page-lg">This look is no longer here.</h1>
          <p className="mt-3 max-w-prose text-body text-graphite-deep">
            It may have been removed, or the link may be out of date. Your other saved combinations are still in the Lookbook.
          </p>
          <ButtonLink to={paths.lookbook(base)} className="mt-7">
            Return to Lookbook
          </ButtonLink>
        </div>
      </Page>
    );
  }

  const items = itemsQuery.data ?? [];
  const rows = resolveOutfitPieces(outfit, items);
  const counts = outfitCounts(rows);
  const title = outfitTitle(outfit);
  const occasions = sharedOccasions(rows);
  const updated = Date.parse(outfit.updatedAt);
  const askDelete = () => {
    setDeleteError(null);
    setConfirmOpen(true);
  };
  const editLink = (
    <ButtonLink
      to={paths.style(base, { outfitId: outfit.id })}
      variant="secondary"
      className="min-h-11"
      aria-disabled={deletePending || undefined}
      onClick={(event) => { if (deletePending) event.preventDefault(); }}
      leadingIcon={<ArrowUpRight aria-hidden="true" className="size-4" />}
    >
      Edit in Studio
    </ButtonLink>
  );
  return (
    <Page wide>
      <BackLink to={paths.lookbook(base)}>Lookbook</BackLink>

      {/* The look card, opened: the flat-lay leads (sticky on desktop), name, notes and details beside it. */}
      <article className="grid items-start gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:gap-10 lg:gap-16">
        <div className="lg:sticky lg:top-10">
          <LookFlatLay rows={rows} images={images.byItem} size="detail" viewTransitionName="look" />
        </div>
        <div className="min-w-0">
          <p className="eyebrow mb-3">Saved look · {sourceLabel(outfit.source)}</p>
          <h1 className="font-display text-page text-midnight lg:text-page-lg">{title}</h1>
          <p className="mt-2 text-body text-graphite-deep">
            {counts.total} {counts.total === 1 ? "piece" : "pieces"}
            {counts.removed > 0 ? ` · ${counts.removed} no longer in your wardrobe` : ""}
          </p>
          <div className="mt-6 hidden flex-wrap gap-3 md:flex">
            {editLink}
            <Button variant="danger-quiet" className="min-h-11" disabled={deletePending} onClick={askDelete}>Delete look</Button>
          </div>

          {outfit.notes && (
            <p className="mt-8 max-w-prose border-l-2 border-line-strong pl-4 font-display text-lead-lg whitespace-pre-wrap text-midnight">{outfit.notes}</p>
          )}

          {deleteError !== null && (
            <div role="alert" className="mt-8 flex flex-col gap-3 border-l-2 border-danger bg-chalk-deep px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-body text-graphite-deep">{errorMessage(deleteError)} The look is still here.</p>
              <Button
                variant="secondary"
                size="sm"
                className="min-h-11 w-fit"
                loading={deletePending}
                loadingLabel="Trying again…"
                onClick={() => void removeOutfit()}
                leadingIcon={<RefreshCw aria-hidden="true" className="size-4" />}
              >
                Retry delete
              </Button>
            </div>
          )}

          <dl className="mt-8 divide-y divide-line border-y border-line">
            <DetailRow label="Made">{outfit.source === "suggestion" ? "Suggested in Ideas" : "Built in Studio"}</DetailRow>
            {occasions.length > 0 && <DetailRow label="Occasion">{occasions.map(labelOf.occasion).join(" · ")}</DetailRow>}
            {Number.isFinite(updated) && (
              <DetailRow label={outfit.updatedAt === outfit.createdAt ? "Saved" : "Updated"}>{savedDate.format(updated)}</DetailRow>
            )}
          </dl>
        </div>
      </article>

      <section className="mt-12 border-t border-line pt-8 lg:mt-16" aria-label="Pieces in this look">
        <h2 className="mb-5 font-display text-look text-midnight lg:text-look-lg">The pieces</h2>
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-5 lg:gap-y-10 xl:grid-cols-6">
          {rows.map(({ piece, item, key }) => (
            <article key={key} className="min-w-0">
              <p className="mb-2 text-caption text-graphite-deep">{SLOT_LABELS[piece.slot]}</p>
              {item ? (
                <ItemCard item={item} imageUrl={images.byItem.get(item.id)?.full} to={paths.item(base, item.id)} />
              ) : (
                <RemovedItemCard slot={piece.slot} />
              )}
            </article>
          ))}
        </div>
      </section>

      {/* Phones and small tablets: actions stay in reach while the whole look scrolls by. */}
      <StickyActionBar className="mt-10 md:hidden" label="Look actions">
        {editLink}
        {phone ? (
          <ActionMenu
            label={`More actions for ${title}`}
            title={title}
            items={[{ label: "Delete look…", icon: <Trash2 aria-hidden="true" className="size-4" strokeWidth={1.5} />, destructive: true, disabled: deletePending, onSelect: askDelete }]}
          />
        ) : (
          <Button variant="danger-quiet" className="min-h-11" disabled={deletePending} onClick={askDelete}>Delete look</Button>
        )}
      </StickyActionBar>
      {isDemo && <SessionNote />}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete “${title}”?`}
        body="This removes the saved combination from your Lookbook. The clothing in your wardrobe stays untouched."
        confirmLabel="Delete look"
        cancelLabel="Keep this look"
        destructive
        loading={deletePending}
        onConfirm={() => void removeOutfit()}
      />
    </Page>
  );
}
