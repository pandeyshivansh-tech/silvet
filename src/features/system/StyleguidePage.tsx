import { AnimatePresence, motion } from "motion/react";
import { Plus, Search } from "lucide-react";
import { useState, type ReactNode } from "react";
import { DemoRepository, RepositoryProvider, useItemImages, useItems, useOutfits } from "@/data";
import { CATEGORIES, COLORS, OCCASIONS, SLOTS, SUBCATEGORIES, labelOf, subcategoriesOf } from "@/domain/taxonomy";
import type { ClothingItem } from "@/domain/types";
import { fadeUp, ideaLook, ideaPiece, slotLand, stagger } from "@/motion/presets";
import {
  Button,
  Chip,
  ChipRow,
  ColorSwatch,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  GarmentFrame,
  GarmentGlyph,
  IconButton,
  ItemCard,
  ItemCardSkeleton,
  ItemGridSkeleton,
  Lockup,
  Page,
  PageHeader,
  RemovedItemCard,
  SectionRule,
  SelectField,
  Sheet,
  SilvetMark,
  StateView,
  TextField,
  WARDROBE_GRID,
  Wordmark,
  useToast,
} from "@/ui";

/**
 * /styleguide — the living design system (visual source of truth: docs/design/SILVET_DESIGN_REFERENCE.pdf).
 * Collaborators review this on their phones via the preview URL. Not linked from the product.
 */
export default function StyleguidePage() {
  const [repository] = useState(() => new DemoRepository({ store: null }));
  return (
    <RepositoryProvider repository={repository}>
      <Page wide>
        <PageHeader eyebrow="Design system · Fluid Atelier" title="SILVET styleguide" lede="Chalk is the room. Midnight is the voice. Lilac answers “what did I pick?”. Citron answers “what’s on, what’s done, whose brand is this?” — always on Midnight." />
        <div className="flex flex-col gap-16">
          <BrandSection />
          <ColourSection />
          <TypeSection />
          <ButtonSection />
          <FilterSection />
          <InputSection />
          <GarmentSection />
          <LiveDataSection />
          <StatesSection />
          <MidnightSection />
          <OverlaySection />
          <MotionSection />
        </div>
      </Page>
    </RepositoryProvider>
  );
}

function Section({ label, children, note }: { label: string; children: ReactNode; note?: ReactNode }) {
  return (
    <section>
      <SectionRule label={label} className="mb-6" />
      {children}
      {note && <p className="mt-4 max-w-prose text-caption text-graphite-deep">{note}</p>}
    </section>
  );
}

function BrandSection() {
  return (
    <Section label="Brand · interim" note="The Selvedge S is still an exploration in the PDF (A · Selvedge is the base option). Until the final asset exists, the mark is a typeset Instrument Serif S — no invented logo.">
      <div className="flex flex-wrap items-center gap-8">
        <Lockup markClassName="text-page" wordmarkClassName="text-look" />
        <div className="surface-midnight flex items-center gap-3 rounded-xs px-6 py-4">
          <SilvetMark className="text-look" />
          <Wordmark className="text-lead text-chalk" />
        </div>
        <div className="surface-midnight flex size-16 items-center justify-center rounded-xs">
          <SilvetMark className="text-section" />
        </div>
      </div>
    </Section>
  );
}

const BRAND = [
  { token: "chalk", name: "Warm Chalk", hex: "#F4F0E9", role: "The canvas. Every page background." },
  { token: "midnight", name: "Midnight Aubergine", hex: "#211A2B", role: "Type, primary buttons, tab bar, banner, active nav, toasts. 14.8:1." },
  { token: "lilac", name: "Atelier Lilac", hex: "#D9C9EF", role: "Selected only. Text on it is Midnight (10.9:1)." },
  { token: "citron", name: "Electric Citron", hex: "#D9F36A", role: "Signature marks on Midnight only (13.6:1)." },
];
const NEUTRALS = [
  { token: "chalk-deep", name: "Chalk Deep", hex: "#EBE6DD", role: "Garment backdrops, quiet panels, skeletons." },
  { token: "graphite-deep", name: "Graphite Deep", hex: "#5E5866", role: "Text under 18 px · 6.0:1." },
  { token: "graphite", name: "Graphite", hex: "#77717E", role: "Borders, icons, text 18 px+ · 4.16:1." },
  { token: "danger", name: "Danger", hex: "#A8321F", role: "Delete and field errors only · 5.9:1." },
];

