import { lazy, Suspense, useState } from "react";
import { Outlet, ScrollRestoration, type Location } from "react-router";
import { DemoRepository, RepositoryProvider } from "@/data";
import { RequireAuth } from "@/lib/auth/RequireAuth";
import { Spinner } from "@/ui";
import { RequireOnboarding } from "@/lib/auth/RequireOnboarding";
const AppShell = lazy(() => import("./AppShell").then((module) => ({ default: module.AppShell })));
const AccountProduct = lazy(() => import("./AccountProduct"));

function ShellFallback() {
  return <div role="status" className="flex min-h-dvh items-center justify-center"><Spinner label="Loading your wardrobe" /></div>;
}

/**
 * A hash typed into the address bar makes a history entry React Router has no key for, so it is keyed
 * "default" — the same as the first page load — and would "restore" that page's position over the anchor
 * jump. Such entries are keyed by their hash instead.
 */
const scrollKey = (location: Location) => (location.key === "default" && location.hash ? location.pathname + location.hash : location.key);

/** Top-level layout: scroll restoration for every route. */
export function RootLayout() {
  return (
    <>
      <ScrollRestoration getKey={scrollKey} />
      <Outlet />
    </>
  );
}

/** /demo/* — sample wardrobe, no account needed (D3). */
export function DemoLayout() {
  const [repository] = useState(() => new DemoRepository());
  return (
    <RepositoryProvider repository={repository}>
      <Suspense fallback={<ShellFallback />}><AppShell /></Suspense>
    </RepositoryProvider>
  );
}

export function AppLayout() {
  return (
    <RequireAuth>
      <RequireOnboarding>
        <Suspense fallback={<ShellFallback />}><AccountProduct /></Suspense>
      </RequireOnboarding>
    </RequireAuth>
  );
}
