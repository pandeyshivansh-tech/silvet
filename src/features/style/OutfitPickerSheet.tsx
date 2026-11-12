import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { paths } from "@/app/paths";
import { useBasePath } from "@/data";
import type { ClothingItem } from "@/domain/types";
import { CATEGORIES, SLOT_LABELS, SUBCATEGORIES, isIndianWear, itemTypeLabel, slotOf } from "@/domain/taxonomy";
import { ButtonLink, Chip, ChipRow, ItemCard, Sheet } from "@/ui";
import { selectDraftPiece, validateDraft, type DraftTarget, type OutfitDraft } from "./outfitDraft";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: DraftTarget | null;
  items: readonly ClothingItem[];
  draft: OutfitDraft;
  images: Map<string, { thumb: string; full: string }>;
  onSelect: (item: ClothingItem) => void;
}

export function OutfitPickerSheet({ open, onOpenChange, target, items, draft, images, onSelect }: Props) {
  const base = useBasePath();
  const [query, setQuery] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [indianOnly, setIndianOnly] = useState(false);
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSubcategory("");
    setIndianOnly(false);
  }, [open, target?.slot, target?.index]);
  const selectedId = target ? draft.pieces.filter((piece) => piece.slot === target.slot)[target.index ?? 0]?.itemId : null;
  const availableSubs = useMemo(
    () => SUBCATEGORIES.filter((sub) => sub.slot === target?.slot),
    [target],
  );
  const candidates = useMemo(() => {
    if (!target) return [];
    const needle = query.trim().toLocaleLowerCase();
    return items.filter((item) => {
      if (slotOf(item) !== target.slot) return false;
      if (subcategory && item.subcategorySlug !== subcategory) return false;
      if (indianOnly && !isIndianWear(item)) return false;
      if (needle && !`${item.name} ${itemTypeLabel(item)}`.toLocaleLowerCase().includes(needle)) return false;
      return validateDraft(selectDraftPiece(draft, target, item), items).check.valid;
    });
  }, [draft, indianOnly, items, query, subcategory, target]);
  const categoryLabel = CATEGORIES.find((category) => category.defaultSlot === target?.slot)?.label;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={target ? `${target.slot === "accessory" ? `Accessory ${((target.index ?? 0) + 1)}` : SLOT_LABELS[target.slot]}` : "Choose a piece"}
      description={target ? `From your wardrobe · ${categoryLabel ?? SLOT_LABELS[target.slot]}` : undefined}
    >
      <div className="space-y-4">
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-graphite-deep" strokeWidth={1.5} />
          <input
            aria-label="Search wardrobe"
            placeholder="Search your wardrobe"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-12 w-full rounded-xs border border-line-strong bg-chalk pl-10 pr-10 text-input text-midnight placeholder:text-graphite-deep focus:border-midnight focus:ring-1 focus:ring-midnight focus:ring-inset focus:outline-none"
          />
          {query && <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="absolute top-1/2 right-1.5 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-xs text-graphite-deep hover:bg-chalk-deep"><X className="size-4" /></button>}
        </div>
        <label className="flex min-h-11 items-center gap-3 text-ui text-midnight">
          <input type="checkbox" checked={indianOnly} onChange={(event) => setIndianOnly(event.target.checked)} className="size-4 accent-midnight" />
          Indian wear
        </label>
        {availableSubs.length > 0 && (
          <ChipRow label="Filter by garment type" className="mx-0 px-0">
            <Chip selected={!subcategory} onClick={() => setSubcategory("")}>All types</Chip>
            {availableSubs.map((sub) => <Chip key={sub.slug} selected={subcategory === sub.slug} onClick={() => setSubcategory(subcategory === sub.slug ? "" : sub.slug)}>{sub.label}</Chip>)}
          </ChipRow>
        )}

        {candidates.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-6">
            {candidates.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                imageUrl={images.get(item.id)?.thumb}
                selected={selectedId === item.id}
                onSelect={onSelect}
              />
            ))}
          </div>
        ) : (
          <div className="border-t border-line py-10 text-center">
            <p className="font-display text-look text-midnight">Nothing fits those filters yet.</p>
            <p className="mx-auto mt-2 max-w-xs text-caption text-graphite-deep">
              {items.some((item) => slotOf(item) === target?.slot)
                ? "Try another type or search. Pieces that conflict with this look are left out."
                : "Add this kind of garment to your wardrobe first."}
            </p>
            {!items.some((item) => slotOf(item) === target?.slot) && (
              <ButtonLink className="mt-5" size="sm" variant="secondary" to={paths.wardrobe(base)}>Open wardrobe</ButtonLink>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}
