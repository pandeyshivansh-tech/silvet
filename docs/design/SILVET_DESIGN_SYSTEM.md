# SILVET Design System — implementation reference

For everyone building SILVET screens. This file says how the Fluid Atelier direction is built in code.

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
| Phone < 640 | base | Compact Chalk top bar (56 px + safe area, Selvedge symbol), Midnight tab bar (64 px + safe area), bottom sheets |
| Tablet 640–1023 | `sm:` (`md:` = 768 for two-column item detail) | Same top bar with the adaptive lockup; same tab bar; content max 720 (`sm:max-w-[45rem]`); sheets become 360 px side panels |
| Desktop ≥ 1024 | `lg:` | 240 px Midnight sidebar with the full lockup; no top bar, no tab bar |

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

Rules: transform and opacity only · calm tweens for anything that appears on its own; a gentle **touch spring** (~320 ms, ~5% overshoot, never wobbly: `spring` in presets, `ease-spring` in CSS) only for what a hand moves — press, select, a piece landing, sliding indicators · never block input · `MotionProvider` sets `reducedMotion="user"` and CSS neutralises transitions under `prefers-reduced-motion` · stagger at most ~24 children; fade larger grids as one block.

Touch layer (M10): buttons and links-as-buttons give to 0.97 under the finger and spring back; the primary Citron arrow nudges forward on hover · chips give to 0.95 · garment cards lift 4 px on hover and give on press (the whole frame moves; a photo is never zoomed or cropped), the selected frame steps in on the spring and its tick pops in · tab and rail indicators slide on the spring, tab icons give to 0.9 · Studio pieces land with a small scale-in, Ideas deal their pieces in (40 ms stagger), toasts rise in on the spring · the weave (`src/polish/WeaveField.tsx`) runs page-wide on the landing page and the auth screens, fixed behind every opaque surface, mouse only, settling away on scroll.

Arrival and travel (M12):
- **Page transitions** use the platform View Transitions API (no library), started by React Router's `viewTransition` on `ButtonLink`, `BackLink`, the rail and tab links, garment cards and Lookbook cards (`RouterProvider` comes from `react-router/dom` so the router can flush the old page first). The old page leaves on the 120 ms exit, the new one settles in on the 200 ms tween (fade + 6 px rise). The shell (`shell-top`, `shell-tabbar`, `shell-rail`) holds still. A garment (`garment`) or a look (`look`) opened from a list morphs into its own page on the touch spring and back again from its back link. List cards carry the name only while that transition runs (`useViewTransitionState`), so a grid never holds two. Browsers without the API just navigate; reduced motion turns every `::view-transition-*` animation off. To give the morph a target, piece and look pages draw at once from the list cache (`useItem(id, true)` / `useOutfit(id, true)`, `placeholderData` only); forms never do.
- **Sliding indicators** inside the pinned rail and the fixed tab bar measure against that bar (`layoutRoot`), so a scroll reset on navigation never reads as movement.
- **Sheets** open on the 320 ms tween. A drag hands its speed to `release`, a spring with no overshoot, so a flick carries on and lands flush with the edge.
- **Ideas** deals a new idea slot by slot (`slotSwap` with `custom` delay, 60 ms apart). A Swap is instant, and the reasons re-arrive per look (40–50 ms cascade).
- **Completion ticks** pop in on the spring: the onboarding step marker and Studio's "The base is complete".
- **Not used:** smooth-scroll libraries (scroll hijacking), WebGL and scroll-jacked pinning on phones.

