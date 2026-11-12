export interface SupabaseConfig {
  url: string;
  publicKey: string;
}

/** VITE values are shipped to browsers. Never accept an elevated API key here. */
export function validateSupabaseConfig(env: Record<string, unknown>): SupabaseConfig {
  const rawUrl = env.VITE_SUPABASE_URL;
  const rawKey = env.VITE_SUPABASE_ANON_KEY;
  if (typeof rawUrl !== "string" || !rawUrl.trim() || typeof rawKey !== "string" || !rawKey.trim()) {
    throw new Error("Supabase requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (a public publishable key).");
  }
  let url: URL;
  try { url = new URL(rawUrl.trim()); }
  catch { throw new Error("VITE_SUPABASE_URL must be a valid Supabase project URL."); }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
    url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("VITE_SUPABASE_URL must use HTTPS (HTTP is allowed only for local development), with no credentials, query or path.");
  }
  const publicKey = rawKey.trim();
  let valid = /^sb_publishable_[A-Za-z0-9_-]+$/.test(publicKey);
  // Backwards compatibility only: payload inspection identifies anon keys;
  // this is NOT signature verification or proof that a key belongs to a project.
  if (!valid && publicKey.split(".").length === 3) {
    try {
      const payload = publicKey.split(".")[1]!;
      const claims: unknown = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
      valid = Boolean(claims && typeof claims === "object" && "role" in claims && claims.role === "anon");
    } catch { valid = false; }
  }
  if (!valid) {
    throw new Error("VITE_SUPABASE_ANON_KEY must contain a public sb_publishable key or legacy anon key. Secret/service-role keys are forbidden.");
  }
  return { url: url.origin, publicKey };
}
