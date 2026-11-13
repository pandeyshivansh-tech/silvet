/**
 * SILVET clothing taxonomy — the single source of truth.
 *
 * Every filter, form, builder slot, suggestion rule and (later) the database seed
 * is derived from this file. Never hardcode category/subcategory strings elsewhere:
 * import from here and use the helpers at the bottom.
 *
 * Principles (Strategy v2 §5):
 * - Categories are garment types, not genders. Everyone sees everything.
 * - The outfit slot lives on the subcategory (a hoodie can act as a top; a kurta set is a full look).
 * - `tradition` powers the "Indian wear" filter; fusion (kurta + jeans) is fully supported.
 * - `formality` (1 casual · 2 smart/festive-casual · 3 formal/ceremonial) lets suggestions work
 *   even when a user only enters name + category.
 */

export const SLOTS = ["top", "bottom", "outerwear", "one_piece", "footwear", "accessory"] as const;
export type Slot = (typeof SLOTS)[number];

/** Slots that can hold at most one item in an outfit. Accessories can hold several. */
export const SINGLE_ITEM_SLOTS: readonly Slot[] = ["top", "bottom", "outerwear", "one_piece", "footwear"];
export const MAX_ACCESSORIES = 2;

export const SLOT_LABELS: Record<Slot, string> = {
  top: "Top",
  bottom: "Bottom",
  outerwear: "Layer",
  one_piece: "One-piece / set",
  footwear: "Footwear",
  accessory: "Accessory",
};

export type Tradition = "western" | "indian" | "universal";
export type Formality = 1 | 2 | 3;

export const FORMALITY_LABELS: Record<Formality, string> = {
  1: "Casual",
  2: "Smart",
  3: "Formal",
};

export interface Category {
  slug: string;
  label: string;
  /** Slot used when an item has no subcategory. */
  defaultSlot: Slot;
  sortOrder: number;
}

export interface Subcategory {
  slug: string;
  categorySlug: string;
  label: string;
  slot: Slot;
  tradition: Tradition;
  /** null for accessories — they never affect formality. */
  formality: Formality | null;
  /** Outerwear that can stand in for a top (hoodie, sweater). */
  canBeWornAlone: boolean;
  sortOrder: number;
}

export const CATEGORIES = [
  { slug: "tops", label: "Tops", defaultSlot: "top", sortOrder: 1 },
  { slug: "bottoms", label: "Bottoms", defaultSlot: "bottom", sortOrder: 2 },
  { slug: "outerwear", label: "Outerwear & layers", defaultSlot: "outerwear", sortOrder: 3 },
  { slug: "one-piece", label: "One-piece & sets", defaultSlot: "one_piece", sortOrder: 4 },
  { slug: "footwear", label: "Footwear", defaultSlot: "footwear", sortOrder: 5 },
  { slug: "accessories", label: "Accessories", defaultSlot: "accessory", sortOrder: 6 },
] as const satisfies readonly Category[];

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

type SubDef = [slug: string, label: string, formality: Formality | null, tradition?: Tradition, wornAlone?: boolean];

function defineSubs(categorySlug: CategorySlug, slot: Slot, defs: SubDef[]): Subcategory[] {
  return defs.map(([slug, label, formality, tradition = "western", wornAlone = false], i) => ({
    slug,
    categorySlug,
    label,
    slot,
    tradition,
    formality,
    canBeWornAlone: wornAlone,
    sortOrder: i + 1,
  }));
}

