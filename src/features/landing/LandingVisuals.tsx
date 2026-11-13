import { motion } from "motion/react";
import { Link } from "react-router";
import { Check, Plus } from "lucide-react";
import { DEMO_ITEMS, DEMO_OUTFITS } from "@/data/demo/demoWardrobe";
import { CATEGORIES, OCCASIONS, getColor, labelOf, slotOf } from "@/domain/taxonomy";
import type { ClothingItem, Outfit } from "@/domain/types";
import { makeRecommendation } from "@/engine/recommend";
import { fadeAt, pieceLand, savedTick } from "@/motion/presets";
import { paths } from "@/app/paths";
import { Chip, GarmentGlyph, ItemCard, OutfitSlot, cn, useIsPhone } from "@/ui";
import { LookFlatLay } from "@/features/lookbook/LookFlatLay";
import { outfitTitle, resolveOutfitPieces } from "@/features/lookbook/lookbookPresentation";

/**
 * Landing vignettes (SILVET_DESIGN_REFERENCE.pdf p2, p4, p15). Every picture on the landing page is the app's own
 * components rendering the sample wardrobe (DEMO_ITEMS / DEMO_OUTFITS) — never a mock-up — and the Ideas reasons are
 * the rules engine's real output for that look. Vignettes are `inert` (no stray tab stops) and their captions
 * carry the meaning.
 */
const item = (id: string) => DEMO_ITEMS.find((piece) => piece.id === `demo-${id}`);
const items = (...ids: string[]) => ids.map(item).filter((piece): piece is ClothingItem => piece !== undefined);
const look = (id: string) => DEMO_OUTFITS.find((outfit) => outfit.id === id);
const NO_PHOTOS = new Map<string, { thumb: string; full: string }>();

export const FUSION = look("demo-look-fusion-college");
export const FESTIVE = look("demo-look-festive");
export const MONOCHROME = look("demo-look-monochrome");

/** The Lilac selected chip, as on the real occasion row. */
function Selected({ children }: { children: string }) {
  return <Chip selected tabIndex={-1}>{children}</Chip>;
}

/** Hero assembly: first piece lands at 0.3 s, the next every 90 ms. */
const HERO = { start: 0.3, step: 0.09 };

const piecesOf = (outfit: Outfit) =>
  outfit.pieces.map((piece) => DEMO_ITEMS.find((candidate) => candidate.id === piece.itemId)).filter((piece): piece is ClothingItem => piece !== undefined);

/**
 * Hero (PDF p5): one sample look as the product shows it — the flat-lay with its Midnight "Saved to Lookbook"
 * moment, and under it Studio's slot strip (four places filled, Layer being chosen in Lilac). The caption opens
 * the same look in the demo Studio. Sequence: the look, the slots, then the save.
 */
export function HeroLook() {
  if (!FUSION) return null;
  const filled = piecesOf(FUSION);
  const label: Record<string, string> = { top: "Top", bottom: "Bottom", footwear: "Footwear", accessory: "Accessory" };
  // One timeline: the mat appears, each piece lands on it and in its slot together, the open Layer slot
  // lights up, then the look is saved. Plays when the look first comes into view (on a phone it sits below the copy).
  const at = (i: number) => HERO.start + i * HERO.step;
  const layerLit = at(filled.length) + 0.12;
  return (
    <figure className="rounded-xs border border-line p-3 sm:p-4">
      <motion.div inert aria-hidden="true" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }}>
        <motion.div variants={fadeAt} custom={0.1} className="relative">
          <LookFlatLay rows={resolveOutfitPieces(FUSION, DEMO_ITEMS)} images={NO_PHOTOS} size="feature" assemble={HERO} />
          <motion.p variants={savedTick} custom={layerLit + 0.2} className="surface-midnight absolute right-3 bottom-3 flex items-center gap-2 rounded-xs px-3 py-2 text-caption">
            <Check className="size-3.5 text-citron" strokeWidth={2.5} />Saved to Lookbook
          </motion.p>
        </motion.div>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {filled.map((piece, i) => (
            <motion.div key={piece.id} variants={pieceLand} custom={at(i)} className="min-w-0">
              <p className="mb-1 truncate text-caption text-graphite-deep">{label[slotOf(piece)] ?? ""}</p>
              <Mat piece={piece} />
            </motion.div>
          ))}
          <motion.div variants={pieceLand} custom={at(filled.length)} className="min-w-0">
            <p className="mb-1 truncate text-caption font-medium text-midnight">Layer</p>
            <div className="relative isolate rounded-xs p-1">
              <motion.div variants={fadeAt} custom={layerLit} className="absolute inset-0 -z-10 rounded-xs bg-lilac" />
              <EmptyMat label="" />
            </div>
          </motion.div>
        </div>
      </motion.div>
      <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-x-4">
        <p className="min-w-0">
          <span className="font-display text-lead-lg text-midnight">{outfitTitle(FUSION)}</span>
          <span className="text-caption text-graphite-deep"> · built from the sample wardrobe, illustrated</span>
        </p>
        <Link to={paths.style("/demo", { outfitId: FUSION.id })} className="inline-flex min-h-11 items-center text-caption font-medium text-midnight underline underline-offset-4">
          Open in Studio
        </Link>
      </figcaption>
    </figure>
  );
}

