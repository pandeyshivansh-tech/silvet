import { useNavigate } from "react-router";
import { useState } from "react";
import { useCreateItem, useBasePath, useIsDemo } from "@/data";
import { paths } from "@/app/paths";
import { Link2 } from "lucide-react";
import type { ReactNode } from "react";
import { BackLink, Button, Page, PageHeader, useToast } from "@/ui";
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
      <BackLink to={paths.wardrobe(base)}>Back to wardrobe</BackLink>
      <PageHeader
        title="Add a piece"
        lede="Start with the details you know. You can always refine them later."
      />
      {!isDemo && !importing && !draft && (
        <div className="mb-10 flex flex-col gap-3 border-y border-line py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-body text-graphite-deep">Found it online? Bring in its photo and name from the product page.</p>
          <Button variant="secondary" className="shrink-0" leadingIcon={<Link2 aria-hidden="true" className="size-4" strokeWidth={1.5} />} onClick={() => setImporting(true)}>Import from URL</Button>
        </div>
      )}
      {importing ? <ProductUrlImport
        onCancel={() => setImporting(false)}
        onReady={(product, image, warning) => { setDraft({ product, image, warning }); setImporting(false); }}
      /> : <>
      {draft && <section className="mb-10 border-y border-line py-6" aria-label="Imported product preview">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-display text-look text-midnight">Review imported product</h2>
            <p className="mt-1 text-caption text-graphite-deep">Nothing has been saved. Check the photo and details below, then choose Save piece.</p>
          </div>
          <Button variant="quiet" size="sm" disabled={createItem.isPending} onClick={() => setDraft(null)}>Cancel import</Button>
        </div>
        <dl className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
          <ImportRow label="Product">{draft.product.title}</ImportRow>
          {draft.product.brand && <ImportRow label="Brand">{draft.product.brand}</ImportRow>}
          {draft.product.categorySlug && <ImportRow label="Suggested category">{getCategory(draft.product.categorySlug)?.label}
            {draft.product.subcategorySlug ? ` · ${getSubcategory(draft.product.subcategorySlug)?.label ?? ""}` : ""}</ImportRow>}
          {draft.product.price && <ImportRow label="Listed price">{draft.product.price} <span className="text-graphite-deep">(reference only)</span></ImportRow>}
          {draft.product.description && <ImportRow label="Description"><span className="text-graphite-deep">{draft.product.description}</span></ImportRow>}
          <ImportRow label="Source"><span className="break-all">{draft.product.productUrl}</span></ImportRow>
        </dl>
        {draft.warning && <p role="status" className="mt-4 border-l-2 border-line-strong pl-3 text-caption text-graphite-deep">{draft.warning}</p>}
      </section>}
      <WardrobeItemForm
        key={draft ? "imported" : "manual"}
        initialInput={draft ? { name: draft.product.title ?? "", categorySlug: draft.product.categorySlug ?? "",
          subcategorySlug: draft.product.subcategorySlug } : undefined}
        initialPhoto={draft?.image}
        submitLabel="Save piece"
        loading={createItem.isPending}
        onSave={async (input, image, allowNavigation) => {
          const item = await createItem.mutateAsync({ input, image });
          toast.success("Piece added to your wardrobe.");
          allowNavigation();
          navigate(paths.item(base, item.id));
        }}
      />
      </>}
    </Page>
  );
}

function ImportRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-caption text-graphite-deep sm:pt-0.5">{label}</dt>
      <dd className="-mt-2 text-ui text-midnight sm:mt-0">{children}</dd>
    </>
  );
}
