import { ArrowLeft, ArrowUpRight, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { errorMessage, useBasePath, useDeleteOutfit, useIsDemo, useItemImages, useItems, useOutfit } from "@/data";
import type { Outfit } from "@/domain/types";
import { SLOT_LABELS } from "@/domain/taxonomy";
import { paths } from "@/app/paths";
import { Button, ButtonLink, ConfirmDialog, ErrorState, ItemCard, Page, PageHeader, RemovedItemCard, Skeleton, useToast } from "@/ui";
import { outfitCounts, outfitTitle, resolveOutfitPieces } from "./lookbookPresentation";

function DetailSkeleton() {
  return (
    <div role="status" aria-label="Loading saved look">
      <div className="mb-8 flex items-center justify-between border-b border-line pb-5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-12 w-3/4 sm:h-16 sm:w-1/2" />
      <Skeleton className="mt-4 h-4 w-32" />
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">
        {[0, 1, 2, 3].map((key) => (
          <div key={key}>
            <Skeleton className="aspect-[4/5] w-full" />
            <Skeleton className="mt-3 h-4 w-3/4" />
            <Skeleton className="mt-2 h-3 w-1/2" />
          </div>
        ))}
      </div>
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
  const outfitQuery = useOutfit(outfitId);
  const itemsQuery = useItems();
  const deleteOutfit = useDeleteOutfit();
  const images = useItemImages(itemsQuery.data);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<unknown>(null);
  const [lastKnownOutfit, setLastKnownOutfit] = useState<Outfit | null>(null);
  const deletingRef = useRef(false);

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
  return (
    <Page wide>
      <header className="mb-8 flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-center sm:justify-between">
        <Link
          to={paths.lookbook(base)}
          className="inline-flex min-h-11 w-fit items-center gap-2 text-ui font-medium text-midnight underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-midnight"
        >
          <ArrowLeft aria-hidden="true" className="size-4" /> Lookbook
        </Link>
        <div className="flex flex-wrap items-center gap-4">
          <ButtonLink
            to={paths.style(base, { outfitId: outfit.id })}
            variant="secondary"
            size="sm"
            className="min-h-11"
            aria-disabled={deletePending || undefined}
            onClick={(event) => { if (deletePending) event.preventDefault(); }}
            leadingIcon={<ArrowUpRight aria-hidden="true" className="size-4" />}
          >
            Edit in Studio
          </ButtonLink>
          <Button
            variant="danger-quiet"
            size="sm"
            className="min-h-11"
            disabled={deletePending}
            onClick={() => {
              setDeleteError(null);
              setConfirmOpen(true);
            }}
          >
            Delete look
          </Button>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-end">
        <div>
          <p className="eyebrow mb-3">Saved look</p>
          <h1 className="max-w-4xl font-display text-page text-midnight lg:text-page-lg">
            {outfitTitle(outfit)}
          </h1>
        </div>
        <p className="text-body text-graphite-deep">
          {counts.total} {counts.total === 1 ? "piece" : "pieces"}
          {counts.removed > 0 ? ` · ${counts.removed} no longer in your wardrobe` : ""}
        </p>
      </div>

      {outfit.notes && (
        <p className="mt-6 max-w-2xl whitespace-pre-wrap text-lead text-graphite-deep">{outfit.notes}</p>
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

      <section className="mt-9 sm:mt-12" aria-label="Pieces in this look">
        <div className="mb-5 flex items-center gap-4">
          <h2 className="font-display text-look text-midnight lg:text-look-lg">The pieces</h2>
          <span className="h-px flex-1 bg-line" />
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-5 lg:gap-y-10">
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
      {isDemo && <SessionNote />}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete “${outfitTitle(outfit)}”?`}
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
