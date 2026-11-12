import { getColor } from "@/domain/taxonomy";
import { cn } from "./cn";

const MULTI = "conic-gradient(#B3261E, #E9C83A, #2F6B3A, #2F5DA8, #5B3F86, #B3261E)";

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
  // Multicolour is a garment-data indicator, not decoration: a conic split of real garment hues.
  const style = def.family === "multi" ? { backgroundImage: MULTI } : { backgroundColor: def.hex };
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className={cn("inline-flex shrink-0 items-center justify-center rounded-full", selected ? "bg-lilac p-0.5 ring-1 ring-midnight" : "p-0")}>
        <span className={cn("inline-flex rounded-full", selected ? "bg-chalk p-0.5" : "p-0")}>
        <span
          aria-hidden={label ? true : undefined}
          role={label ? undefined : "img"}
          aria-label={label ? undefined : def.label}
          style={style}
          className={cn(
            "inline-block shrink-0 rounded-full ring-1 ring-line-strong ring-inset",
            size === "sm" && "size-3",
            size === "md" && "size-5",
            size === "lg" && "size-7",
          )}
        />
        </span>
      </span>
      {label && <span className="text-caption text-graphite-deep">{def.label}</span>}
    </span>
  );
}
