import { motion } from "motion/react";
import { useState } from "react";
import type { ClothingItem } from "@/domain/types";
import { SLOT_LABELS, getColor, type Slot } from "@/domain/taxonomy";
import { useRepositoryKind } from "@/data/RepositoryProvider";
import { pieceLand } from "@/motion/presets";
import { GarmentGlyph, cn } from "@/ui";
import { flatLay, type ResolvedOutfitPiece } from "./lookbookPresentation";

type Images = Map<string, { thumb: string; full: string }>;

/**
 * A saved look as one flat-lay (SILVET_DESIGN_REFERENCE.pdf p11): every piece on a single Chalk Deep mat,
 * the base and layer large across the top, footwear bottom-left, accessories bottom-right.
 * Photos are shown whole (object-contain, never cropped or tinted) and fade in once decoded; a piece without
 * a photo, or whose photo fails, is drawn in its colour; a removed piece is a faint outline.
 * The mat is one image to assistive tech, labelled slot by slot.
 */
export function LookFlatLay({ rows, images, size = "card", className, assemble, viewTransitionName }: {
  rows: readonly ResolvedOutfitPiece[];
  images: Images;
  /** "card": 4:5 thumbnails · "feature": 5:4 lead look · "detail": 4:5 with full-size photos. */
  size?: "card" | "feature" | "detail";
  className?: string;
  /** Landing hero only: piece i lands at `start + i × step` s (`pieceLand`), driven by a parent's "visible". */
  assemble?: { start: number; step: number };
  /** Page-transition name: the mat morphs between a Lookbook card and the look's own page. */
  viewTransitionName?: string;
}) {
  const kind = useRepositoryKind();
  const { main, finishing } = flatLay(rows);
  const footwear = finishing.filter((row) => row.piece.slot === "footwear");
  const accessories = finishing.filter((row) => row.piece.slot !== "footwear");
  const url = (item: ClothingItem | null) => (item ? images.get(item.id)?.[size === "card" ? "thumb" : "full"] : undefined);
  const present = rows.filter((row) => row.item);
  // Same honesty tag as GarmentFrame, once per mat, only when nothing on it is a photo.
  const tag = present.length > 0 && present.every((row) => !url(row.item)) ? (kind === "supabase" ? "No photos yet" : "Illustration") : null;
  const label = rows.map(({ piece, item }) => `${SLOT_LABELS[piece.slot]}: ${item ? item.name : "no longer in your wardrobe"}`).join(", ");
  const piece = (row: ResolvedOutfitPiece, cell: string) => (
    <motion.div key={row.key} variants={assemble && pieceLand} custom={assemble && assemble.start + rows.indexOf(row) * assemble.step}
      className={cn("relative h-full min-w-0", cell)}>
      <LaidPiece item={row.item} slot={row.piece.slot} url={url(row.item)} />
    </motion.div>
  );

  return (
    <div role="img" aria-label={label || "No pieces"} style={{ viewTransitionName }} className={cn("relative overflow-hidden rounded-xs bg-chalk-deep", size === "feature" ? "aspect-[5/4]" : "aspect-[4/5]", className)}>
      <div className="absolute inset-0 flex flex-col gap-[4%] p-[8%] transition-transform duration-200 ease-editorial group-hover:scale-[1.02]">
        <div className="flex min-h-0 flex-[2.4] items-stretch justify-center gap-[5%]">
          {main.map((row) => piece(row, "flex-1"))}
        </div>
        {finishing.length > 0 && (
          <div className="flex min-h-0 flex-1 items-end justify-between gap-[5%]">
            <div className="flex h-full min-w-0 gap-[5%]">{footwear.map((row) => piece(row, "aspect-[5/4]"))}</div>
            <div className="flex h-3/4 min-w-0 justify-end gap-[8%]">{accessories.map((row) => piece(row, "aspect-square"))}</div>
          </div>
        )}
      </div>
      {tag && <span className="absolute bottom-2 left-2 rounded-xs bg-chalk px-1.5 py-0.5 text-caption text-graphite-deep">{tag}</span>}
    </div>
  );
}

function LaidPiece({ item, slot, url }: { item: ClothingItem | null; slot: Slot; url?: string }) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const [loadedUrl, setLoadedUrl] = useState<string>();
  if (!item) return <GarmentGlyph slot={slot} strokeWidth={1} className="absolute inset-0 size-full text-graphite opacity-50" />;
  if (url && url !== failedUrl) {
    return (
      <img
        src={url}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        onError={() => setFailedUrl(url)}
        onLoad={() => setLoadedUrl(url)}
        // A cached image can finish before React attaches onLoad.
        ref={(img) => { if (img?.complete && img.naturalWidth > 0) setLoadedUrl(img.getAttribute("src") ?? undefined); }}
        className={cn("absolute inset-0 size-full object-contain transition-opacity duration-200 ease-editorial", loadedUrl === url ? "opacity-100" : "opacity-0")}
      />
    );
  }
  return (
    <GarmentGlyph slot={slot} subcategory={item.subcategorySlug} fill={getColor(item.primaryColor)?.hex ?? "transparent"}
      className="absolute inset-0 size-full text-midnight" />
  );
}
