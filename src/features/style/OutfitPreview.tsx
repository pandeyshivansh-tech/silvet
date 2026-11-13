import type { ReactNode } from "react";
import type { ClothingItem } from "@/domain/types";
import { MAX_ACCESSORIES, type Slot } from "@/domain/taxonomy";
import { OutfitSlot, cn } from "@/ui";
import type { DraftTarget, OutfitDraft } from "./outfitDraft";

interface Props {
  draft: OutfitDraft;
  items: readonly ClothingItem[];
  imageByItem: Map<string, { thumb: string; full: string }>;
  onChoose: (target: DraftTarget) => void;
  onRemove: (slot: Slot, index?: number) => void;
  /** The slot the picker is open for; it carries the Lilac "Choosing" mat. */
  active?: DraftTarget | null;
  disabled?: boolean;
  /** Sits beside "The base" heading (the separates / one-piece switch). */
  baseControl?: ReactNode;
}

type Target = DraftTarget & { label: string; optional?: boolean };

/**
 * The Build board: the base (top + bottom, or one piece) and the layer lead at full size; footwear and
 * accessories follow as finishing touches. Every place is an OutfitSlot (empty · filled · removed · active).
 */
export function OutfitPreview({ draft, items, imageByItem, onChoose, onRemove, active, disabled = false, baseControl }: Props) {
  const accessories = draft.pieces.filter((piece) => piece.slot === "accessory");
  const base: Target[] = [
    ...(draft.mode === "separates"
      ? [{ slot: "top" as const, label: "Top" }, { slot: "bottom" as const, label: "Bottom" }]
      : [{ slot: "one_piece" as const, label: "One-piece / set" }]),
    { slot: "outerwear", label: "Layer", optional: true },
  ];
  const finishing: Target[] = [
    { slot: "footwear", label: "Footwear", optional: true },
    ...Array.from({ length: Math.max(MAX_ACCESSORIES, accessories.length) }, (_, index) => ({
      slot: "accessory" as const, index, label: `Accessory ${index + 1}`, optional: true,
    })),
  ];
  const slot = ({ label, optional, ...target }: Target) => {
    const piece = draft.pieces.filter((piece) => piece.slot === target.slot)[target.index ?? 0];
    const item = piece?.itemId ? items.find((item) => item.id === piece.itemId) : undefined;
    return (
      <OutfitSlot
        key={`${target.slot}-${target.index ?? 0}`}
        label={label}
        optional={optional}
        item={item}
        removed={Boolean(piece && !item)}
        imageUrl={item ? imageByItem.get(item.id)?.full : undefined}
        onChoose={() => onChoose(target)}
        onRemove={() => onRemove(target.slot, target.index)}
        active={active?.slot === target.slot && (active.index ?? 0) === (target.index ?? 0)}
        disabled={disabled}
        compact={optional}
      />
    );
  };
  return (
    <div className="space-y-10">
      <div>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <h2 className="font-display text-look text-midnight">The base</h2>
            <p className="mt-1 text-caption text-graphite-deep">{draft.mode === "separates" ? "A top and a bottom make the base." : "One garment or set is the base."}</p>
          </div>
          {baseControl}
        </div>
        <div className={cn("grid grid-cols-2 items-start gap-x-3 gap-y-8 sm:gap-x-5", draft.mode === "separates" ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-3")}>
          {base.map(slot)}
        </div>
      </div>
      <div className="border-t border-line pt-6">
        <h2 className="mb-5 font-display text-look text-midnight">Finishing touches</h2>
        <div className="grid grid-cols-2 items-start gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-5">
          {finishing.map(slot)}
        </div>
      </div>
    </div>
  );
}
