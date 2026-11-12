import { parse, type DefaultTreeAdapterMap } from "parse5";
import { CATEGORIES, SUBCATEGORIES } from "../src/domain/taxonomy.js";
import type { ImportedProduct } from "../src/domain/productImport.js";
import { ImportError } from "./errors.js";
import { productUrl } from "./safeFetch.js";
type Node = DefaultTreeAdapterMap["node"];
type ObjectData = Record<string, unknown>;
const object = (value: unknown): value is ObjectData => Boolean(value && typeof value === "object" && !Array.isArray(value));
function clean(value: unknown, max = 500): string | null {
  // eslint-disable-next-line no-control-regex -- Explicitly remove untrusted metadata control characters.
  return typeof value === "string" && value.trim() ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) : null;
}
function image(value: unknown, base: string): string | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  const raw = object(candidate) ? candidate.url ?? candidate.contentUrl : candidate;
  if (typeof raw !== "string") return null;
  try { return productUrl(new URL(raw, base).href).href; } catch { return null; }
}
function findProduct(value: unknown, depth = 0): ObjectData | null {
  if (depth > 12) return null;
  if (Array.isArray(value)) {
    for (const entry of value) { const found = findProduct(entry, depth + 1); if (found) return found; }
  } else if (object(value)) {
    const types = Array.isArray(value["@type"]) ? value["@type"] : [value["@type"]];
    if (types.some((type) => typeof type === "string" && /(^|[/#])Product$/i.test(type))) return value;
    for (const key of ["@graph", "mainEntity", "itemListElement", "item"]) {
      const found = findProduct(value[key], depth + 1); if (found) return found;
    }
  }
  return null;
}
/** Only explicit category metadata matching the existing taxonomy is inferred. */
export function categorySuggestion(value: unknown) {
  const text = clean(value)?.toLowerCase().replace(/[-_]/g, " ");
  if (!text) return { categorySlug: null, subcategorySlug: null };
  const segments = text.split(/[>/|]/).map((part) => part.trim());
  for (const sub of SUBCATEGORIES) {
    if (segments.some((part) => [sub.slug.replace(/-/g, " "), sub.label.toLowerCase()].includes(part)))
      return { categorySlug: sub.categorySlug, subcategorySlug: sub.slug };
  }
  const category = CATEGORIES.find((entry) => segments.includes(entry.slug.replace(/-/g, " ")) || segments.includes(entry.label.toLowerCase()));
  return { categorySlug: category?.slug ?? null, subcategorySlug: null };
}
export function extractMetadata(html: string, finalUrl: string): ImportedProduct {
  const meta = new Map<string, string>();
  let product: ObjectData | null = null;
  function inspect(node: Node) {
    if ("tagName" in node) {
      const attrs = new Map(node.attrs.map((attr) => [attr.name.toLowerCase(), attr.value]));
      if (node.tagName === "meta") {
        const key = attrs.get("property") ?? attrs.get("name");
        if (key && attrs.get("content") && !meta.has(key.toLowerCase())) meta.set(key.toLowerCase(), attrs.get("content")!);
      }
      if (node.tagName === "script" && attrs.get("type")?.split(";")[0]?.trim().toLowerCase() === "application/ld+json" && !product) {
        const source = node.childNodes.map((child) => "value" in child ? child.value : "").join("");
        try { product = findProduct(JSON.parse(source)); } catch { /* Malformed retailer metadata is optional, not executable code. */ }
      }
    }
  }
  const stack: Node[] = [parse(html)];
  let count = 0;
  while (stack.length) {
    const node = stack.pop()!;
    if (++count > 30000) throw new ImportError("unsupported_retailer", "This page is too complex to import. Please enter details manually.");
    inspect(node);
    if ("childNodes" in node) {
      for (let i = node.childNodes.length - 1; i >= 0; i--) stack.push(node.childNodes[i]!);
    }
  }
  // Assignment occurs during traversal; keep the metadata object typed as untrusted.
  const data: ObjectData = product ?? {};
  const title = clean(data.name, 80) ?? clean(meta.get("og:title"), 80) ?? clean(meta.get("twitter:title"), 80);
  if (!title) throw new ImportError("metadata_unavailable", "No usable product metadata was found. Please enter your clothing details manually.");
  const brandValue = data.brand;
  const offers = Array.isArray(data.offers) ? data.offers[0] : data.offers;
  const price = object(offers) ? clean(typeof offers.price === "number" ? String(offers.price) : offers.price, 40) : clean(meta.get("product:price:amount"), 40);
  return {
    title, brand: clean(object(brandValue) ? brandValue.name : brandValue, 120) ?? clean(meta.get("product:brand"), 120),
    description: clean(data.description, 1500) ?? clean(meta.get("og:description"), 1500) ?? clean(meta.get("twitter:description"), 1500) ?? clean(meta.get("description"), 1500),
    productUrl: finalUrl,
    imageUrl: image(data.image, finalUrl) ?? image(meta.get("og:image"), finalUrl) ?? image(meta.get("twitter:image"), finalUrl),
    ...categorySuggestion(data.category ?? meta.get("product:category")), price,
  };
}
