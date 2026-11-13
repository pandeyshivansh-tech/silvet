import { AnimatePresence, motion } from "motion/react";
import { Ellipsis } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { fade } from "@/motion/presets";
import { cn } from "./cn";
import { IconButton } from "./IconButton";
import { Sheet } from "./Sheet";
import { useIsPhone } from "./useMediaQuery";

export interface ActionMenuItem {
  label: string;
  onSelect: () => void;
  icon?: ReactNode;
  /** Danger text; the action itself must still open a ConfirmDialog. */
  destructive?: boolean;
  disabled?: boolean;
}

export interface ActionMenuProps {
  /** Accessible name of the ⋯ trigger, e.g. "More actions for Blue oxford shirt". */
  label: string;
  /** Sheet title on phones. Defaults to `label`. */
  title?: string;
  items: ActionMenuItem[];
  className?: string;
}

const row = (destructive?: boolean) =>
  cn(
    "flex min-h-11 w-full items-center gap-3 rounded-xs px-3 text-left text-ui transition-colors duration-120 ease-editorial disabled:text-graphite",
    destructive ? "text-danger" : "text-midnight",
  );

/**
 * The ⋯ menu. Phones get a bottom sheet of 56 px rows; tablet and desktop get a popover menu
 * (role="menu": ↑/↓/Home/End move, Esc or Tab closes and focus returns to the ⋯ button).
 * An action runs after the menu has closed, so a ConfirmDialog it opens owns focus cleanly.
 */
export function ActionMenu({ label, title, items, className }: ActionMenuProps) {
  const phone = useIsPhone();
  const [open, setOpen] = useState(false);
  // Open toward the side with room: end-aligned by default, start-aligned when the ⋯ sits near the left edge.
  const [alignStart, setAlignStart] = useState(false);
  const show = () => {
    setAlignStart((trigger.current?.getBoundingClientRect().right ?? Infinity) < 224);
    setOpen(true);
  };
  const pending = useRef<(() => void) | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();

  const choose = (item: ActionMenuItem) => {
    if (item.disabled) return;
    pending.current = item.onSelect;
    setOpen(false);
  };
  const runPending = () => {
    const action = pending.current;
    pending.current = null;
    action?.();
  };

  // Popover: focus the first item on open; outside press closes.
  useEffect(() => {
    if (phone || !open) return;
    menu.current?.querySelector<HTMLButtonElement>("[role=menuitem]:not(:disabled)")?.focus();
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menu.current?.contains(target) && !trigger.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open, phone]);

  // Popover: once it has closed, give focus back and run the chosen action.
  const closedOnce = useRef(false);
  useEffect(() => {
    if (phone) return;
    if (open) { closedOnce.current = true; return; }
    if (!closedOnce.current) return;
    closedOnce.current = false;
    const action = pending.current;
    pending.current = null;
    if (action) { trigger.current?.focus(); action(); }
  }, [open, phone]);

  const onMenuKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const enabled = [...(menu.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]:not(:disabled)") ?? [])];
    const index = enabled.indexOf(document.activeElement as HTMLButtonElement);
    const move = (next: number) => { event.preventDefault(); enabled.at(next % enabled.length)?.focus(); };
    if (event.key === "ArrowDown") move(index + 1);
    else if (event.key === "ArrowUp") move(index - 1);
    else if (event.key === "Home") move(0);
    else if (event.key === "End") move(enabled.length - 1);
    else if (event.key === "Escape") { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
    else if (event.key === "Tab") setOpen(false);
  };

  const triggerButton = (
    <IconButton
      ref={trigger}
      label={label}
      icon={<Ellipsis className="size-5" strokeWidth={1.5} />}
      variant="outline"
      aria-haspopup={phone ? "dialog" : "menu"}
      aria-expanded={open}
      aria-controls={open && !phone ? id : undefined}
      onClick={() => (open ? setOpen(false) : show())}
      onKeyDown={(event) => { if (!phone && event.key === "ArrowDown") { event.preventDefault(); show(); } }}
    />
  );

  if (phone) {
    return (
      <span className={cn("inline-flex", className)}>
        {triggerButton}
        <Sheet open={open} onOpenChange={setOpen} title={title ?? label} onCloseAutoFocus={(event) => { event.preventDefault(); trigger.current?.focus(); runPending(); }}>
          <ul className="-mx-2 pb-1">
            {items.map((item) => (
              <li key={item.label}>
                <button type="button" disabled={item.disabled} onClick={() => choose(item)} className={cn(row(item.destructive), "min-h-14 hover:bg-chalk-deep active:bg-chalk-deep")}>
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </Sheet>
      </span>
    );
  }

  return (
    <span className={cn("relative inline-flex", className)}>
      {triggerButton}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={menu}
            id={id}
            role="menu"
            aria-label={title ?? label}
            variants={fade}
            initial="hidden"
            animate="visible"
            exit="exit"
            onKeyDown={onMenuKey}
            className={cn("absolute top-full z-30 mt-1 min-w-48 rounded-xs border border-line-strong bg-chalk p-1 shadow-sheet", alignStart ? "left-0" : "right-0")}
          >
            {items.map((item) => (
              <button key={item.label} type="button" role="menuitem" tabIndex={-1} disabled={item.disabled} onClick={() => choose(item)}
                className={cn(row(item.destructive), "hover:bg-chalk-deep focus-visible:bg-chalk-deep focus-visible:-outline-offset-2")}>
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}
