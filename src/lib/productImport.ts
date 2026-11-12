import { z } from "zod";
import { getSupabaseClient } from "./supabase/client";
import { validateImage } from "./images";
import type { ImportedProduct } from "@/domain/productImport";
import { CATEGORIES, SUBCATEGORIES } from "@/domain/taxonomy";

const productSchema = z.object({
  title: z.string().max(80).nullable(), brand: z.string().max(120).nullable(),
  description: z.string().max(1500).nullable(), productUrl: z.url().max(4096),
  imageUrl: z.url().max(4096).nullable(), categorySlug: z.string().nullable(),
  subcategorySlug: z.string().nullable(), price: z.string().max(40).nullable(),
});

async function api(path: "extract" | "image", url: string, signal: AbortSignal) {
  const client = getSupabaseClient();
  const initial = await client.auth.getSession();
  const session = initial.data.session;
  if (initial.error || !session) throw new Error("Sign in again before importing.");
  const response = await fetch(`/api/product-import/${path}`, {
    method: "POST", signal, headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ url }), cache: "no-store",
  });
  const current = await client.auth.getSession();
  if (current.data.session?.user.id !== session.user.id) throw new Error("The signed-in account changed. Please try again.");
  if (!response.ok) {
    const error = await response.json().catch(() => null) as { message?: unknown } | null;
    throw new Error(typeof error?.message === "string" ? error.message : "Product import failed. Try manual entry.");
  }
  return response;
}
export async function importProduct(url: string, signal: AbortSignal): Promise<ImportedProduct> {
  const product = productSchema.parse(await (await api("extract", url, signal)).json());
  // Keep the domain taxonomy authoritative even if an API response is malformed.
  if (!CATEGORIES.some((entry) => entry.slug === product.categorySlug)) product.categorySlug = null;
  if (!SUBCATEGORIES.some((entry) => entry.slug === product.subcategorySlug && entry.categorySlug === product.categorySlug)) product.subcategorySlug = null;
  return product;
}
export async function importProductImage(url: string, signal: AbortSignal): Promise<File> {
  const response = await api("image", url, signal);
  const blob = await response.blob();
  validateImage(blob);
  // Ensure the browser can decode it before making it the selected local photo.
  const bitmap = await createImageBitmap(blob).catch(() => { throw new Error("The product image could not be decoded. Choose a photo manually."); });
  bitmap.close();
  return new File([blob], "product-image", { type: blob.type });
}
