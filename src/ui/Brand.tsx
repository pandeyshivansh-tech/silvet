import { cn } from "./cn";

/**
 * SILVET brand marks — INTERIM.
 *
 * The approved PDF shows the Selvedge S only as explorations (A Selvedge · B Stitched · C Fold ·
 * D Bias cut — "exploration, not final"; A is the base option). No final symbol asset exists yet,
 * so the mark here is a typeset Instrument Serif "S" with no invented hairline or custom path.
 * When the final Selvedge S is delivered, replace <SilvetMark> with the supplied SVG — every usage
 * goes through this component. See docs/design/SILVET_DESIGN_SYSTEM.md §Logo.
 */
export function SilvetMark({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn("inline-flex items-center justify-center font-display leading-none", className)}>
      S
    </span>
  );
}

/** SILVET wordmark: Instrument Serif caps, generously tracked. */
export function Wordmark({ className, as: Tag = "span" }: { className?: string; as?: "span" | "h1" | "p" }) {
  return <Tag className={cn("font-display uppercase tracking-[0.22em] text-midnight", className)}>Silvet</Tag>;
}

/**
 * Lockup: mark + wordmark, gap = ⅓ mark width. Below 360 px the compact mark is shown alone.
 * (The S → SILVET reveal animation is specified in SILVET_DESIGN_SYSTEM.md and not yet built.)
 */
export function Lockup({ className, markClassName = "text-look", wordmarkClassName = "text-lead" }: { className?: string; markClassName?: string; wordmarkClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-[0.33em] text-midnight", className)}>
      <SilvetMark className={markClassName} />
      <Wordmark className={cn("hidden min-[22.5rem]:inline", wordmarkClassName)} />
      <span className="sr-only min-[22.5rem]:hidden">SILVET</span>
    </span>
  );
}
