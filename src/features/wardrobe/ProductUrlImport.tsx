import { useEffect, useRef, useState, type FormEvent } from "react";
import { importProduct, importProductImage } from "@/lib/productImport";
import type { ImportedProduct } from "@/domain/productImport";
import { Button, TextField } from "@/ui";

export function ProductUrlImport({ onReady, onCancel }: {
  onReady: (product: ImportedProduct, image: File | undefined, warning: string) => void;
  onCancel: () => void;
}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const active = useRef<AbortController | null>(null);
  const lock = useRef(false);
  useEffect(() => () => active.current?.abort(), []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    let input: URL;
    try {
      input = new URL(url);
      if (!["http:", "https:"].includes(input.protocol)) throw new Error();
    } catch { setError("Enter a valid HTTP or HTTPS product URL."); return; }
    lock.current = true; setLoading(true); setError("");
    const controller = new AbortController();
    active.current = controller;
    try {
      const product = await importProduct(input.href, controller.signal);
      let image: File | undefined;
      let warning = "";
      if (product.imageUrl) {
        try { image = await importProductImage(product.imageUrl, controller.signal); }
        catch {
          if (controller.signal.aborted) return;
          warning = "The product image could not be imported. Choose a photo manually or save without one.";
        }
      } else warning = "No supported product image was found. Choose a photo manually or save without one.";
      if (!controller.signal.aborted) onReady(product, image, warning);
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Product import failed. Try manual entry.");
    } finally {
      lock.current = false;
      if (!controller.signal.aborted) setLoading(false);
    }
  }
  return (
    <form onSubmit={submit} noValidate className="max-w-xl space-y-5">
      <TextField label="Product URL" type="url" name="productUrl" value={url} maxLength={4096}
        onChange={(event) => setUrl(event.target.value)} error={error} placeholder="https://retailer.com/product" />
      <p className="text-caption text-graphite-deep">Public product pages only. You can review and edit every detail before saving. Some retailers restrict automated access.</p>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={loading} loadingLabel="Importing product…">Preview product</Button>
        <Button type="button" variant="secondary" onClick={() => { active.current?.abort(); onCancel(); }}>
          {loading ? "Cancel import" : "Enter details manually"}
        </Button>
      </div>
    </form>
  );
}
