# SILVET Design System — implementation reference

For **Claude Code** and **Replit Agent**. This file says how the Fluid Atelier direction is built in code.

- **Visual source of truth:** `docs/design/SILVET_DESIGN_REFERENCE.pdf` (Foundations v2 · approved direction). When code and PDF disagree, the PDF wins.
- **Direction and principles:** `DESIGN.md`.
- **Live reference:** the `/styleguide` route on any preview URL shows every token and component state below.
- **Tokens live in** `src/styles/index.css`. **Components live in** `src/ui` (import from `@/ui`). **Motion lives in** `src/motion/presets.ts`.

PDF page guide: p1 Foundations (colour, type, Selvedge S, space, shape, motion) · p2 Colour by job · p3 Every control, every state · p4 Three layouts · p5–6 Landing · p7–8 Wardrobe · p9 Studio Build · p10 Studio Ideas · p11 Lookbook · p12 Item detail · p13 Add item · p14 Create account (desktop) · p15–16 Mobile screens · p17 Account states.

---

## 1. Rules that are enforced by the build

- **Tailwind's default palette, type scale, radii and shadows are removed** (`--color-*: initial` etc.). `bg-gray-100`, `text-sm`, `rounded-2xl`, `shadow-lg` produce no CSS. Only the tokens below exist.
- **ESLint blocks** raw hex colours and arbitrary `px` values in `className`, and Supabase / `framer-motion` / Radix imports inside `src/features`.
- Garment colours from the taxonomy are **data**, applied inline (`style`) — never as brand tokens.

## 2. Colour tokens

| Tailwind token | Hex | Name | Use · never |
|---|---|---|---|
| `chalk` | `#F4F0E9` | Warm Chalk | Page background (set on `body`). Never a dark mode. |
| `midnight` | `#211A2B` | Midnight Aubergine | Text, primary buttons, tab bar, demo banner, active nav, toasts, **one** dark section per page. |
| `lilac` | `#D9C9EF` | Atelier Lilac | **Selected only.** Text on it is always `text-midnight`. Never a page/section background. |
| `citron` | `#D9F36A` | Electric Citron | **Only on Midnight surfaces.** Never on Chalk (1.09:1), never on Lilac. |
| `chalk-deep` | `#EBE6DD` | Chalk Deep | Garment backdrops, quiet panels, skeletons, hover fills, input fill on press. |
| `graphite-deep` | `#5E5866` | Graphite Deep | **All text under 18 px** that isn't Midnight: captions, metadata, hints, placeholders. 6.0:1. |
| `graphite` | `#77717E` | Graphite | Borders, icons, disabled text, text **≥ 18 px** only. 4.16:1 — fails small text. |
| `danger` | `#A8321F` | Danger | Delete actions and field errors only. 5.9:1. |

**Derived interaction shades** (not brand colours — do not use decoratively):

| Token | Value | Use |
|---|---|---|
| `midnight-hover` | `#2E2539` | Primary button hover |
| `midnight-press` | `#15101C` | Primary button pressed |
| `midnight-muted` | `#B3ACB9` | Inactive tab bar items and secondary text **on Midnight** (7.6:1, from the PDF) |
| `danger-press` | `#8C2918` | Danger button hover/pressed |
| `line` | Midnight 12% | Default 1 px hairlines and dividers |
| `line-strong` | Midnight 28% | Inputs and secondary-button borders, dashed empty slots |
| `scrim` | Midnight 42% | Dialog and sheet overlay |

**Surfaces.** Use the `surface-midnight` utility for any Midnight block: it sets Midnight background, Chalk text and switches the focus ring to Citron for everything inside. Secondary text inside it is `text-midnight-muted`.

**Contrast cheat-sheet.** Midnight on Chalk 14.8 · Midnight on Lilac 10.9 · Citron on Midnight 13.6 · Graphite Deep on Chalk 6.0 · Graphite on Chalk 4.16 (≥ 18 px only) · Danger on Chalk 5.9 · `#B3ACB9` on Midnight 7.6 · Graphite Deep on Lilac 4.4 (**never** — text on Lilac is Midnight).

## 3. Typography tokens

`font-display` = Instrument Serif · `font-sans` = Geist (default). Mobile size is the base token; add `lg:` with the `-lg` token for desktop.

