/**
 * Shared data hooks. Screens use ONLY these — never the repository directly and never Supabase.
 * Every hook is scoped by repository kind so demo and real data never share cache entries.
 */
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ClothingItem, ImageRef, Outfit } from "@/domain/types";
import { useRepository } from "./RepositoryProvider";
import type { CreateItemArgs, SaveOutfitArgs, UpdateItemArgs } from "./repository";
import { mutationKeys, queryKeys } from "./queryScope";
export { mutationKeys, queryKeys } from "./queryScope";

/* ---------------- items ---------------- */

export function useItems() {
  const repo = useRepository();
  return useQuery({ queryKey: queryKeys.items(repo), queryFn: () => repo.listItems() });
}

/**
 * `fromList`: read-only screens may show the piece from the wardrobe list while it is fetched, so opening it
 * from the grid draws at once (and its frame can morph into place). Forms leave it off: they must start from
 * the fetched record, never a possibly stale list copy.
 */
export function useItem(id: string | undefined, fromList = false) {
  const repo = useRepository();
  const qc = useQueryClient();
  return useQuery({
    queryKey: queryKeys.item(repo, id ?? "none"),
    queryFn: () => repo.getItem(id as string),
    enabled: Boolean(id),
    placeholderData: fromList ? () => qc.getQueryData<ClothingItem[]>(queryKeys.items(repo))?.find((item) => item.id === id) : undefined,
  });
}

export function useItemUsage(id: string | undefined) {
  const repo = useRepository();
  return useQuery({
    queryKey: queryKeys.itemUsage(repo, id ?? "none"),
    queryFn: () => repo.countOutfitsUsingItem(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateItem() {
  const repo = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationKey: mutationKeys.items(repo),
    mutationFn: (args: CreateItemArgs) => repo.createItem(args),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.items(repo) }),
  });
}

export function useUpdateItem() {
  const repo = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationKey: mutationKeys.items(repo),
    mutationFn: (args: UpdateItemArgs) => repo.updateItem(args),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.items(repo) }),
  });
}

export function useDeleteItem() {
  const repo = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationKey: mutationKeys.items(repo),
    mutationFn: (id: string) => repo.deleteItem(id),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.items(repo) }),
        qc.invalidateQueries({ queryKey: queryKeys.outfits(repo) }),
      ]),
  });
}

/* ---------------- outfits ---------------- */

export function useOutfits() {
  const repo = useRepository();
  return useQuery({ queryKey: queryKeys.outfits(repo), queryFn: () => repo.listOutfits() });
}

/** `fromList`: as for `useItem` — read-only screens only; Studio's editor starts from the fetched look. */
export function useOutfit(id: string | undefined, fromList = false) {
  const repo = useRepository();
  const qc = useQueryClient();
  return useQuery({
    queryKey: queryKeys.outfit(repo, id ?? "none"),
    queryFn: () => repo.getOutfit(id as string),
    enabled: Boolean(id),
    placeholderData: fromList ? () => qc.getQueryData<Outfit[]>(queryKeys.outfits(repo))?.find((outfit) => outfit.id === id) : undefined,
  });
}

export function useSaveOutfit() {
  const repo = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationKey: mutationKeys.outfits(repo),
    mutationFn: (args: SaveOutfitArgs) => repo.saveOutfit(args),
    onSuccess: () => Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.outfits(repo) }),
      qc.invalidateQueries({ queryKey: queryKeys.items(repo) }),
    ]),
  });
}

export function useDeleteOutfit() {
  const repo = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationKey: mutationKeys.outfits(repo),
    mutationFn: (id: string) => repo.deleteOutfit(id),
    onSuccess: () => Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.outfits(repo) }),
      qc.invalidateQueries({ queryKey: queryKeys.items(repo) }),
    ]),
  });
}

/* ---------------- images ---------------- */

/**
 * Resolves displayable image URLs for a list of items in one batch.
 * Returns a lookup: item.id → { thumb, full } (absent when the item has no photo).
 */
export function useItemImages(items: readonly ClothingItem[] | undefined) {
  const repo = useRepository();
  const refs = useMemo(() => (items ?? []).map((i) => i.image).filter((r): r is ImageRef => r !== null), [items]);
  const key = refs.map((r) => r.path).sort().join("|");

  const query = useQuery({
    queryKey: queryKeys.images(repo, key),
    queryFn: () => repo.getImageUrls(refs),
    enabled: refs.length > 0,
    // Signed URLs expire after ~1h (WS6); refresh well before that.
    staleTime: 30 * 60 * 1000,
    refetchInterval: repo.kind === "supabase" ? 30 * 60 * 1000 : false,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: "always",
    refetchOnMount: "always",
  });

  // A suspended tab can resume with old cache data before its refetch completes.
  // Do not render expired bearer URLs while waiting for fresh ones.
  const expired = repo.kind === "supabase" && Date.now() - query.dataUpdatedAt >= 55 * 60 * 1000;
  return useMemo(() => {
    const byItem = new Map<string, { thumb: string; full: string }>();
    if (query.data && !expired) {
      for (const item of items ?? []) {
        const urls = item.image ? query.data[item.image.path] : undefined;
        if (urls) byItem.set(item.id, urls);
      }
    }
    return { byItem, isLoading: query.isLoading && refs.length > 0 };
  }, [query.data, query.isLoading, items, refs.length, expired]);
}
