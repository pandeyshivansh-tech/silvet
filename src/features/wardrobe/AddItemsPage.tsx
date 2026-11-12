import { useNavigate } from "react-router";
import { useState } from "react";
import { useCreateItem, useBasePath, useIsDemo } from "@/data";
import { paths } from "@/app/paths";
import { Button, ButtonLink, Page, PageHeader, useToast } from "@/ui";
import { WardrobeItemForm } from "./WardrobeItemForm";
import { ProductUrlImport } from "./ProductUrlImport";
import type { ImportedProduct } from "@/domain/productImport";
import { getCategory, getSubcategory } from "@/domain/taxonomy";

export default function AddItemsPage() {
  const base = useBasePath();
  const navigate = useNavigate();
  const toast = useToast();
  const createItem = useCreateItem();
  const isDemo = useIsDemo();
  const [importing, setImporting] = useState(false);
  const [draft, setDraft] = useState<{ product: ImportedProduct; image?: File; warning: string } | null>(null);

  return (
    <Page>
      <PageHeader
        eyebrow="Your wardrobe"
        title="Add a piece"
        lede="Start with the details you know. You can always refine them later."
        actions={<ButtonLink to={paths.wardrobe(base)} variant="secondary">Back to wardrobe</ButtonLink>}
      />
      {!isDemo && !importing && !draft && <div className="mb-8"><Button variant="secondary" onClick={() => setImporting(true)}>Import from URL</Button></div>}
      {importing ? <ProductUrlImport
        onCancel={() => setImporting(false)}
        onReady={(product, image, warning) => { setDraft({ product, image, warning }); setImporting(false); }}
      /> : <>
      {draft && <section className="mb-8 space-y-3 border-b border-line pb-6" aria-label="Imported product preview">
        <h2 className="font-display text-look text-midnight">Review imported product</h2>
        <p className="text-body text-midnight">{draft.product.title}</p>
        {draft.product.brand && <p className="text-caption text-graphite-deep">Brand: {draft.product.brand}</p>}
        {draft.product.description && <p className="text-caption text-graphite-deep">{draft.product.description}</p>}
        {draft.product.categorySlug && <p className="text-caption text-graphite-deep">Suggested category: {getCategory(draft.product.categorySlug)?.label}
          {draft.product.subcategorySlug ? ` · ${getSubcategory(draft.product.subcategorySlug)?.label ?? ""}` : ""}</p>}
        {draft.product.price && <p className="text-caption text-graphite-deep">Listed price: {draft.product.price} (reference only)</p>}
        <p className="break-all text-caption text-graphite-deep">Source: {draft.product.productUrl}</p>
        <p className="text-caption text-graphite-deep">Nothing has been saved. Review the photo and garment details below, then choose Save piece.</p>
        {draft.warning && <p role="status" className="text-caption text-graphite-deep">{draft.warning}</p>}
        <Button variant="secondary" disabled={createItem.isPending} onClick={() => setDraft(null)}>Cancel import</Button>
      </section>}
      <WardrobeItemForm
        key={draft ? "imported" : "manual"}
        initialInput={draft ? { name: draft.product.title ?? "", categorySlug: draft.product.categorySlug ?? "",
          subcategorySlug: draft.product.subcategorySlug } : undefined}
        initialPhoto={draft?.image}
        submitLabel="Save piece"
        loading={createItem.isPending}
        onSave={async (input, image) => {
          const item = await createItem.mutateAsync({ input, image });
          toast.success("Piece added to your wardrobe.");
          navigate(paths.item(base, item.id));
        }}
      />
      </>}
    </Page>
  );
}
