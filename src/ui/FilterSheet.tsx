import { SlidersHorizontal } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { Button } from "./Button";
import { Sheet } from "./Sheet";

export interface FilterSheetProps {
  /** Filters set inside the sheet; shown on the trigger as a Lilac count. */
  activeCount: number;
  /** Live result count for the footer button ("Show 12 pieces"). */
  resultCount: number;
  noun: [singular: string, plural: string];
  onReset: () => void;
  /** The same controls the inline layout uses. Changes apply immediately (URL state stays the single source). */
  children: ReactNode;
  title?: string;
}

/**
 * Phone filters: a "Filters" button that opens a bottom sheet of the screen's own filter controls.
 * Nothing is staged: every change writes through the screen's existing filter state, so URLs, reload
 * and Back behave exactly as the inline filters do. The footer shows the live count and closes.
 */
export function FilterSheet({ activeCount, resultCount, noun, onReset, children, title = "Filters" }: FilterSheetProps) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <>
      <Button ref={trigger} variant="secondary" aria-haspopup="dialog" onClick={() => setOpen(true)} leadingIcon={<SlidersHorizontal aria-hidden="true" className="size-4" strokeWidth={1.5} />}>
        Filters
        {activeCount > 0 && <span className="rounded-xs bg-lilac px-1.5 text-caption font-medium tabular-nums text-midnight"><span className="sr-only">, </span>{activeCount}<span className="sr-only"> active</span></span>}
      </Button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={title}
        description="Changes apply as you choose."
        onCloseAutoFocus={(event) => { event.preventDefault(); trigger.current?.focus(); }}
        footer={
          <div className="flex items-center gap-4">
            <Button variant="quiet" className="min-h-11" disabled={activeCount === 0} onClick={onReset}>Reset filters</Button>
            <Button className="flex-1" onClick={() => setOpen(false)}>
              Show {resultCount} {resultCount === 1 ? noun[0] : noun[1]}
            </Button>
          </div>
        }
      >
        {children}
      </Sheet>
    </>
  );
}
