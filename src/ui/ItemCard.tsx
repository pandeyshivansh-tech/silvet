import { motion } from "motion/react";
import { Check } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, useViewTransitionState } from "react-router";
import type { ClothingItem } from "@/domain/types";
import { getColor, itemTypeLabel, slotOf, type Slot } from "@/domain/taxonomy";
import { useRepositoryKind } from "@/data/RepositoryProvider";
import { cn } from "./cn";
import { GarmentGlyph } from "./GarmentGlyph";

/**
 * Garment card (SILVET_DESIGN_REFERENCE.pdf · Garment card) — the most reused component:
 * wardrobe grid, picker sheet, builder slots, ideas, lookbook thumbnails, add-item preview.
 *
 * States: default · hover (image 1.02, name underlined) · focus (2 px Midnight ring) ·
 * selected (Lilac mat + Citron tick on Midnight) · sample ("Illustration" tag) ·
 * yours without a photo ("No photo yet" tag) · loading (ItemCardSkeleton) · removed (RemovedItemCard).
 *
 * Garment imagery is product content: the backdrop is always neutral Chalk Deep and brand colours
 * never sit over or behind a photo. The Lilac mat sits OUTSIDE the frame.
 * Photos are shown whole (object-contain in a fixed 4:5 frame, never cropped or tinted) and fade in
 * once decoded, so a slow signed URL shows the quiet Chalk Deep frame rather than a half-drawn image.
 */

type FrameItem = Pick<ClothingItem, "name" | "categorySlug" | "subcategorySlug" | "primaryColor">;

export function GarmentFrame({
  item,
  imageUrl,
  layoutId,
  className,
  /** Overrides the placeholder tag. Default: "Illustration" for sample data, "No photo yet" for an account. */
  placeholderTag,
  /** Page-transition name: the frame morphs between a list card and the piece's own page. */
  viewTransitionName,
}: {
  item: FrameItem;
  imageUrl?: string;
  layoutId?: string;
  className?: string;
  placeholderTag?: string;
  viewTransitionName?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const [loadedUrl, setLoadedUrl] = useState<string>();
  const kind = useRepositoryKind();
  const showImage = Boolean(imageUrl) && imageUrl !== failedUrl;
  const hex = getColor(item.primaryColor)?.hex;
  const tag = placeholderTag ?? (kind === "supabase" ? "No photo yet" : "Illustration");

  return (
    <motion.div layoutId={layoutId} style={{ viewTransitionName }} className={cn("relative aspect-[4/5] w-full overflow-hidden rounded-xs bg-chalk-deep", className)}>
      {showImage ? (
        <img
          src={imageUrl}
          alt={item.name}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setFailedUrl(imageUrl)}
          onLoad={() => setLoadedUrl(imageUrl)}
          // A cached image can finish before React attaches onLoad.
          ref={(img) => { if (img?.complete && img.naturalWidth > 0) setLoadedUrl(img.getAttribute("src") ?? undefined); }}
          className={cn(
            // No hover zoom: the frame clips, and a photo must always show to its edges.
            "absolute inset-0 size-full object-contain transition-opacity duration-200 ease-editorial",
            loadedUrl === imageUrl ? "opacity-100" : "opacity-0",
          )}
        />
      ) : (
        <>
          <div className="absolute inset-0 flex items-center justify-center text-midnight transition-transform duration-200 ease-editorial group-hover:scale-[1.02]">
            <GarmentGlyph slot={slotOf(item)} subcategory={item.subcategorySlug} fill={hex ?? "transparent"} className="h-3/5 w-auto" />
          </div>
          <span className="absolute bottom-2 left-2 rounded-xs bg-chalk px-1.5 py-0.5 text-caption text-graphite-deep">{tag}</span>
        </>
      )}
    </motion.div>
  );
}

export interface ItemCardProps {
  item: ClothingItem;
  imageUrl?: string;
  /** Navigate on click (whole-card target). */
  to?: string;
  /** Act as a selectable button (pickers, builder). */
  onSelect?: (item: ClothingItem) => void;
  selected?: boolean;
  showMeta?: boolean;
  layoutId?: string;
  placeholderTag?: string;
  className?: string;
}

export function ItemCard({ item, imageUrl, to, onSelect, selected = false, showMeta = true, layoutId, placeholderTag, className }: ItemCardProps) {
  const body = (morph?: string) => (
    <>
      {/* Lilac mat: the frame scales in to reveal the mat — transform only, no layout shift. */}
      <div
        className={cn(
          "relative rounded-xs transition-[background-color,transform] duration-[200ms,320ms] ease-spring",
          // Hover lifts the whole card a hair; a press gives under the finger. The frame moves, the photo is never cropped.
          "group-hover:-translate-y-1 group-active:translate-y-0 group-active:scale-[0.98]",
          "group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-midnight",
          selected ? "bg-lilac" : "bg-transparent",
        )}
      >
        <div className={cn("transition-transform duration-320 ease-spring", selected ? "scale-[0.93]" : "scale-100")}>
          <GarmentFrame item={item} imageUrl={imageUrl} layoutId={layoutId} placeholderTag={placeholderTag} viewTransitionName={morph} />
        </div>
        {selected && (
          <span className="surface-midnight absolute top-1.5 right-1.5 flex size-6 animate-pop items-center justify-center rounded-full">
            <Check className="size-3.5 text-citron" strokeWidth={2.5} aria-hidden="true" />
          </span>
        )}
      </div>
      {showMeta && (
        <div className="mt-3 min-w-0 text-left">
          <p className="truncate font-display text-lead-lg text-midnight decoration-midnight decoration-1 underline-offset-4 group-hover:underline">{item.name}</p>
          <p className="truncate text-caption text-graphite-deep">{itemTypeLabel(item)}</p>
        </div>
      )}
    </>
  );

  const interactive = "group block w-full rounded-xs focus-visible:outline-none";

  if (to) return <CardLink to={to} className={cn(interactive, className)} render={body} />;
  if (onSelect) {
    return (
      <button type="button" aria-pressed={selected} onClick={() => onSelect(item)} className={cn(interactive, className)}>
        {body()}
      </button>
    );
  }
  return <div className={cn("block w-full", className)}>{body()}</div>;
}

/** A card that opens the piece. Its frame is named "garment" only while a page transition to or from that piece runs, so a grid never holds two. */
function CardLink({ to, className, render }: { to: string; className: string; render: (morph?: string) => ReactNode }) {
  const morph = useViewTransitionState(to) ? "garment" : undefined;
  return (
    <Link to={to} viewTransition className={className}>
      {render(morph)}
    </Link>
  );
}

/** A saved look whose piece was deleted from the wardrobe (D5). Dashed and neutral — never a fake garment. */
export function RemovedItemCard({ slot, className }: { slot: Slot; className?: string }) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex aspect-[4/5] w-full flex-col items-center justify-center rounded-xs border border-dashed border-line-strong text-graphite">
        <GarmentGlyph slot={slot} className="h-2/5 w-auto opacity-60" />
      </div>
      <p className="mt-2.5 text-ui font-medium text-midnight">No longer in your wardrobe</p>
      <p className="mt-0.5 text-caption text-graphite-deep">Removed · in a saved look</p>
    </div>
  );
}
