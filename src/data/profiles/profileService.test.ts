import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ProfileRow } from "@/lib/supabase/database.types";
import { createProfileService } from "./profileService";

const row: ProfileRow = { id: "account-a", display_name: "Saved name", style_preferences: ["traditional", "fusion"], onboarding_completed_at: null, created_at: "2026-11-12T00:00:00Z", updated_at: "2026-11-12T00:00:00Z" };
type Result = { data: ProfileRow | null; error: unknown };
function setup(results: Result[], verified = true) {
  const queue = [...results];
  const consume = () => Promise.resolve(queue.shift() ?? { data: null, error: new Error("No fixture result") });
  const builder = {
    select: vi.fn(() => builder), eq: vi.fn(() => builder), abortSignal: vi.fn(() => builder),
    maybeSingle: vi.fn(consume), single: vi.fn(consume),
    upsert: vi.fn(() => builder), update: vi.fn(() => builder),
    then: (resolve: (value: Result) => unknown) => consume().then(resolve),
  };
  const auth = { getUser: vi.fn(async () => ({ data: { user: { id: row.id, email_confirmed_at: verified ? "confirmed" : null } }, error: null })) };
  const from = vi.fn(() => builder);
  const service = createProfileService(() => ({ auth, from }) as unknown as SupabaseClient<Database>);
  return { service, builder, from, auth };
}
describe("profile provisioning and onboarding persistence", () => {
  it("returns an existing profile without any write", async () => {
    const { service, builder } = setup([{ data: row, error: null }]);
    expect(await service.load(row.id, new AbortController().signal)).toMatchObject({ displayName: row.display_name, stylePreferences: row.style_preferences });
    expect(builder.upsert).not.toHaveBeenCalled();
    expect(builder.update).not.toHaveBeenCalled();
  });
  it("creates only an authenticated user id and ignores existing conflicts", async () => {
    const { service, builder } = setup([{ data: null, error: null }, { data: null, error: null }, { data: row, error: null }]);
    await service.load(row.id, new AbortController().signal);
    expect(builder.upsert).toHaveBeenCalledWith({ id: row.id }, { onConflict: "id", ignoreDuplicates: true });
  });
  it("retains another login's concurrently provisioned profile", async () => {
    const { service } = setup([{ data: null, error: null }, { data: null, error: null }, { data: { ...row, display_name: "Concurrent name" }, error: null }]);
    expect((await service.load(row.id, new AbortController().signal)).displayName).toBe("Concurrent name");
  });
  it("never provisions when a read fails", async () => {
    const { service, builder } = setup([{ data: null, error: { status: 403 } }]);
    await expect(service.load(row.id, new AbortController().signal)).rejects.toThrow(/load your profile/);
    expect(builder.upsert).not.toHaveBeenCalled();
  });
  it("reports failed creation without claiming a profile exists", async () => {
    const { service } = setup([{ data: null, error: null }, { data: null, error: { status: 503 } }]);
    await expect(service.load(row.id, new AbortController().signal)).rejects.toThrow(/prepare your profile/);
  });
  it("reports failure retrieving a newly provisioned profile", async () => {
    const { service } = setup([{ data: null, error: null }, { data: null, error: null }, { data: null, error: { status: 503 } }]);
    await expect(service.load(row.id, new AbortController().signal)).rejects.toThrow(/retrieve your profile/);
  });
  it("refuses unverified sessions before any database operation", async () => {
    const { service, from } = setup([], false);
    await expect(service.load(row.id, new AbortController().signal)).rejects.toThrow(/verified account/);
    expect(from).not.toHaveBeenCalled();
  });
  it("refuses a forged requested user id", async () => {
    const { service, from } = setup([]);
    await expect(service.load("account-b", new AbortController().signal)).rejects.toThrow(/verified account/);
    expect(from).not.toHaveBeenCalled();
  });
  it("does not provision after cancellation", async () => {
    const { service, from } = setup([]);
    const abort = new AbortController(); abort.abort();
    await expect(service.load(row.id, abort.signal)).rejects.toThrow();
    expect(from).not.toHaveBeenCalled();
  });
  it("saves selected values and completion in one update", async () => {
    const { service, builder } = setup([{ data: { ...row, onboarding_completed_at: "complete" }, error: null }]);
    await service.complete(row.id, { displayName: "  New name ", stylePreferences: ["traditional"] });
    expect(builder.update).toHaveBeenCalledWith({ display_name: "New name", style_preferences: ["traditional"], onboarding_completed_at: expect.any(String) });
    expect(builder.eq).toHaveBeenCalledWith("id", row.id);
  });
  it("skip updates only completion even with invalid unsaved input", async () => {
    const { service, builder } = setup([{ data: row, error: null }]);
    const saved = await service.complete(row.id, { displayName: "x".repeat(90), stylePreferences: [] }, true);
    expect(builder.update).toHaveBeenCalledWith({ onboarding_completed_at: expect.any(String) });
    expect(saved.stylePreferences).toEqual(["traditional", "fusion"]);
    expect(saved.displayName).toBe("Saved name");
  });
  it("rejects failed saves rather than marking completion locally", async () => {
    const { service } = setup([{ data: null, error: { status: 503 } }]);
    await expect(service.complete(row.id, { displayName: null, stylePreferences: [] })).rejects.toThrow(/weren’t saved/);
  });
});
