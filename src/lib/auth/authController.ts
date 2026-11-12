import type { Session, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseClient } from "@/lib/supabase/client";
import { validateSupabaseConfig } from "@/lib/supabase/config";
import { authError, AuthFlowError, callbackUrl, emailCodeSchema, rememberNext, signInSchema, signUpSchema } from "./authFlow";

export type AuthStatus = "loading" | "signed-out" | "signed-in";
export interface AuthUser { id: string; email: string | null; emailVerified: boolean }
export interface AuthSnapshot {
  status: AuthStatus;
  user: AuthUser | null;
  isConfigured: boolean;
  error: string | null;
  googleAvailable: boolean | null;
}
export function createAuthController(factory: () => SupabaseClient<Database> = getSupabaseClient) {
  let snapshot: AuthSnapshot = { status: "loading", user: null, isConfigured: false, error: null, googleAvailable: null };
  const listeners = new Set<() => void>();
  let active = false;
  let epoch = 0;
  let lifecycle = 0;
  let client: SupabaseClient<Database>;
  let providersRequest: Promise<void> | undefined;
  let lastCallback: { code: string; promise: Promise<void> } | undefined;
  const publish = (next: Partial<AuthSnapshot>) => {
    if (!active) return;
    snapshot = { ...snapshot, ...next };
    listeners.forEach((listener) => listener());
  };
  const accept = async (session: Session | null) => {
    const request = ++epoch;
    if (!session) { publish({ status: "signed-out", user: null, error: null }); return; }
    if (snapshot.user?.id !== session.user.id) publish({ status: "loading", user: null, error: null });
    // Explicit JWT avoids taking the SDK's session lock from an auth-event callback.
    let result;
    try { result = await client.auth.getUser(session.access_token); }
    catch (error) {
      if (active && request === epoch) publish({ status: "signed-out", user: null, error: authError(error).message });
      return;
    }
    const { data, error } = result;
    if (!active || request !== epoch) return;
    if (error) {
      publish({ status: "signed-out", user: null, error: authError(error).message });
    } else if (!data.user?.email_confirmed_at) {
      publish({ status: "signed-out", user: null, error: "Confirm your email before continuing." });
    } else {
      publish({ status: "signed-in", user: { id: data.user.id, email: data.user.email ?? null, emailVerified: true }, error: null });
    }
  };
  const restore = async () => {
    const request = epoch;
    try {
      const { data, error } = await client.auth.getSession();
      if (!active || request !== epoch) return;
      if (error) throw error;
      await accept(data.session);
    } catch (error) {
      if (active && request === epoch) publish({ status: "signed-out", user: null, error: authError(error).message });
    }
  };
  const run = async <T,>(operation: () => Promise<T>): Promise<T> => {
    try {
      if (!snapshot.isConfigured) throw new AuthFlowError("Accounts are not configured here. You can still explore the demo.");
      return await operation();
    } catch (error) { throw authError(error); }
  };
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    start: () => {
      const instance = ++lifecycle;
      active = true;
      try { client = factory(); publish({ isConfigured: true, status: "loading", error: null }); }
      catch {
        publish({ status: "signed-out", isConfigured: false, error: "Accounts are not configured here. You can still explore the demo." });
        return () => { if (instance === lifecycle) { active = false; epoch++; } };
      }
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        // Do not await another Supabase operation inside the SDK callback.
        if (active && instance === lifecycle) void accept(session);
      });
      void restore();
      return () => {
        if (instance === lifecycle) { active = false; epoch++; }
        data.subscription.unsubscribe();
      };
    },
    retry: () => { publish({ error: null, status: "loading" }); void restore(); },
    checkProviders: () => {
      if (!snapshot.isConfigured || providersRequest) return;
      providersRequest = (async () => {
        try {
          const config = validateSupabaseConfig({
            VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
            VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
          });
          const response = await fetch(`${config.url}/auth/v1/settings`, { headers: { apikey: config.publicKey }, signal: AbortSignal.timeout(8000) });
          if (!response.ok) throw new Error("Provider settings unavailable");
          const settings = await response.json() as { external?: { google?: boolean } };
          publish({ googleAvailable: settings.external?.google === true });
        } catch { publish({ googleAvailable: false }); }
      })();
    },
    signIn: (email: string, password: string) => run(async () => {
      const input = signInSchema.parse({ email, password });
      const { data, error } = await client.auth.signInWithPassword(input);
      if (error) throw error;
      await accept(data.session);
    }),
    signUp: (email: string, password: string, next?: string) => run(async () => {
      const input = signUpSchema.parse({ email, password });
      rememberNext(next);
      const { data, error } = await client.auth.signUp({ ...input, options: { emailRedirectTo: callbackUrl() } });
      // Do not reveal whether an existing address was registered.
      if (error && error.code !== "user_already_exists") throw error;
      if (data?.session) await accept(data.session);
      return { needsVerification: !data?.session };
    }),
    signOut: () => run(async () => {
      const { error } = await client.auth.signOut({ scope: "local" });
      if (error) throw error;
      epoch++;
      publish({ user: null, status: "signed-out", error: null });
    }),
    resend: (email: string, next?: string) => run(async () => {
      rememberNext(next);
      const { error } = await client.auth.resend({ type: "signup", email: signInSchema.shape.email.parse(email), options: { emailRedirectTo: callbackUrl() } });
      if (error) throw error;
    }),
    verifyEmail: (email: string, token: string) => run(async () => {
      const { data, error } = await client.auth.verifyOtp({ email: signInSchema.shape.email.parse(email), token: emailCodeSchema.parse(token), type: "email" });
      if (error) throw error;
      await accept(data.session);
    }),
    signInWithGoogle: (next?: string) => run(async () => {
      if (snapshot.googleAvailable !== true) throw new AuthFlowError("Google sign-in is not available yet. Please use email and password.");
      rememberNext(next);
      const { error } = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: callbackUrl() } });
      if (error) throw error;
    }),
    finishCallback: (code: string) => {
      if (lastCallback?.code === code) return lastCallback.promise;
      const promise = run(async () => {
        if (!code || code.length > 4096) throw new AuthFlowError("This sign-in link is invalid. Please start again.");
        const { data, error } = await client.auth.exchangeCodeForSession(code);
        if (error) throw error;
        await accept(data.session);
      });
      lastCallback = { code, promise };
      return promise;
    },
  };
}
export type AuthController = ReturnType<typeof createAuthController>;