| Style | Classes | Size (mobile → desktop) | Use |
|---|---|---|---|
| Hero | `font-display text-hero lg:text-hero-lg` | 56/52 → 96/88 | Landing hero only |
| Page | `font-display text-page lg:text-page-lg` | 40/40 → 56/56 | One page title per screen (`PageHeader`) |
| Section | `font-display text-section lg:text-section-lg` | 32 → 48 | Section titles, reason numerals |
| Look name | `font-display text-look lg:text-look-lg` | 24 → 28 | Outfit names, sheet/dialog/empty-state titles |
| Lead | `text-lead lg:text-lead-lg` | 16/24 → 18/28 | Short supporting lines |
| Body | `text-body` | 15/23 | Paragraphs |
| UI | `text-ui font-medium` | 14/20 · 500 | Buttons, nav, labels, item names, chips |
| Caption | `text-caption text-graphite-deep` | 13/19 | Metadata, helper text, tags |
| Label | `eyebrow` | 11 · +14% · caps | **Once per view, max** |
| Input | `text-input` | 16 | Every input, select and textarea (iOS never zooms) |

Item metadata is sentence case (`text-caption text-graphite-deep`), not uppercase eyebrows. Field labels are `text-ui font-medium`.

## 4. Space, shape, elevation

- **Spacing:** Tailwind's 4 px scale. Use 1 · 2 · 3 · 4 · 5 · 6 · 8 · 10 · 12 · 16 (= 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 px).
- **Gutters:** `px-5 sm:px-8 lg:px-10` (20 / 32 / 40). `Page` applies them.
- **Grid gaps:** `gap-3` (12) on phone/tablet, `lg:gap-5` (20) on desktop.
- **Radius:** `rounded-xs` (2 px) on everything you tap · `rounded-t-sheet` (16 px) on mobile sheets only · `rounded-full` only for dots, avatars and colour swatches. No pills.
- **Borders:** `border border-line` default; `border-line-strong` for inputs and secondary buttons; dashed `border-line-strong` for empty slots and zero-result chips.
- **Shadow:** `shadow-sheet` on the mobile sheet. That is the only shadow.

## 5. Breakpoints and layout

| Range | Tailwind | Shell |
|---|---|---|
| Phone < 640 | base | Midnight tab bar (64 px + safe area), bottom sheets |
| Tablet 640–1023 | `sm:` (`md:` = 768 for two-column item detail) | Same tab bar; content max 720 (`sm:max-w-[45rem]`); sheets become 360 px side panels |
| Desktop ≥ 1024 | `lg:` | 240 px Chalk rail; no tab bar |

Helpers: `useIsPhone()` (< 640) and `useIsDesktop()` (≥ 1024) from `@/ui`. Wardrobe grid class: `WARDROBE_GRID` (2 → 3 → 4 columns → auto-fill 176 px on desktop).

Per-screen layouts: see `DESIGN.md` §5 and PDF p4.

## 6. Motion (`@/motion/presets`)

| Token | Value | Use |
|---|---|---|
| `duration.press` / `transition.press` | 120 ms | Press feedback, exits |
| `duration.select` / `transition.select` | 200 ms | Select, fade (default for `MotionConfig`) |
| `duration.move` / `transition.move` | 320 ms | Sheets, shared-element moves, garment → slot |
| `ease.out` | `cubic-bezier(.2,0,0,1)` | Everything (CSS: `ease-editorial`) |

Variants: `fade`, `fadeUp`, `stagger()`, `page`, `sheetBottom`, `sheetSide`, `overlay`, `dialog`, `toast`, `slotLand` (garment slides into its slot), `slotSwap`, `ideaLook` + `ideaPiece` (old idea out 120 ms, new pieces in with 40 ms stagger), `savedTick`, `contactSheet`, `tabPress` (0.94), `sharedId.item(id)` for shared-element `layoutId`s, `wordmarkReveal` timing.

Rules: transform and opacity only · no bouncy springs · never block input · `MotionProvider` sets `reducedMotion="user"` and CSS neutralises transitions under `prefers-reduced-motion` · stagger at most ~24 children; fade larger grids as one block · buttons scale to 0.98 when pressed (CSS), tab icons to 0.94.

## 7. Components (`@/ui`) and their states

Every interactive component: **default · hover · focus · pressed · loading · disabled**. Focus = 2 px Midnight ring (offset 2) on Chalk, Citron ring inside `surface-midnight` — handled globally by `:focus-visible` and `--focus-ring`; do not remove outlines. Hover never carries meaning touch can't see.

