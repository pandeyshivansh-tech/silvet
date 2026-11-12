import { useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useBasePath, useDeleteItem, useItem, useItemImages, useItemUsage } from "@/data";
import { errorMessage } from "@/data/repository";
import { paths } from "@/app/paths";
import { getCategory, itemTypeLabel, labelOf } from "@/domain/taxonomy";
import { Button, ButtonLink, ColorSwatch, ConfirmDialog, EmptyState, GarmentFrame, Page, PageHeader, Skeleton, StateView, useToast } from "@/ui";

export default function ItemDetailPage() {
  const { itemId } = useParams();
  const base = useBasePath();
  const navigate = useNavigate();
  const toast = useToast();
  const itemQuery = useItem(itemId);
  const item = itemQuery.data;
  const imageItems = useMemo(() => item ? [item] : undefined, [item]);
  const imageQuery = useItemImages(imageItems);
  const usageQuery = useItemUsage(itemId);
  const deleteItem = useDeleteItem();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deleting = useRef(false);

  const remove = async () => {
    if (!itemId || deleting.current) return;
    deleting.current = true;
    try {
      await deleteItem.mutateAsync(itemId);
      setConfirmOpen(false);
      toast.success("Piece removed from your wardrobe.");
      navigate(paths.wardrobe(base));
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      deleting.current = false;
    }
  };

  return (
    <Page>
      <PageHeader
        eyebrow="My wardrobe"
        title={item?.name ?? "Piece details"}
        actions={
          item ? (
            <div className="hidden items-center gap-2 md:flex">
              <ButtonLink to={paths.editItem(item.id, base)} variant="secondary">Edit piece</ButtonLink>
              <Button variant="danger-quiet" onClick={() => setConfirmOpen(true)}>Delete</Button>
            </div>
          ) : <ButtonLink to={paths.wardrobe(base)} variant="secondary">Back to wardrobe</ButtonLink>
        }
      />
      <StateView
        query={itemQuery}
        loading={<div className="grid gap-8 md:grid-cols-2"><Skeleton className="aspect-[4/5] w-full" /><div className="space-y-5"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-24 w-full" /></div></div>}
        empty={<EmptyState title="This piece isn't in the wardrobe." body="It may have been removed, or the link may be out of date." action={<ButtonLink to={paths.wardrobe(base)}>Return to my wardrobe</ButtonLink>} />}
        isEmpty={(data) => data === null}
      >
        {(data) => data ? (
          <div className="grid items-start gap-8 md:grid-cols-[minmax(16rem,0.9fr)_minmax(0,1.1fr)] md:gap-12 lg:gap-16">
            <div className="mx-auto w-full max-w-md md:mx-0">
              <GarmentFrame item={data} imageUrl={imageQuery.byItem.get(data.id)?.full} />
            </div>
            <div className="min-w-0">
              <p className="mb-3 text-caption text-graphite-deep">{getCategory(data.categorySlug)?.label ?? "Wardrobe piece"}</p>
              <h2 className="font-display text-section text-midnight lg:text-section-lg">{data.name}</h2>
              <p className="mt-2 text-body text-graphite-deep">{itemTypeLabel(data)}</p>

              <dl className="mt-8 divide-y divide-line border-y border-line">
                <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-4 py-4">
                  <dt className="text-caption text-graphite-deep">Category</dt>
                  <dd className="text-ui text-midnight">{getCategory(data.categorySlug)?.label ?? data.categorySlug}</dd>
                </div>
                {data.subcategorySlug && <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-4 py-4">
                  <dt className="text-caption text-graphite-deep">Type</dt>
                  <dd className="text-ui text-midnight">{labelOf.subcategory(data.subcategorySlug)}</dd>
                </div>}
                {(data.primaryColor || data.secondaryColor) && <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-4 py-4">
                  <dt className="text-caption text-graphite-deep">Colour</dt>
                  <dd className="flex flex-wrap gap-x-5 gap-y-2">
                    {[...new Set([data.primaryColor, data.secondaryColor].filter((color): color is string => Boolean(color)))].map((color) => (
                      <ColorSwatch key={color} slug={color} label />
                    ))}
                  </dd>
                </div>}
                {data.pattern && <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-4 py-4">
                  <dt className="text-caption text-graphite-deep">Pattern</dt>
                  <dd className="text-ui text-midnight">{labelOf.pattern(data.pattern)}</dd>
                </div>}
                {data.styleTags.length > 0 && <MetadataRow label="Style" values={data.styleTags.map(labelOf.style)} />}
                {data.occasionTags.length > 0 && <MetadataRow label="Occasion" values={data.occasionTags.map(labelOf.occasion)} />}
                {data.seasonTags.length > 0 && <MetadataRow label="Season" values={data.seasonTags.map(labelOf.season)} />}
              </dl>

              <section className="mt-8">
                <h3 className="text-ui font-medium text-midnight">Saved looks</h3>
                {usageQuery.isPending ? (
                  <p className="mt-2 text-caption text-graphite-deep">Checking saved looks…</p>
                ) : usageQuery.isError ? (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <p className="text-caption text-graphite-deep">Saved-look usage is unavailable right now.</p>
                    <Button variant="quiet" size="sm" onClick={() => void usageQuery.refetch()}>Try again</Button>
                  </div>
                ) : (
                  <p className="mt-2 text-body text-graphite-deep">
                    {usageQuery.data === 0
                      ? "This piece hasn't been used in a saved look yet."
                      : `Used in ${usageQuery.data} saved ${usageQuery.data === 1 ? "look" : "looks"}.`}
                  </p>
                )}
              </section>
              <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-line pt-5 md:hidden">
                <ButtonLink to={paths.editItem(data.id, base)} variant="secondary">Edit piece</ButtonLink>
                <Button variant="danger-quiet" onClick={() => setConfirmOpen(true)}>Delete piece</Button>
              </div>
            </div>
          </div>
        ) : null}
      </StateView>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Remove this piece?"
        body={usageQuery.data
          ? `It's in ${usageQuery.data} saved ${usageQuery.data === 1 ? "look" : "looks"}. Those looks will remain, with this piece marked as removed.`
          : "This piece will be removed from your wardrobe. Saved looks that include it will stay, with the piece marked as removed."}
        confirmLabel="Remove piece"
        destructive
        loading={deleteItem.isPending}
        onConfirm={() => void remove()}
      />
    </Page>
  );
}

function MetadataRow({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-4 py-4">
      <dt className="text-caption text-graphite-deep">{label}</dt>
      <dd className="flex flex-wrap gap-x-2 gap-y-1 text-ui text-midnight">
        {values.map((value, index) => <span key={`${value}-${index}`}>{index > 0 && <span className="mr-2 text-graphite">·</span>}{value}</span>)}
      </dd>
    </div>
  );
}
