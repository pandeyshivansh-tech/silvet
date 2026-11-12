import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { validateSupabaseConfig } from "./config";
import type { Database } from "./database.types";

let client: SupabaseClient<Database> | undefined;

/**
 * Lazy by design. AuthProvider initializes accounts; DemoRepository remains independent.
 * The existing ANON_KEY variable accepts the modern public sb_publishable key.
 * No Authorization header override: the SDK supplies user JWTs after login.
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (!client) {
    const config = validateSupabaseConfig({
      VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    });
    client = createClient<Database>(config.url, config.publicKey, {
      auth: {
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: "silvet.auth.v1",
      },
    });
  }
  return client;
}
