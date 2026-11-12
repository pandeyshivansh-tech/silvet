import { ArrowUpRight, BookOpen } from "lucide-react";
import { Link } from "react-router";
import { useBasePath, useIsDemo, useItemImages, useItems, useOutfits } from "@/data";
import type { ClothingItem, Outfit } from "@/domain/types";
import { itemTypeLabel } from "@/domain/taxonomy";
import { paths } from "@/app/paths";
import { ButtonLink, EmptyState, ErrorState, GarmentFrame, Page, PageHeader, RemovedItemCard, Skeleton } from "@/ui";
import { outfitCounts, outfitTitle, orderOutfits, resolveOutfitPieces } from "./lookbookPresentation";

function LoadingGrid() {
  return (
    <div role="status" aria-label="Loading saved looks" className="space-y-8">
      <div className="grid gap-5 rounded-xs bg-midnight p-4 sm:grid-cols-[1.15fr_0.85fr] sm:p-6 lg:gap-8 lg:p-8">
        <Skeleton className="aspect-[4/3] w-full" />
        <div className="flex flex-col justify-between gap-6 py-2">
          <div className="space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-4/5" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-12 w-36" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">
        {[0, 1, 2, 3].map((key) => (
          <div key={key}>
            <Skeleton className="aspect-[4/5] w-full" />
            <Skeleton className="mt-3 h-5 w-4/5" />
            <Skeleton className="mt-2 h-3 w-2/5" />
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewComposition({
  outfit,
  items,
  byItem,
  featured = false,
}: {
  outfit: Outfit;
  items: readonly ClothingItem[];
  byItem: Map<string, { thumb: string; full: string }>;
  featured?: boolean;
}) {
  const pieces = resolveOutfitPieces(outfit, items);
  return (
    <div
      className="grid min-h-0 grid-cols-2 content-start gap-2 sm:gap-3"
      aria-label={`${pieces.length} pieces in this look`}
    >
      {pieces.map(({ piece, item, key }) =>
        item ? (
          <GarmentFrame
            key={key}
            item={item}
            imageUrl={byItem.get(item.id)?.thumb}
            className={featured ? "aspect-[4/3]! [&_img]:object-contain" : undefined}
          />
        ) : (
          <div key={key} className="min-w-0">
            <RemovedItemCard slot={piece.slot} />
          </div>
        ),
      )}
    </div>
  );
}

function PieceNames({ outfit, items }: { outfit: Outfit; items: readonly ClothingItem[] }) {
  const pieces = resolveOutfitPieces(outfit, items);
  const labels = pieces.flatMap(({ item }) =>
    item ? [`${item.name} · ${itemTypeLabel(item)}`] : [],
  );
  return (
    <p className="mt-2 line-clamp-2 text-caption text-graphite-deep">
      {labels.length ? labels.join("  /  ") : "Pieces kept with this look"}
      {pieces.some(({ item }) => !item) && labels.length > 0 ? "  /  Removed piece" : ""}
    </p>
  );
}

function FeaturedLook({
  outfit,
  items,
  byItem,
  base,
}: {
  outfit: Outfit;
  items: readonly ClothingItem[];
  byItem: Map<string, { thumb: string; full: string }>;
  base: "/demo" | "/app";
}) {
  const rows = resolveOutfitPieces(outfit, items);
  const counts = outfitCounts(rows);
  return (
    <article className="surface-midnight grid gap-5 rounded-xs p-4 sm:grid-cols-[1.12fr_0.88fr] sm:gap-7 sm:p-6 lg:gap-9 lg:p-8">
      <Link
        to={paths.outfit(base, outfit.id)}
        aria-label={`Open ${outfitTitle(outfit)}`}
        className="group min-w-0 rounded-xs bg-chalk-deep p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-citron sm:p-4"
      >
        <PreviewComposition outfit={outfit} items={items} byItem={byItem} featured />
      </Link>
      <div className="flex min-w-0 flex-col items-start justify-between gap-7 py-1 sm:py-3">
        <div>
          <p className="eyebrow mb-3 text-midnight-muted">From your Lookbook</p>
          <h2 className="font-display text-section text-chalk lg:text-section-lg">
            {outfitTitle(outfit)}
          </h2>
          <p className="mt-3 text-caption text-midnight-muted">
            {counts.total} {counts.total === 1 ? "piece" : "pieces"}
            {counts.removed > 0 ? ` · ${counts.removed} no longer in wardrobe` : ""}
          </p>
          <div className="mt-4 space-y-1">
            {rows.map(({ item, key }) =>
              item ? (
                <p key={key} className="text-body text-chalk">
                  {item.name}
                </p>
              ) : null,
            )}
          </div>
        </div>
        <ButtonLink
          to={paths.outfit(base, outfit.id)}
          variant="secondary"
          size="sm"
          className="min-h-11"
          aria-label={`Open ${outfitTitle(outfit)}`}
        >
          Open this look
        </ButtonLink>
      </div>
    </article>
  );
}

function LookTile({
  outfit,
  items,
  byItem,
  base,
}: {
  outfit: Outfit;
  items: readonly ClothingItem[];
  byItem: Map<string, { thumb: string; full: string }>;
  base: "/demo" | "/app";
}) {
  const counts = outfitCounts(resolveOutfitPieces(outfit, items));
  return (
    <Link
      to={paths.outfit(base, outfit.id)}
      className="group block min-w-0 rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-midnight"
    >
      <div className="bg-chalk-deep p-3 sm:p-4">
        <PreviewComposition outfit={outfit} items={items} byItem={byItem} />
      </div>
      <div className="pt-3">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-display text-look text-midnight decoration-midnight underline-offset-4 group-hover:underline lg:text-look-lg">
            {outfitTitle(outfit)}
          </h2>
          <ArrowUpRight aria-hidden="true" className="mt-1 size-4 shrink-0 text-graphite-deep" strokeWidth={1.5} />
        </div>
        <p className="mt-1 text-caption text-graphite-deep">
          {counts.total} {counts.total === 1 ? "piece" : "pieces"}
          {counts.removed ? ` · ${counts.removed} removed` : ""}
        </p>
        <PieceNames outfit={outfit} items={items} />
      </div>
    </Link>
  );
}

function SessionNote() {
  return (
    <aside className="mt-10 flex flex-col gap-2 border-t border-line pt-5 text-caption text-graphite-deep sm:flex-row sm:items-center sm:justify-between">
      <p>These looks are kept for this session. They disappear when you close the tab.</p>
      <Link to={paths.signUp()} className="min-h-11 inline-flex items-center gap-1 font-medium text-midnight underline underline-offset-4">
        Create your wardrobe <ArrowUpRight aria-hidden="true" className="size-3.5" />
      </Link>
    </aside>
  );
}

export default function LookbookPage() {
  const base = useBasePath();
  const isDemo = useIsDemo();
  const outfitsQuery = useOutfits();
  const itemsQuery = useItems();
  const items = itemsQuery.data;
  const images = useItemImages(items);

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
  return (
    <Page wide>
      <PageHeader
        title="Lookbook"
        lede={
          outfits.length
            ? `${outfits.length} saved ${outfits.length === 1 ? "look" : "looks"}${
                newestFirst ? " · newest first" : ""
              }`
            : "A place for the combinations you want to remember."
        }
        actions={
          outfits.length > 0 ? (
            <ButtonLink to={paths.style(base)} size="sm" className="min-h-11">
              Build a new look
            </ButtonLink>
          ) : undefined
        }
      />

      {!outfits.length ? (
        <EmptyState
          art={<BookOpen aria-hidden="true" className="mx-auto size-16 stroke-[1.2]" />}
          title="Your first look starts here."
          body="Bring a few pieces together in Studio, then save the combination here for another day."
          action={<ButtonLink to={paths.style(base)}>Create an outfit</ButtonLink>}
        />
      ) : (
        <>
          <FeaturedLook outfit={outfits[0]!} items={items} byItem={images.byItem} base={base} />
          {outfits.length > 1 && (
            <section className="mt-10 sm:mt-12" aria-label="More saved looks">
              <div className="mb-5 flex items-center gap-4">
                <h2 className="font-display text-look text-midnight lg:text-look-lg">Kept alongside</h2>
                <span className="h-px flex-1 bg-line" />
                <span className="text-caption text-graphite-deep">{outfits.length - 1} more</span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-5 lg:gap-y-10">
                {outfits.slice(1).map((outfit) => (
                  <LookTile
                    key={outfit.id}
                    outfit={outfit}
                    items={items}
                    byItem={images.byItem}
                    base={base}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
      {isDemo && <SessionNote />}
    </Page>
  );
}
