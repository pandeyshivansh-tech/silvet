import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, animate, motion, useDragControls, useMotionValue, useReducedMotion, useTransform, type PanInfo } from "motion/react";
import { X } from "lucide-react";
import { useState, type PointerEvent, type ReactNode } from "react";
import { duration, ease, overlay, release, sheetSide, transition } from "@/motion/presets";
import { cn } from "./cn";
import { IconButton } from "./IconButton";
import { useReturnFocus } from "./useReturnFocus";
import { useIsPhone } from "./useMediaQuery";

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Visually hidden but announced, unless `showHeader` is true. */
  description?: string;
  /** Show the serif title + close button header. Default true. */
  showHeader?: boolean;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  /**
   * Phone presentation (< 640 px). "content" fits its content up to 88% of the screen (menus, filters);
   * "half" opens at half height and drags (or toggles) to 88% (long pickers). Tablet and desktop always
   * use the 360 px side panel.
   */
  phoneHeight?: "content" | "half";
  /** Side panel width from 1024 px: "default" 360 px, "wide" 480 px (browsing garments). */
  size?: "default" | "wide";
  /** Runs after the sheet has closed and focus is back on the opener (Radix `onCloseAutoFocus`). */
  onCloseAutoFocus?: (event: Event) => void;
}

/** Share of the viewport a full phone sheet covers, and what "half" leaves visible. */
const FULL = 0.88;
const HALF = 0.5;

/**
 * Bottom sheet on phones (< 640 px), 360 px side panel from tablet up (SILVET_DESIGN_REFERENCE.pdf ·
 * Three layouts). Radix handles the focus trap, Esc and scroll lock; useReturnFocus hands focus back to the opener.
 * Phone sheets drag from the handle and title: down past a threshold dismisses; a "half" sheet snaps
 * between half and full, and its handle is also a button so keyboard users can expand it.
 * Motion is transform-only (the sheet moves, it never resizes); reduced motion makes snaps instant.
 */
