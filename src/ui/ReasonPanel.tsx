import { motion } from "motion/react";
import { useId } from "react";
import { fadeUp, stagger } from "@/motion/presets";
import { cn } from "./cn";

export interface Reason {
  key: string;
  message: string;
}

/**
 * "Why this works": the screen's one Midnight panel. Chalk text, Citron numerals (Citron lives only on
 * Midnight). Plain, specific reasons from the rule engine; never scores or hype.
 * The reasons arrive one after another when the panel mounts — key it by the look so a new look re-explains itself.
 */
export function ReasonPanel({ reasons, title = "Why this works", className }: { reasons: readonly Reason[]; title?: string; className?: string }) {
  const id = useId();
  return (
    <div aria-labelledby={id} role="group" className={cn("surface-midnight rounded-xs px-5 py-6 sm:px-8 sm:py-7", className)}>
      <h2 id={id} className="font-display text-look text-chalk lg:text-look-lg">{title}</h2>
      <motion.ol variants={stagger(0.05, 0.1)} initial="hidden" animate="visible" className="mt-5 space-y-4">
        {reasons.map((reason, index) => (
          <motion.li key={reason.key} variants={fadeUp} className="grid grid-cols-[1.75rem_minmax(0,1fr)] items-baseline gap-3">
            <span aria-hidden="true" className="font-display text-look text-citron tabular-nums">{index + 1}</span>
            <p className="text-body text-chalk">{reason.message}</p>
          </motion.li>
        ))}
      </motion.ol>
    </div>
  );
}
