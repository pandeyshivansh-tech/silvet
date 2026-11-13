import { useId } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ease, wordmarkReveal } from "@/motion/presets";
import { cn } from "./cn";

/**
 * SILVET identity — A · Selvedge (approved by the founder, M8 Batch 1).
 *
 * Geometry is copied verbatim from design-explorations/silvet-brand/a-selvedge/mark.svg and the outlined
 * Instrument Serif wordmark from design-explorations/silvet-brand/assets/wordmark-outlined.svg.
 * Do not redraw, simplify or re-space either without founder approval. public/favicon.svg uses the same paths.
 *
 * Colour: the mark is currentColor (Midnight on Chalk, Chalk on Midnight). Inside .surface-midnight the
 * selvedge edge turns Citron (index.css); everywhere else it stays one ink.
 */
const BODY = "M56 8C45 4 31 5 20 11C9 17 7 25 14 30C21 35 36 36 44 41C50 45 47 51 37 54C27 57 17 54 10 50L6 56C14 61 27 62 39 58C53 53 57 43 48 36C40 30 24 29 18 25C14 22 19 17 25 14C35 9 47 9 54 14L56 8Z";
const EDGE = "M51.5 11.5C42.5 8.7 31.3 9.5 22.7 14.2C15.8 18 12.6 23.3 16.7 27.7C21.5 32.7 36.1 34 43.1 38.7C48 42 46 47.4 37.5 50.4C29.7 53.2 21.8 52.1 15.2 49";
const WORDMARK_VIEWBOX = "0 0 3069 745";
const WORDMARK_GLYPHS: [transform: string, d: string][] = [
  [
    "translate(-41 735) scale(1 -1)",
    "M184 -9Q164 -9 139.5 -5Q115 -1 93.5 5Q72 11 60 18Q53 22 49.5 26.5Q46 31 46 42L41 199Q41 219 54 219Q65 219 69 201L78 163Q112 20 205 20Q255 20 284.5 53.5Q314 87 314 148Q314 207 283.5 258Q253 309 186 359Q112 412 78 461.5Q44 511 44 567Q44 641 95.5 685.5Q147 730 227 730Q257 730 285 723Q313 716 331 703Q337 699 340.5 694Q344 689 344 681L347 530Q347 513 334 513Q325 513 321 527L314 552Q292 629 268.5 664.5Q245 700 201 700Q158 700 132.5 672Q107 644 107 593Q107 550 135 511Q163 472 233 416Q308 355 342.5 298.5Q377 242 377 178Q377 122 352 80Q327 38 283.5 14.5Q240 -9 184 -9Z"
  ],
  [
    "translate(516 735) scale(1 -1)",
    "M34 0Q19 0 19 11Q19 20 32 23L55 27Q76 31 82.5 38Q89 45 89 66L89 654Q89 675 82.5 682Q76 689 55 693L32 697Q19 700 19 709Q19 720 34 720L215 720Q230 720 230 709Q230 700 217 697L194 693Q173 689 166.5 682Q160 675 160 654L160 66Q160 45 166.5 38Q173 31 194 27L217 23Q230 20 230 11Q230 0 215 0L34 0Z"
  ],
  [
    "translate(935 735) scale(1 -1)",
    "M34 0Q19 0 19 11Q19 20 32 23L55 27Q76 31 82.5 38Q89 45 89 66L89 654Q89 675 82.5 682Q76 689 55 693L32 697Q19 700 19 709Q19 720 34 720L217 720Q232 720 232 708Q232 699 221 697L194 693Q173 690 166.5 682Q160 674 160 653L160 93Q160 57 180.5 41Q201 25 232 25Q255 25 279.5 34.5Q304 44 324 70.5Q344 97 354 148L367 215Q370 228 382 228Q396 228 394 211L382 23Q380 0 357 0L34 0Z"
  ],
  [
    "translate(1463 735) scale(1 -1)",
    "M229 -10Q225 -10 220 -7Q215 -4 213 6L55 640Q48 668 39.5 679Q31 690 11 694L-4 697Q-18 700 -18 710Q-18 720 -3 720L168 720Q182 720 182 709Q182 698 165 697L146 695Q129 694 124.5 684.5Q120 675 125 653L241 172Q243 166 247.5 166Q252 166 253 172L368 632Q382 689 338 695L323 697Q306 700 306 709Q306 720 320 720L460 720Q475 720 475 710Q475 700 461 697L446 694Q427 690 416.5 674.5Q406 659 399 631L244 6Q242 -4 237.5 -7Q233 -10 229 -10Z"
  ],
  [
    "translate(2030 735) scale(1 -1)",
    "M34 0Q19 0 19 11Q19 20 32 23L55 27Q76 31 82.5 38Q89 45 89 66L89 654Q89 675 82.5 682Q76 689 55 693L32 697Q19 700 19 709Q19 720 34 720L370 720Q393 720 395 697L403 531Q405 514 390 514Q378 514 376 527L370 564Q359 632 325 663.5Q291 695 231 695Q191 695 175.5 683.5Q160 672 160 643L160 402Q160 388 174 388L224 388Q268 388 278 435L288 485Q292 500 305 498Q316 496 316 481L316 256Q316 241 305 239Q292 237 288 252L278 301Q271 336 258.5 347Q246 358 223 358L174 358Q160 358 160 344L160 93Q160 57 178.5 41Q197 25 246 25Q296 25 331.5 50.5Q367 76 381 146L393 205Q396 218 408 218Q422 218 420 201L410 23Q408 0 385 0L34 0Z"
  ],
  [
    "translate(2618 735) scale(1 -1)",
    "M118 0Q103 0 103 11Q103 22 116 23L161 30Q181 33 188 40.5Q195 48 195 69L195 669Q195 683 189 689Q183 695 164 695Q127 695 91 663Q55 631 44 560L39 527Q37 514 25 514Q10 514 12 531L21 712Q23 735 39 735Q46 735 52 731.5Q58 728 72.5 724Q87 720 119 720L342 720Q374 720 388.5 724Q403 728 409.5 731.5Q416 735 422 735Q438 735 440 712L449 531Q451 514 436 514Q424 514 422 527L417 560Q407 631 371 663Q335 695 297 695Q278 695 272 689Q266 683 266 669L266 69Q266 48 273.5 40.5Q281 33 300 30L345 23Q358 22 358 11Q358 0 343 0L118 0Z"
  ]
];

