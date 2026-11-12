import { useNavigate } from "react-router";
import { useCreateItem, useBasePath } from "@/data";
import { paths } from "@/app/paths";
import { ButtonLink, Page, PageHeader, useToast } from "@/ui";
import { WardrobeItemForm } from "./WardrobeItemForm";

export default function AddItemsPage() {
  const base = useBasePath();
  const navigate = useNavigate();
  const toast = useToast();
  const createItem = useCreateItem();

  return (
    <Page>
      <PageHeader
        eyebrow="Your wardrobe"
        title="Add a piece"
        lede="Start with the details you know. You can always refine them later."
        actions={<ButtonLink to={paths.wardrobe(base)} variant="secondary">Back to wardrobe</ButtonLink>}
      />
      <WardrobeItemForm
        submitLabel="Save piece"
        loading={createItem.isPending}
        onSave={async (input) => {
          const item = await createItem.mutateAsync({ input });
          toast.success("Piece added to your wardrobe.");
          navigate(paths.item(base, item.id));
        }}
      />
    </Page>
  );
}
