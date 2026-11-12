import { isIndianWear } from "@/domain/taxonomy";
import type { ClothingItem } from "@/domain/types";

export interface WardrobeFilters {
  query: string;
  category: string;
  subcategory: string;
  color: string;
  indianWear: boolean;
}

export function filterWardrobeItems<T extends Pick<ClothingItem, "name" | "categorySlug" | "subcategorySlug" | "primaryColor" | "secondaryColor">>(
  items: readonly T[],
  filters: WardrobeFilters,
): T[] {
  const query = filters.query.trim().toLocaleLowerCase();
  return items.filter((item) => {
    if (query && !item.name.toLocaleLowerCase().includes(query)) return false;
    if (filters.category && item.categorySlug !== filters.category) return false;
    if (filters.subcategory && item.subcategorySlug !== filters.subcategory) return false;
    if (filters.color && item.primaryColor !== filters.color && item.secondaryColor !== filters.color) return false;
    if (filters.indianWear && !isIndianWear(item)) return false;
    return true;
  });
}

export function countActiveWardrobeFilters(filters: WardrobeFilters): number {
  return Number(Boolean(filters.query.trim())) +
    Number(Boolean(filters.category)) +
    Number(Boolean(filters.subcategory)) +
    Number(Boolean(filters.color)) +
    Number(filters.indianWear);
}
