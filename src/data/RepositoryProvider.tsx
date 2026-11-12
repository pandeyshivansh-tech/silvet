import { createContext, useContext, type ReactNode } from "react";
import type { Repository } from "./repository";

const RepositoryContext = createContext<Repository | null>(null);

/** Provided by the layout: DemoLayout → DemoRepository, AppLayout → SupabaseRepository (WS6). */
export function RepositoryProvider({ repository, children }: { repository: Repository; children: ReactNode }) {
  return <RepositoryContext.Provider value={repository}>{children}</RepositoryContext.Provider>;
}

export function useRepository(): Repository {
  const repo = useContext(RepositoryContext);
  if (!repo) throw new Error("useRepository must be used inside a <RepositoryProvider> (DemoLayout or AppLayout).");
  return repo;
}

/** "/demo" or "/app" — use to build links that work in both the demo and the signed-in app. */
export function useBasePath(): "/demo" | "/app" {
  return useRepository().kind === "demo" ? "/demo" : "/app";
}

/** Like useRepository().kind, but returns null outside a provider (landing, styleguide primitives). */
export function useRepositoryKind(): Repository["kind"] | null {
  return useContext(RepositoryContext)?.kind ?? null;
}

export function useIsDemo(): boolean {
  return useRepository().kind === "demo";
}