/** A Chalk Deep garment mat with the garment drawn in its colour (same treatment as GarmentFrame, without the tag). */
function Mat({ piece, className }: { piece: ClothingItem; className?: string }) {
  return (
    <div className={cn("flex aspect-[4/5] items-center justify-center rounded-xs bg-chalk-deep text-midnight", className)}>
      <GarmentGlyph slot={slotOf(piece)} subcategory={piece.subcategorySlug} fill={getColor(piece.primaryColor)?.hex ?? "transparent"} className="h-3/5 w-auto" />
    </div>
  );
}

function EmptyMat({ label }: { label: string }) {
  return (
    <div className="flex aspect-[4/5] flex-col items-center justify-center rounded-xs border border-dashed border-line-strong px-2 text-center text-midnight">
      <Plus aria-hidden="true" className={label ? "mb-1 size-4" : "size-4"} strokeWidth={1.5} />
      {label && <span className="text-caption font-medium">{label}</span>}
    </div>
  );
}

/** Step panels share one size so the three captions line up. */
const panel = "relative flex aspect-[16/10] flex-col justify-center overflow-hidden rounded-xs p-4";

/** Step 1 (PDF p5 · 01): a piece just added — the real success toast on Midnight. */
export function StepAdd() {
  const kurta = item("mustard-kurta");
  if (!kurta) return null;
  return (
    <div aria-hidden="true" className={cn(panel, "bg-chalk-deep")}>
      <div className="flex flex-1 items-start justify-center pb-10 text-midnight">
        <GarmentGlyph slot={slotOf(kurta)} subcategory={kurta.subcategorySlug} fill={getColor(kurta.primaryColor)?.hex} className="h-full w-auto" />
      </div>
      <p className="surface-midnight absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-xs px-3 py-2 text-caption">
        <Check className="size-3.5 shrink-0 text-citron" strokeWidth={2.5} />Piece added to your wardrobe.
      </p>
    </div>
  );
}

/** Step 2 (PDF p5 · 02): Studio slots — top in place, the bottom being chosen (Lilac + the picker's tick), footwear next. */
export function StepCombine() {
  const [kurta, jeans] = items("white-chikankari-kurta", "straight-blue-jeans");
  if (!kurta || !jeans) return null;
  return (
    <div aria-hidden="true" className={cn(panel, "border border-line")}>
      <div className="grid grid-cols-3 gap-2">
        <div><p className="mb-1 text-caption text-graphite-deep">Top</p><Mat piece={kurta} /></div>
        <div>
          <p className="mb-1 text-caption font-medium text-midnight">Bottom</p>
          <div className="relative rounded-xs bg-lilac">
            <Mat piece={jeans} className="scale-[0.92]" />
            <span className="surface-midnight absolute top-1 right-1 flex size-5 items-center justify-center rounded-full"><Check className="size-3 text-citron" strokeWidth={2.5} /></span>
          </div>
        </div>
        <div><p className="mb-1 text-caption text-graphite-deep">Footwear</p><EmptyMat label="Add" /></div>
      </div>
    </div>
  );
}

/** A look laid flat in miniature, same arrangement as the Lookbook mat (base large on top, the rest below). */
function MiniLook({ outfit }: { outfit: Outfit }) {
  const pieces = piecesOf(outfit);
  const base = (piece: ClothingItem) => ["top", "bottom", "one_piece", "outerwear"].includes(slotOf(piece));
  const glyph = (piece: ClothingItem) => (
    <GarmentGlyph key={piece.id} slot={slotOf(piece)} subcategory={piece.subcategorySlug} fill={getColor(piece.primaryColor)?.hex ?? "transparent"} className="h-full w-auto min-w-0" />
  );
  return (
    <div className="flex aspect-[4/5] flex-col gap-[6%] rounded-xs bg-chalk-deep p-[12%] text-midnight">
      <div className="flex min-h-0 flex-[2.4] justify-center gap-[6%]">{pieces.filter(base).map(glyph)}</div>
      <div className="flex min-h-0 flex-1 items-end justify-between">{pieces.filter((piece) => !base(piece)).map(glyph)}</div>
    </div>
  );
}

/** How it works · 3: the Lookbook in miniature — saved Western, Indian and fusion looks. */
export function StepKeep() {
  const looks = [MONOCHROME, FESTIVE, FUSION].filter((outfit): outfit is Outfit => outfit !== undefined);
  return (
    <div aria-hidden="true" className={cn(panel, "border border-line")}>
      <p className="mb-1 text-caption text-graphite-deep">Lookbook · {looks.length} looks</p>
      <div className="grid grid-cols-3 gap-2">{looks.map((outfit) => <MiniLook key={outfit.id} outfit={outfit} />)}</div>
    </div>
  );
}