/** The Selvedge S symbol. Sized by className (defaults to 1em square). */
export function SilvetMark({ className }: { className?: string }) {
  const mask = `selvedge-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 64 64" fill="none" className={cn("size-[1em] shrink-0", className)}>
      <defs>
        <mask id={mask} maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
          <rect width="64" height="64" fill="white" />
          <path d={EDGE} stroke="black" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
        </mask>
      </defs>
      <path d={BODY} fill="currentColor" mask={`url(#${mask})`} />
      <g data-role="detail" className="silvet-detail">
        <path d={EDGE} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

/** Outlined SILVET wordmark (Instrument Serif, optically spaced). Pass a height class; defaults to 1em. */
export function Wordmark({ className = "h-[1em]" }: { className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox={WORDMARK_VIEWBOX} fill="currentColor" className={cn("w-auto shrink-0", className)}>
      {WORDMARK_GLYPHS.map(([transform, d]) => (
        <path key={transform} transform={transform} d={d} />
      ))}
    </svg>
  );
}

/**
 * "ILVET": the same outlined glyphs without the S, cropped at the I's left ink edge (x 535), so the
 * Selvedge S can stand in as the first letter. With `reveal`, the letters appear one by one after the S
 * (wordmarkReveal timing, opacity only, skipped under reduced motion).
 */
function Ilvet({ className, reveal }: { className?: string; reveal: boolean }) {
  const reduced = useReducedMotion();
  const animate = reveal && !reduced;
  return (
    <svg aria-hidden="true" focusable="false" viewBox="535 0 2534 745" fill="currentColor" className={cn("w-auto shrink-0", className)}>
      {WORDMARK_GLYPHS.slice(1).map(([transform, d], index) => (
        <motion.path key={transform} transform={transform} d={d}
          initial={animate ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ duration: wordmarkReveal.letterDuration, delay: wordmarkReveal.settle + index * wordmarkReveal.stagger, ease: ease.out }} />
      ))}
    </svg>
  );
}

type LockupSize = "sm" | "md" | "lg";
const LOCKUP_SIZE: Record<LockupSize, string> = { sm: "text-[1.5rem]", md: "text-[2rem]", lg: "text-[3rem]" };

/**
 * Responsive identity: symbol only below 640 px; from 640 px the full lockup whenever the space the
 * lockup is given can hold it (container query), otherwise the symbol; from 1024 px always the full lockup.
 * "symbol" and "full" force one form. `reveal` letters ILVET in after the S (landing hero only).
 *
 * The full lockup reads as one word: the Selvedge S is the first letter, then ILVET. Both are unchanged
 * geometry; only placement is derived. The S keeps its 1em box; ILVET is sized so the mark's ink height
 * (y 5.6–60.5 of 64) equals the wordmark S's (y 5–744 of 745): 0.8643em, set 0.0817em down so the tops
 * align, and 0.1059em after the mark so the mark-to-I gap equals the wordmark's own S-to-I gap (199 units).
 * The wrapper fills its parent's inline size, so give the parent room (flex-1 / block) where it adapts.
 */
export function Lockup({ className, size = "md", mode = "responsive", reveal = false }: { className?: string; size?: LockupSize; mode?: "responsive" | "full" | "symbol"; reveal?: boolean }) {
  return (
    <span className={cn("block min-w-[1em]", mode === "responsive" && "@container w-full", LOCKUP_SIZE[size], className)}>
      <span className="flex items-start">
        <SilvetMark />
        <Ilvet
          reveal={reveal}
          className={cn(
            "mt-[0.0817em] ml-[0.1059em] h-[0.8643em]",
            mode === "symbol" && "hidden",
            mode === "responsive" && "hidden sm:@min-[4.25em]:block lg:block",
          )}
        />
        <span className="sr-only">SILVET</span>
      </span>
    </span>
  );
}
