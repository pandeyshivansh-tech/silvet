import { AnimatePresence, motion } from "motion/react";
import { Check, CircleAlert, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast as toastVariants } from "@/motion/presets";
import { cn } from "./cn";

/**
 * Feedback toasts (SILVET_DESIGN_REFERENCE.pdf · Feedback):
 * bottom-centre · one at a time · 4 s · pause on hover/focus · announced politely ·
 * success/neutral = Midnight with a Citron tick · errors = Chalk with a Danger edge and stay until dismissed.
 */
type ToastTone = "neutral" | "success" | "error";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastEntry {
  id: number;
  message: string;
  tone: ToastTone;
  action?: ToastAction;
  durationMs: number | null;
}

interface ToastApi {
  show: (message: string, options?: { tone?: ToastTone; action?: ToastAction; durationMs?: number | null }) => void;
  success: (message: string, action?: ToastAction) => void;
  error: (message: string, action?: ToastAction) => void;
  dismiss: () => void;
}

const ToastContext = createContext<ToastApi | null>(null);
const DEFAULT_MS = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<ToastEntry | null>(null);
  const nextId = useRef(1);

  const dismiss = useCallback(() => setCurrent(null), []);

  const show = useCallback<ToastApi["show"]>((message, options = {}) => {
    const tone = options.tone ?? "neutral";
    const durationMs = options.durationMs !== undefined ? options.durationMs : tone === "error" ? null : DEFAULT_MS;
    // One at a time: a new toast replaces the current one.
    setCurrent({ id: nextId.current++, message, tone, action: options.action, durationMs });
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      dismiss,
      success: (message, action) => show(message, { tone: "success", action }),
      error: (message, action) => show(message, { tone: "error", action }),
    }),
    [show, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--tabbar-height)+env(safe-area-inset-bottom)+0.75rem)] z-[60] flex justify-center px-4 lg:bottom-6"
      >
        <AnimatePresence mode="wait" initial={false}>
          {current && <ToastView key={current.id} entry={current} onDismiss={dismiss} />}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastView({ entry, onDismiss }: { entry: ToastEntry; onDismiss: () => void }) {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(entry.durationMs);
  const startedAt = useRef(0);

  useEffect(() => {
    if (entry.durationMs === null || paused || remaining.current === null) return;
    startedAt.current = Date.now();
    const timer = window.setTimeout(onDismiss, remaining.current);
    return () => {
      window.clearTimeout(timer);
      if (remaining.current !== null) remaining.current -= Date.now() - startedAt.current;
    };
  }, [paused, entry.durationMs, onDismiss]);

  const isError = entry.tone === "error";

  return (
    <motion.div
      variants={toastVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      role={isError ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn(
        "pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xs px-4 py-3 text-ui",
        isError ? "border border-danger bg-chalk text-midnight" : "surface-midnight",
      )}
    >
      {isError && <CircleAlert aria-hidden="true" className="size-4 shrink-0 text-danger" strokeWidth={2} />}
      {entry.tone === "success" && <Check aria-hidden="true" className="size-4 shrink-0 text-citron" strokeWidth={2.25} />}
      <span className="min-w-0 flex-1">{entry.message}</span>
      {entry.action && (
        <button
          type="button"
          className={cn("shrink-0 font-medium underline underline-offset-4", isError ? "decoration-line-strong hover:decoration-midnight" : "decoration-chalk/40 hover:decoration-chalk")}
          onClick={() => {
            entry.action?.onClick();
            onDismiss();
          }}
        >
          {entry.action.label}
        </button>
      )}
      {isError && (
        <button type="button" aria-label="Dismiss" onClick={onDismiss} className="-mr-1 inline-flex size-8 shrink-0 items-center justify-center rounded-xs text-graphite-deep hover:bg-chalk-deep">
          <X className="size-4" strokeWidth={1.75} aria-hidden="true" />
        </button>
      )}
    </motion.div>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>.");
  return ctx;
}
