import { useCallback, useEffect, useRef } from "react";
import { useBeforeUnload, useBlocker, type BlockerFunction } from "react-router";
import { ConfirmDialog } from "@/ui";

/** A ref allows successful saves to permit their immediate navigation, before React renders. */
export function useUnsavedChanges(dirty: boolean, shouldBlock?: BlockerFunction) {
  const bypass = useRef(false);
  const blocker = useBlocker(useCallback<BlockerFunction>((args) => dirty && !bypass.current && (!shouldBlock || shouldBlock(args)), [dirty, shouldBlock]));
  useBeforeUnload(useCallback((event) => {
    if (dirty && !bypass.current) {
      event.preventDefault();
      event.returnValue = "";
    }
  }, [dirty]));
  useEffect(() => { bypass.current = false; }, [dirty]);
  return {
    allowNavigation: () => { bypass.current = true; },
    prompt: <ConfirmDialog
      open={blocker.state === "blocked"}
      onOpenChange={(open) => { if (!open && blocker.state === "blocked") blocker.reset(); }}
      title="Leave unsaved changes?"
      body="Your unsaved changes will be lost. Stay here to keep editing."
      confirmLabel="Leave without saving"
      cancelLabel="Keep editing"
      onConfirm={() => { if (blocker.state === "blocked") blocker.proceed(); }}
    />,
  };
}
