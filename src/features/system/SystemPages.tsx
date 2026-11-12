import { isRouteErrorResponse, useRouteError } from "react-router";
import { paths } from "@/app/paths";
import { ButtonLink, EmptyState, GarmentGlyph } from "@/ui";

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <EmptyState
        art={<GarmentGlyph slot="accessory" className="h-full w-auto" />}
        eyebrow="404"
        title="This page isn't in the wardrobe"
        body="The link may be old, or the page may have moved."
        action={<ButtonLink to={paths.landing()}>Back to SILVET</ButtonLink>}
      />
    </div>
  );
}

/** Router-level error boundary: never a white screen. */
export function RouteErrorPage() {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  if (notFound) return <NotFoundPage />;
  if (import.meta.env.DEV) console.error(error);
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <EmptyState
        eyebrow="Error"
        title="Something went wrong"
        body="Reload the page to try again. If it keeps happening, tell us what you were doing."
        action={
          <ButtonLink to={paths.landing()} reloadDocument>
            Reload SILVET
          </ButtonLink>
        }
      />
    </div>
  );
}
