import { useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router";
import { useBasePath, useDeleteItem, useItem, useItemImages, useItemUsage } from "@/data";
import { errorMessage } from "@/data/repository";
import { paths } from "@/app/paths";
import { getCategory, itemTypeLabel, labelOf } from "@/domain/taxonomy";
import { Trash2 } from "lucide-react";
import { ActionMenu, BackLink, Button, ButtonLink, ColorSwatch, ConfirmDialog, EmptyState, GarmentFrame, Page, Skeleton, StateView, StickyActionBar, useIsPhone, useToast } from "@/ui";

/**
 * One garment (M8 Batch 4): the photograph leads (left from 768 px, sticky on desktop), the name is the
 * serif page heading, then colour, the details as a quiet definition list, and where it is used.
 * Edit / Delete sit under the name from 768 px; below that they move to the sticky action bar.
 */
export default function ItemDetailPage() {
  const { itemId } = useParams();
  const base = useBasePath();
  const navigate = useNavigate();
  const toast = useToast();
  const itemQuery = useItem(itemId, true);
  const item = itemQuery.data;
  const imageItems = useMemo(() => item ? [item] : undefined, [item]);
  const imageQuery = useItemImages(imageItems);
  const usageQuery = useItemUsage(itemId);
  const deleteItem = useDeleteItem();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deleting = useRef(false);
  const phone = useIsPhone();

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
      <BackLink to={paths.wardrobe(base)}>My wardrobe</BackLink>
      {!item && <h1 className="sr-only">Piece details</h1>}
      <StateView
        query={itemQuery}
        loading={
          <div className="grid gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:gap-10 lg:gap-16">
            <Skeleton className="aspect-[4/5] w-full" />
            <div className="space-y-4"><Skeleton className="h-3 w-1/4" /><Skeleton className="h-12 w-3/4" /><Skeleton className="h-4 w-1/3" /><Skeleton className="mt-8 h-40 w-full" /></div>
          </div>
        }
        empty={<EmptyState title="This piece isn't in the wardrobe." body="It may have been removed, or the link may be out of date." action={<ButtonLink to={paths.wardrobe(base)}>Return to my wardrobe</ButtonLink>} />}
        isEmpty={(data) => data === null}
      >
        {(data) => data ? (
          <article className="grid items-start gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:gap-10 lg:gap-16">
            <div className="lg:sticky lg:top-10">
              <GarmentFrame item={data} imageUrl={imageQuery.byItem.get(data.id)?.full} viewTransitionName="garment" />
            </div>
            <div className="min-w-0 md:pt-1">
              <p className="eyebrow mb-3">{getCategory(data.categorySlug)?.label ?? "Wardrobe piece"}</p>
              <h1 className="font-display text-page text-midnight lg:text-page-lg">{data.name}</h1>
              <p className="mt-2 text-body text-graphite-deep">{itemTypeLabel(data)}</p>

              <div className="mt-6 hidden items-center gap-2 md:flex">
                <ButtonLink to={paths.editItem(data.id, base)} variant="secondary">Edit piece</ButtonLink>
                <Button variant="danger-quiet" onClick={() => setConfirmOpen(true)}>Delete</Button>
              </div>

              <dl className="mt-8 divide-y divide-line border-y border-line">
                <DetailRow label="Category">{getCategory(data.categorySlug)?.label ?? data.categorySlug}</DetailRow>
                {data.subcategorySlug && <DetailRow label="Type">{labelOf.subcategory(data.subcategorySlug)}</DetailRow>}
                {(data.primaryColor || data.secondaryColor) && (
                  <DetailRow label="Colour">
                    <span className="flex flex-wrap gap-x-5 gap-y-2">
                      {[...new Set([data.primaryColor, data.secondaryColor].filter((color): color is string => Boolean(color)))].map((color) => (
                        <ColorSwatch key={color} slug={color} label />
                      ))}
                    </span>
                  </DetailRow>
                )}
                {data.pattern && <DetailRow label="Pattern">{labelOf.pattern(data.pattern)}</DetailRow>}
                {data.styleTags.length > 0 && <DetailRow label="Style"><List values={data.styleTags.map(labelOf.style)} /></DetailRow>}
                {data.occasionTags.length > 0 && <DetailRow label="Occasion"><List values={data.occasionTags.map(labelOf.occasion)} /></DetailRow>}
                {data.seasonTags.length > 0 && <DetailRow label="Season"><List values={data.seasonTags.map(labelOf.season)} /></DetailRow>}
              </dl>

              <section className="mt-8" aria-labelledby="saved-looks-heading">
                <h2 id="saved-looks-heading" className="font-display text-look text-midnight">Saved looks</h2>
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
              {/* Below 768 px: Edit stays in reach above the tab bar; on phones Delete moves into the ⋯ menu. */}
              <StickyActionBar className="mt-8 md:hidden" label="Piece actions">
                <ButtonLink to={paths.editItem(data.id, base)} className="flex-1 sm:flex-none">Edit piece</ButtonLink>
                {phone ? (
                  <ActionMenu
                    label={`More actions for ${data.name}`}
                    title={data.name}
                    items={[{ label: "Delete piece", destructive: true, icon: <Trash2 aria-hidden="true" className="size-4" strokeWidth={1.5} />, onSelect: () => setConfirmOpen(true) }]}
                  />
                ) : (
                  <Button variant="danger-quiet" className="min-h-11" onClick={() => setConfirmOpen(true)}>Delete piece</Button>
                )}
              </StickyActionBar>
            </div>
          </article>
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

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-4 py-3.5">
      <dt className="text-caption text-graphite-deep">{label}</dt>
      <dd className="text-ui text-midnight">{children}</dd>
    </div>
  );
}

function List({ values }: { values: string[] }) {
  return (
    <span className="flex flex-wrap gap-x-2 gap-y-1">
      {values.map((value, index) => <span key={`${value}-${index}`}>{index > 0 && <span aria-hidden="true" className="mr-2 text-graphite">·</span>}{value}</span>)}
    </span>
  );
}