function Swatches({ list }: { list: typeof BRAND }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {list.map((c) => (
        <div key={c.token}>
          <div className="aspect-[3/2] rounded-xs ring-1 ring-line ring-inset" style={{ backgroundColor: `var(--color-${c.token})` }} />
          <p className="mt-2 text-ui font-medium">
            {c.name} <span className="font-normal text-graphite-deep">{c.hex}</span>
          </p>
          <p className="text-caption text-graphite-deep">{c.role}</p>
        </div>
      ))}
    </div>
  );
}

function ColourSection() {
  return (
    <Section label="Colour by job" note="Approximate share of a screen: Chalk 64 · Chalk Deep 14 · Midnight 13 · Graphite 4 · Lilac 3–6 · Citron ≈1. Never: Citron on Chalk or Lilac · gradients, glows, blur, blobs · brand colour over or behind a garment photo · more than one Midnight section per page.">
      <Swatches list={BRAND} />
      <div className="mt-6">
        <Swatches list={NEUTRALS} />
      </div>
    </Section>
  );
}

const TYPE = [
  { cls: "font-display text-hero lg:text-hero-lg", spec: "Hero 96/88 · 56/52", sample: "Decided." },
  { cls: "font-display text-page lg:text-page-lg", spec: "Page 56/56 · 40/40", sample: "Lookbook" },
  { cls: "font-display text-section lg:text-section-lg", spec: "Section 48 · 32", sample: "Why this works" },
  { cls: "font-display text-look lg:text-look-lg", spec: "Look name 28 · 24", sample: "Diwali evening" },
  { cls: "text-lead lg:text-lead-lg", spec: "Lead 18/28 · 16/24", sample: "Combine what you own." },
  { cls: "text-body", spec: "Body 15/23", sample: "Chikankari kurta over denim." },
  { cls: "text-ui font-medium", spec: "UI 14/20 · 500", sample: "Save look · Tops 11" },
  { cls: "text-caption text-graphite-deep", spec: "Caption 13/19", sample: "4 pieces · built in Studio" },
  { cls: "eyebrow", spec: "Label 11 · +14% · caps", sample: "Once per view, max" },
];

