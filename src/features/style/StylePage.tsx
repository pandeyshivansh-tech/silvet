import { useSearchParams } from "react-router";
import { useItems, useOutfit, useItemImages, useBasePath } from "@/data";
import { ButtonLink, ErrorState, Page, PageHeader, Skeleton } from "@/ui";
import { useMemo } from "react";
import { paths } from "@/app/paths";
import { OutfitEditor } from "./OutfitEditor";

export default function StylePage() {
  const [searchParams] = useSearchParams();
  const outfitId = searchParams.get("outfit") ?? undefined;
  const base = useBasePath();
  const itemsQuery = useItems();
  const outfitQuery = useOutfit(outfitId);
  const items = itemsQuery.data;
  const images = useItemImages(items);
  const imageMap = useMemo(() => images.byItem, [images.byItem]);

  if (itemsQuery.isPending || (outfitId && outfitQuery.isPending)) {
    return (
      <Page wide>
        <PageHeader title="Build a look" lede="Start with the pieces you want to wear. The rest is yours to decide." />
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
          <Skeleton className="min-h-[28rem] w-full" />
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-12 w-2/3" />
          </div>
        </div>
      </Page>
    );
  }

  if (itemsQuery.isError) {
    return <Page wide><ErrorState error={itemsQuery.error} onRetry={() => void itemsQuery.refetch()} /></Page>;
  }
  if (outfitId && outfitQuery.isError) {
    return <Page wide><ErrorState error={outfitQuery.error} title="This look couldn't be opened." onRetry={() => void outfitQuery.refetch()} /></Page>;
  }
  if (outfitId && !outfitQuery.data) {
    return (
      <Page wide>
        <PageHeader title="Look not found" lede="It may have been removed, or the link may be out of date." />
        <ButtonLink variant="secondary" to={paths.style(base)}>Start a new look</ButtonLink>
      </Page>
    );
  }

  return (
    <Page wide>
      <OutfitEditor
        key={outfitId ?? "new"}
        outfit={outfitQuery.data ?? undefined}
        items={items ?? []}
        imageByItem={imageMap}
        base={base}
      />
    </Page>
  );
}
