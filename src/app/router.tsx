/** Route inventory is preserved; M7 adds password recovery and defers feature bundles. */
import { Navigate, createBrowserRouter } from "react-router";
import { AppLayout, DemoLayout, RootLayout } from "./layouts";
import { NotFoundPage, RouteErrorPage } from "@/features/system/SystemPages";
import { Spinner } from "@/ui";

/** Screens shared by the demo and the signed-in app. */
const sharedWardrobeRoutes = [
  { index: true, element: <Navigate to="wardrobe" replace /> },
  { path: "wardrobe", lazy: async () => ({ Component: (await import("@/features/wardrobe/WardrobePage")).default }) },
  // Static segments rank above the item identifier route.
  { path: "wardrobe/new", lazy: async () => ({ Component: (await import("@/features/wardrobe/AddItemsPage")).default }) },
  { path: "wardrobe/:itemId/edit", lazy: async () => ({ Component: (await import("@/features/wardrobe/EditItemPage")).default }) },
  { path: "wardrobe/:itemId", lazy: async () => ({ Component: (await import("@/features/wardrobe/ItemDetailPage")).default }) },
  { path: "style", lazy: async () => ({ Component: (await import("@/features/style/StylePage")).default }) },
  { path: "lookbook", lazy: async () => ({ Component: (await import("@/features/lookbook/LookbookPage")).default }) },
  { path: "lookbook/:outfitId", lazy: async () => ({ Component: (await import("@/features/lookbook/OutfitDetailPage")).default }) },
];

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    hydrateFallbackElement: <div className="flex min-h-dvh items-center justify-center"><Spinner label="Loading SILVET" /></div>,
    children: [
      { path: "/", lazy: async () => ({ Component: (await import("@/features/landing/LandingPage")).default }) },
      ...(import.meta.env.DEV ? [{ path: "/styleguide", lazy: async () => ({ Component: (await import("@/features/system/StyleguidePage")).default }) }] : []),
      { path: "/auth/sign-in", lazy: async () => ({ Component: (await import("@/features/auth/SignInPage")).default }) },
      { path: "/auth/sign-up", lazy: async () => ({ Component: (await import("@/features/auth/SignUpPage")).default }) },
      { path: "/auth/callback", lazy: async () => ({ Component: (await import("@/features/auth/AuthCallbackPage")).default }) },
      { path: "/auth/reset-password", lazy: async () => ({ Component: (await import("@/features/auth/ResetPasswordPage")).default }) },
      { path: "/auth/update-password", lazy: async () => ({ Component: (await import("@/features/auth/UpdatePasswordPage")).default }) },
      { path: "/onboarding", lazy: async () => ({ Component: (await import("@/features/onboarding/OnboardingPage")).default }) },
      {
        path: "/demo",
        element: <DemoLayout />,
        children: sharedWardrobeRoutes,
      },
      {
        path: "/app",
        element: <AppLayout />,
        children: [
          { path: "profile", lazy: async () => ({ Component: (await import("@/features/profile/ProfilePage")).default }) },
          // Milestone 4 approved entry point; reuse Studio's existing Ideas mode.
          { path: "ideas", element: <Navigate to="/app/style?mode=ideas" replace /> },
          ...sharedWardrobeRoutes,
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
