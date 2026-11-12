# A · Selvedge

## Design rationale

A broad, hand-drawn ribbon makes the S legible through its ink silhouette first: the upper and lower turns counterbalance around a clearly pinched center, while the tapered diagonal terminals give the form a cloth-like direction. The silhouette is intentionally substantial rather than a typeset S with a decorative hairline.

One continuous edge tracks the ribbon’s long side as a selvedge. It is now a genuinely separate, narrow strip: a transparent channel is masked from the primary silhouette, then the finer edge is drawn inside that channel. The transparent margins keep the edge legible in one ink, without relying on a color change or adding visual weight. Rounded ends and a quietly changing offset suggest a finished fabric edge without turning the mark into a literal seam illustration.

## Color and use

- On Warm Chalk `#F4F0E9`: use Midnight Aubergine `#211A2B` for the symbol (`currentColor`).
- On Midnight Aubergine `#211A2B`: use Warm Chalk `#F4F0E9` for the primary path; the parent may recolor only `[data-role="detail"]` to Electric Citron `#D9F36A`.
- In true single-ink use, keep both paths the same `currentColor`. The channel around the detail remains transparent, so the separation survives without a color change. The SVG has no background.
- Keep the existing Instrument Serif SILVET wordmark as a separately composed lockup; this asset is the symbol only.

## Small-size tradeoff

The S’s outer mass is the recognition cue at 16 px. A 6.5-unit transparent channel surrounds the 2.5-unit detail stroke in the 64-unit viewBox; at 16 px, the strip is about 0.6 px wide with transparent margins of about 0.5 px on either side. Inspect the channel’s continuity and the clear opening of both S turns at 16 px on Chalk and Midnight, especially in the single-ink versions. At 24/32 px, the separated edge should resolve more clearly without competing with the silhouette.
