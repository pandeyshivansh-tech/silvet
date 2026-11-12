import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuthChangeEvent, Session, SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createAuthController } from "./authController";

const user = (id = "account-a", confirmed = true) => ({ id, email: `${id}@example.com`, email_confirmed_at: confirmed ? "2026-11-12T00:00:00Z" : undefined }) as User;
const session = (id = "account-a") => ({ access_token: `fixture-${id}`, user: user(id) }) as Session;
const tick = async () => { await new Promise((resolve) => setTimeout(resolve, 0)); };
const cleanups: (() => void)[] = [];
afterEach(() => { cleanups.splice(0).forEach((fn) => fn()); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
function setup() {
  let event: (event: AuthChangeEvent, session: Session | null) => void = () => {};
  const auth = {
    getSession: vi.fn(async () => ({ data: { session: null as Session | null }, error: null as unknown })),
    getUser: vi.fn(async () => ({ data: { user: user() as User | null }, error: null as unknown })),
    onAuthStateChange: vi.fn((listener: typeof event) => { event = listener; return { data: { subscription: { unsubscribe: vi.fn() } } }; }),
    signInWithPassword: vi.fn(async () => ({ data: { session: session() }, error: null as unknown })),
    signUp: vi.fn(async () => ({ data: { session: null }, error: null as unknown })),
    signOut: vi.fn(async () => ({ error: null as unknown })),
    resend: vi.fn(async () => ({ error: null as unknown })),
    verifyOtp: vi.fn(async () => ({ data: { session: session() }, error: null as unknown })),
    exchangeCodeForSession: vi.fn(async () => ({ data: { session: session() }, error: null as unknown })),
    signInWithOAuth: vi.fn(async () => ({ error: null as unknown })),
  };
  const controller = createAuthController(() => ({ auth }) as unknown as SupabaseClient<Database>);
  vi.stubGlobal("window", { location: { origin: "https://app.example.com" } });
  vi.stubGlobal("sessionStorage", { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() });
  cleanups.push(controller.start());
  return { auth, controller, getListener: () => event, event: (name: AuthChangeEvent, value: Session | null) => event(name, value) };
}
describe("authentication controller", () => {
  it("restores signed-out state without blocking public screens", async () => {
    const { controller } = setup(); await tick();
    expect(controller.getSnapshot()).toMatchObject({ status: "signed-out", isConfigured: true });
  });
  it("handles missing configuration explicitly", () => {
    const controller = createAuthController(() => { throw new Error("fixture"); });
    cleanups.push(controller.start());
    expect(controller.getSnapshot()).toMatchObject({ status: "signed-out", isConfigured: false });
  });
  it("validates restored sessions with the Auth server", async () => {
    const { controller, auth } = setup(); await tick();
    auth.getSession.mockResolvedValue({ data: { session: session() }, error: null });
    controller.retry(); await tick();
    expect(controller.getSnapshot().user?.id).toBe("account-a");
    expect(auth.getUser).toHaveBeenCalledWith("fixture-account-a");
  });
  it("does not trust a locally claimed unverified session", async () => {
    const { auth, controller } = setup(); await tick();
    auth.getUser.mockResolvedValue({ data: { user: user("account-a", false) }, error: null });
    await controller.signIn("a@example.com", "password");
    expect(controller.getSnapshot().status).toBe("signed-out");
    expect(controller.getSnapshot().error).toContain("Confirm your email");
  });
  it("ignores events from a stopped subscription after Strict Mode restart", async () => {
    const { controller, getListener } = setup(); await tick();
    const oldListener = getListener();
    cleanups.pop()!();
    cleanups.push(controller.start()); await tick();
    await controller.signIn("a@example.com", "password");
    oldListener("SIGNED_OUT", null);
    expect(controller.getSnapshot().status).toBe("signed-in");
  });
  it("waits for verification after signup without provisioning a profile", async () => {
    const { auth, controller } = setup(); await tick();
    expect(await controller.signUp("a@example.com", "password")).toEqual({ needsVerification: true });
    expect(auth.getUser).not.toHaveBeenCalled();
    expect(controller.getSnapshot().user).toBeNull();
  });
  it("does not reveal existing signup accounts", async () => {
    const { auth, controller } = setup(); await tick();
    auth.signUp.mockResolvedValue({ data: { session: null }, error: { code: "user_already_exists" } });
    expect(await controller.signUp("a@example.com", "password")).toEqual({ needsVerification: true });
  });
  it("uses signup resend with a same-origin callback", async () => {
    const { auth, controller } = setup(); await tick();
    await controller.resend("a@example.com");
    expect(auth.resend).toHaveBeenCalledWith({ type: "signup", email: "a@example.com", options: { emailRedirectTo: "https://app.example.com/auth/callback" } });
  });
  it("verifies an email OTP and validates the resulting session", async () => {
    const { controller, auth } = setup(); await tick();
    await controller.verifyEmail("a@example.com", "123456");
    expect(auth.verifyOtp).toHaveBeenCalledWith({ email: "a@example.com", token: "123456", type: "email" });
    expect(controller.getSnapshot().status).toBe("signed-in");
  });
  it("exchanges a callback only once even when entered twice", async () => {
    const { controller, auth } = setup(); await tick();
    await Promise.all([controller.finishCallback("dummy-code"), controller.finishCallback("dummy-code")]);
    expect(auth.exchangeCodeForSession).toHaveBeenCalledTimes(1);
  });
  it("rejects expired callbacks with a safe message", async () => {
    const { auth, controller } = setup(); await tick();
    auth.exchangeCodeForSession.mockResolvedValue({ data: { session: session() }, error: { code: "flow_state_expired" } });
    await expect(controller.finishCallback("expired")).rejects.toThrow(/expired/);
  });
  it("signs out locally and handles cross-tab sign-out", async () => {
    const { auth, controller, event } = setup(); await tick();
    await controller.signIn("a@example.com", "password");
    event("SIGNED_OUT", null);
    expect(controller.getSnapshot().status).toBe("signed-out");
    await controller.signOut();
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
  it("does not claim successful logout when it fails", async () => {
    const { auth, controller } = setup(); await tick();
    await controller.signIn("a@example.com", "password");
    auth.signOut.mockResolvedValue({ error: { status: 503 } });
    await expect(controller.signOut()).rejects.toThrow();
    expect(controller.getSnapshot().status).toBe("signed-in");
  });
  it("preserves the current verified user while refreshing", async () => {
    const { controller, event } = setup(); await tick();
    await controller.signIn("a@example.com", "password");
    event("TOKEN_REFRESHED", session());
    expect(controller.getSnapshot().status).toBe("signed-in"); await tick();
  });
  it("ignores late results after logout", async () => {
    const { auth, controller, event } = setup(); await tick();
    let resolve!: (value: { data: { user: User }; error: null }) => void;
    auth.getUser.mockImplementation(() => new Promise((done) => { resolve = done; }));
    event("SIGNED_IN", session());
    await controller.signOut();
    resolve({ data: { user: user() }, error: null }); await tick();
    expect(controller.getSnapshot().status).toBe("signed-out");
  });
  it("never displays the previous account after switching accounts", async () => {
    const { auth, controller, event } = setup(); await tick();
    await controller.signIn("a@example.com", "password");
    auth.getUser.mockResolvedValue({ data: { user: user("account-b") }, error: null });
    event("SIGNED_IN", session("account-b"));
    expect(controller.getSnapshot().user).toBeNull(); await tick();
    expect(controller.getSnapshot().user?.id).toBe("account-b");
  });
  it("handles validation network failures and can retry", async () => {
    const { auth, controller } = setup(); await tick();
    auth.getSession.mockResolvedValue({ data: { session: session() }, error: null });
    auth.getUser.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    controller.retry(); await tick();
    expect(controller.getSnapshot().error).toContain("connection");
    controller.retry(); await tick();
    expect(controller.getSnapshot().status).toBe("signed-in");
  });
  it("keeps Google unavailable until the provider is confirmed enabled", async () => {
    const { controller } = setup(); await tick();
    await expect(controller.signInWithGoogle()).rejects.toThrow(/not available/);
    vi.stubEnv("VITE_SUPABASE_URL", "https://fixture.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "sb_publishable_fixture");
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ external: { google: false } }) })));
    controller.checkProviders(); await tick();
    expect(controller.getSnapshot().googleAvailable).toBe(false);
  });
  it("uses PKCE OAuth only for a configured Google provider", async () => {
    const { controller, auth } = setup(); await tick();
    vi.stubEnv("VITE_SUPABASE_URL", "https://fixture.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "sb_publishable_fixture");
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ external: { google: true } }) })));
    controller.checkProviders(); await tick();
    await controller.signInWithGoogle("/app/style");
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({ provider: "google", options: { redirectTo: "https://app.example.com/auth/callback" } });
  });
});
