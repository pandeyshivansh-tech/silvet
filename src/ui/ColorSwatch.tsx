import { getColor } from "@/domain/taxonomy";
import { cn } from "./cn";

/** Multicolour garments: four flat quadrants of real garment hues (no gradient). */
const MULTI = ["#B3261E", "#E9C83A", "#2F5DA8", "#2F6B3A"];

/**
 * Garment colour dot from the taxonomy palette. These are garment colours (data), not brand colours,
 * so they are applied inline — never via className tokens.
 * Selected = Chalk gap + Lilac ring + Midnight hairline (SILVET_DESIGN_REFERENCE.pdf · Filters).
 */
export function ColorSwatch({
  slug,
  size = "md",
  selected = false,
  className,
  label,
}: {
  slug: string;
  size?: "sm" | "md" | "lg";
  selected?: boolean;
  className?: string;
  label?: boolean;
}) {
  const def = getColor(slug);
  if (!def) return null;
  const multi = def.family === "multi";
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className={cn("inline-flex shrink-0 items-center justify-center rounded-full", selected ? "bg-lilac p-0.5 ring-1 ring-midnight" : "p-0")}>
        <span className={cn("inline-flex rounded-full", selected ? "bg-chalk p-0.5" : "p-0")}>
        <span
          aria-hidden={label ? true : undefined}
          role={label ? undefined : "img"}
          aria-label={label ? undefined : def.label}
          style={multi ? undefined : { backgroundColor: def.hex }}
          className={cn(
            "relative inline-grid shrink-0 grid-cols-2 overflow-hidden rounded-full ring-1 ring-line-strong ring-inset",
            size === "sm" && "size-3",
            size === "md" && "size-5",
            size === "lg" && "size-7",
          )}
        >
          {multi && MULTI.map((hex) => <span key={hex} style={{ backgroundColor: hex }} />)}
          {/* Inset rings paint under children, so the quadrants get their hairline from an overlay. */}
          {multi && <span className="absolute inset-0 rounded-full ring-1 ring-line-strong ring-inset" />}
        </span>
        </span>
      </span>
      {label && <span className="text-caption text-graphite-deep">{def.label}</span>}
    </span>
  );
}