export function Sheet({ open, onOpenChange, title, description, showHeader = true, footer, children, className, phoneHeight = "content", size = "default", onCloseAutoFocus }: SheetProps) {
  const phone = useIsPhone();
  const returnFocus = useReturnFocus(onCloseAutoFocus);
  const half = phone && phoneHeight === "half";
  const reduced = useReducedMotion();
  const controls = useDragControls();
  const [expanded, setExpanded] = useState(false);
  // shortcut: the half offset is measured when the sheet renders, not on resize; rotating mid-sheet keeps the old snap until the next open.
  const viewport = typeof window === "undefined" ? 800 : window.innerHeight;
  const halfOffset = Math.round(viewport * (FULL - HALF));
  const rest = half && !expanded ? halfOffset : 0;
  const y = useMotionValue(viewport);
  // A half sheet keeps its footer on screen: the footer moves up by however much of the sheet is below the fold.
  const footerY = useTransform(y, (value) => (half ? -Math.min(Math.max(value, 0), halfOffset) : 0));

  const snap = (to: number, velocity = 0) => void animate(y, to, reduced ? { duration: 0 } : { ...release, velocity });
  const startDrag = (event: PointerEvent) => { if (phone) controls.start(event); };
  const endDrag = (_: unknown, info: PanInfo) => {
    const projected = y.get() + info.velocity.y * 0.2;
    if (projected > rest + Math.min(140, viewport * 0.18)) return onOpenChange(false);
    const nextExpanded = half && projected < halfOffset / 2;
    setExpanded(nextExpanded);
    snap(half && !nextExpanded ? halfOffset : 0, info.velocity.y);
  };
  const toggle = () => {
    setExpanded(!expanded);
    snap(expanded ? halfOffset : 0);
  };
  const change = (next: boolean) => {
    if (next) setExpanded(false);
    onOpenChange(next);
  };

  return (
    <Dialog.Root open={open} onOpenChange={change}>
      <AnimatePresence onExitComplete={() => setExpanded(false)}>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div className="fixed inset-0 z-40 bg-scrim" variants={overlay} initial="hidden" animate="visible" exit="exit" />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount {...returnFocus} {...(description ? {} : { "aria-describedby": undefined })}>
              {phone ? (
                <motion.div
                  style={{ y }}
                  initial={{ y: viewport }}
                  // Opens to its first rest; later rests are snapped (with the release spring), so a re-render never restarts a tween over them.
                  animate={{ y: half ? halfOffset : 0, transition: reduced ? { duration: 0 } : transition.move }}
                  exit={{ y: viewport, transition: { duration: reduced ? 0 : duration.select, ease: ease.exit } }}
                  drag="y"
                  dragListener={false}
                  dragControls={controls}
                  dragConstraints={{ top: 0, bottom: viewport }}
                  dragElastic={{ top: 0.04, bottom: 0.4 }}
                  dragMomentum={false}
                  onDragEnd={endDrag}
                  className={cn(
                    "fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-sheet bg-chalk shadow-sheet safe-bottom focus:outline-none",
                    half ? "h-[88dvh]" : "max-h-[88dvh]",
                    className,
                  )}
                >
                  {half ? (
                    <button
                      type="button"
                      aria-label={expanded ? "Collapse sheet" : "Expand sheet"}
                      aria-expanded={expanded}
                      onClick={toggle}
                      onPointerDown={startDrag}
                      className="flex h-11 w-full shrink-0 touch-none justify-center pt-2.5"
                    >
                      <span aria-hidden="true" className="h-1 w-10 rounded-full bg-line-strong" />
                    </button>
                  ) : (
                    <div aria-hidden="true" onPointerDown={startDrag} className="flex h-6 shrink-0 touch-none justify-center pt-2.5">
                      <span className="h-1 w-10 rounded-full bg-line-strong" />
                    </div>
                  )}
                  <SheetBody title={title} description={description} showHeader={showHeader} onHeaderPointerDown={startDrag}
                    footer={footer && <motion.footer style={{ y: footerY }} className="shrink-0 border-t border-line bg-chalk px-5 py-4">{footer}</motion.footer>}
                    spacer={half && !expanded ? halfOffset : 0}>
                    {children}
                  </SheetBody>
                </motion.div>
              ) : (
                <motion.div
                  variants={sheetSide}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className={cn("fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-line bg-chalk focus:outline-none", size === "wide" ? "max-w-[22.5rem] lg:max-w-[30rem]" : "max-w-[22.5rem]", className)}
                >
                  <SheetBody title={title} description={description} showHeader={showHeader}
                    footer={footer && <footer className="shrink-0 border-t border-line px-5 py-4 sm:px-6">{footer}</footer>}>
                    {children}
                  </SheetBody>
                </motion.div>
              )}
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

function SheetBody({ title, description, showHeader, footer, spacer = 0, onHeaderPointerDown, children }: {
  title: string;
  description?: string;
  showHeader: boolean;
  footer: ReactNode;
  spacer?: number;
  onHeaderPointerDown?: (event: PointerEvent) => void;
  children: ReactNode;
}) {
  return (
    <>
      {showHeader ? (
        <header className="flex shrink-0 items-start justify-between gap-4 px-5 pt-2 pb-3 sm:px-6 sm:pt-6">
          <div className="min-w-0 flex-1 touch-none select-none" onPointerDown={onHeaderPointerDown}>
            <Dialog.Title className="font-display text-look text-midnight">{title}</Dialog.Title>
            {description && <Dialog.Description className="mt-1 text-caption text-graphite-deep">{description}</Dialog.Description>}
          </div>
          <Dialog.Close asChild>
            <IconButton label="Close" icon={<X className="size-5" strokeWidth={1.5} />} className="-mt-1 -mr-2" />
          </Dialog.Close>
        </header>
      ) : (
        <>
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          {description && <Dialog.Description className="sr-only">{description}</Dialog.Description>}
        </>
      )}
      {/* A collapsed half sheet ends its scroll area at the fold, so every row it shows (and scrolls to) is on screen. */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-6" style={spacer ? { marginBottom: spacer } : undefined}>
        {children}
      </div>
      {footer}
    </>
  );
}
