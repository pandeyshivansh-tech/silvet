import type { ButtonHTMLAttributes, ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "./cn";

/**
 * Chips (SILVET_DESIGN_REFERENCE.pdf · Filters): 32 px tall, 2 px radius, never pills.
 * - variant "filter": bordered; selected = Lilac fill, Midnight text (+ ✕ when `removable`).
 * - variant "tab":    category tab; no border until hover; selected = Lilac fill.
 * - `empty`: a filter that would return 0 — dashed, still tappable, then explains itself.
 * Lilac answers "what did I pick?". Citron never appears on chips.
 */
export interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  selected?: boolean;
  variant?: "filter" | "tab";
  /** Show ✕ on the selected chip (active-filter row). */
  removable?: boolean;
  /** Would return 0 results. */
  empty?: boolean;
  /** Optional leading visual (e.g. a ColorSwatch). */
  leading?: ReactNode;
  count?: number;
}

export function Chip({ selected = false, variant = "filter", removable = false, empty = false, leading, count, className, children, type = "button", ...rest }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        // h-8 visual; the ::before extends the hit area by 6 px top and bottom (44 px target).
        "relative inline-flex h-8 shrink-0 select-none items-center gap-1.5 rounded-xs px-3 text-ui",
        "before:absolute before:-inset-y-1.5 before:inset-x-0 before:content-['']",
        "transition-[background-color,border-color,color] duration-120 ease-editorial",
        "motion-safe:transition-[background-color,border-color,color,transform] motion-safe:duration-[120ms,120ms,120ms,320ms] motion-safe:ease-spring active:scale-[0.95]",
        variant === "filter" && "border",
        selected
          ? "border-lilac bg-lilac font-medium text-midnight"
          : empty
            ? "border-dashed border-line-strong text-graphite-deep hover:bg-chalk-deep"
            : variant === "filter"
              ? "border-line-strong text-midnight hover:bg-chalk-deep"
              : "text-midnight hover:bg-chalk-deep",
        className,
      )}
      {...rest}
    >
      {leading}
      <span>{children}</span>
      {count !== undefined && <span className={cn("tabular-nums", selected ? "text-midnight" : "text-graphite-deep")}>{count}</span>}
      {selected && removable && <X aria-hidden="true" className="size-3.5" strokeWidth={2} />}
    </button>
  );
}

/** Horizontal scroll row for chips and category tabs. No edge fade: the next chip peeking past the gutter shows it scrolls. */
export function ChipRow({ children, className, label }: { children: ReactNode; className?: string; label: string }) {
  return (
    <div role="group" aria-label={label} className={cn("scrollbar-none -mx-5 flex snap-x gap-2 overflow-x-auto px-5 py-1.5 sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0", className)}>
      {children}
    </div>
  );
}
