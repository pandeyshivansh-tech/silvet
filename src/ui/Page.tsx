import { motion } from "motion/react";
import type { ReactNode } from "react";
import { page } from "@/motion/presets";
import { cn } from "./cn";

/** Standard page container. Gutters 20 phone · 32 tablet · 40 desktop. Content max 720 on tablet. */
export function Page({ children, className, wide = false }: { children: ReactNode; className?: string; wide?: boolean }) {
  return (
    <motion.main
      variants={page}
      initial="hidden"
      animate="visible"
      className={cn("mx-auto w-full px-5 pt-6 pb-10 sm:max-w-[45rem] sm:px-8 sm:pt-8 lg:px-10 lg:pt-10", wide ? "lg:max-w-7xl" : "lg:max-w-5xl", className)}
    >
      {children}
    </motion.main>
  );
}

export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  /** Short supporting line under the title. */
  lede?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/** Optional eyebrow + serif page title + optional actions. One per screen (the eyebrow counts as the view's one label). */
export function PageHeader({ eyebrow, title, lede, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:mb-10", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="font-display text-page text-midnight lg:text-page-lg">{title}</h1>
        {lede && <p className="mt-2 max-w-prose text-body text-graphite-deep">{lede}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Thin rule with an optional label, used to separate editorial sections. */
export function SectionRule({ label, className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      {label && <span className="eyebrow shrink-0">{label}</span>}
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
