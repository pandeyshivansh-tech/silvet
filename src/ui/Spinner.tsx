import { cn } from "./cn";

/** Minimal spinner for inline busy states. Prefer skeletons for content loading. */
export function Spinner({ size = 16, className, label }: { size?: number; className?: string; label?: string }) {
  return (
    <span role={label ? "status" : undefined} aria-label={label} className={cn("inline-flex", className)}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="animate-spin" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </span>
  );
}
