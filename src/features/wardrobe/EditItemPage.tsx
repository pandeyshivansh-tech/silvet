import { useNavigate, useParams } from "react-router";
import { useBasePath, useItem, useUpdateItem } from "@/data";
import { paths } from "@/app/paths";
import { ButtonLink, EmptyState, ItemCardSkeleton, Page, PageHeader, StateView, useToast } from "@/ui";
import { WardrobeItemForm } from "./WardrobeItemForm";

export default function EditItemPage() {
  const { itemId } = useParams();
  const base = useBasePath();
  const navigate = useNavigate();
  const toast = useToast();
  const itemQuery = useItem(itemId);
  const updateItem = useUpdateItem();

  return (
    <Page>
      <PageHeader
        eyebrow="Your wardrobe"
        title="Edit piece"
        actions={<ButtonLink to={paths.wardrobe(base)} variant="secondary">Cancel</ButtonLink>}
      />
      <StateView
        query={itemQuery}
        loading={<div className="max-w-sm"><ItemCardSkeleton /></div>}
        empty={<EmptyState title="This piece is no longer here." body="It may have been removed from your wardrobe." action={<ButtonLink to={paths.wardrobe(base)} variant="secondary">Back to wardrobe</ButtonLink>} />}
        isEmpty={(item) => item === null}
      >
        {(item) => item ? (
          <WardrobeItemForm
            key={item.id}
            initialItem={item}
            submitLabel="Save changes"
            loading={updateItem.isPending}
            onSave={async (input) => {
              const saved = await updateItem.mutateAsync({ id: item.id, input });
              toast.success("Your changes have been saved.");
              navigate(paths.item(base, saved.id));
            }}
          />
        ) : null}
      </StateView>
    </Page>
  );
}