Smoothness rules (measured with the CPU slowed 4× to phone speed, at 390 and 1440 px):
- **Heavy work never runs inside a tap.** The Ideas engine searches every combination, which would freeze a phone for most of a second, so it runs in a Web Worker (`src/features/style/ideas.worker.ts`). While one idea is on screen the next is already being worked out, so "Another idea" is instant. While a new brief is being worked out the look on screen dims and stays (`aria-busy`); it never blanks. Before the first idea, quiet skeletons fade in only if the wait is long enough to notice.
- **The headline waits for its typeface** (Instrument Serif, at most 700 ms), so on a slow first visit the lines never change shape mid-rise.
- **Canvas layers are only as big as what they draw.** The weave is a pointer-sized patch moved on a GPU transform, never a full-screen bitmap.
- Scroll-linked visuals, sheets and indicators animate transform and opacity only. Photos decode off the main thread (`decoding="async"`) and fade in once loaded.

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
- 6 px invisible padding above and below for a 44 px target. `ChipRow` scrolls and snaps; no edge fade — the next chip peeking past the gutter shows it scrolls; **never over garments**.
- Active filters collect in one row above the grid with "Clear all" (screen responsibility).

### ColorSwatch
Garment colour dot (inline colour). `selected` = Chalk gap + Lilac ring + Midnight hairline. Show the selected colour's name in the active-filter row.

### TextField / TextAreaField / SelectField
Boxed, Chalk fill, `line-strong` border, 48 px tall, 16 px text. Label `text-ui font-medium` with "optional"/"required" on the right. Focus 2 px Midnight. Error: Danger border + "!" message (`role="alert"`), errors appear on submit then update as you type, focus moves to the first field to fix. Disabled: dashed and the hint/placeholder **says why** ("Choose a category first"). Native `<select>`. `hideLabel` keeps the label for assistive tech only — for compact search rows whose placeholder says what to type. `trailing` puts a small control inside the right edge of a TextField (the password "Show"/"Hide" toggle); it keeps its own accessible name.

### GarmentFrame / ItemCard / RemovedItemCard
- 4:5, `rounded-xs`, **Chalk Deep backdrop**, photo shown whole with `object-contain` (never cropped, never tinted) and faded in once decoded, so a slow signed URL shows the quiet frame, not a half-drawn image. Never a brand colour over or behind the photo.
- No photo: flat garment silhouette in the garment's own colour (accessories use their own: cap, jewellery, scarf/dupatta, watch, belt, sunglasses; bag otherwise — `garmentGlyphPaths.ts`), tagged **"Illustration"** (sample data) or **"No photo yet"** (account data). Override with `placeholderTag`.
- Hover: a drawn garment scales 1.02 (a photo never does — the frame would clip its edges), name underlines. Focus: Midnight ring around the frame. Selected: **Lilac mat outside the frame** (frame scales to 0.93) + Midnight tick badge with a Citron check. Loading: `ItemCardSkeleton`. Removed (deleted piece in a saved look): `RemovedItemCard`, dashed, "No longer in your wardrobe".
- Meta: name in the display serif (`font-display text-lead-lg`), type `text-caption text-graphite-deep`. Whole card is the target (`to` or `onSelect`).
- `WARDROBE_GRID`: 2 columns on phones, 3 from 640 px, 4 from 1280 px; gaps widen with the screen (12/32 → 20/40 → 32/48 px).

### OutfitSlot (M8 Batch 3)
One place in a look, shared by Studio Build and Ideas. Label line ("Top", "Layer · optional"). Filled: neutral `GarmentFrame` (no brand colour over photos), name, optional detail line; with `onChoose` the frame is a "Replace {slot}" button plus a quiet "Replace" link; `onRemove` adds a ✕ "Remove {slot}" on a Chalk chip. Empty + choosable: dashed `line-strong` frame, "+ Add {slot} / Choose a piece" (optional slots stay short on phones via `compact`). Removed piece: "Replace removed piece · No longer in your wardrobe" + "Remove placeholder". Garment changes crossfade with `slotSwap` (200 ms, opacity only). `action` slot carries Ideas' "Swap". Issues from `checkOutfit` are written as help, not errors.

