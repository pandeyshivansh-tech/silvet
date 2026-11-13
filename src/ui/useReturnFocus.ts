import { useRef } from "react";

/**
 * Radix only returns focus to its own Dialog.Trigger, and SILVET opens dialogs from state. This remembers
 * whatever had focus when a dialog opened and hands focus back to it on close (if it is still on the page).
 * A caller's own onCloseAutoFocus runs first and wins if it calls preventDefault(). If the opener has left the
 * page (the dialog deleted the thing it was opened from), focus goes to `fallback()` instead of being lost.
 */
export function useReturnFocus(onCloseAutoFocus?: (event: Event) => void, fallback?: () => HTMLElement | null) {
  const opener = useRef<HTMLElement | null>(null);
  return {
    onOpenAutoFocus: () => {
      const active = document.activeElement;
      opener.current = active instanceof HTMLElement && active !== document.body ? active : null;
    },
    onCloseAutoFocus: (event: Event) => {
      onCloseAutoFocus?.(event);
      if (!event.defaultPrevented) {
        event.preventDefault();
        if (opener.current?.isConnected) opener.current.focus();
        else fallback?.()?.focus();
      }
      opener.current = null;
    },
  };
}
