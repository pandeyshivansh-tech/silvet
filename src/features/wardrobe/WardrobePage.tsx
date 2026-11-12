import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useItemImages, useItems, useBasePath } from "@/data";
import { CATEGORIES, COLORS, getCategory, getColor, labelOf, subcategoriesOf } from "@/domain/taxonomy";
import { Button, ButtonLink, Chip, ChipRow, ColorSwatch, EmptyState, ItemCard, ItemGridSkeleton, Page, PageHeader, SelectField, StateView, TextField, WARDROBE_GRID } from "@/ui";
import { paths } from "@/app/paths";
import { countActiveWardrobeFilters, filterWardrobeItems, type WardrobeFilters } from "./wardrobeFilters";

const initialFilters: WardrobeFilters = {
  query: "",
  category: "",
  subcategory: "",
  color: "",
  indianWear: false,
};

export default function WardrobePage() {
  const base = useBasePath();
  const itemsQuery = useItems();
  const items = itemsQuery.data;
  const images = useItemImages(items);
  const [filters, setFilters] = useState<WardrobeFilters>(initialFilters);

  const visibleItems = useMemo(() => filterWardrobeItems(items ?? [], filters), [items, filters]);
  const activeCount = countActiveWardrobeFilters(filters);
  const subcategoryOptions = filters.category
    ? subcategoriesOf(filters.category).map(({ slug, label }) => ({ value: slug, label }))
    : [];
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items ?? []) counts.set(item.categorySlug, (counts.get(item.categorySlug) ?? 0) + 1);
    return counts;
  }, [items]);
  const update = <K extends keyof WardrobeFilters>(key: K, value: WardrobeFilters[K]) =>
    setFilters((current) => ({ ...current, [key]: value }));
  const reset = () => setFilters(initialFilters);

  return (
    <Page wide>
      <PageHeader
        eyebrow={items ? `${items.length} ${items.length === 1 ? "piece" : "pieces"}` : "Your collection"}
        title="My wardrobe"
        lede="Everything you own, gathered in one place."
        actions={<ButtonLink to={paths.addItems(base)} size="md" leadingIcon={<Plus aria-hidden="true" className="size-4" />}>Add pieces</ButtonLink>}
      />

      <section aria-label="Wardrobe filters" className="mb-8 space-y-4">
        <div className="grid gap-4 sm:grid-cols-[minmax(15rem,1fr)_minmax(12rem,0.7fr)] sm:items-end">
          <TextField
            label="Search your pieces"
            aria-label="Search clothing by name"
            placeholder="Try “kurta” or “black”"
            value={filters.query}
            onChange={(event) => update("query", event.target.value)}
          />
          {filters.category && (
            <SelectField
              label="Type"
              value={filters.subcategory}
              onChange={(event) => update("subcategory", event.target.value)}
              options={subcategoryOptions}
              placeholder="All types"
            />
          )}
        </div>
        <ChipRow label="Wardrobe categories">
          <Chip variant="tab" selected={!filters.category} count={items?.length ?? 0} onClick={() => setFilters((current) => ({ ...current, category: "", subcategory: "" }))}>All</Chip>
          {CATEGORIES.map(({ slug, label }) => (
            <Chip
              key={slug}
              variant="tab"
              selected={filters.category === slug}
              count={categoryCounts.get(slug) ?? 0}
              onClick={() => setFilters((current) => ({ ...current, category: current.category === slug ? "" : slug, subcategory: "" }))}
            >
              {label}
            </Chip>
          ))}
        </ChipRow>
        <div className="flex flex-col gap-3 border-t border-line pt-3 sm:flex-row sm:items-center sm:justify-between">
          <Chip selected={filters.indianWear} onClick={() => update("indianWear", !filters.indianWear)}>Indian wear</Chip>
          <div className="flex min-w-0 items-center gap-3">
            <span className="shrink-0 text-caption text-graphite-deep">Colour</span>
            <ChipRow label="Filter by colour" className="min-w-0 flex-1">
              {COLORS.map((color) => (
                <button
                  key={color.slug}
                  type="button"
                  aria-label={`Filter by ${color.label}`}
                  aria-pressed={filters.color === color.slug}
                  title={color.label}
                  onClick={() => update("color", filters.color === color.slug ? "" : color.slug)}
                  className="relative inline-flex size-11 shrink-0 items-center justify-center rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-midnight"
                >
                  <ColorSwatch slug={color.slug} selected={filters.color === color.slug} />
                </button>
              ))}
            </ChipRow>
            {filters.color && <span className="hidden shrink-0 text-caption text-graphite-deep sm:inline">{getColor(filters.color)?.label}</span>}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {filters.query.trim() && <Chip selected removable onClick={() => update("query", "")}>Search: {filters.query.trim()}</Chip>}
            {filters.category && <Chip selected removable onClick={() => setFilters((current) => ({ ...current, category: "", subcategory: "" }))}>{getCategory(filters.category)?.label}</Chip>}
            {filters.subcategory && <Chip selected removable onClick={() => update("subcategory", "")}>{labelOf.subcategory(filters.subcategory)}</Chip>}
            {filters.color && <Chip selected removable onClick={() => update("color", "")}>{getColor(filters.color)?.label}</Chip>}
            {filters.indianWear && <Chip selected removable onClick={() => update("indianWear", false)}>Indian wear</Chip>}
            {activeCount > 0 && <p className="text-caption text-graphite-deep" aria-live="polite">{visibleItems.length} matching {visibleItems.length === 1 ? "piece" : "pieces"}</p>}
          </div>
          {activeCount > 0 && <Button variant="quiet" size="sm" onClick={reset}>Reset filters</Button>}
        </div>
      </section>

      <StateView
        query={itemsQuery}
        loading={<ItemGridSkeleton />}
        errorTitle="Your wardrobe is taking a moment."
        empty={
          <EmptyState
            title="A wardrobe begins with one."
            body="Add a piece you love. Its details will be ready when you plan what to wear."
            action={<ButtonLink to={paths.addItems(base)}>Add your first piece</ButtonLink>}
          />
        }
        isEmpty={(data) => data.length === 0}
      >
        {(data) => visibleItems.length === 0 ? (
          <div className="border-t border-line pt-2">
            <EmptyState
              title="Nothing matches just yet."
              body="Try another search or clear your filters to see the whole collection."
              action={<Button variant="secondary" onClick={reset}>Clear filters</Button>}
            />
          </div>
        ) : (
          <>
            <p className="mb-4 text-caption text-graphite-deep" aria-live="polite">
              Showing {visibleItems.length} of {data.length} {data.length === 1 ? "piece" : "pieces"}
            </p>
            <div className={WARDROBE_GRID}>
              {visibleItems.map((item) => (
                <ItemCard key={item.id} item={item} imageUrl={images.byItem.get(item.id)?.thumb} to={paths.item(base, item.id)} />
              ))}
            </div>
          </>
        )}
      </StateView>
    </Page>
  );
}
