import { AnimatePresence, motion } from "motion/react";
import { fade, transition } from "@/motion/presets";
import { useId, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { Plus, SlidersHorizontal } from "lucide-react";
import { useItemImages, useItems, useBasePath } from "@/data";
import { CATEGORIES, COLORS, OCCASIONS, SEASONS, STYLES, getCategory, getColor, labelOf, subcategoriesOf } from "@/domain/taxonomy";
import { Button, ButtonLink, Chip, ChipRow, ColorSwatch, EmptyState, FilterSheet, ItemCard, ItemGridSkeleton, Page, PageHeader, RotatingWord, SelectField, StateView, TextField, WARDROBE_GRID, cn, useIsPhone } from "@/ui";
import { paths } from "@/app/paths";
import { countActiveWardrobeFilters, emptyWardrobeFilters, filterWardrobeItems, readWardrobeFilters, writeWardrobeFilters, type WardrobeFilters } from "./wardrobeFilters";

/**
 * The wardrobe (M8 Batch 4): a personal archive, garments first. Search, category tabs and a Filters
 * control sit in two short rows; the detailed filters live in a sheet on phones and in a panel that
 * opens under the toolbar from 640 px, so the first row of garments shows early at every width.
 * All filter state stays in the URL (wardrobeFilters.ts) exactly as before.
 */
/** Rotating search hints: a garment, a colour, an occasion — the three things search and filters understand. */
const SEARCH_HINTS = ["kurta", "black", "festive", "juttis", "denim"];

export default function WardrobePage() {
  const base = useBasePath();
  const [searchFocused, setSearchFocused] = useState(false);
  const itemsQuery = useItems();
  const items = itemsQuery.data;
  const images = useItemImages(items);
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => readWardrobeFilters(params), [params]);
  const setFilters = (next: WardrobeFilters | ((current: WardrobeFilters) => WardrobeFilters)) =>
    setParams((current) => writeWardrobeFilters(typeof next === "function" ? next(readWardrobeFilters(current)) : next, current), { replace: true, preventScrollReset: true });

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
  const reset = () => setFilters(emptyWardrobeFilters);
  // Search and categories stay on the page; everything else lives in the Filters sheet (phones) or panel (640 px+).
  const phone = useIsPhone();
  const panelCount = [filters.subcategory, filters.occasion, filters.season, filters.style, filters.color].filter(Boolean).length + (filters.indianWear ? 1 : 0);
  const resetPanel = () => setFilters((current) => ({ ...emptyWardrobeFilters, query: current.query, category: current.category }));
  // A shared or reloaded URL with detailed filters opens the panel, so what is filtering the grid is visible.
  const [panelOpen, setPanelOpen] = useState(panelCount > 0);
  const panelId = useId();

  const typeSelect = filters.category && (
    <SelectField
      label="Type"
      value={filters.subcategory}
      onChange={(event) => update("subcategory", event.target.value)}
      options={subcategoryOptions}
      placeholder="All types"
    />
  );
  const facets = (
    <>
      <SelectField label="Occasion" value={filters.occasion ?? ""} placeholder="All occasions"
        options={OCCASIONS.map(({ slug, label }) => ({ value: slug, label }))} onChange={(event) => update("occasion", event.target.value)} />
      <SelectField label="Season" value={filters.season ?? ""} placeholder="All seasons"
        options={SEASONS.map(({ slug, label }) => ({ value: slug, label }))} onChange={(event) => update("season", event.target.value)} />
      <SelectField label="Style" value={filters.style ?? ""} placeholder="All styles"
        options={STYLES.map(({ slug, label }) => ({ value: slug, label }))} onChange={(event) => update("style", event.target.value)} />
    </>
  );
  const indianWear = <Chip selected={filters.indianWear} onClick={() => update("indianWear", !filters.indianWear)} className="self-start">Indian wear</Chip>;
  const colourButtons = COLORS.map((color) => (
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
    ));
  const colourLabel = <p className="mb-1 text-caption text-graphite-deep">Colour{filters.color && ` · ${getColor(filters.color)?.label}`}</p>;
  const countBadge = panelCount > 0 && (
    <span className="rounded-xs bg-lilac px-1.5 text-caption font-medium tabular-nums text-midnight"><span className="sr-only">, </span>{panelCount}<span className="sr-only"> active</span></span>
  );

  return (
    <Page wide>
      <PageHeader
        eyebrow={items ? `${items.length} ${items.length === 1 ? "piece" : "pieces"}` : "Your collection"}
        title="My wardrobe"
        lede={phone ? undefined : "Everything you own, gathered in one place."}
        actions={
          <ButtonLink to={paths.addItems(base)} size={phone ? "sm" : "md"} aria-label={phone ? "Add pieces" : undefined} leadingIcon={<Plus aria-hidden="true" className="size-4" />}>
            {phone ? "Add" : "Add pieces"}
          </ButtonLink>
        }
      />

      <section aria-label="Wardrobe filters" className="mb-6 space-y-3 lg:mb-8">
        <div className="flex items-center gap-3">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <TextField
              label="Search your pieces"
              hideLabel
              aria-label="Search clothing by name"
              type="search"
              // While the empty box is idle, the rotating hint below stands in for the placeholder.
              placeholder={searchFocused ? "Search “kurta” or “black”" : ""}
              value={filters.query}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              onChange={(event) => update("query", event.target.value)}
            />
            {!searchFocused && !filters.query && (
              <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 flex h-12 items-center px-3.5 text-input text-graphite-deep">
                Search for&nbsp;<RotatingWord words={SEARCH_HINTS} />
              </span>
            )}
          </div>
          {phone ? (
            <FilterSheet activeCount={panelCount} resultCount={visibleItems.length} noun={["piece", "pieces"]} onReset={resetPanel}>
              <div className="space-y-5">
                <div className="grid gap-5">{typeSelect}{facets}</div>
                {indianWear}
                <div>
                  {colourLabel}
                  <div role="group" aria-label="Filter by colour" className="-mx-1.5 flex flex-wrap">
                    {colourButtons}
                  </div>
                </div>
              </div>
            </FilterSheet>
          ) : (
            <Button variant="secondary" aria-expanded={panelOpen} aria-controls={panelId} onClick={() => setPanelOpen(!panelOpen)}
              leadingIcon={<SlidersHorizontal aria-hidden="true" className="size-4" strokeWidth={1.5} />}>
              Filters
              {countBadge}
            </Button>
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

        {!phone && (
          // `hidden` keeps the controls mounted, so URL state and the inline layout stay one source.
          <div id={panelId} hidden={!panelOpen} className="space-y-4 border-y border-line py-5">
            <div className={cn("grid gap-4 sm:grid-cols-2", typeSelect ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
              {typeSelect}
              {facets}
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0">
                {colourLabel}
                <div role="group" aria-label="Filter by colour" className="-mx-1.5 flex flex-wrap">
                  {colourButtons}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                {indianWear}
                <Button variant="quiet" size="sm" disabled={panelCount === 0} onClick={resetPanel}>Clear these</Button>
              </div>
            </div>
          </div>
        )}

        {activeCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {filters.query.trim() && <Chip selected removable onClick={() => update("query", "")}>Search: {filters.query.trim()}</Chip>}
              {filters.category && <Chip selected removable onClick={() => setFilters((current) => ({ ...current, category: "", subcategory: "" }))}>{getCategory(filters.category)?.label}</Chip>}
              {filters.subcategory && <Chip selected removable onClick={() => update("subcategory", "")}>{labelOf.subcategory(filters.subcategory)}</Chip>}
              {filters.color && <Chip selected removable onClick={() => update("color", "")}>{getColor(filters.color)?.label}</Chip>}
              {filters.indianWear && <Chip selected removable onClick={() => update("indianWear", false)}>Indian wear</Chip>}
              {(["occasion", "season", "style"] as const).map((key) => filters[key] && <Chip key={key} selected removable onClick={() => update(key, "")}>{labelOf[key](filters[key])}</Chip>)}
            </div>
            <Button variant="quiet" size="sm" onClick={reset}>Reset filters</Button>
          </div>
        )}
        <p className="sr-only" aria-live="polite">
          {activeCount > 0 && `${visibleItems.length} matching ${visibleItems.length === 1 ? "piece" : "pieces"}`}
        </p>
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
            {activeCount > 0 && (
              <p className="mb-4 text-caption text-graphite-deep">
                {visibleItems.length} of {data.length} {data.length === 1 ? "piece" : "pieces"}
              </p>
            )}
            <div className={WARDROBE_GRID}>
              {/* Filtering: kept cards glide to their new places, others fade (transform + opacity, 320 ms). */}
              <AnimatePresence mode="popLayout" initial={false}>
                {visibleItems.map((item) => (
                  <motion.div key={item.id} layout="position" variants={fade} initial="hidden" animate="visible" exit="exit" transition={transition.move} className="min-w-0">
                    <ItemCard item={item} imageUrl={images.byItem.get(item.id)?.thumb} to={paths.item(base, item.id)} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </StateView>
    </Page>
  );
}