export const SUBCATEGORIES: readonly Subcategory[] = [
  ...defineSubs("tops", "top", [
    ["t-shirts", "T-shirts", 1],
    ["shirts", "Shirts", 2],
    ["polos", "Polos", 1],
    ["blouses", "Blouses", 2],
    ["crop-tops", "Crop tops", 1],
    ["tank-tops", "Tank tops & camis", 1],
    ["kurtas", "Kurtas", 2, "indian"],
    ["short-kurtis", "Short kurtis", 1, "indian"],
  ]),
  ...defineSubs("bottoms", "bottom", [
    ["jeans", "Jeans", 1],
    ["trousers", "Trousers", 2],
    ["cargos", "Cargos", 1],
    ["shorts", "Shorts", 1],
    ["joggers", "Joggers & track pants", 1],
    ["skirts", "Skirts", 2],
    ["leggings", "Leggings", 1],
    ["churidars-salwars", "Churidars & salwars", 2, "indian"],
    ["palazzos", "Palazzos", 2, "indian"],
    ["dhoti-pants", "Dhoti pants", 2, "indian"],
  ]),
  ...defineSubs("outerwear", "outerwear", [
    ["hoodies", "Hoodies", 1, "western", true],
    ["sweatshirts", "Sweatshirts", 1, "western", true],
    ["sweaters", "Sweaters & cardigans", 2, "western", true],
    ["jackets", "Jackets", 1],
    ["shackets", "Shackets", 1, "western", true],
    ["blazers", "Blazers", 3],
    ["nehru-jackets", "Nehru jackets", 3, "indian"],
    ["shrugs", "Shrugs", 2, "indian"],
  ]),
  ...defineSubs("one-piece", "one_piece", [
    ["dresses", "Dresses", 2],
    ["jumpsuits", "Jumpsuits", 2],
    ["rompers", "Rompers", 1],
    ["co-ord-sets", "Co-ord sets", 2],
    ["kurta-sets", "Kurta sets", 2, "indian"],
    ["anarkalis", "Anarkalis", 3, "indian"],
    ["sarees", "Sarees", 3, "indian"],
    ["lehenga-sets", "Lehenga sets", 3, "indian"],
    ["sherwani-sets", "Sherwani sets", 3, "indian"],
  ]),
  ...defineSubs("footwear", "footwear", [
    ["sneakers", "Sneakers", 1],
    ["sandals", "Sandals & slides", 1],
    ["boots", "Boots", 2],
    ["loafers", "Loafers", 2],
    ["flats", "Flats", 2],
    ["heels", "Heels", 3],
    ["formal-shoes", "Formal shoes", 3],
    ["kolhapuris", "Kolhapuris", 1, "indian"],
    ["juttis", "Juttis & mojaris", 2, "indian"],
  ]),
  ...defineSubs("accessories", "accessory", [
    ["watches", "Watches", null, "universal"],
    ["caps-hats", "Caps & hats", null, "universal"],
    ["belts", "Belts", null, "universal"],
    ["bags", "Bags", null, "universal"],
    ["sunglasses", "Sunglasses", null, "universal"],
    ["jewellery", "Jewellery", null, "universal"],
    ["scarves-stoles", "Scarves & stoles", null, "universal"],
    ["dupattas", "Dupattas", null, "indian"],
  ]),
];

export interface ColorDef {
  slug: string;
  label: string;
  hex: string;
  isNeutral: boolean;
  isMetallic: boolean;
  family: "neutral" | "blue" | "green" | "red" | "pink" | "purple" | "yellow" | "orange" | "metallic" | "multi";
}

function color(slug: string, label: string, hex: string, family: ColorDef["family"], isNeutral = false): ColorDef {
  return { slug, label, hex, family, isNeutral, isMetallic: family === "metallic" };
}

