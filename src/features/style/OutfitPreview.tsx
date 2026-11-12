import { Plus, X } from "lucide-react";
import type { ClothingItem, OutfitPiece } from "@/domain/types";
import { MAX_ACCESSORIES, type Slot } from "@/domain/taxonomy";
import { GarmentFrame, IconButton } from "@/ui";
import type { DraftTarget, OutfitDraft } from "./outfitDraft";

interface Props {
  draft: OutfitDraft;
  items: readonly ClothingItem[];
  imageByItem: Map<string, { thumb: string; full: string }>;
  onChoose: (target: DraftTarget) => void;
  onRemove: (slot: Slot, index?: number) => void;
  disabled?: boolean;
}

export function OutfitPreview({ draft, items, imageByItem, onChoose, onRemove, disabled = false }: Props) {
  const accessories = draft.pieces.filter((piece) => piece.slot === "accessory");
  const targets: (DraftTarget & { label: string; compact?: boolean })[] = [
    ...(draft.mode === "separates"
      ? [{ slot: "top" as const, label: "Top" }, { slot: "bottom" as const, label: "Bottom" }]
      : [{ slot: "one_piece" as const, label: "One-piece / set" }]),
    { slot: "outerwear", label: "Layer · optional", compact: true },
    { slot: "footwear", label: "Footwear · optional", compact: true },
    ...Array.from({ length: Math.max(MAX_ACCESSORIES, accessories.length) }, (_, index) => ({
      slot: "accessory" as const, index, label: `Accessory ${index + 1} · optional`, compact: true,
    })),
  ];
  return (
    <div className="border-y border-line py-5">
      <div className="mb-5 flex items-center justify-between gap-4">
        <p className="text-caption text-graphite-deep">Live preview</p>
        <p className="text-caption text-graphite-deep">{draft.mode === "separates" ? "Separates" : "One-piece"}</p>
      </div>
      <div className="grid grid-cols-2 items-start gap-x-3 gap-y-6 lg:grid-cols-3">
        {targets.map(({ label, compact, ...target }) => {
          const piece = draft.pieces.filter((piece) => piece.slot === target.slot)[target.index ?? 0];
          const item = piece?.itemId ? items.find((item) => item.id === piece.itemId) : undefined;
          return (
            <PreviewSlot
              key={`${target.slot}-${target.index ?? 0}`}
              label={label}
              piece={piece}
              item={item}
              imageUrl={item ? imageByItem.get(item.id)?.full : undefined}
              onChoose={() => onChoose(target)}
              onRemove={() => onRemove(target.slot, target.index)}
              disabled={disabled}
              compact={compact}
            />
          );
        })}
      </div>
    </div>
  );
}

function PreviewSlot({
  label, piece, item, imageUrl, onChoose, onRemove, disabled, compact = false,
}: {
  label: string;
  piece?: OutfitPiece;
  item?: ClothingItem;
  imageUrl?: string;
  onChoose: () => void;
  onRemove: () => void;
  disabled: boolean;
  compact?: boolean;
}) {
  const removed = Boolean(piece && !item);
  const slotLabel = label.replace(" · optional", "");
  return (
    <div className="group relative min-w-0">
      <p className="mb-2 text-caption text-graphite-deep">{label}</p>
      {item ? (
        <>
          <button type="button" aria-label={`Replace ${slotLabel.toLowerCase()}`} onClick={onChoose} disabled={disabled} className="block w-full rounded-xs">
            <GarmentFrame item={item} imageUrl={imageUrl} />
          </button>
          <p className="mt-2 truncate text-ui font-medium text-midnight">{item.name}</p>
          <button type="button" onClick={onChoose} disabled={disabled} className="min-h-11 px-1 text-caption text-midnight underline decoration-line-strong underline-offset-4 disabled:text-graphite">Replace</button>
          <IconButton label={`Remove ${slotLabel.toLowerCase()}`} icon={<X className="size-4" strokeWidth={1.5} />} onClick={onRemove} disabled={disabled} className="absolute top-8 right-1 bg-chalk/90" />
        </>
      ) : (
        <button
          type="button"
          onClick={onChoose}
          disabled={disabled}
          className={`flex w-full flex-col items-center justify-center rounded-xs border border-dashed border-line-strong px-3 text-center text-midnight transition-colors hover:bg-chalk-deep ${compact ? "min-h-28 lg:aspect-[4/5]" : "aspect-[4/5]"}`}
        >
          <Plus aria-hidden="true" className="mb-2 size-5" strokeWidth={1.5} />
          <span className="text-ui font-medium">{removed ? "Replace removed piece" : `Add ${slotLabel}`}</span>
          <span className="mt-1 text-caption text-graphite-deep">{removed ? "No longer in your wardrobe" : "Choose a piece"}</span>
        </button>
      )}
      {removed && (
        <button type="button" onClick={onRemove} disabled={disabled} className="min-h-11 text-caption text-midnight underline decoration-line-strong underline-offset-4">
          Remove placeholder
        </button>
      )}
    </div>
  );
}
