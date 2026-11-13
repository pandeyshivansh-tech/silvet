import { useReducedMotion, useScroll, useTransform, type MotionStyle } from "motion/react";
import type { RefObject } from "react";

/**
 * Landing scroll language: one rule for every visual. As a block travels from the bottom of the screen to
 * 60% up it, it settles into place — rises `distance` px, grows from 96% and fades in. Scroll-linked (it
 * follows the scrollbar both ways, never plays on its own), transform + opacity only. Reduced motion: static.
 */
export function useScrollSettle(ref: RefObject<HTMLElement | null>, distance = 48): MotionStyle {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 0.6"] });
  const y = useTransform(scrollYProgress, [0, 1], [distance, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.96, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [0, 1]);
  return reduce ? {} : { y, scale, opacity };
}

/**
 * The hero look leaving: as the hero scrolls away, the look sinks back a little (to 94%) and drifts up
 * more slowly than the page — a sense of depth, not a show. Reduced motion: static.
 */
export function useScrollRecede(ref: RefObject<HTMLElement | null>): MotionStyle {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.94]);
  return reduce ? {} : { y, scale };
}
