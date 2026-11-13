import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { dialog, overlay } from "@/motion/presets";
import { Button } from "./Button";
import { useReturnFocus } from "./useReturnFocus";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  /** Where focus goes on close if the opener is gone (e.g. the card it was opened from was deleted). */
  fallbackFocus?: () => HTMLElement | null;
}

/**
 * Centered confirmation for destructive actions (delete item, delete look). Focus starts on the
 * safe choice ("Keep it" — first in DOM order); on close focus returns to whatever opened it.
 * The filled Danger button only ever appears here.
 */
export function ConfirmDialog({ open, onOpenChange, title, body, confirmLabel, cancelLabel = "Keep it", destructive = false, loading = false, onConfirm, fallbackFocus }: ConfirmDialogProps) {
  const returnFocus = useReturnFocus(undefined, fallbackFocus);
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !loading && onOpenChange(next)}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div className="fixed inset-0 z-40 bg-scrim" variants={overlay} initial="hidden" animate="visible" exit="exit" />
            </Dialog.Overlay>
            <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
              <Dialog.Content asChild forceMount {...returnFocus}>
                <motion.div
                  role="alertdialog"
                  variants={dialog}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="pointer-events-auto w-full max-w-sm rounded-xs border border-line bg-chalk p-6 focus:outline-none"
                >
                  <Dialog.Title className="font-display text-look text-midnight">{title}</Dialog.Title>
                  {body ? (
                    <Dialog.Description asChild>
                      <div className="mt-2 text-body text-graphite-deep">{body}</div>
                    </Dialog.Description>
                  ) : (
                    <Dialog.Description className="sr-only">{title}</Dialog.Description>
                  )}
                  <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Dialog.Close asChild>
                      <Button variant="secondary" disabled={loading}>
                        {cancelLabel}
                      </Button>
                    </Dialog.Close>
                    <Button variant={destructive ? "danger" : "primary"} loading={loading} loadingLabel={destructive ? "Deleting…" : undefined} onClick={onConfirm}>
                      {confirmLabel}
                    </Button>
                  </div>
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
