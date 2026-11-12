/**
 * SILVET sample wardrobe (Tier A demo).
 *
 * A balanced, gender-neutral mix of Western and Indian pieces so visitors can browse, filter,
 * build outfits and get ideas without an account. Photos are added by the imagery collaborators:
 * drop `<id>.webp` + `<id>-thumb.webp` into /public/demo/ and set `photo: true` below.
 * Until then each item renders the designed no-photo placeholder — never stock imagery.
 */
import type { ClothingItem, Outfit } from "@/domain/types";
import type { OccasionSlug, PatternSlug, SeasonSlug, StyleSlug } from "@/domain/taxonomy";

interface DemoSeed {
  id: string;
  name: string;
  cat: string;
  sub: string;
  color: string;
  color2?: string;
  pattern?: PatternSlug;
  styles?: StyleSlug[];
  occasions?: OccasionSlug[];
  seasons?: SeasonSlug[];
  photo?: boolean;
}

const SEEDS: DemoSeed[] = [
  // Tops
  { id: "white-oversized-tee", name: "Oversized white tee", cat: "tops", sub: "t-shirts", color: "white", styles: ["minimal", "casual"], occasions: ["everyday", "college"], seasons: ["all-season"] },
  { id: "black-boxy-tee", name: "Boxy black tee", cat: "tops", sub: "t-shirts", color: "black", styles: ["minimal", "streetwear"], occasions: ["everyday", "college", "party"] },
  { id: "graphic-tee", name: "Washed graphic tee", cat: "tops", sub: "t-shirts", color: "charcoal", pattern: "graphic", styles: ["streetwear", "vintage"], occasions: ["everyday", "college"] },
  { id: "blue-oxford-shirt", name: "Blue oxford shirt", cat: "tops", sub: "shirts", color: "blue", styles: ["classic"], occasions: ["work", "college", "date"] },
  { id: "linen-shirt-cream", name: "Cream linen shirt", cat: "tops", sub: "shirts", color: "cream", styles: ["minimal", "classic"], occasions: ["everyday", "date", "travel"], seasons: ["summer"] },
  { id: "striped-polo", name: "Navy striped polo", cat: "tops", sub: "polos", color: "navy", color2: "white", pattern: "striped", styles: ["classic", "casual"], occasions: ["everyday", "travel"] },
  { id: "ribbed-tank", name: "Ribbed tank", cat: "tops", sub: "tank-tops", color: "black", styles: ["minimal", "y2k"], occasions: ["everyday", "party"], seasons: ["summer"] },
  { id: "satin-blouse", name: "Satin blouse", cat: "tops", sub: "blouses", color: "maroon", styles: ["classic"], occasions: ["work", "date", "party"] },
  { id: "white-chikankari-kurta", name: "White chikankari kurta", cat: "tops", sub: "kurtas", color: "white", pattern: "embroidered", styles: ["traditional", "fusion"], occasions: ["festive", "college", "everyday"], seasons: ["summer"] },
  { id: "indigo-short-kurti", name: "Indigo block-print kurti", cat: "tops", sub: "short-kurtis", color: "navy", pattern: "printed", styles: ["fusion", "casual"], occasions: ["college", "everyday"] },
  { id: "mustard-kurta", name: "Mustard cotton kurta", cat: "tops", sub: "kurtas", color: "mustard", styles: ["traditional", "fusion"], occasions: ["festive", "everyday"] },

  // Bottoms
  { id: "straight-blue-jeans", name: "Straight blue jeans", cat: "bottoms", sub: "jeans", color: "denim", styles: ["casual", "classic"], occasions: ["everyday", "college", "date", "travel"], seasons: ["all-season"] },
  { id: "black-baggy-jeans", name: "Black baggy jeans", cat: "bottoms", sub: "jeans", color: "black", styles: ["streetwear", "y2k"], occasions: ["everyday", "college", "party"] },
  { id: "pleated-trousers", name: "Pleated wool trousers", cat: "bottoms", sub: "trousers", color: "charcoal", styles: ["classic", "minimal"], occasions: ["work", "date"] },
  { id: "beige-chinos", name: "Beige tailored trousers", cat: "bottoms", sub: "trousers", color: "beige", styles: ["classic", "minimal"], occasions: ["work", "everyday", "travel"] },
  { id: "olive-cargos", name: "Olive cargos", cat: "bottoms", sub: "cargos", color: "olive", styles: ["streetwear"], occasions: ["everyday", "college", "travel"] },
  { id: "grey-joggers", name: "Grey joggers", cat: "bottoms", sub: "joggers", color: "grey", styles: ["sporty", "casual"], occasions: ["active", "lounge", "travel"] },
  { id: "black-midi-skirt", name: "Black satin midi skirt", cat: "bottoms", sub: "skirts", color: "black", styles: ["minimal", "classic"], occasions: ["date", "party", "work"] },
  { id: "white-churidar", name: "White churidar", cat: "bottoms", sub: "churidars-salwars", color: "white", styles: ["traditional"], occasions: ["festive", "wedding"] },
  { id: "cream-palazzo", name: "Cream palazzos", cat: "bottoms", sub: "palazzos", color: "cream", styles: ["traditional", "fusion"], occasions: ["festive", "everyday"], seasons: ["summer"] },

  // Outerwear & layers
  { id: "grey-hoodie", name: "Heather grey hoodie", cat: "outerwear", sub: "hoodies", color: "grey", styles: ["casual", "sporty", "streetwear"], occasions: ["everyday", "college", "travel", "lounge"], seasons: ["winter", "monsoon"] },
  { id: "cream-knit-cardigan", name: "Cream knit cardigan", cat: "outerwear", sub: "sweaters", color: "cream", styles: ["minimal", "vintage"], occasions: ["everyday", "date", "work"], seasons: ["winter"] },
  { id: "denim-jacket", name: "Washed denim jacket", cat: "outerwear", sub: "jackets", color: "denim", styles: ["casual", "vintage"], occasions: ["everyday", "college", "travel"] },
  { id: "black-blazer", name: "Black single-breasted blazer", cat: "outerwear", sub: "blazers", color: "black", styles: ["classic", "minimal"], occasions: ["work", "party", "wedding"] },
  { id: "brown-check-shacket", name: "Brown check shacket", cat: "outerwear", sub: "shackets", color: "brown", pattern: "checked", styles: ["casual", "vintage"], occasions: ["everyday", "college"], seasons: ["winter"] },
  { id: "maroon-nehru-jacket", name: "Maroon Nehru jacket", cat: "outerwear", sub: "nehru-jackets", color: "maroon", styles: ["traditional", "fusion"], occasions: ["festive", "wedding"] },

  // One-piece & sets
  { id: "black-slip-dress", name: "Black slip dress", cat: "one-piece", sub: "dresses", color: "black", styles: ["minimal", "y2k"], occasions: ["party", "date"] },
  { id: "linen-co-ord", name: "Sage linen co-ord", cat: "one-piece", sub: "co-ord-sets", color: "green", styles: ["minimal", "casual"], occasions: ["everyday", "travel", "date"], seasons: ["summer"] },
  { id: "rose-kurta-set", name: "Rose cotton kurta set", cat: "one-piece", sub: "kurta-sets", color: "pink", styles: ["traditional"], occasions: ["festive", "everyday"] },
  { id: "teal-silk-saree", name: "Teal silk saree", cat: "one-piece", sub: "sarees", color: "teal", color2: "gold", styles: ["traditional"], occasions: ["festive", "wedding"] },
  { id: "ivory-sherwani-set", name: "Ivory sherwani set", cat: "one-piece", sub: "sherwani-sets", color: "cream", color2: "gold", pattern: "embroidered", styles: ["traditional"], occasions: ["wedding"] },
  { id: "maroon-lehenga-set", name: "Maroon lehenga set", cat: "one-piece", sub: "lehenga-sets", color: "maroon", color2: "gold", pattern: "embroidered", styles: ["traditional"], occasions: ["wedding", "festive"] },

  // Footwear
  { id: "white-sneakers", name: "White leather sneakers", cat: "footwear", sub: "sneakers", color: "white", styles: ["minimal", "casual", "streetwear"], occasions: ["everyday", "college", "travel", "date"], seasons: ["all-season"] },
  { id: "retro-runners", name: "Retro runners", cat: "footwear", sub: "sneakers", color: "multicolour", styles: ["sporty", "streetwear", "y2k"], occasions: ["everyday", "active", "college"] },
  { id: "black-loafers", name: "Black penny loafers", cat: "footwear", sub: "loafers", color: "black", styles: ["classic"], occasions: ["work", "date", "festive"] },
  { id: "brown-chelsea-boots", name: "Brown Chelsea boots", cat: "footwear", sub: "boots", color: "brown", styles: ["classic", "vintage"], occasions: ["date", "work", "everyday"], seasons: ["winter"] },
  { id: "tan-kolhapuris", name: "Tan Kolhapuris", cat: "footwear", sub: "kolhapuris", color: "brown", styles: ["traditional", "fusion"], occasions: ["everyday", "festive", "college"], seasons: ["summer"] },
  { id: "gold-juttis", name: "Gold embroidered juttis", cat: "footwear", sub: "juttis", color: "gold", pattern: "embroidered", styles: ["traditional"], occasions: ["festive", "wedding"] },

  // Accessories
  { id: "steel-watch", name: "Steel field watch", cat: "accessories", sub: "watches", color: "silver", styles: ["classic", "minimal"], occasions: ["everyday", "work", "date"] },
  { id: "black-tote", name: "Black canvas tote", cat: "accessories", sub: "bags", color: "black", styles: ["minimal", "casual"], occasions: ["everyday", "college", "travel"] },
  { id: "silver-hoops", name: "Silver hoops", cat: "accessories", sub: "jewellery", color: "silver", styles: ["minimal", "y2k"], occasions: ["everyday", "party", "date"] },
  { id: "oxidised-jhumkas", name: "Oxidised jhumkas", cat: "accessories", sub: "jewellery", color: "silver", styles: ["traditional", "fusion"], occasions: ["festive", "college", "wedding"] },
  { id: "gold-dupatta", name: "Gold-border dupatta", cat: "accessories", sub: "dupattas", color: "cream", color2: "gold", styles: ["traditional"], occasions: ["festive", "wedding"] },
  { id: "black-cap", name: "Black six-panel cap", cat: "accessories", sub: "caps-hats", color: "black", styles: ["streetwear", "sporty"], occasions: ["everyday", "travel", "active"] },
];

