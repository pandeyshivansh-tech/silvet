/** Transient extraction result, not a new persisted wardrobe model. */
export interface ImportedProduct {
  title: string | null;
  brand: string | null;
  description: string | null;
  productUrl: string;
  imageUrl: string | null;
  categorySlug: string | null;
  subcategorySlug: string | null;
  price: string | null;
}
