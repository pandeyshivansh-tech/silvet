/**
 * Route builders. Never hand-write paths in features — use these so demo (/demo) and
 * signed-in (/app) screens share the same components.
 */
export type Base = "/demo" | "/app";

export const paths = {
  landing: () => "/",
  styleguide: () => "/styleguide",
  signIn: (next?: string) => (next ? `/auth/sign-in?next=${encodeURIComponent(next)}` : "/auth/sign-in"),
  signUp: (next?: string) => next ? `/auth/sign-up?next=${encodeURIComponent(next)}` : "/auth/sign-up",
  authCallback: () => "/auth/callback",
  onboarding: (next?: string) => next ? `/onboarding?next=${encodeURIComponent(next)}` : "/onboarding",

  wardrobe: (base: Base) => `${base}/wardrobe`,
  item: (base: Base, id: string) => `${base}/wardrobe/${encodeURIComponent(id)}`,
  addItems: (base: Base = "/app") => `${base}/wardrobe/new`,
  editItem: (id: string, base: Base = "/app") => `${base}/wardrobe/${encodeURIComponent(id)}/edit`,

  /** Builder + Ideas. `?outfit=<id>` opens a saved outfit for editing; `?mode=ideas` opens Ideas. */
  style: (base: Base, opts?: { outfitId?: string; mode?: "build" | "ideas" }) => {
    const q = new URLSearchParams();
    if (opts?.outfitId) q.set("outfit", opts.outfitId);
    if (opts?.mode) q.set("mode", opts.mode);
    const s = q.toString();
    return `${base}/style${s ? `?${s}` : ""}`;
  },
  lookbook: (base: Base) => `${base}/lookbook`,
  outfit: (base: Base, id: string) => `${base}/lookbook/${encodeURIComponent(id)}`,
  profile: () => "/app/profile",
};