const CREATED = "2026-11-01T09:00:00.000Z";

export const DEMO_ITEMS: readonly ClothingItem[] = SEEDS.map((s, i) => ({
  id: `demo-${s.id}`,
  name: s.name,
  categorySlug: s.cat,
  subcategorySlug: s.sub,
  primaryColor: s.color,
  secondaryColor: s.color2 ?? null,
  pattern: s.pattern ?? "solid",
  styleTags: s.styles ?? [],
  occasionTags: s.occasions ?? [],
  seasonTags: s.seasons ?? [],
  image: s.photo ? { path: `demo/${s.id}.webp`, thumbPath: `demo/${s.id}-thumb.webp` } : null,
  createdAt: new Date(Date.parse(CREATED) + i * 60_000).toISOString(),
  updatedAt: CREATED,
}));

const piece = (slot: Outfit["pieces"][number]["slot"], id: string, position: number) => ({
  slot,
  itemId: `demo-${id}`,
  position,
});

/** Styled starter looks for the demo Lookbook. Every one passes checkOutfit (see demoWardrobe.test.ts). */
export const DEMO_OUTFITS: readonly Outfit[] = [
  {
    id: "demo-look-monochrome",
    name: "Monochrome Monday",
    notes: "Clean lines, one texture shift.",
    source: "manual",
    pieces: [piece("top", "black-boxy-tee", 0), piece("bottom", "pleated-trousers", 1), piece("footwear", "black-loafers", 2), piece("accessory", "steel-watch", 3)],
    createdAt: CREATED,
    updatedAt: CREATED,
  },
  {
    id: "demo-look-fusion-college",
    name: "Fusion for campus",
    notes: "Chikankari kurta over denim — the easiest Indo-western look.",
    source: "manual",
    pieces: [piece("top", "white-chikankari-kurta", 0), piece("bottom", "straight-blue-jeans", 1), piece("footwear", "tan-kolhapuris", 2), piece("accessory", "oxidised-jhumkas", 3)],
    createdAt: CREATED,
    updatedAt: CREATED,
  },
  {
    id: "demo-look-festive",
    name: "Diwali evening",
    notes: null,
    source: "manual",
    pieces: [piece("one_piece", "teal-silk-saree", 0), piece("footwear", "gold-juttis", 1), piece("accessory", "oxidised-jhumkas", 2)],
    createdAt: CREATED,
    updatedAt: CREATED,
  },
  {
    id: "demo-look-weekend",
    name: "Off-duty layers",
    notes: "The hoodie works as the top — no tee needed.",
    source: "manual",
    pieces: [piece("outerwear", "grey-hoodie", 0), piece("bottom", "olive-cargos", 1), piece("footwear", "retro-runners", 2), piece("accessory", "black-cap", 3)],
    createdAt: CREATED,
    updatedAt: CREATED,
  },
];
