import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { wordRoll } from "@/motion/presets";
import { cn } from "./cn";

/**
 * One word that changes every few seconds, rolling up out of a clip (the headline's motion, one word at a time).
 * Decorative: render it aria-hidden beside a static sentence for assistive tech. Put it at the end of its line,
 * since its width follows the word. Pauses in a background tab; reduced motion shows the first word only.
 */
export function RotatingWord({ words, interval = 2600, className }: { words: readonly string[]; interval?: number; className?: string }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (reduce || words.length < 2) return;
    const timer = window.setInterval(() => { if (!document.hidden) setIndex((n) => (n + 1) % words.length); }, interval);
    return () => window.clearInterval(timer);
  }, [reduce, words.length, interval]);
  const word = words[index] ?? "";
  return (
    <span className={cn("relative inline-grid overflow-y-clip pb-[0.12em] -mb-[0.12em] align-bottom", className)}>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span key={word} variants={wordRoll} initial="hidden" animate="visible" exit="exit" className="col-start-1 row-start-1 whitespace-nowrap">
          {word}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
