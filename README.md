# SILVET

**Your wardrobe. Your style. Your everyday outfit companion.**

SILVET helps people digitise the clothes they already own, combine them into outfits, get honest rule-based outfit ideas, and keep the looks they love — across Western and Indian wear.

## Quick start
Requires Node 20.19+ (Node 22 recommended).

```bash
npm install
cp .env.example .env.local   # Supabase keys (needed from WS6 onward; the demo runs without them)
npm run dev                  # http://localhost:5173
```

| Script | What it does |
|---|---|
| `npm run dev` | Dev server (exposed on your network for phone testing) |
| `npm run check` | Type-check + lint + unit tests |
| `npm run build` | Type-check + production build to `dist/` |
| `npm run preview` | Serve the production build locally |

## Routes
`/` landing · `/demo/*` sample wardrobe (no account) · `/app/*` your wardrobe (sign-in required) · `/auth/*` · `/onboarding` · `/styleguide` design system.

## Architecture
```
src/
  app/        router, layouts, app shell, route builders (paths.ts)
  ui/         SILVET design system components
  motion/     motion presets + reduced-motion provider
  domain/     taxonomy (single source of truth), types, Zod schemas, outfit rules
  data/       Repository interface, DemoRepository, shared TanStack Query hooks
  lib/        auth (Supabase wiring in WS6), images (WS6)
  features/   screens — landing, wardrobe, style, lookbook, profile, auth, onboarding
  styles/     Tailwind v4 tokens
```
Screens never touch Supabase directly: they use the hooks in `src/data`, which run on either the `DemoRepository` (sample wardrobe) or the Supabase repository (signed-in users).

## Deployment
Cloudflare Pages from GitHub: build command `npm run build`, output `dist`, env vars `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. `public/_redirects` handles client-side routing.

## Docs
`CLAUDE.md` (engineering rules) · `DESIGN.md` (design direction) · `docs/design/SILVET_DESIGN_SYSTEM.md` (tokens, components, states) · `docs/design/SILVET_DESIGN_REFERENCE.pdf` (approved visual reference) · `replit.md` (rules for Replit Agent).
