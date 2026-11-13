/**
 * SILVET motion language — see docs/design/SILVET_DESIGN_SYSTEM.md §Motion
 * (visual source: docs/design/SILVET_DESIGN_REFERENCE.pdf, Foundations).
 *
 *   120 ms  press feedback, exits
 *   200 ms  select / fade
 *   320 ms  sheets and shared-element moves ("selecting a garment slides it into its slot")
 *   ease    cubic-bezier(.2, 0, 0, 1)
 *
 * Rules: transform + opacity only · calm tweens for things that appear on their own · a gentle spring
 * (`spring`, ~5% overshoot, never wobbly) only for things a hand moves: press, select, land · never delay an action ·
 * reduced motion is handled globally by <MotionProvider reducedMotion="user"> (transforms off,
 * fades kept) and by CSS for transitions.
 */
import type { Transition, Variants } from "motion/react";

export const duration = {
  press: 0.12,
  select: 0.2,
  move: 0.32,
} as const;

/** Editorial ease-out: fast start, long soft landing. */
export const ease = {
  out: [0.2, 0, 0, 1],
  exit: [0.4, 0, 1, 1],
} as const satisfies Record<string, [number, number, number, number]>;

export const transition = {
  press: { duration: duration.press, ease: ease.out },
  select: { duration: duration.select, ease: ease.out },
  move: { duration: duration.move, ease: ease.out },
  exit: { duration: duration.press, ease: ease.exit },
} as const satisfies Record<string, Transition>;

/** Touch spring: press release, selection, a piece landing in its slot, sliding indicators. CSS twin: `ease-spring`. */
export const spring = { type: "spring", visualDuration: 0.32, bounce: 0.18 } as const satisfies Transition;

/**
 * Drag release (sheets): a spring with no overshoot, started at the finger's speed (`{ ...release, velocity }`),
 * so a flick carries on from the hand and lands flush — nothing a hand lets go of ever bounces off an edge.
 */
export const release = { type: "spring", visualDuration: duration.move, bounce: 0 } as const satisfies Transition;

/* ---------------- generic variants ---------------- */

export const fade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transition.select },
  exit: { opacity: 0, transition: transition.exit },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: transition.select },
  exit: { opacity: 0, transition: transition.exit },
};

/** Parent for staggered lists. Keep to ≤ 24 animated children; fade larger grids as one block. */
export const stagger = (step = 0.04, delayChildren = 0): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: step, delayChildren } },
});

export const page: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transition.select },
};

/* ---------------- surfaces ---------------- */

export const sheetBottom: Variants = {
  hidden: { y: "100%" },
  visible: { y: 0, transition: transition.move },
  exit: { y: "100%", transition: { duration: duration.select, ease: ease.exit } },
};

export const sheetSide: Variants = {
  hidden: { x: "100%" },
  visible: { x: 0, transition: transition.move },
  exit: { x: "100%", transition: { duration: duration.select, ease: ease.exit } },
};

export const overlay: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transition.select },
  exit: { opacity: 0, transition: transition.exit },
};

export const dialog: Variants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: { opacity: 1, scale: 1, transition: transition.select },
  exit: { opacity: 0, transition: transition.exit },
};

export const toast: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { ...spring, opacity: transition.select } },
  exit: { opacity: 0, transition: transition.exit },
};

/* ---------------- product moments ---------------- */

/** Selecting a garment slides it into its slot (320 ms). */
export const slotLand: Variants = {
  hidden: { opacity: 0, y: -12 },
  visible: { opacity: 1, y: 0, transition: transition.move },
  exit: { opacity: 0, transition: transition.exit },
};

/**
 * Replacing a piece: the old one fades out, the new one lands on the spring. Use with <AnimatePresence mode="popLayout">.
 * `custom` = delay in seconds, only for a whole new look being dealt slot by slot — a single swap never waits.
 */
export const slotSwap: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: (delay = 0) => ({ opacity: 1, scale: 1, transition: { ...spring, delay, opacity: { ...transition.select, delay } } }),
  exit: { opacity: 0, transition: transition.exit },
};

/**
 * Ideas · "Another idea": the old idea fades out (120 ms), the new one fades in piece by piece
 * (40 ms stagger). Buttons stay put. Apply `ideaLook` to the look container and `ideaPiece`
 * to each garment inside it.
 */
export const ideaLook: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
  exit: { opacity: 0, transition: { duration: duration.press, ease: ease.exit } },
};
export const ideaPiece: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { ...spring, opacity: transition.select } },
};

/**
 * Landing hero, played once on arrival. Headline lines rise out of a clip (parent: `stagger(0.08)`, each line
 * inside an overflow-clip box). The hero look assembles: each piece lands on its mat and in its slot at the
 * same moment, `custom` = its delay in seconds. Reduced motion keeps only the fades.
 */
export const lineRise: Variants = {
  hidden: { opacity: 0, y: "110%" },
  visible: { opacity: 1, y: 0, transition: { ...transition.move, opacity: transition.select } },
};
export const pieceLand: Variants = {
  hidden: { opacity: 0, y: -12, scale: 0.94 },
  // A per-value transition ignores the shared delay, so opacity carries its own.
  visible: (delay = 0) => ({ opacity: 1, y: 0, scale: 1, transition: { ...spring, delay, opacity: { ...transition.select, delay } } }),
};
/** Opacity only, at `custom` seconds: a mat appearing, the slot being filled lighting up. */
export const fadeAt: Variants = {
  hidden: { opacity: 0 },
  visible: (delay = 0) => ({ opacity: 1, transition: { ...transition.select, delay } }),
};

/** A rotating word (RotatingWord): the next one rolls up as the last rolls away. */
export const wordRoll: Variants = {
  hidden: { opacity: 0, y: "100%" },
  visible: { opacity: 1, y: 0, transition: { ...transition.move, opacity: transition.select } },
  exit: { opacity: 0, y: "-100%", transition: transition.exit },
};

/** Saved / added confirmation tick. `custom` = optional delay in seconds. */
export const savedTick: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: (delay = 0) => ({ opacity: 1, scale: 1, transition: { ...spring, delay, opacity: { ...transition.select, delay } } }),
};

/** Multi-add queue: each processed photo settles into place. */
export const contactSheet: Variants = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: { opacity: 1, scale: 1, transition: transition.select },
};

/** Mobile tab bar: pressed icon scales to 0.94. */
export const tabPress = { whileTap: { scale: 0.9 }, transition: spring } as const;

/**
 * Wordmark reveal (kept): S → SI → SIL → SILV → SILVE → SILVET.
 * 80 ms per letter · 40 ms stagger · 160 ms settle · reverse to retract · fixed box (no layout shift) ·
 * off under reduced motion (show the full wordmark immediately).
 */
export const wordmarkReveal = {
  letterDuration: 0.08,
  stagger: 0.04,
  settle: 0.16,
} as const;

/** Stable layoutIds for shared-element transitions (320 ms). */
export const sharedId = {
  item: (id: string) => `item-frame-${id}`,
  outfit: (id: string) => `outfit-${id}`,
};
