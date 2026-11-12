/**
 * Shared data hooks. Screens use ONLY these — never the repository directly and never Supabase.
 * Every hook is scoped by repository kind so demo and real data never share cache entries.
 */
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ClothingItem, ImageRef } from "@/domain/types";
import { useRepository } from "./RepositoryProvider";
import type { CreateItemArgs, SaveOutfitArgs, UpdateItemArgs } from "./repository";

export const queryKeys = {
  items: (kind: string) => ["items", kind] as const,
  item: (kind: string, id: string) => ["items", kind, id] as const,
  itemUsage: (kind: string, id: string) => ["items", kind, id, "usage"] as const,
  outfits: (kind: string) => ["outfits", kind] as const,
  outfit: (kind: string, id: string) => ["outfits", kind, id] as const,
  images: (kind: string, paths: string) => ["images", kind, paths] as const,
};

/* ---------------- items ---------------- */

export function useItems() {
  const repo = useRepository();
  return useQuery({ queryKey: queryKeys.items(repo.kind), queryFn: () => repo.listItems() });
}

export function useItem(id: string | undefined) {
  const repo = useRepository();
  return useQuery({
    queryKey: queryKeys.item(repo.kind, id ?? "none"),
    queryFn: () => repo.getItem(id as string),
    enabled: Boolean(id),
  });
}

export function useItemUsage(id: string | undefined) {
  const repo = useRepository();
  return useQuery({
    queryKey: queryKeys.itemUsage(repo.kind, id ?? "none"),
    queryFn: () => repo.countOutfitsUsingItem(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateItem() {
  const repo = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: CreateItemArgs) => repo.createItem(args),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.items(repo.kind) }),
  });
}

export function useUpdateItem() {
  const repo = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: UpdateItemArgs) => repo.updateItem(args),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.items(repo.kind) }),
  });
}

export function useDeleteItem() {
  const repo = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repo.deleteItem(id),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.items(repo.kind) }),
        qc.invalidateQueries({ queryKey: queryKeys.outfits(repo.kind) }),
      ]),
  });
}

/* ---------------- outfits ---------------- */

export function useOutfits() {
  const repo = useRepository();
  return useQuery({ queryKey: queryKeys.outfits(repo.kind), queryFn: () => repo.listOutfits() });
}

export function useOutfit(id: string | undefined) {
  const repo = useRepository();
  return useQuery({
    queryKey: queryKeys.outfit(repo.kind, id ?? "none"),
    queryFn: () => repo.getOutfit(id as string),
    enabled: Boolean(id),
  });
}

export function useSaveOutfit() {
  const repo = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: SaveOutfitArgs) => repo.saveOutfit(args),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.outfits(repo.kind) }),
  });
}

export function useDeleteOutfit() {
  const repo = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repo.deleteOutfit(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.outfits(repo.kind) }),
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
    queryKey: queryKeys.images(repo.kind, key),
    queryFn: () => repo.getImageUrls(refs),
    enabled: refs.length > 0,
    // Signed URLs expire after ~1h (WS6); refresh well before that.
    staleTime: 30 * 60 * 1000,
  });

  return useMemo(() => {
    const byItem = new Map<string, { thumb: string; full: string }>();
    if (query.data) {
      for (const item of items ?? []) {
        const urls = item.image ? query.data[item.image.path] : undefined;
        if (urls) byItem.set(item.id, urls);
      }
    }
    return { byItem, isLoading: query.isLoading && refs.length > 0 };
  }, [query.data, query.isLoading, items, refs.length]);
}
