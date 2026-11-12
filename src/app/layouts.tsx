import { useState } from "react";
import { Outlet, ScrollRestoration, useLocation } from "react-router";
import { DemoRepository, RepositoryProvider } from "@/data";
import { RequireAuth } from "@/lib/auth/RequireAuth";
import { AppShell } from "./AppShell";
import { RequireOnboarding } from "@/lib/auth/RequireOnboarding";
import { AuthFrame } from "@/features/auth/AuthFrame";
import { ButtonLink } from "@/ui";
import { paths } from "./paths";

/** Top-level layout: scroll restoration for every route. */
export function RootLayout() {
  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  );
}

/** /demo/* — sample wardrobe, no account needed (D3). */
export function DemoLayout() {
  const [repository] = useState(() => new DemoRepository());
  return (
    <RepositoryProvider repository={repository}>
      <AppShell />
    </RepositoryProvider>
  );
}

/** Account-only until SupabaseRepository is implemented; never pass sample data as personal data. */
export function AppLayout() {
  const location = useLocation();
  return (
    <RequireAuth>
      <RequireOnboarding>
        {location.pathname.replace(/\/$/, "") === paths.profile() ? <Outlet /> :
          <AuthFrame eyebrow="Your account" title="Your account is ready" description="Your personal wardrobe, Studio and Lookbook are coming next. Nothing from the demo has been copied into your account.">
            <div className="flex flex-col gap-4">
              <ButtonLink to={paths.profile()}>Your profile</ButtonLink>
              <ButtonLink to={paths.wardrobe("/demo")} variant="secondary">Explore the sample wardrobe</ButtonLink>
            </div>
          </AuthFrame>}
      </RequireOnboarding>
    </RequireAuth>
  );
}