### Sheet
Bottom sheet under 640 px (16 px top corners, the system's one shadow, handle bar); 360 px side panel from 640 px. Radix handles focus trap, Esc, scroll lock and returning focus to the opener. Title in `text-look`. Radix only refocuses a `Dialog.Trigger`, so `useReturnFocus` records the opener and hands focus back (Sheet and ConfirmDialog). Phone sheets drag down from the handle or title to dismiss. `phoneHeight="half"` (long pickers): opens at 50% of the screen, drags or taps (the handle is an "Expand sheet" button) to 88%; while collapsed the scroll area ends at the fold and the footer stays on screen. Transform only; reduced motion snaps.

### ActionMenu (⋯)
`IconButton` trigger with an explicit label ("More actions for …"). Phones: a Sheet of 56 px rows. Tablet/desktop: popover `role="menu"`, ↑/↓/Home/End, Esc returns focus to ⋯, Tab or outside press closes; opens toward the side with room. The chosen action runs after the menu closes, so a ConfirmDialog it opens owns focus. Destructive rows use `text-danger` and must still confirm.

### FilterSheet
Phone-only "Filters" button (Lilac count badge, announced as "N active") opening a Sheet of the screen's own filter controls. Nothing is staged: changes write straight to URL state; footer = quiet "Reset filters" + primary "Show N pieces" (closes).

### StickyActionBar
A screen's primary actions, stuck above the tab bar + home-indicator safe area under 1024 px (Chalk, hairline top, full bleed), an ordinary row from 1024 px. While stuck it sets `--action-bar-height` so toasts lift above it. One per screen.

### ReasonPanel
The "Why this works" block: one `surface-midnight` panel (counts as the page's Midnight section), Chalk serif title, numbered reasons with Citron serif numerals, Chalk body text.

### ConfirmDialog
Chalk card on the 42% scrim, serif title, plain consequence ("It's in 2 saved looks. Those looks stay…"). Focus starts on the safe action ("Keep it"); destructive action is `danger`.

### Toast (`useToast`)
Bottom-centre (above the tab bar on mobile), one at a time, 4 s, pauses on hover/focus, `aria-live="polite"`. `success` = Midnight + Citron tick (+ optional action: "View", "Add another", "Keep it"). `error` = Chalk with Danger border and "!", stays until dismissed, has ✕.

### Page states
`StateView` renders exactly one of loading / error / empty / content. `ItemGridSkeleton` matches the real grid (flat Chalk Deep, slow opacity pulse, no gradient, no colour). `EmptyState`: serif line, one or two lines of body, one action, quiet progress ("2 of 5") — never streaks. `ErrorState`: reassure ("Nothing is lost — this is usually the connection.") + "Try again" (or a custom `action`), with a "!" in a Danger ring. `SuccessState`: `role="status"`, tick in a `line-strong` ring, serif title, optional body and next action.

### Page / PageHeader / SectionRule
`Page` applies gutters and widths and is the screen's one `<main id="main" tabIndex={-1}>` (the shell's "Skip to content" link focuses it; Profile renders its own `main#main` outside the shell). `PageHeader`: optional eyebrow (counts as the view's one label), serif page title, optional lede and actions; actions stay beside a short title and wrap under a long one. `BackLink`: quiet "← My wardrobe" above a detail or form heading.

### Wardrobe (M8 Batch 4)
Garments first. Header, then one toolbar row (compact search + Filters) and the scrollable category tabs; the first row of garments shows on the first phone screen. Detailed filters (type, occasion, season, style, Indian wear, colour) live in the FilterSheet on phones and in a panel under the toolbar from 640 px (opens itself when the URL carries detailed filters). Active filters show as Lilac removable chips with "Reset filters". Detail: photo leads (left from 768 px, sticky on desktop), serif name as the page `h1`, Edit/Delete under it from 768 px, metadata as a hairline definition list. Add/edit: photo panel first, then "The piece" / "Colour and pattern" / "When you wear it" sections, Save in the StickyActionBar.

### Studio (M8 Batch 5)
Build: the board is the centrepiece. "The base" (Top + Bottom + Layer, or One-piece / set + Layer, with the base switch beside the heading) leads at full size; "Finishing touches" (Footwear, Accessory 1–N) follow. Every place is an `OutfitSlot`: empty = dashed Chalk frame naming the step ("Add Top"); filled = the garment with nothing over the photo, serif name, then Replace · Remove text actions (the frame itself is "Replace …"); removed = dashed "No longer in your wardrobe" + "Remove placeholder"; active (picker open for it) = Lilac mat, frame steps in to 0.94, "Choosing" beside the label. Name and notes sit in a quiet right column (under the board on phones); Save is the StickyActionBar. The picker is a wide side panel from 1024 px (480 px), half sheet on phones, with search, an Indian wear chip, a live piece count and type tabs.
Ideas: the brief is three borderless serif selects on one hairline row (Occasion full width on phones); the look follows under "Your {occasion} look", base and layer large, finishing touches below, each with Swap. "Why this works" is the `ReasonPanel` (the one Midnight surface on the page) beside the look from 1024 px, with Save look / Another idea in the StickyActionBar under it and Open in Build / View saved look as quiet links.

### Lookbook (M8 Batch 6)
Follows PDF p11. Header: "Lookbook", "N saved looks · newest first", "Build a new look" (secondary). The newest look leads on the page's one Midnight panel (side by side from 768 px): its flat-lay, a Citron dot with "Latest · from Ideas" / "built in Studio", serif name, the piece names, "Open look" and the look's ⋯. The rest follow in the wardrobe grid as cards: flat-lay, serif name, "4 pieces · built in Studio" (· "N removed"), ⋯ menu with Edit in Studio and Delete look… (same confirmation as the detail page; after deleting, focus moves to the page). The whole card is one link (stretched over it) with the ring on the card. Empty: dashed garment drawing, "Your first look starts here.", Create an outfit + Get an idea.
**Flat-lay** (`features/lookbook/LookFlatLay.tsx`): one Chalk Deep mat per look; base and layer large across the top, footwear bottom-left, accessories bottom-right. Photos whole (object-contain, never cropped or tinted), fading in once decoded; no photo or a failed photo → the garment drawing in its colour; removed piece → faint outline. One "Illustration" / "No photos yet" tag per mat, only when nothing on it is a photo. One accessible image per mat, labelled slot by slot.
**Saved look detail:** same frame as garment detail — flat-lay left (sticky on desktop), eyebrow "Saved look · built in Studio", serif name, piece count, Edit in Studio + Delete look from 768 px, notes as a serif pull line, then Made / Occasion (only occasions every tagged piece shares, at least two) / Saved or Updated. "The pieces" grid below keeps each garment card and the removed placeholder. Below 768 px the actions sit in the sticky bar; on phones Delete is behind ⋯.

### Authentication (M8 Batch 7)
Follows PDF p14 and p17. `features/auth/AuthFrame.tsx`: from 768 px a 50/50 split. Left: Chalk Deep, sticky full height, full lockup (home link), the sample look drawn from the demo wardrobe (teal saree, black blazer, gold juttis — garment drawings in their taxonomy colours, tagged "Sample look · illustrated"), and the serif line "A saree on Saturday, a blazer on Monday. *One wardrobe.*" Right: Chalk, form column max 24 rem, serif title + one line. Below 768 px the look shrinks to a short Chalk Deep band (symbol, "One wardrobe, every occasion.", small garments) so the primary action stays on the first screen at 390. Order: Continue with Google (Google's own four-colour G, `AuthParts.tsx`) → "or with email" → fields → Midnight primary → "New here? / Already have an account?" → "Just looking? Explore the sample wardrobe" (sign-in and sign-up only). Google stays visible when the project has no Google provider: disabled, with the reason under it. Password fields carry "Show"/"Hide" inside the box (label "Show password"/"Hide password"); update-password's one toggle reveals both fields. Form-level errors: Danger border, "!" icon, Midnight text (`AuthMessage`); field errors stay on the field. No "required" marks on auth forms (every field is needed); no testimonials, counts or customer photos.

### Onboarding and profile (M8 Batch 7)
Onboarding is a two-step setup on one page (name, then style), both optional: numbered markers turn into ticks when answered, a progress list beside the form from 1024 px ("1 of 2 answered" in the header below that), primary "Save and continue" + quiet "Skip for now" in a bar that sticks to the bottom on phones. Style preferences are grouped for reading — **Indian and fusion** (Traditional, Indo-western fusion, each explained in one line) then **Western and everyday** — from `STYLE_GROUPS` in `domain/taxonomy.ts` (display only; STYLES order is the database's). Profile: the page's one Midnight panel is the account — initial, serif name, email, "Your style" in the order chosen (Citron dots), Sign out. Below: "Edit your profile" (same grouped chips, save row says "unsaved changes" / "saved") beside "Your spaces" links and a dashed "The sample wardrobe" note that keeps the demo clearly apart from the account.

### Landing (M8 Batch 8)
Follows PDF p5–6 (desktop) and p4 (phone order). `features/landing/LandingPage.tsx` + `LandingVisuals.tsx`. Header: `<Lockup reveal />` home link; "How it works" (md+), "Sample wardrobe" (sm+), secondary "Sign in". Signed in (M8 Batch 9): "Sign in" and both "Create your wardrobe" actions become "Open my wardrobe" (`/app/wardrobe`), the hero leads with it and keeps "Explore the sample wardrobe" as the secondary button, and "No account needed to explore." is hidden. "How it works" links move focus to the section without adding a history entry; `/#how-it-works` still opens there directly. Motion pass (M9): the hero carries `WeaveField`, a fine warp-and-weft weave in Line Strong that appears only around a fine pointer and fades at rest (off for touch and reduced motion, never a brand colour). Scroll language (M11, `src/motion/useScrollSettle.ts`, Motion `useScroll`, linked to the scrollbar both ways, transform + opacity only, static under reduced motion): every landing visual *settles* as it arrives (rises 48 px, 96% → 100%, fades in between the bottom of the screen and 60% up); the hero look *recedes* as you leave it (drifts 80 px, to 94%). From 768 px "How it works" is a pinned story: the drawing stays put and changes (fade + touch-spring settle) to the step crossing the line 35% down the screen, a hairline beside the steps fills in Midnight with your progress, the active step gets a Midnight rule and the others sit at 40%. Below 768 px the steps stack and each drawing settles in. Wardrobe: filtering glides kept cards to their new places and fades the rest (`layout="position"`, 320 ms; transforms off under reduced motion). Arrival (M12): the headline lines rise out of their own clips one after another (`lineRise`, 80 ms apart, clip cut vertically only, with em room for descenders and the italic). Then the hero look assembles: the mat appears, each piece lands on it and in its slot strip at the same moment (`pieceLand`, 90 ms apart), the open Layer slot lights Lilac and "Saved to Lookbook" pops (~1.2 s in all). It plays once, when the look first comes into view. The header is sticky: it steps away while you read down and returns on any scroll up, on a Chalk backing with a hairline once off the top. On phones a Chalk bar with the main action ("Explore the sample wardrobe", or "Open my wardrobe" when signed in) rises once the hero's buttons have scrolled away, and leaves before the closing panel. **Hero:** eyebrow, `text-hero` "Kurta, Monday. / Cargos, Friday. / Both, Sunday." (no italic accent), one lede, Midnight "Explore the sample wardrobe" + secondary "Create your wardrobe", "No account needed to explore." + "See how it works ↓". Beside it (below on phones, after the buttons, so the CTA sits ~480 px down at 390): the "Fusion for campus" sample look as a Lookbook flat-lay with a Midnight "✓ Saved to Lookbook" tag (Citron tick), a five-slot strip (Top · Bottom · Footwear · Accessory filled, Layer empty in Lilac) and a caption with "Open in Studio" (demo Studio, that look). **Three things, done well** (`#how-it-works`): three fixed-ratio panels (piece added toast · slot strip with Bottom selected in Lilac · Lookbook of three looks), each with a serif "01–03", sans title and one line. **What’s inside:** Wardrobe, Studio, Ideas, Lookbook, each drawn with the app's own components on demo data (`ItemCard`, read-only `OutfitSlot`, `Chip`, `LookFlatLay`); Ideas shows the engine's real reasons for the sample look and says plainly it is rules (colour, formality, occasion, season, style), not AI. Lookbook looks scroll sideways with snap on phones (focusable list), three columns from 640 px. **Close:** the page's one Midnight panel, inset with `rounded-xs` from 768 px and full-bleed on phones: Selvedge S, "Start with five pieces you wear every week.", Chalk "Create your wardrobe →" + outlined "Explore the sample". All vignettes are `inert` + `aria-hidden` (no extra tab stops); garments are tagged "Illustration". On arrival only the hero plays (headline, look, Saved tick); with reduced motion nothing moves (app-wide policy: transforms off, short opacity fades stay) and the wordmark shows complete. No counts, ratings, quotes or logos.

### App shell (`src/app/AppShell.tsx`, core: not a screen task)
Top bar (< 1024): Chalk, hairline bottom border, `Lockup size="sm"` (symbol on phones, full lockup on tablets when it fits), quiet "Sign in" on the right in the demo; sticky with the demo banner under it; `html` scroll-padding clears it. Desktop sidebar (M8 Batch 2): `surface-midnight`, Lockup with Citron selvedge edge, Wardrobe · Studio · Lookbook; inactive `text-midnight-muted`, hover and active = `bg-midnight-hover` with Chalk label, active adds a 2 px Citron edge that slides between items (Motion `layoutId`, 320 ms); bottom = "Have an account? Sign in" (demo) or Profile (signed in). No sign-up in the rail. Mobile tab bar: `surface-midnight`, inactive `text-midnight-muted`, active Chalk label + 2 px Citron bar above (slides between tabs), icon scales 0.94 on press; Profile appears as the 4th tab when signed in. Demo notice under 1024 px: Midnight banner under the top bar, Citron dot, "Demo wardrobe. Pieces and looks stay in this tab only. Photos are not stored." + "Create your wardrobe" (phone: "Demo wardrobe · session only" + "Start yours"). From 1024 px the same words and link sit in a `bg-midnight-hover` note at the sidebar foot, so no Midnight strip meets the Midnight sidebar.

## 8. Logo, wordmark and reveal

**Status: A · Selvedge is approved (founder, M8 Batch 1).** Geometry comes verbatim from `design-explorations/silvet-brand/a-selvedge/mark.svg`; the wordmark is the outlined Instrument Serif from `assets/wordmark-outlined.svg`. Do not redraw, simplify or re-space either without founder approval.

In code (`src/ui/Brand.tsx`): `SilvetMark` (currentColor; the selvedge edge turns Citron only inside `surface-midnight`), `Wordmark` (outlined SVG, full SILVET, used on its own), and `Lockup`. The full lockup reads as one word (founder request, M8 Batch 5): the Selvedge S is the first letter, followed by the wordmark's own ILVET glyphs. Nothing is redrawn; placement only: the mark keeps its 1em box, ILVET is 0.8643em tall so the mark's ink height equals the wordmark S's, set 0.0817em down so the tops align, 0.1059em after the mark so the gap equals the wordmark's own S-to-I gap. Responsive identity: symbol only below 640 px; 640–1023 px the full lockup whenever its container can hold it (container query), otherwise the symbol; 1024 px and up always the full lockup. `public/favicon.svg` uses the same paths: Midnight on light browser chrome, Chalk with a Citron edge on dark (`prefers-color-scheme`). `public/apple-touch-icon.png` (180 px, opaque Chalk, Midnight mark) is rendered from the unchanged `mark.svg` paths.

**Wordmark reveal (built on the landing header, `<Lockup reveal />`):** `S → SI → SIL → SILV → SILVE → SILVET`. Built as opacity only, starting 160 ms after first paint; retract is not built.
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
