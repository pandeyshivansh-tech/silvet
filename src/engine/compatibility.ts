/**
 * Recommendation policy, not additional manual-builder domain rules.
 * Explicit occasion tags override coarse subcategory formality defaults.
 * Untagged/unknown metadata is unknown, not an invented match.
 * Colour/pattern/style preferences rank candidates; they never prohibit fusion.
 */
import { checkOutfit } from "@/domain/outfitRules";
import { formalityOf, getColor, labelOf, OCCASIONS, slotOf, traditionOf } from "@/domain/taxonomy";
import type { ClothingItem, OutfitPiece } from "@/domain/types";
import type { Explanation, RecommendationContext, Wardrobe } from "./types";

export function eligible(item: ClothingItem, context: RecommendationContext): boolean {
  if (context.occasion === "active" && !item.occasionTags.includes("active")) return false;
  return !context.season || item.seasonTags.length === 0 ||
    item.seasonTags.includes("all-season") || item.seasonTags.includes(context.season);
}

export function evaluate(
  pieces: readonly OutfitPiece[], wardrobe: Wardrobe, context: RecommendationContext,
): { score: number; explanations: Explanation[] } | null {
  const byId = new Map(wardrobe.map((item) => [item.id, item]));
  const check = checkOutfit(pieces, (id) => byId.get(id));
  if (!check.valid || !check.complete) return null;
  const items = pieces.map((piece) => byId.get(piece.itemId ?? ""));
  if (items.some((item) => !item || !eligible(item, context))) return null;
  const selected = items as ClothingItem[];
  const base = selected.filter((item) => ["top", "bottom", "one_piece"].includes(slotOf(item)));
  const layer = selected.find((item) => slotOf(item) === "outerwear");
  if (!base.some((item) => slotOf(item) === "top" || slotOf(item) === "one_piece") && layer) base.push(layer);
  const [min, max] = OCCASIONS.find((occasion) => occasion.slug === context.occasion)!.formality;
  const formalLayer = layer && formalityOf(layer) === 3;
  // A formal layer may lift smart separates to a formal occasion, not sportswear
  // to a wedding. Explicit garment tags take precedence over type-level defaults.
  for (const item of base) {
    const formality = formalityOf(item);
    if (item.occasionTags.includes(context.occasion) || formality === null) continue;
    if (formality > max || (formality < min && !(formalLayer && formality >= min - 1))) return null;
  }
  const shoes = selected.find((item) => slotOf(item) === "footwear");
  if (min === 3 && shoes && formalityOf(shoes) === 1 && !shoes.occasionTags.includes(context.occasion)) return null;
  if (layer && !base.includes(layer) && min === 3 && formalityOf(layer) === 1 &&
    !layer.occasionTags.includes(context.occasion)) return null;
  // A ceremonial layer is not inferred to be everyday wear, unless explicitly tagged.
  if (layer && !base.includes(layer) && formalityOf(layer) === 3 && max < 3 &&
    !layer.occasionTags.includes(context.occasion)) return null;

  let score = 0;
  const evidence: Explanation[] = [];
  const add = (kind: Explanation["kind"], garments: ClothingItem[], message: string, points: number) => {
    if (!garments.length) return;
    score += points;
    evidence.push({ kind, itemIds: garments.map((item) => item.id), message });
  };
  const occasionMatches = selected.filter((item) => item.occasionTags.includes(context.occasion));
  const occasion = labelOf.occasion(context.occasion).toLowerCase();
  add("occasion", occasionMatches, occasionMatches.length === selected.length && selected.length > 1
    ? `Every piece here is one you tagged for ${occasion}.`
    : `${few(occasionMatches)} ${occasionMatches.length === 1 ? "is" : "are"} tagged for ${occasion}.`, occasionMatches.length * 4);
  const styleMatches = context.style ? selected.filter((item) => item.styleTags.includes(context.style!)) : [];
  add("style", styleMatches, `${few(styleMatches)} ${styleMatches.length === 1 ? "carries" : "carry"} the ${context.style ? labelOf.style(context.style).toLowerCase() : ""} style you asked for.`, styleMatches.length * 3);
  const preferred = new Set(context.preferredStyles ?? []);
  preferred.delete(context.style!); // Do not count an explicitly selected style twice.
  const preferenceMatches = selected.filter((item) => item.styleTags.some((tag) => preferred.has(tag)));
  if (preferenceMatches.length) {
    score += preferenceMatches.reduce((sum, item) => sum + item.styleTags.filter((tag) => preferred.has(tag)).length * 2, 0);
    const styles = [...new Set(preferenceMatches.flatMap((item) => item.styleTags.filter((tag) => preferred.has(tag))))].map(labelOf.style);
    const message = `${few(preferenceMatches)} ${preferenceMatches.length === 1 ? "leans" : "lean"} toward styles you saved: ${styles.join(", ")}.`;
    const existing = evidence.find((reason) => reason.kind === "style");
    if (existing) {
      existing.message += ` It also leans toward styles you saved: ${styles.join(", ")}.`;
      existing.itemIds = [...new Set([...existing.itemIds, ...preferenceMatches.map((item) => item.id)])];
    } else evidence.push({ kind: "style", itemIds: preferenceMatches.map((item) => item.id), message });
  }
  const indian = base.filter((item) => traditionOf(item) === "indian");
  const western = base.filter((item) => traditionOf(item) === "western");
  if (indian.length && western.length) {
    add("tradition", [...indian, ...western], `${indian[0]!.name} with ${western[0]!.name}: Indian and Western worn together.`, context.style === "fusion" ? 8 : 2);
  }
  if (context.style === "traditional") score += indian.length * 4;
  if (context.season) {
    const seasonal = selected.filter((item) => item.seasonTags.includes(context.season!));
    add("season", seasonal, seasonal.length === selected.length && selected.length > 1
      ? `Every piece here is tagged for ${labelOf.season(context.season).toLowerCase()}.`
      : `${few(seasonal)} ${seasonal.length === 1 ? "is" : "are"} tagged for ${labelOf.season(context.season).toLowerCase()}.`, seasonal.length * 2);
  }
  const knownColours = base.filter((item) => getColor(item.primaryColor));
  const neutrals = knownColours.filter((item) => getColor(item.primaryColor)?.isNeutral);
  add("colour", neutrals, neutrals.length === 1
    ? `${neutrals[0]!.name} is a neutral (${getColor(neutrals[0]!.primaryColor)!.label.toLowerCase()}), so the other colours can lead.`
    : `${few(neutrals)} are neutrals (${[...new Set(neutrals.map((item) => getColor(item.primaryColor)!.label.toLowerCase()))].join(", ")}), so the look stays easy to wear.`, neutrals.length);
  if (knownColours.length > 1 && knownColours.every((item) => getColor(item.primaryColor)?.family === getColor(knownColours[0]!.primaryColor)?.family)) score += 2;
  const patterned = base.filter((item) => item.pattern && item.pattern !== "solid");
  const solid = base.filter((item) => item.pattern === "solid");
  if (patterned.length === 1 && solid.length) {
    add("pattern", [...patterned, ...solid], `${patterned[0]!.name} is the only pattern (${labelOf.pattern(patterned[0]!.pattern)!.toLowerCase()}); the solid pieces let it lead.`, 2);
  }
  score -= Math.max(0, patterned.length - 1);
  // Optional pieces are not added just to fill slots. Reward appropriate footwear
  // and a winter/formal layer; otherwise an equally good simpler look wins.
  if (shoes) score += 2;
  if (layer && (context.season === "winter" || (formalLayer && min === 3))) score += 4;
  const onePiece = base.find((item) => slotOf(item) === "one_piece");
  const structure: Explanation = {
    kind: "structure", itemIds: base.map((item) => item.id),
    message: onePiece ? `${onePiece.name} is a complete outfit on its own; everything else finishes it.`
      : `It starts from ${few(base)}; everything else finishes it.`,
  };
  return { score, explanations: [...evidence.slice(0, 2), structure] };
}

/** Reasons name at most two pieces, so they read like a stylist's note rather than a list. Wording only. */
function few(items: readonly ClothingItem[]): string {
  const names = items.map((item) => item.name);
  if (names.length <= 2) return names.join(" and ");
  const more = names.length - 2;
  return `${names[0]}, ${names[1]} and ${more} more ${more === 1 ? "piece" : "pieces"}`;
}
