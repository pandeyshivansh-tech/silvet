import type { Slot } from "@/domain/taxonomy";

/**
 * Category silhouettes for photo-less garments, empty states and empty slots.
 * Interim art: the PDF's sample wardrobe uses flat, filled garment illustrations in the garment's
 * own colour on Chalk Deep. These simple shapes follow that treatment until the illustration
 * set / photo shoot replaces them. The first path of each glyph is the fillable body.
 */
const PATHS: Record<Slot, string[]> = {
  top: ["M16 10 10 13 4 22l6 4 4-4v30h20V22l4 4 6-4-6-9-6-3c-2 4-14 4-16 0Z"],
  bottom: ["M14 6h20l2 48h-9l-3-32-3 32h-9Z", "M14 11h20"],
  outerwear: ["M16 8 8 12 5 50h8l1-24v28h20V26l1 24h8l-3-38-8-4-8 12Z", "M24 20v34", "M16 8l4 16M32 8l-4 16"],
  one_piece: ["M19 6h10l1 8c2 4 4 7 5 10l5 30H8l5-30c1-3 3-6 5-10Z", "M13.5 24h21"],
  footwear: ["M6 44V28h10c4 4 10 6 18 7 6 1 9 3 9 7v2Z", "M6 40h37"],
  accessory: ["M10 22h28l2 28H8Z", "M18 22c0-10 12-10 12 0"],
};

export interface GarmentGlyphProps {
  slot: Slot;
  className?: string;
  /** Garment colour (hex from the taxonomy). Omit for an outline-only glyph (empty slots, empty states). */
  fill?: string;
  strokeWidth?: number;
}

export function GarmentGlyph({ slot, className, fill, strokeWidth = 1.25 }: GarmentGlyphProps) {
  return (
    <svg viewBox="0 0 48 60" fill="none" className={className} aria-hidden="true">
      {PATHS[slot].map((d, i) => (
        <path
          key={d}
          d={d}
          fill={i === 0 && fill ? fill : "none"}
          stroke="currentColor"
          strokeOpacity={fill ? 0.28 : 1}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