/** Wardrobe: the real category tabs with the sample wardrobe's counts, and the Tops it filters to. */
export function WardrobeVignette() {
  const tops = items("white-chikankari-kurta", "indigo-short-kurti", "black-boxy-tee", "blue-oxford-shirt");
  return (
    <div inert aria-hidden="true">
      <div className="flex flex-wrap gap-2">
        <Chip tabIndex={-1}>All · {DEMO_ITEMS.length}</Chip>
        {CATEGORIES.map((category) => {
          const count = DEMO_ITEMS.filter((piece) => piece.categorySlug === category.slug).length;
          return category.slug === "tops"
            ? <Selected key={category.slug}>{`${category.label} · ${count}`}</Selected>
            : <Chip key={category.slug} tabIndex={-1} className="max-sm:hidden">{category.label} · {count}</Chip>;
        })}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-4">
        {tops.map((piece) => <ItemCard key={piece.id} item={piece} />)}
      </div>
    </div>
  );
}

/** Studio: a complete look in read-only slots — exactly what Build shows once every place is filled. */
export function StudioVignette() {
  if (!MONOCHROME) return null;
  const labels: Record<string, string> = { top: "Top", bottom: "Bottom", footwear: "Footwear", accessory: "Accessory 1" };
  return (
    <div inert aria-hidden="true">
      <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-4">
        {MONOCHROME.pieces.map((piece) => {
          const garment = DEMO_ITEMS.find((candidate) => candidate.id === piece.itemId);
          return garment && <OutfitSlot key={piece.itemId} label={labels[piece.slot] ?? piece.slot} item={garment} detail={labelOf.subcategory(garment.subcategorySlug) ?? undefined} optional={piece.slot === "accessory"} />;
        })}
      </div>
      <p className="mt-5 flex items-center gap-2 border-t border-line pt-4 text-caption text-midnight">
        <Check aria-hidden="true" className="size-4" strokeWidth={2} />
        Complete look · {MONOCHROME.pieces.length} pieces · ready to name and save
      </p>
    </div>
  );
}

/** Ideas: the occasion row and the rules engine's own reasons for the sample look, on Midnight with Citron numerals. */
export function IdeasVignette({ outfit }: { outfit: Outfit }) {
  const reasons = makeRecommendation(outfit.pieces, DEMO_ITEMS, { occasion: "college" })?.explanations ?? [];
  return (
    <figure>
      <div inert aria-hidden="true" className="flex flex-wrap gap-2">
        {OCCASIONS.slice(0, 5).map((occasion) => occasion.slug === "college"
          ? <Selected key={occasion.slug}>{occasion.label}</Selected>
          : <Chip key={occasion.slug} tabIndex={-1} className={occasion.slug === "date" ? "max-sm:hidden" : undefined}>{occasion.label}</Chip>)}
      </div>
      <div className="surface-midnight mt-4 rounded-xs p-5 sm:p-7">
        <p className="font-display text-look text-chalk">Why this works</p>
        <ol className="mt-4 space-y-3">
          {reasons.map((reason, index) => (
            <li key={reason.kind} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-2 text-body">
              <span aria-hidden="true" className="font-display text-lead text-citron">{String(index + 1).padStart(2, "0")}</span>
              <span className="text-chalk">{reason.message}</span>
            </li>
          ))}
        </ol>
      </div>
      <figcaption className="mt-3 text-caption text-graphite-deep">
        Real output of SILVET’s rules for the sample look “{outfitTitle(outfit)}”, chosen for College.
      </figcaption>
    </figure>
  );
}

/** Lookbook: Western, Indian and fusion sample looks side by side (PDF p4: three columns on desktop). */
export function LookbookRow() {
  const phone = useIsPhone();
  const row = [
    { outfit: MONOCHROME, kind: "Western" },
    { outfit: FESTIVE, kind: "Indian" },
    { outfit: FUSION, kind: "Fusion" },
  ].filter((entry): entry is { outfit: Outfit; kind: string } => entry.outfit !== undefined);
  return (
    // Phones: a swipeable row (focusable so it scrolls from the keyboard too); from 640 px three columns.
    <ul tabIndex={phone ? 0 : undefined} aria-label="Sample looks: Western, Indian and fusion"
      className="scrollbar-none -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-2 focus-visible:outline-2 focus-visible:outline-offset-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-x-5 sm:overflow-visible sm:px-0 sm:pb-0">
      {row.map(({ outfit, kind }) => (
        <li key={outfit.id} className="w-[72%] min-w-0 shrink-0 snap-start sm:w-auto">
          <LookFlatLay rows={resolveOutfitPieces(outfit, DEMO_ITEMS)} images={NO_PHOTOS} />
          <p className="mt-3 text-caption text-graphite-deep">{kind}</p>
          <p className="truncate font-display text-lead-lg text-midnight">{outfitTitle(outfit)}</p>
          <p className="mt-1 text-caption text-graphite-deep">{piecesOf(outfit).map((piece) => piece.name).join(" · ")}</p>
        </li>
      ))}
    </ul>
  );
}