### Button / ButtonLink
| Variant | Default | Hover | Pressed | Loading | Disabled |
|---|---|---|---|---|---|
| `primary` | Midnight, Chalk label, **Citron →** | `midnight-hover` | `midnight-press`, 0.98 | label → "Saving" + 3 Citron dots | Chalk Deep, Graphite text and arrow |
| `secondary` | Chalk, `line-strong` border | Chalk Deep fill | Chalk Deep + Graphite border | label → "Finding one…" | `line` border, Graphite text |
| `quiet` | underlined Midnight text | underline darkens | — | — | Graphite |
| `danger` | Danger fill, Chalk text | `danger-press` | `danger-press` | "Deleting…" | **only inside `ConfirmDialog`** |
| `danger-quiet` | underlined Danger text ("Delete item") | underline darkens | — | — | opens the confirm dialog |

One primary per view. Primary always carries the Citron arrow (`arrow={false}` to opt out). Sizes `md` (48 px) and `sm` (40 px).

### IconButton
44 × 44, `rounded-xs`, `label` required (aria-label + title). Variants `plain`, `outline`, `solid` (Midnight).

### Chip / ChipRow
- `variant="tab"` — category tab: no border; hover Chalk Deep; selected Lilac fill, medium weight, live `count`.
- `variant="filter"` (default) — 32 px, `line-strong` border; hover Chalk Deep; selected Lilac fill + ✕ when `removable`.
- `empty` — would return 0: dashed, still tappable, the screen explains why.
- 6 px invisible padding above and below for a 44 px target. `ChipRow` scrolls and snaps; its edge fade is fine for chips, **never over garments**.
- Active filters collect in one row above the grid with "Clear all" (screen responsibility).

### ColorSwatch
Garment colour dot (inline colour). `selected` = Chalk gap + Lilac ring + Midnight hairline. Show the selected colour's name in the active-filter row.

### TextField / TextAreaField / SelectField
Boxed, Chalk fill, `line-strong` border, 48 px tall, 16 px text. Label `text-ui font-medium` with "optional"/"required" on the right. Focus 2 px Midnight. Error: Danger border + "!" message (`role="alert"`), errors appear on submit then update as you type, focus moves to the first field to fix. Disabled: dashed and the hint/placeholder **says why** ("Choose a category first"). Native `<select>`.

### GarmentFrame / ItemCard / RemovedItemCard
- 4:5, `rounded-xs`, **Chalk Deep backdrop**, `object-cover` photo. Never a brand colour over or behind the photo.
- No photo: flat garment silhouette in the garment's own colour, tagged **"Illustration"** (sample data) or **"No photo yet"** (account data). Override with `placeholderTag`.
- Hover: image scales 1.02, name underlines. Focus: Midnight ring around the frame. Selected: **Lilac mat outside the frame** (frame scales to 0.93) + Midnight tick badge with a Citron check. Loading: `ItemCardSkeleton`. Removed (deleted piece in a saved look): `RemovedItemCard`, dashed, "No longer in your wardrobe".
- Meta: name `text-ui font-medium`, type `text-caption text-graphite-deep`. Whole card is the target (`to` or `onSelect`).

### Outfit slot (to build in WS5 from these rules)
Empty: dashed `line-strong` frame, "+ Add a layer / an accessory". Filling: Lilac mat + 2 px Midnight edge + "Choosing →". Filled: garment + "Replace · Remove" quiet actions. Issues from `checkOutfit` are written as help, not errors. Accessory slots show "1 of 2".

