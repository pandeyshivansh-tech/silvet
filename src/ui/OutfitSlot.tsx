import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import type { ClothingItem } from "@/domain/types";
import { slotSwap } from "@/motion/presets";
import { cn } from "./cn";
import { GarmentFrame } from "./ItemCard";

export interface OutfitSlotProps {
  /** Slot name as people say it: "Top", "Accessory 1". */
  label: string;
  optional?: boolean;
  item?: ClothingItem;
  imageUrl?: string;
  /** The look still references a piece that has left the wardrobe. */
  removed?: boolean;
  /** Second line under the name, e.g. the garment type. */
  detail?: string;
  /** Makes the slot choosable: an empty slot becomes "Add …", a filled frame becomes "Replace …". */
  onChoose?: () => void;
  onRemove?: () => void;
  disabled?: boolean;
  /** The picker is open for this slot: Lilac mat behind the frame and "Choosing" beside the label. */
  active?: boolean;
  /** Optional empty slots stay short on phones so the base pieces lead. */
  compact?: boolean;
  /** Extra control under the garment (Ideas: Swap). */
  action?: ReactNode;
  /** Seconds before a new garment lands (Ideas deals a whole new look slot by slot). */
  enterDelay?: number;
  className?: string;
}

const textAction = "inline-flex min-h-11 items-center text-caption text-midnight underline decoration-line-strong underline-offset-4 transition-colors duration-120 ease-editorial hover:decoration-midnight disabled:text-graphite";

/**
 * One place in a look, shared by Studio Build (choose / replace / remove) and Ideas (read-only + Swap).
 * Three states read at a glance: empty (dashed frame naming the next step), filled (the garment, nothing
 * over the photo; Replace · Remove underneath) and removed (dashed, "No longer in your wardrobe").
 * Active (picker open for it) adds the Lilac mat: the frame steps in to reveal it, transform only.
 * Changing the garment: the old one fades, the new one lands on the touch spring.
 */
export function OutfitSlot({ label, optional = false, item, imageUrl, removed = false, detail, onChoose, onRemove, disabled = false, active = false, compact = false, action, enterDelay = 0, className }: OutfitSlotProps) {
  const name = label.toLowerCase();
  const frame = (content: ReactNode) => (
    <div className={cn("rounded-xs transition-colors duration-200 ease-editorial", active ? "bg-lilac" : "bg-transparent")}>
      <div className={cn("transition-transform duration-200 ease-editorial", active ? "scale-[0.94]" : "scale-100")}>{content}</div>
    </div>
  );
  return (
    <div className={cn("group/slot relative min-w-0", className)}>
      <p className="mb-2 flex items-baseline justify-between gap-2 text-caption text-graphite-deep">
        <span className="truncate">{label}{optional && " · optional"}</span>
        {active && <span className="shrink-0 font-medium text-midnight">Choosing</span>}
      </p>
      {item ? (
        <>
          {frame(
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div key={item.id} variants={slotSwap} custom={enterDelay} initial="hidden" animate="visible" exit="exit">
                {onChoose ? (
                  <button type="button" aria-label={`Replace ${name}`} onClick={onChoose} disabled={disabled} className="group block w-full rounded-xs">
                    <GarmentFrame item={item} imageUrl={imageUrl} />
                  </button>
                ) : (
                  <GarmentFrame item={item} imageUrl={imageUrl} />
                )}
              </motion.div>
            </AnimatePresence>,
          )}
          <p className="mt-3 truncate font-display text-lead-lg text-midnight">{item.name}</p>
          {detail && <p className="truncate text-caption text-graphite-deep">{detail}</p>}
          {(onChoose || onRemove) && (
            <div className="-mb-2 flex items-center gap-4">
              {onChoose && <button type="button" onClick={onChoose} disabled={disabled} className={textAction}>Replace</button>}
              {onRemove && <button type="button" aria-label={`Remove ${name}`} onClick={onRemove} disabled={disabled} className={cn(textAction, "text-graphite-deep hover:text-danger")}>Remove</button>}
            </div>
          )}
        </>
      ) : onChoose ? (
        frame(
          <button
            type="button"
            onClick={onChoose}
            disabled={disabled}
            className={cn(
              "flex w-full flex-col items-center justify-center rounded-xs border border-dashed border-line-strong bg-chalk px-3 text-center text-midnight transition-colors duration-120 ease-editorial hover:border-midnight hover:bg-chalk-deep disabled:text-graphite",
              compact ? "min-h-28 sm:min-h-0 sm:aspect-[4/5]" : "aspect-[4/5]",
            )}
          >
            <Plus aria-hidden="true" className="mb-2 size-5" strokeWidth={1.5} />
            <span className="text-ui font-medium">{removed ? "Replace removed piece" : `Add ${label}`}</span>
            <span className="mt-1 text-caption text-graphite-deep">{removed ? "No longer in your wardrobe" : "Choose a piece"}</span>
          </button>,
        )
      ) : (
        <div className={cn("flex w-full items-center justify-center rounded-xs border border-dashed border-line-strong px-3 text-center text-caption text-graphite-deep", compact ? "min-h-28" : "aspect-[4/5]")}>
          {removed ? "No longer in your wardrobe" : "Nothing here yet"}
        </div>
      )}
      {removed && onRemove && (
        <button type="button" onClick={onRemove} disabled={disabled} className={textAction}>
          Remove placeholder
        </button>
      )}
      {action}
    </div>
  );
}
