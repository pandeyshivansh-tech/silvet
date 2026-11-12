import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { clearAccountCache, mutationKeys, queryKeys } from "./queryScope";
const A = { kind: "supabase" as const, userId: "account-a" };
const B = { kind: "supabase" as const, userId: "account-b" };
const demo = { kind: "demo" as const };
describe("account-scoped product queries", () => {
  it("isolates all list/detail/usage/image keys by user, including identical resource IDs", () => {
    for (const key of [
      (s: typeof A) => queryKeys.items(s), (s: typeof A) => queryKeys.item(s, "same"),
      (s: typeof A) => queryKeys.itemUsage(s, "same"), (s: typeof A) => queryKeys.outfits(s),
      (s: typeof A) => queryKeys.outfit(s, "same"), (s: typeof A) => queryKeys.images(s, "same"),
    ]) expect(key(A)).not.toEqual(key(B));
  });
  it("keeps existing demo cache keys and rejects anonymous personal scopes", () => {
    expect(queryKeys.items(demo)).toEqual(["items", "demo"]);
    expect(() => queryKeys.items({ kind: "supabase" })).toThrow();
    expect(mutationKeys.items(demo)).toEqual(["mutations", "demo", "items"]);
    expect(mutationKeys.items(A)).not.toEqual(mutationKeys.items(B));
  });
  it("clears previous-account lists, details, images and profiles without touching demo or user B", () => {
    const client = new QueryClient();
    for (const key of [queryKeys.items(A), queryKeys.item(A, "item"), queryKeys.itemUsage(A, "item"), queryKeys.outfits(A), queryKeys.outfit(A, "look"), queryKeys.images(A, "path"), ["profile", A.userId]])
      client.setQueryData(key, "private-a");
    client.setQueryData(queryKeys.items(B), "private-b"); client.setQueryData(queryKeys.items(demo), "demo");
    clearAccountCache(client, A.userId);
    expect(client.getQueryData(queryKeys.items(A))).toBeUndefined();
    expect(client.getQueryData(["profile", A.userId])).toBeUndefined();
    expect(client.getQueryData(queryKeys.items(B))).toBe("private-b");
    expect(client.getQueryData(queryKeys.items(demo))).toBe("demo");
    expect(client.getQueryCache().getAll()).toHaveLength(2);
    client.clear();
  });
  it("cancels in-flight user A queries so their late responses cannot repopulate the cache", async () => {
    const client = new QueryClient();
    let finish!: (value: string) => void;
    const pending = client.fetchQuery({ queryKey: queryKeys.items(A), queryFn: () => new Promise<string>((resolve) => { finish = resolve; }) }).catch(() => "cancelled");
    clearAccountCache(client, A.userId); finish("private-a");
    expect(await pending).toBe("cancelled");
    expect(client.getQueryData(queryKeys.items(A))).toBeUndefined();
    expect(client.getQueryData(queryKeys.items(B))).toBeUndefined();
    client.clear();
  });
  it("invalidates only the correct user's queries, including item usage after outfit saves", async () => {
    const client = new QueryClient();
    client.setQueryData(queryKeys.itemUsage(A, "same"), 1);
    client.setQueryData(queryKeys.itemUsage(B, "same"), 2);
    await client.invalidateQueries({ queryKey: queryKeys.items(A) });
    expect(client.getQueryState(queryKeys.itemUsage(A, "same"))?.isInvalidated).toBe(true);
    expect(client.getQueryState(queryKeys.itemUsage(B, "same"))?.isInvalidated).toBe(false);
    client.clear();
  });

  it("removes only previous-account mutations, including pending cache entries", async () => {
    const client = new QueryClient();
    const cache = client.getMutationCache();
    let finish!: (value: string) => void;
    const pendingA = cache.build(client, {
      mutationKey: mutationKeys.items(A),
      mutationFn: () => new Promise<string>((resolve) => { finish = resolve; }),
    });
    const pendingResult = pendingA.execute(undefined).catch(() => "cancelled");
    const settledA = cache.build(client, {
      mutationKey: mutationKeys.outfits(A),
      mutationFn: async () => "private-a",
    });
    await settledA.execute(undefined);
    const pendingB = cache.build(client, {
      mutationKey: mutationKeys.items(B),
      mutationFn: async () => "private-b",
    });
    await pendingB.execute(undefined);
    const demoMutation = cache.build(client, {
      mutationKey: mutationKeys.items(demo),
      mutationFn: async () => "demo",
    });
    await demoMutation.execute(undefined);

    clearAccountCache(client, A.userId);
    expect(cache.getAll()).not.toContain(pendingA);
    expect(cache.getAll()).not.toContain(settledA);
    expect(cache.getAll()).toContain(pendingB);
    expect(cache.getAll()).toContain(demoMutation);

    // Removing a pending mutation is cache cleanup, not network cancellation.
    finish("private-a");
    await expect(pendingResult).resolves.toBe("private-a");
    expect(cache.getAll()).not.toContain(pendingA);
    client.clear();
  });
});
