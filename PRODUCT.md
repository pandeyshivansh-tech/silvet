# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Gen Z, India-first and usable anywhere: roughly 16–26, at college or early in their careers. They dress every day for college, work, dates, parties, travel, festivals and weddings, and they own a mix of Western, Indian and fusion clothing. They use SILVET mostly on a phone, often in the moment of getting dressed, and on a laptop when organising their wardrobe.

## Product Purpose

SILVET is a personal digital wardrobe and everyday outfit companion. People digitise the clothes they already own, combine them into looks in Studio, get honest rule-based outfit ideas, and keep the looks they love in a Lookbook.

Success right now is a daily-use habit: someone adds a starter wardrobe (about five pieces they wear every week), saves looks, and comes back to decide what to wear.

## Positioning

- Works only from clothes the person already owns. It is not a marketplace and does not sell anything.
- Indian, Western and fusion wear are equal first-class citizens across taxonomy, Studio and Ideas, not a special-case add-on.
- Ideas come from transparent rules (colour, category, formality, occasion, season, style tags) with explanations grounded in the garment's actual metadata. No hidden profiling, no invented attributes.

## Operating Context

- Two modes of the same product: a no-account sample wardrobe at `/demo/*` (session-only; looks and edits vanish when the tab closes; selected photos are local previews, not uploads) and a signed-in wardrobe at `/app/*` backed by Supabase.
- Core workflows: add a piece (photo optional; name and category are enough; optional product-URL import on signed-in accounts), browse and filter the wardrobe (state kept in the URL), build a look in Studio (top + bottom, or a one-piece/set, plus optional layer, footwear and up to two accessories), get Ideas by occasion and optional style, save to the Lookbook, edit or delete saved looks, edit profile and style preferences.
- Accounts: email and password with verification, password reset, optional Google sign-in where enabled, one-time onboarding for style preferences.
- Deployed as a single Node process (frontend and product-import API) on Replit.

## Capabilities and Constraints

- M1–M7 functionality is complete and must be preserved, including routes, browser-test selectors and accessibility labels, URL filter state, authentication, image handling, Studio state and unsaved-change protection.
- Stack is fixed: Vite, React 19, TypeScript, React Router 7, TanStack Query, Zod 4, Tailwind CSS v4, Motion, Radix Dialog, Supabase. Motion is the only animation system.
- Screens read data only through hooks in `src/data`; the same screens serve the demo and the signed-in app through one Repository interface.
- Taxonomy (categories, subcategories, colours, occasions, seasons, styles, patterns) is data in `src/domain/taxonomy.ts`. Outfit structure rules live once in `checkOutfit` and are mirrored by the database.
- Images are private storage keys resolved through signed URLs, never public URLs. Uploads are re-encoded on device (EXIF/GPS stripped) without forced cropping; limit 10 MiB, JPEG/PNG/WebP.
- Security: only the Supabase anon key in the client, RLS on every table, no service-role credentials in the repo.
- Out of scope for now: account deletion.

## Brand Commitments

- Name: SILVET. Tagline in use: "Your wardrobe. Your style. Your everyday outfit companion."
- The approved visual reference is binding: `docs/design/SILVET_DESIGN_REFERENCE.pdf` (Foundations v2, "The Fluid Atelier"), with `DESIGN.md` and `docs/design/SILVET_DESIGN_SYSTEM.md` as its implementation notes. If they disagree, the PDF wins.
- Symbol: a bespoke SVG "Selvedge S". A · Selvedge is the officially selected SILVET logo (approved by the founder in M8 Batch 1); its geometry in `design-explorations/silvet-brand/a-selvedge/` is final and is never redrawn. B Stitched and C Fold remain only as archived explorations. Phones show the symbol only; tablets show the full lockup when it fits, otherwise the symbol; desktop shows the full SILVET wordmark. The favicon uses the same symbol geometry.
- Voice: plain, warm and specific; confident without hype; young, not childish. Errors say what happened and what to do; empty states invite the next action.

## Evidence on Hand

- Sample wardrobe: 44 illustrated pieces and sample looks in `src/data/demo/` (flat garment illustrations, not photographs).
- Brand explorations and outlined wordmark: `design-explorations/silvet-brand/`.
- No real user photography, testimonials, customer quotes, press, usage statistics or pricing exist. Do not fabricate any of them.

## Product Principles

1. Your own clothes first: every screen works from what the person owns, and never pushes them to buy.
2. Equal standing for Indian, Western and fusion wear in every list, rule and example.
3. Honest ideas: explain suggestions only with real garment metadata, and say plainly when the wardrobe can't make a look yet.
4. Mobile first in the moment of dressing: primary actions within thumb reach, no task that only works on desktop.
5. Nothing is lost: protect unsaved work, keep state in the URL where it helps, and be explicit about what the demo does not keep.

## Accessibility & Inclusion

WCAG 2.2 AA: text contrast as specified in the design reference, visible focus on every control, 44 × 44 px minimum touch targets, full keyboard paths, 16 px inputs (no iOS zoom) and reduced motion respected without losing state changes.
