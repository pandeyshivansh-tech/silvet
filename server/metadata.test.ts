import { describe, expect, it } from "vitest";
import { categorySuggestion, extractMetadata } from "./metadata";
const url = "https://store.com/products/1";
const json = (input: unknown) => `<script type="application/ld+json">${JSON.stringify(input)}</script>`;
describe("structured product metadata", () => {
  it("prefers Schema.org Product fields and reuses the Indian clothing taxonomy", () => {
    const result = extractMetadata(`${json({ "@type": "Product", name: "Cotton kurta", brand: { name: "Atelier" }, image: ["/kurta.jpg"], description: "Retailer supplied text", category: "Kurtas", offers: { price: 1200 } })}<meta property="og:title" content="Other title">`, url);
    expect(result).toMatchObject({ title: "Cotton kurta", brand: "Atelier", imageUrl: "https://store.com/kurta.jpg",
      description: "Retailer supplied text", categorySlug: "tops", subcategorySlug: "kurtas", price: "1200", productUrl: url });
  });
  it("finds Product entries inside graphs and arrays", () => {
    expect(extractMetadata(json({ "@graph": [{ "@type": "Organization" }, { "@type": ["Thing", "Product"], name: "Saree", image: { url: "/s.png" } }] }), url).title).toBe("Saree");
    expect(extractMetadata(json([{ "@type": "https://schema.org/Product", name: "Lehenga" }]), url).title).toBe("Lehenga");
  });
  it("extracts OG metadata with mixed attribute ordering, HTML entities and casing", () => {
    expect(extractMetadata(`<META content='Shirt &amp; trousers' PROPERTY='og:title'><meta content="/a.png" property="og:image"><meta name="description" content="Cotton">`, url))
      .toMatchObject({ title: "Shirt & trousers", imageUrl: "https://store.com/a.png", description: "Cotton", brand: null, categorySlug: null });
  });
  it("supports Twitter metadata and ignores malformed JSON-LD", () => {
    expect(extractMetadata(`<script type="application/ld+json">{broken</script><meta name="twitter:title" content="Trousers"><meta name="twitter:image" content="/t.webp">`, url))
      .toMatchObject({ title: "Trousers", imageUrl: "https://store.com/t.webp" });
  });
  it("never invents metadata or infer garment attributes from promotional text", () => {
    const result = extractMetadata(`<meta property="og:title" content="Red cotton festive kurta">`, url);
    expect(result).toEqual({ title: "Red cotton festive kurta", imageUrl: null, brand: null, description: null, categorySlug: null, subcategorySlug: null, price: null, productUrl: url });
  });
  it("does not execute HTML or JSON-LD", () => {
    expect(extractMetadata(`${json({ "@type": "Product", name: "<img onerror=alert(1)>", brand: 45 })}<script>throw Error('never run')</script>`, url))
      .toMatchObject({ title: "<img onerror=alert(1)>", brand: null });
  });
  it.each(["javascript:alert(1)", "data:image/svg+xml,test", "http://127.0.0.1/image", "https://user:pass@store.com/a"])("rejects unsafe extracted image %s", (image) => {
    expect(extractMetadata(json({ "@type": "Product", name: "Item", image }), url).imageUrl).toBeNull();
  });
  it("ignores invalid scalar metadata and truncates long text", () => {
    expect(extractMetadata(json({ "@type": "Product", name: "N".repeat(400), description: {}, image: 9 }), url)).toMatchObject({ title: "N".repeat(80), description: null, imageUrl: null });
  });
  it("reports absent product metadata rather than scraping arbitrary document text", () => {
    expect(() => extractMetadata("<html><title>Homepage</title><h1>Store</h1></html>", url)).toThrow("No usable product metadata");
  });
  it.each(["jeans", "sarees", "lehenga-sets", "co-ord-sets", "hoodies"])("recognizes an explicit existing subcategory %s", (category) => {
    expect(categorySuggestion(category).subcategorySlug).toBe(category);
  });
  it("does not guess ambiguous or unknown categories", () => {
    expect(categorySuggestion("Women's clothing")).toEqual({ categorySlug: null, subcategorySlug: null });
  });
});