export const COLORS: readonly ColorDef[] = [
  color("black", "Black", "#111111", "neutral", true),
  color("white", "White", "#FAFAF7", "neutral", true),
  color("cream", "Off-white / cream", "#EFE6D2", "neutral", true),
  color("grey", "Grey", "#9A9A96", "neutral", true),
  color("charcoal", "Charcoal", "#3C3C3A", "neutral", true),
  color("navy", "Navy", "#1F2A44", "neutral", true),
  color("beige", "Beige", "#D8C6A6", "neutral", true),
  color("brown", "Brown", "#6B4A32", "neutral", true),
  color("khaki", "Khaki", "#B5A57A", "neutral", true),
  color("denim", "Denim blue", "#4A6A8F", "neutral", true),
  color("olive", "Olive", "#6B6B3A", "green"),
  color("blue", "Blue", "#2F5DA8", "blue"),
  color("teal", "Teal", "#1F6F6B", "green"),
  color("green", "Green", "#2F6B3A", "green"),
  color("red", "Red", "#B3261E", "red"),
  color("maroon", "Maroon", "#5E1A1D", "red"),
  color("pink", "Pink", "#E3A4B4", "pink"),
  color("purple", "Purple", "#5B3F86", "purple"),
  color("yellow", "Yellow", "#E9C83A", "yellow"),
  color("mustard", "Mustard", "#C99A2E", "yellow"),
  color("orange", "Orange", "#D9682B", "orange"),
  color("gold", "Gold", "#C2A25A", "metallic"),
  color("silver", "Silver", "#BFC1C2", "metallic"),
  color("multicolour", "Multicolour", "#888888", "multi"),
];

export const PATTERNS = [
  { slug: "solid", label: "Solid" },
  { slug: "striped", label: "Striped" },
  { slug: "checked", label: "Checked" },
  { slug: "printed", label: "Printed" },
  { slug: "graphic", label: "Graphic" },
  { slug: "embroidered", label: "Embroidered" },
  { slug: "other", label: "Other" },
] as const;
export type PatternSlug = (typeof PATTERNS)[number]["slug"];

export const OCCASIONS = [
  { slug: "everyday", label: "Everyday", formality: [1, 2] },
  { slug: "college", label: "College", formality: [1, 2] },
  { slug: "work", label: "Work", formality: [2, 3] },
  { slug: "party", label: "Party", formality: [1, 3] },
  { slug: "date", label: "Date", formality: [1, 3] },
  { slug: "festive", label: "Festive", formality: [2, 3] },
  { slug: "wedding", label: "Wedding", formality: [3, 3] },
  { slug: "travel", label: "Travel", formality: [1, 2] },
  /** Tag-only: suggestions for Active use tagged items only (Strategy v2 §7). */
  { slug: "active", label: "Active", formality: [1, 1] },
  { slug: "lounge", label: "Lounge", formality: [1, 1] },
] as const satisfies readonly { slug: string; label: string; formality: readonly [Formality, Formality] }[];
export type OccasionSlug = (typeof OCCASIONS)[number]["slug"];

export const SEASONS = [
  { slug: "summer", label: "Summer" },
  { slug: "monsoon", label: "Monsoon" },
  { slug: "winter", label: "Winter" },
  { slug: "all-season", label: "All-season" },
] as const;
export type SeasonSlug = (typeof SEASONS)[number]["slug"];

export const STYLES = [
  { slug: "minimal", label: "Minimal" },
  { slug: "casual", label: "Casual" },
  { slug: "streetwear", label: "Streetwear" },
  { slug: "classic", label: "Classic" },
  { slug: "sporty", label: "Sporty" },
  { slug: "vintage", label: "Vintage" },
  { slug: "y2k", label: "Y2K" },
  { slug: "fusion", label: "Indo-western fusion" },
  { slug: "traditional", label: "Traditional" },
] as const;
export type StyleSlug = (typeof STYLES)[number]["slug"];

/**
 * Display grouping for style preferences (onboarding, profile) — presentation only; STYLES' order is the
 * database's. Indian wear first: India-first product. domain.test.ts checks every style is in exactly one group.
 */
export const STYLE_GROUPS = [
  { slug: "indian", label: "Indian and fusion", hint: "Traditional covers sarees, kurtas, lehengas and juttis. Fusion mixes Indian and Western pieces in one look.", styles: ["traditional", "fusion"] },
  { slug: "western", label: "Western and everyday", hint: "From clean basics and sportswear to streetwear and throwback eras.", styles: ["minimal", "casual", "classic", "streetwear", "sporty", "vintage", "y2k"] },
] as const satisfies readonly { slug: string; label: string; hint: string; styles: readonly StyleSlug[] }[];

