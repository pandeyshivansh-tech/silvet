import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { overlay, sheetBottom, sheetSide } from "@/motion/presets";
import { cn } from "./cn";
import { IconButton } from "./IconButton";
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
}

/**
 * Bottom sheet on phones (< 640 px), 360 px side panel from tablet up (SILVET_DESIGN_REFERENCE.pdf ·
 * Three layouts). Radix handles focus trap, Esc, scroll lock and returning focus to the control that
 * opened it; Motion handles the 320 ms transition. 16 px top corners on mobile sheets only.
 * Not yet implemented from the PDF: open at half height + drag to full (WS5 picker).
 */
export function Sheet({ open, onOpenChange, title, description, showHeader = true, footer, children, className }: SheetProps) {
  const phone = useIsPhone();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div className="fixed inset-0 z-40 bg-scrim" variants={overlay} initial="hidden" animate="visible" exit="exit" />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount {...(description ? {} : { "aria-describedby": undefined })}>
              <motion.div
                variants={phone ? sheetBottom : sheetSide}
                initial="hidden"
                animate="visible"
                exit="exit"
                className={cn(
                  "fixed z-50 flex flex-col bg-chalk focus:outline-none",
                  phone
                    ? "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-sheet shadow-sheet safe-bottom"
                    : "inset-y-0 right-0 w-full max-w-[22.5rem] border-l border-line",
                  className,
                )}
              >
                {phone && <div aria-hidden="true" className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-line-strong" />}
                {showHeader ? (
                  <header className="flex shrink-0 items-start justify-between gap-4 px-5 pt-4 pb-3 sm:px-6 sm:pt-6">
                    <div className="min-w-0">
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
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-6">{children}</div>
                {footer && <footer className="shrink-0 border-t border-line px-5 py-4 sm:px-6">{footer}</footer>}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