### Sheet
Bottom sheet under 640 px (16 px top corners, the system's one shadow, handle bar); 360 px side panel from 640 px. Radix handles focus trap, Esc, scroll lock and returning focus to the opener. Title in `text-look`. **Not yet built from the PDF:** open at half height + drag to full (WS5 picker).

### ConfirmDialog
Chalk card on the 42% scrim, serif title, plain consequence ("It's in 2 saved looks. Those looks stay…"). Focus starts on the safe action ("Keep it"); destructive action is `danger`.

### Toast (`useToast`)
Bottom-centre (above the tab bar on mobile), one at a time, 4 s, pauses on hover/focus, `aria-live="polite"`. `success` = Midnight + Citron tick (+ optional action: "View", "Add another", "Keep it"). `error` = Chalk with Danger border and "!", stays until dismissed, has ✕.

### Page states
`StateView` renders exactly one of loading / error / empty / content. `ItemGridSkeleton` matches the real grid (Chalk Deep, slow tonal sweep, no colour). `EmptyState`: serif line, one or two lines of body, one action, quiet progress ("2 of 5") — never streaks. `ErrorState`: reassure ("Nothing is lost — this is usually the connection.") + "Try again".

### Page / PageHeader / SectionRule
`Page` applies gutters and widths. `PageHeader`: optional eyebrow (counts as the view's one label), serif page title, optional lede and actions.

### App shell (`src/app/AppShell.tsx` — Claude Code only)
Desktop rail: Lockup, Wardrobe · Studio · Lookbook; active = `surface-midnight` block + Citron dot; hover Chalk Deep; bottom = "Have an account? Sign in" (demo) or Profile (signed in). No sign-up in the rail. Mobile tab bar: `surface-midnight`, inactive `text-midnight-muted`, active Chalk label + 2 px Citron bar above, icon scales 0.94 on press; Profile appears as the 4th tab when signed in. Demo banner: Midnight, Citron dot, "Sample wardrobe. Illustrated pieces, not your clothes. Looks you save last until you close the tab." + "Create your wardrobe" (phone: "Sample wardrobe · illustrated" + "Start yours").

## 8. Logo, wordmark and reveal

**Status: Selvedge S is an exploration, not a final asset.** The PDF's four refinements: **A · Selvedge** — hairline beside the full stroke; clearest story; base option · **B · Stitched** — hairline as running stitch; reads "atelier", weakens under 24 px · **C · Fold** — hairline only across the spine; calmest; holds at 20 px · **D · Bias cut** — hairline tilted as cloth cut on the bias; most expressive, least legible.

In code (`src/ui/Brand.tsx`): `SilvetMark` is an **interim typeset Instrument Serif "S"** — no custom path, no hairline. `Wordmark` is Instrument Serif caps, tracking 0.22 em. `Lockup` = mark + wordmark with a ⅓-mark gap, compact mark alone below 360 px. The favicon is the interim S on Midnight. When the final Selvedge S SVG is approved, replace `SilvetMark` and `public/favicon.svg` only — every usage goes through the component. The logo hairline is Citron and appears only on Midnight.

**Wordmark reveal (kept, not yet built):** `S → SI → SIL → SILV → SILVE → SILVET`.
- 80 ms per letter (opacity + slight x), 40 ms stagger, 160 ms settle; reverse order to retract.
- The S is anchored; the box is fixed at the full wordmark width so nothing shifts.
- Under reduced motion: no animation, show the full wordmark.
- Calm and purposeful (e.g. rail expand/collapse, landing first paint) — never a loading spinner.
- Timing constants: `wordmarkReveal` in `src/motion/presets.ts`.

## 9. Imagery

- Photos: whole garment, 4:5, consistent light, backdrop matching Chalk Deep (`#EBE6DD`), no faces, natural colour, WebP (~1200 px full, ~400 px thumb). Demo files: `public/demo/<id>.webp` + `<id>-thumb.webp`, then set `photo: true` in `src/data/demo/demoWardrobe.ts`.
- Until then: flat silhouettes in the garment's true colour, tagged "Illustration" / "No photo yet". Indian, Western and fusion equally represented.

## 10. Never

Decorative gradients, gradient text/cards · glows, neon, glass, blur, colour blobs · Citron on Chalk or Lilac · Lilac as a background or with non-Midnight text · brand colour over or behind a garment photo · more than one Midnight section per page · pills, floating cards, dashboard tiles, extra shadows · more than one uppercase label per view · Graphite (`#77717E`) for text under 18 px · fake controls, streaks, fake social proof.

## 11. Screen checklist (before merge)

1. Only `@/ui` components and the tokens above; no raw values.
2. Colour by job: Lilac only for selection, Citron only on Midnight, ≤ 1 Midnight section.
3. Garments are the visual priority; backdrops neutral.
4. Loading, empty, error and success states built.
5. Works at 360, 768 and 1280 px; primary action in the bottom third on phones; 44 px targets.
6. Keyboard: visible focus everywhere, sheets/dialogs return focus.
7. Reduced motion checked.
8. Matches the corresponding PDF page.
