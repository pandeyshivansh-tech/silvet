import type { QueryClient } from "@tanstack/react-query";
import type { Repository } from "./repository";

type Scope = Pick<Repository, "kind" | "userId">;
function namespace(scope: Scope): readonly string[] {
  if (scope.kind === "demo") return ["demo"];
  if (!scope.userId) throw new Error("A personal repository needs an account-specific query scope.");
  return ["supabase", scope.userId];
}
export const queryKeys = {
  items: (scope: Scope) => ["items", ...namespace(scope)] as const,
  item: (scope: Scope, id: string) => [...queryKeys.items(scope), id] as const,
  itemUsage: (scope: Scope, id: string) => [...queryKeys.item(scope, id), "usage"] as const,
  outfits: (scope: Scope) => ["outfits", ...namespace(scope)] as const,
  outfit: (scope: Scope, id: string) => [...queryKeys.outfits(scope), id] as const,
  images: (scope: Scope, paths: string) => ["images", ...namespace(scope), paths] as const,
};
export const mutationKeys = {
  account: (userId: string) => ["mutations", "supabase", userId] as const,
  items: (scope: Scope) => ["mutations", ...namespace(scope), "items"] as const,
  outfits: (scope: Scope) => ["mutations", ...namespace(scope), "outfits"] as const,
};

export function clearAccountCache(client: QueryClient, userId: string) {
  const queryFilters = { predicate: ({ queryKey: key }: { queryKey: readonly unknown[] }) =>
    (key[0] === "profile" && key[1] === userId) ||
    (["items", "outfits", "images"].includes(String(key[0])) && key[1] === "supabase" && key[2] === userId) };
  // Cancellation signals immediately; removing synchronously prevents a stale frame.
  void client.cancelQueries(queryFilters);
  client.removeQueries(queryFilters);

  // TanStack Query has no mutation-cancellation API. Remove only this account's
  // mutation-cache entries; an in-flight repository request may still settle,
  // and its account-bound repository remains responsible for fencing its result.
  const mutations = client.getMutationCache();
  for (const mutation of mutations.findAll({ mutationKey: mutationKeys.account(userId) })) {
    mutations.remove(mutation);
  }
}
