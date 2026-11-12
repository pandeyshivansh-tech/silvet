import { useState } from "react";
import { Outlet, ScrollRestoration } from "react-router";
import { DemoRepository, RepositoryProvider } from "@/data";
import { RequireAuth } from "@/lib/auth/RequireAuth";
import { AppShell } from "./AppShell";

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

/**
 * /app/* — the signed-in wardrobe.
 * WS6 adds the SupabaseRepository here: <RepositoryProvider repository={supabaseRepository}>.
 * Until auth is wired, RequireAuth redirects every visit to sign-in, so no screen here can run without data.
 */
export function AppLayout() {
  return (
    <RequireAuth>
      <AppShell />
    </RequireAuth>
  );
}
