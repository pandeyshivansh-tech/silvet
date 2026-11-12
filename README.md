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
| `npm run build` | Type-check + frontend to `dist/` and Node API to `dist-server/` |
| `npm start` | Serve the production frontend and API together |
| `npm run preview` | Frontend-only preview; does not provide the import API |

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

`server/` contains the minimal Node HTTP API, secure public-page downloader and
structured metadata parser. Development mounts the same API handler in Vite;
production serves the React build and API from a single Node process.

## Deployment
The intended production platform is the existing **Replit Reserved VM** at
`https://silvet.replit.app`. Build: `npm run build`; run: `npm start`. The Node
server binds `0.0.0.0` and uses `PORT` (default `5000`). It serves `/api/*`, built
assets and extensionless SPA routes on the same domain.

Both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` must be configured for build
**and runtime**. The latter contains the existing public `sb_publishable` key,
never a service-role key. No additional API keys are needed.

Static hosting and `vite preview` alone cannot provide URL extraction.
`public/_redirects` is retained for existing static/demo use but is not the
production server's routing mechanism. Configuration changes take effect only
after you explicitly republish; no publish is performed by setup.

See [Product URL import](docs/PRODUCT_URL_IMPORT.md) for security limits,
retailer limitations, verification commands and manual acceptance steps.

## Docs
`CLAUDE.md` (engineering rules) · `DESIGN.md` (design direction) · `docs/design/SILVET_DESIGN_SYSTEM.md` (tokens, components, states) · `docs/design/SILVET_DESIGN_REFERENCE.pdf` (approved visual reference) · `replit.md` (rules for Replit Agent).