export const stylesByGroup = () =>
  STYLE_GROUPS.map((group) => ({ ...group, styles: group.styles.map((slug) => STYLES.find((style) => style.slug === slug)!) }));

/* ------------------------------------------------------------------ */
/* Lookups and helpers — use these instead of searching the arrays.    */
/* ------------------------------------------------------------------ */

const categoryBySlug = new Map<string, Category>(CATEGORIES.map((c) => [c.slug, c]));
const subcategoryBySlug = new Map<string, Subcategory>(SUBCATEGORIES.map((s) => [s.slug, s]));
const colorBySlug = new Map<string, ColorDef>(COLORS.map((c) => [c.slug, c]));

export const isCategorySlug = (v: string): v is CategorySlug => categoryBySlug.has(v);
export const isSubcategorySlug = (v: string): boolean => subcategoryBySlug.has(v);
export const isColorSlug = (v: string): boolean => colorBySlug.has(v);
export const isPatternSlug = (v: string): v is PatternSlug => PATTERNS.some((p) => p.slug === v);
export const isOccasionSlug = (v: string): v is OccasionSlug => OCCASIONS.some((o) => o.slug === v);
export const isSeasonSlug = (v: string): v is SeasonSlug => SEASONS.some((s) => s.slug === v);
export const isStyleSlug = (v: string): v is StyleSlug => STYLES.some((s) => s.slug === v);

export const getCategory = (slug: string): Category | undefined => categoryBySlug.get(slug);
export const getSubcategory = (slug: string | null | undefined): Subcategory | undefined =>
  slug ? subcategoryBySlug.get(slug) : undefined;
export const getColor = (slug: string | null | undefined): ColorDef | undefined => (slug ? colorBySlug.get(slug) : undefined);

export const subcategoriesOf = (categorySlug: string): Subcategory[] =>
  SUBCATEGORIES.filter((s) => s.categorySlug === categorySlug).sort((a, b) => a.sortOrder - b.sortOrder);

export const subcategoryBelongsTo = (subcategorySlug: string, categorySlug: string): boolean =>
  subcategoryBySlug.get(subcategorySlug)?.categorySlug === categorySlug;

/** Minimal shape needed to classify an item — works for full items and draft form values. */
export interface Classifiable {
  categorySlug: string;
  subcategorySlug: string | null;
}

export function slotOf(item: Classifiable): Slot {
  const sub = getSubcategory(item.subcategorySlug);
  if (sub) return sub.slot;
  return getCategory(item.categorySlug)?.defaultSlot ?? "accessory";
}

export function formalityOf(item: Classifiable): Formality | null {
  return getSubcategory(item.subcategorySlug)?.formality ?? null;
}

export function traditionOf(item: Classifiable): Tradition {
  return getSubcategory(item.subcategorySlug)?.tradition ?? "western";
}

export const isIndianWear = (item: Classifiable): boolean => traditionOf(item) === "indian";

export function canBeWornAlone(item: Classifiable): boolean {
  return getSubcategory(item.subcategorySlug)?.canBeWornAlone ?? false;
}

/** Human label: subcategory if known, otherwise category. */
export function itemTypeLabel(item: Classifiable): string {
  return getSubcategory(item.subcategorySlug)?.label ?? getCategory(item.categorySlug)?.label ?? "Item";
}

export const labelOf = {
  category: (slug: string) => getCategory(slug)?.label ?? slug,
  subcategory: (slug: string | null) => getSubcategory(slug)?.label ?? null,
  color: (slug: string | null) => getColor(slug)?.label ?? null,
  pattern: (slug: string | null) => PATTERNS.find((p) => p.slug === slug)?.label ?? null,
  occasion: (slug: string) => OCCASIONS.find((o) => o.slug === slug)?.label ?? slug,
  season: (slug: string) => SEASONS.find((s) => s.slug === slug)?.label ?? slug,
  style: (slug: string) => STYLES.find((s) => s.slug === slug)?.label ?? slug,
  slot: (slot: Slot) => SLOT_LABELS[slot],
};
