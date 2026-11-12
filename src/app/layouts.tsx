import { useMemo, useState } from "react";
import { Outlet, ScrollRestoration, useLocation } from "react-router";
import { DemoRepository, RepositoryProvider } from "@/data";
import { RequireAuth } from "@/lib/auth/RequireAuth";
import { AppShell } from "./AppShell";
import { RequireOnboarding } from "@/lib/auth/RequireOnboarding";
import { paths } from "./paths";
import { useAuth } from "@/lib/auth/AuthProvider";
import { SupabaseRepository } from "@/data/supabase/SupabaseRepository";

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

/** Repositories and local drafts are isolated by account, inside the verified guards. */
function AccountProduct() {
  const { user } = useAuth();
  const repository = useMemo(() => user?.emailVerified ? new SupabaseRepository(user.id) : null, [user?.id, user?.emailVerified]);
  if (!repository) return null;
  return <RepositoryProvider key={repository.userId} repository={repository}><AppShell /></RepositoryProvider>;
}

export function AppLayout() {
  const location = useLocation();
  return (
    <RequireAuth>
      <RequireOnboarding>
        {location.pathname.replace(/\/$/, "") === paths.profile() ? <Outlet /> : <AccountProduct />}
      </RequireOnboarding>
    </RequireAuth>
  );
}
