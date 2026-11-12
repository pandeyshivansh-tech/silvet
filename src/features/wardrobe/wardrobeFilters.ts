import { CATEGORIES, COLORS, OCCASIONS, SEASONS, STYLES, getCategory, isIndianWear, labelOf, subcategoriesOf } from "@/domain/taxonomy";
import type { ClothingItem } from "@/domain/types";

export interface WardrobeFilters {
  query: string;
  category: string;
  subcategory: string;
  color: string;
  indianWear: boolean;
  occasion?: string;
  season?: string;
  style?: string;
}

export const emptyWardrobeFilters: WardrobeFilters = {
  query: "", category: "", subcategory: "", color: "", indianWear: false, occasion: "", season: "", style: "",
};
const filterKeys = ["query", "category", "subcategory", "color", "occasion", "season", "style"] as const;
export function readWardrobeFilters(params: URLSearchParams): WardrobeFilters {
  const valid = (key: string, options: readonly { slug: string }[]) =>
    options.some((entry) => entry.slug === params.get(key)) ? params.get(key)! : "";
  const category = valid("category", CATEGORIES);
  return {
    query: params.get("query") ?? "", category,
    subcategory: valid("subcategory", category ? subcategoriesOf(category) : []),
    color: valid("color", COLORS), occasion: valid("occasion", OCCASIONS),
    season: valid("season", SEASONS), style: valid("style", STYLES),
    indianWear: params.get("indianWear") === "true",
  };
}
export function writeWardrobeFilters(filters: WardrobeFilters, existing = new URLSearchParams()): URLSearchParams {
  const params = new URLSearchParams(existing);
  for (const key of filterKeys) {
    if (filters[key]) params.set(key, filters[key]!);
    else params.delete(key);
  }
  if (filters.indianWear) params.set("indianWear", "true"); else params.delete("indianWear");
  return params;
}

type SearchItem = Pick<ClothingItem, "name" | "categorySlug" | "subcategorySlug" | "primaryColor" | "secondaryColor"> &
  Partial<Pick<ClothingItem, "styleTags" | "occasionTags" | "seasonTags" | "pattern">>;

export function filterWardrobeItems<T extends SearchItem>(
  items: readonly T[],
  filters: WardrobeFilters,
): T[] {
  const query = filters.query.trim().toLocaleLowerCase();
  return items.filter((item) => {
    const searchable = [item.name, getCategory(item.categorySlug)?.label, labelOf.subcategory(item.subcategorySlug),
      ...[item.primaryColor, item.secondaryColor].map((slug) => COLORS.find((color) => color.slug === slug)?.label),
      ...(item.occasionTags ?? []).map(labelOf.occasion), ...(item.styleTags ?? []).map(labelOf.style),
      ...(item.seasonTags ?? []).map(labelOf.season), item.pattern].filter(Boolean).join(" ").toLocaleLowerCase();
    if (query && !query.split(/\s+/).every((term) => searchable.includes(term))) return false;
    if (filters.category && item.categorySlug !== filters.category) return false;
    if (filters.subcategory && item.subcategorySlug !== filters.subcategory) return false;
    if (filters.color && item.primaryColor !== filters.color && item.secondaryColor !== filters.color) return false;
    if (filters.indianWear && !isIndianWear(item)) return false;
    if (filters.occasion && !item.occasionTags?.includes(filters.occasion as ClothingItem["occasionTags"][number])) return false;
    if (filters.season && !item.seasonTags?.includes(filters.season as ClothingItem["seasonTags"][number])) return false;
    if (filters.style && !item.styleTags?.includes(filters.style as ClothingItem["styleTags"][number])) return false;
    return true;
  });
}

export function countActiveWardrobeFilters(filters: WardrobeFilters): number {
  return Number(Boolean(filters.query.trim())) +
    Number(Boolean(filters.category)) +
    Number(Boolean(filters.subcategory)) +
    Number(Boolean(filters.color)) +
    Number(filters.indianWear) + Number(Boolean(filters.occasion)) + Number(Boolean(filters.season)) + Number(Boolean(filters.style));
}
