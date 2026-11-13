import type { UseQueryResult } from "@tanstack/react-query";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { Check, RefreshCw } from "lucide-react";
import { errorMessage } from "@/data/repository";
import { fadeUp } from "@/motion/presets";
import { Button } from "./Button";
import { cn } from "./cn";

/* ---------------- skeletons ---------------- */

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("skeleton rounded-xs", className)} />;
}

export function ItemCardSkeleton() {
  return (
    <div aria-hidden="true">
      <Skeleton className="aspect-[4/5] w-full" />
      <Skeleton className="mt-3 h-4 w-3/4" />
      <Skeleton className="mt-2 h-2.5 w-1/3" />
    </div>
  );
}

/** Garment grid: 2 columns on phones, 3 on tablets and small laptops, 4 from 1280 px, with room between pieces. */
export const WARDROBE_GRID = "grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-10 lg:gap-x-8 lg:gap-y-12 xl:grid-cols-4";

/** Same grid as the wardrobe, so loading never shifts layout. */
export function ItemGridSkeleton({ count = 8, className }: { count?: number; className?: string }) {
  return (
    <div role="status" aria-label="Loading" className={cn(WARDROBE_GRID, className)}>
      {Array.from({ length: count }, (_, i) => (
        <ItemCardSkeleton key={i} />
      ))}
    </div>
  );
}

/* ---------------- empty / error ---------------- */

export interface EmptyStateProps {
  /** Usually a <GarmentGlyph />. */
  art?: ReactNode;
  eyebrow?: string;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/**
 * Every empty state explains the next action: serif title, one or two lines of body, one action.
 * Celebrate progress quietly ("2 of 5") — never streaks or pressure.
 */
export function EmptyState({ art, eyebrow, title, body, action, className }: EmptyStateProps) {
  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" className={cn("mx-auto flex max-w-sm flex-col items-center px-6 py-16 text-center", className)}>
      {art && <div className="mb-6 h-20 text-graphite">{art}</div>}
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <h2 className="font-display text-look text-midnight lg:text-look-lg">{title}</h2>
      {body && <p className="mt-3 text-body text-graphite-deep">{body}</p>}
      {action && <div className="mt-8">{action}</div>}
    </motion.div>
  );
}

/** Plain-language error with a way forward. Reassure first ("Nothing is lost"), then offer "Try again" and, optionally, another route. */
export function ErrorState({ error, onRetry, title = "That didn't load.", action, className }: { error?: unknown; onRetry?: () => void; title?: string; action?: ReactNode; className?: string }) {
  return (
    <div role="alert" className={cn("mx-auto flex max-w-sm flex-col items-start px-6 py-16 text-left", className)}>
      <p aria-hidden="true" className="mb-4 flex size-8 items-center justify-center rounded-full border border-danger font-medium text-danger">!</p>
      <h2 className="font-display text-look text-midnight lg:text-look-lg">{title}</h2>
      <p className="mt-2 text-body text-graphite-deep">{errorMessage(error)}</p>
      {onRetry && (
        <Button variant="secondary" fullWidth className="mt-6" onClick={onRetry} leadingIcon={<RefreshCw className="size-4" strokeWidth={1.5} />}>
          Try again
        </Button>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/**
 * Quiet confirmation for a finished task ("Check your email", "Your look is saved"): Midnight tick,
 * serif title, one line, the next step. Announced politely. Toasts cover in-place saves; this is for
 * a screen whose whole job is done.
 */
export function SuccessState({ title, body, action, className }: { title: string; body?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <motion.div role="status" variants={fadeUp} initial="hidden" animate="visible" className={cn("mx-auto flex max-w-sm flex-col items-center px-6 py-16 text-center", className)}>
      <span aria-hidden="true" className="mb-6 flex size-12 items-center justify-center rounded-full border border-line-strong text-midnight">
        <Check className="size-5" strokeWidth={1.75} />
      </span>
      <h2 className="font-display text-look text-midnight lg:text-look-lg">{title}</h2>
      {body && <p className="mt-3 text-body text-graphite-deep">{body}</p>}
      {action && <div className="mt-8">{action}</div>}
    </motion.div>
  );
}

/* ---------------- StateView ---------------- */

export interface StateViewProps<T> {
  query: Pick<UseQueryResult<T>, "data" | "isPending" | "isError" | "error" | "refetch">;
  loading: ReactNode;
  empty?: ReactNode;
  /** Defaults to: empty arrays and null are empty. */
  isEmpty?: (data: T) => boolean;
  errorTitle?: string;
  children: (data: T) => ReactNode;
}

const defaultIsEmpty = (data: unknown) => data === null || (Array.isArray(data) && data.length === 0);

/**
 * Renders exactly one of loading / error / empty / content for a query.
 * Every list and detail screen uses this, so no screen ships without all four states.
 */
export function StateView<T>({ query, loading, empty, isEmpty = defaultIsEmpty, errorTitle, children }: StateViewProps<T>) {
  if (query.isPending) return <>{loading}</>;
  if (query.isError) return <ErrorState error={query.error} title={errorTitle} onRetry={() => void query.refetch()} />;
  const data = query.data as T;
  if (empty !== undefined && isEmpty(data)) return <>{empty}</>;
  return <>{children(data)}</>;
}