function TypeSection() {
  return (
    <Section label="Type scale" note="Instrument Serif: titles, look names, editorial lines. Geist: everything you tap, read twice or scan. Inputs are 16 px so iOS never zooms.">
      <div className="divide-y divide-line">
        {TYPE.map((t) => (
          <div key={t.spec} className="grid gap-2 py-3 sm:grid-cols-[12rem_1fr] sm:items-baseline">
            <p className="text-caption text-graphite-deep">{t.spec}</p>
            <p className={t.cls}>{t.sample}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function ButtonSection() {
  return (
    <Section label="Buttons · every state" note="Hover and pressed are live — try them. Focus with Tab: 2 px Midnight ring on Chalk, Citron ring on Midnight. The filled Danger button only appears inside a confirm dialog.">
      <div className="grid gap-4">
        <Row label="Primary">
          <Button>Save look</Button>
          <Button loading loadingLabel="Saving">
            Save look
          </Button>
          <Button disabled>Save look</Button>
        </Row>
        <Row label="Secondary">
          <Button variant="secondary">Another idea</Button>
          <Button variant="secondary" loading loadingLabel="Finding one…">
            Another idea
          </Button>
          <Button variant="secondary" disabled>
            Another idea
          </Button>
        </Row>
        <Row label="Quiet">
          <Button variant="quiet">Clear look</Button>
          <Button variant="quiet" disabled>
            Clear look
          </Button>
        </Row>
        <Row label="Danger">
          <Button variant="danger-quiet">Delete item</Button>
          <Button variant="danger">Delete</Button>
          <Button variant="danger" loading loadingLabel="Deleting…">
            Delete
          </Button>
        </Row>
        <Row label="Icon">
          <IconButton label="Search wardrobe" icon={<Search className="size-5" strokeWidth={1.5} />} />
          <IconButton label="Add piece" variant="outline" icon={<Plus className="size-5" strokeWidth={1.5} />} />
          <IconButton label="Add" variant="solid" icon={<Plus className="size-5" strokeWidth={1.5} />} />
        </Row>
      </div>
    </Section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid items-center gap-3 sm:grid-cols-[8rem_1fr]">
      <p className="text-ui font-medium">{label}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

function FilterSection() {
  const [tab, setTab] = useState("bottoms");
  const [active, setActive] = useState<string[]>(["indian"]);
  const [colour, setColour] = useState("navy");
  const toggle = (k: string) => setActive((a) => (a.includes(k) ? a.filter((x) => x !== k) : [...a, k]));
  return (
    <Section label="Filters & tabs" note="Active filters collect in one row above the grid with “Clear all”. A filter that would return 0 is dashed but stays tappable, then explains itself. Chips are 32 px tall with 6 px of invisible padding.">
      <ChipRow label="Categories">
        {CATEGORIES.map((c) => (
          <Chip key={c.slug} variant="tab" selected={tab === c.slug} count={subcategoriesOf(c.slug).length} onClick={() => setTab(c.slug)}>
            {c.label}
          </Chip>
        ))}
      </ChipRow>
      <ChipRow label="Filters" className="mt-3">
        <Chip selected={active.includes("indian")} removable onClick={() => toggle("indian")}>
          Indian wear
        </Chip>
        {OCCASIONS.slice(0, 4).map((o) => (
          <Chip key={o.slug} selected={active.includes(o.slug)} removable onClick={() => toggle(o.slug)}>
            {o.label}
          </Chip>
        ))}
        <Chip empty>Dhoti pants 0</Chip>
      </ChipRow>
      <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Colour">
        {COLORS.slice(0, 12).map((c) => (
          <button key={c.slug} type="button" aria-pressed={colour === c.slug} aria-label={c.label} onClick={() => setColour(c.slug)} className="rounded-full p-1">
            <ColorSwatch slug={c.slug} selected={colour === c.slug} />
          </button>
        ))}
        <span className="ml-2 text-caption text-graphite-deep">{labelOf.color(colour)}</span>
      </div>
    </Section>
  );
}

function InputSection() {
  const [category, setCategory] = useState("");
  return (
    <Section label="Inputs" note="Errors appear on submit, then update as you type. Focus moves to the first field to fix. Disabled fields say why.">
      <div className="grid max-w-3xl gap-6 sm:grid-cols-2">
        <TextField label="Name" requiredMark placeholder="e.g. Black slip dress" hint="Two or three words is plenty." />
        <TextField label="Name" requiredMark defaultValue="Mustard kurta" />
        <TextField label="Email" type="email" defaultValue="priya@" error="Add the part after @, like gmail.com" />
        <SelectField
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Choose a category"
          options={CATEGORIES.map((c) => ({ value: c.slug, label: c.label }))}
        />
        <SelectField
          label="Subcategory"
          optional
          disabled={!category}
          placeholder={category ? "Choose a type" : "Choose a category first"}
          options={category ? subcategoriesOf(category).map((s) => ({ value: s.slug, label: s.label })) : []}
        />
      </div>
    </Section>
  );
}

const SAMPLE: ClothingItem = {
  id: "styleguide-satin-blouse",
  name: "Satin blouse",
  categorySlug: "tops",
  subcategorySlug: "blouses",
  primaryColor: "maroon",
  secondaryColor: null,
  pattern: "solid",
  styleTags: [],
  occasionTags: [],
  seasonTags: [],
  image: null,
  createdAt: "",
  updatedAt: "",
};

function GarmentSection() {
  return (
    <Section label="Garment card" note="Hover: image 1.02 and the name underlines. Focus: Midnight ring. Selected: Lilac mat outside the frame + Citron tick on Midnight — the garment backdrop stays neutral. Photo-less items are clearly tagged, never passed off as the user’s photo.">
      <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-4 lg:grid-cols-6">
        <Labeled label="Default · sample">
          <ItemCard item={SAMPLE} onSelect={() => {}} />
        </Labeled>
        <Labeled label="Selected">
          <ItemCard item={SAMPLE} selected onSelect={() => {}} />
        </Labeled>
        <Labeled label="Yours · no photo yet">
          <ItemCard item={{ ...SAMPLE, primaryColor: "pink" }} placeholderTag="No photo yet" />
        </Labeled>
        <Labeled label="Loading">
          <ItemCardSkeleton />
        </Labeled>
        <Labeled label="Removed">
          <RemovedItemCard slot="top" />
        </Labeled>
        <Labeled label="Indian wear">
          <ItemCard item={{ ...SAMPLE, name: "Teal silk saree", categorySlug: "one-piece", subcategorySlug: "sarees", primaryColor: "teal" }} />
        </Labeled>
      </div>
      <div className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {SLOTS.map((slot) => (
          <div key={slot}>
            <div className="flex aspect-[4/5] items-center justify-center rounded-xs border border-dashed border-line-strong text-graphite">
              <GarmentGlyph slot={slot} className="h-2/5 w-auto" />
            </div>
            <p className="mt-2 text-caption text-graphite-deep">{labelOf.slot(slot)} · empty slot</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      {children}
      <p className="mt-1 text-caption text-graphite-deep">{label}</p>
    </div>
  );
}

function LiveDataSection() {
  const items = useItems();
  const outfits = useOutfits();
  const images = useItemImages(items.data);
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <Section label="Live data · DemoRepository" note={`Rendered through the same hooks screens use: ${items.data?.length ?? "…"} sample pieces, ${outfits.data?.length ?? "…"} starter looks. Desktop grid auto-fills 176 px columns.`}>
      <StateView query={items} loading={<ItemGridSkeleton count={6} />}>
        {(list) => (
          <motion.div variants={stagger()} initial="hidden" animate="visible" className={WARDROBE_GRID}>
            {list.slice(0, 12).map((item) => (
              <motion.div key={item.id} variants={fadeUp}>
                <ItemCard item={item} imageUrl={images.byItem.get(item.id)?.thumb} selected={picked === item.id} onSelect={(i) => setPicked(i.id === picked ? null : i.id)} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </StateView>
    </Section>
  );
}

function StatesSection() {
  return (
    <Section label="Page states" note="Loading · empty · error. Success is the screen itself. Skeletons use Chalk Deep with a slow tonal sweep — no colour.">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xs border border-line p-4">
          <ItemGridSkeleton count={3} className="grid-cols-3! sm:grid-cols-3! md:grid-cols-3! lg:grid-cols-3!" />
        </div>
        <div className="rounded-xs border border-line">
          <EmptyState
            title="Start with five pieces you wear every week."
            body="A name and category is enough. Photos can come later."
            action={
              <div className="flex flex-col gap-3">
                <Button>Add your first piece</Button>
                <div className="flex gap-1" aria-label="2 of 5 added">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span key={i} className={i < 2 ? "h-0.5 flex-1 bg-midnight" : "h-0.5 flex-1 bg-line-strong"} />
                  ))}
                </div>
                <p className="text-caption text-graphite-deep">2 of 5 — quiet progress, no streaks.</p>
              </div>
            }
          />
        </div>
        <div className="rounded-xs border border-line">
          <ErrorState title="Your wardrobe didn’t load." error={new Error("network")} onRetry={() => {}} />
        </div>
      </div>
    </Section>
  );
}

function MidnightSection() {
  return (
    <Section label="Midnight panel · one per page" note="Citron only appears on Midnight: reason numerals, arrows, ticks, the active-tab bar. Focus inside turns Citron.">
      <div className="surface-midnight max-w-md rounded-xs p-6">
        <p className="text-caption text-midnight-muted">Why this works</p>
        <ol className="mt-4 divide-y divide-chalk/15">
          {[
            ["One strong colour, the rest ivory.", "Maroon leads; white kurta and churidar keep it clean."],
            ["The jacket sets the level.", "A Nehru jacket makes it formal; gold juttis match that."],
          ].map(([title, body], i) => (
            <li key={title} className="grid grid-cols-[2.5rem_1fr] gap-3 py-4">
              <span className="font-display text-section text-citron">{String(i + 1).padStart(2, "0")}</span>
              <span>
                <span className="block text-ui font-medium">{title}</span>
                <span className="mt-1 block text-caption text-midnight-muted">{body}</span>
              </span>
            </li>
          ))}
        </ol>
        <button type="button" className="mt-2 text-ui underline decoration-chalk/40 underline-offset-4 hover:decoration-chalk">
          Focus me — Citron ring
        </button>
      </div>
    </Section>
  );
}

function OverlaySection() {
  const [sheet, setSheet] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const toast = useToast();
  return (
    <Section label="Sheets, dialogs, toasts" note="Toasts: bottom-centre, 4 s, pause on hover/focus, one at a time; errors stay until dismissed. Sheets: bottom sheet under 640 px, 360 px side panel above; focus returns to what opened them.">
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={() => setSheet(true)}>
          Open picker sheet
        </Button>
        <Button variant="secondary" onClick={() => setConfirm(true)}>
          Confirm delete
        </Button>
        <Button variant="secondary" onClick={() => toast.success("Saved to Lookbook", { label: "View", onClick: () => {} })}>
          Success toast
        </Button>
        <Button variant="secondary" onClick={() => toast.error("Upload stopped — your connection dropped.", { label: "Try again", onClick: () => {} })}>
          Error toast
        </Button>
      </div>
      <Sheet open={sheet} onOpenChange={setSheet} title="Bottom" description="Choosing for · 9 that fit" footer={<Button fullWidth onClick={() => setSheet(false)}>Done</Button>}>
        <div className="grid grid-cols-2 gap-3 pt-2">
          {SUBCATEGORIES.filter((s) => s.slot === "bottom")
            .slice(0, 6)
            .map((s) => (
              <ItemCard
                key={s.slug}
                item={{ ...SAMPLE, id: s.slug, name: s.label, categorySlug: "bottoms", subcategorySlug: s.slug, primaryColor: "denim" }}
                selected={picked === s.slug}
                onSelect={() => setPicked(s.slug)}
              />
            ))}
        </div>
      </Sheet>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete Black slip dress?"
        body="It’s in 2 saved looks. Those looks stay — this piece will show as “No longer in your wardrobe”."
        confirmLabel="Delete"
        destructive
        onConfirm={() => setConfirm(false)}
      />
    </Section>
  );
}

const IDEAS: Array<{ id: string; colors: string[] }> = [
  { id: "a", colors: ["maroon", "white", "white", "gold"] },
  { id: "b", colors: ["navy", "cream", "brown", "black"] },
  { id: "c", colors: ["black", "charcoal", "black", "silver"] },
];

function MotionSection() {
  const [landKey, setLandKey] = useState(0);
  const [idea, setIdea] = useState(0);
  const current = IDEAS[idea % IDEAS.length] ?? IDEAS[0]!;
  const slots = ["outerwear", "top", "bottom", "footwear"] as const;
  return (
    <Section label="Motion" note="120 ms press · 200 ms select/fade · 320 ms sheets and shared-element moves · ease (.2,0,0,1) · transform and opacity only. Turn on “Reduce motion” in your OS: transforms stop, fades remain.">
      <div className="grid gap-10 lg:grid-cols-[12rem_1fr]">
        <div>
          <div className="w-36">
            <motion.div key={landKey} variants={slotLand} initial="hidden" animate="visible">
              <GarmentFrame item={{ name: "Kurta set", categorySlug: "one-piece", subcategorySlug: "kurta-sets", primaryColor: "pink" }} />
            </motion.div>
          </div>
          <Button variant="secondary" size="sm" className="mt-4" onClick={() => setLandKey((k) => k + 1)}>
            Slide into slot
          </Button>
        </div>
        <div>
          <div className="grid max-w-lg grid-cols-4 gap-3">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={current.id} variants={ideaLook} initial="hidden" animate="visible" exit="exit" className="col-span-4 grid grid-cols-4 gap-3">
                {slots.map((slot, i) => (
                  <motion.div key={slot} variants={ideaPiece}>
                    <GarmentFrame item={{ name: slot, categorySlug: "tops", subcategorySlug: null, primaryColor: current.colors[i] ?? "black" }} placeholderTag={labelOf.slot(slot)} />
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
          <Button variant="secondary" size="sm" className="mt-4" onClick={() => setIdea((n) => n + 1)}>
            Another idea
          </Button>
          <p className="mt-2 text-caption text-graphite-deep">Old idea fades out (120 ms); the new one fades in piece by piece (40 ms stagger). Buttons stay put.</p>
        </div>
      </div>
    </Section>
  );
}
