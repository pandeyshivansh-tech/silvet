import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { transition } from "./presets";

/**
 * Global motion settings. reducedMotion="user" respects the OS "Reduce motion" setting:
 * transform and layout animations are disabled, opacity fades remain (CSS transitions are
 * neutralised separately in styles/index.css).
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={transition.select}>
      {children}
    </MotionConfig>
  );
}
