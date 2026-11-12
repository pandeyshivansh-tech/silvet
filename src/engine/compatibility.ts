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
  add("occasion", occasionMatches, `${occasionMatches.map((item) => item.name).join(", ")} ${occasionMatches.length === 1 ? "is" : "are"} tagged for ${labelOf.occasion(context.occasion).toLowerCase()}.`, occasionMatches.length * 4);
  const styleMatches = context.style ? selected.filter((item) => item.styleTags.includes(context.style!)) : [];
  add("style", styleMatches, `${styleMatches.map((item) => item.name).join(", ")} ${styleMatches.length === 1 ? "has" : "have"} your selected ${context.style ? labelOf.style(context.style).toLowerCase() : ""} style tag.`, styleMatches.length * 3);
  const indian = base.filter((item) => traditionOf(item) === "indian");
  const western = base.filter((item) => traditionOf(item) === "western");
  if (indian.length && western.length) {
    add("tradition", [...indian, ...western], `${indian.map((item) => item.name).join(", ")} and ${western.map((item) => item.name).join(", ")} combine Indian and Western garment types.`, context.style === "fusion" ? 8 : 2);
  }
  if (context.style === "traditional") score += indian.length * 4;
  if (context.season) {
    const seasonal = selected.filter((item) => item.seasonTags.includes(context.season!));
    add("season", seasonal, `${seasonal.map((item) => item.name).join(", ")} ${seasonal.length === 1 ? "is" : "are"} tagged for ${labelOf.season(context.season).toLowerCase()}.`, seasonal.length * 2);
  }
  const knownColours = base.filter((item) => getColor(item.primaryColor));
  const neutrals = knownColours.filter((item) => getColor(item.primaryColor)?.isNeutral);
  add("colour", neutrals, `${neutrals.map((item) => `${item.name} (${getColor(item.primaryColor)!.label.toLowerCase()})`).join(", ")} ${neutrals.length === 1 ? "provides a neutral colour" : "provide neutral colours"}.`, neutrals.length);
  if (knownColours.length > 1 && knownColours.every((item) => getColor(item.primaryColor)?.family === getColor(knownColours[0]!.primaryColor)?.family)) score += 2;
  const patterned = base.filter((item) => item.pattern && item.pattern !== "solid");
  const solid = base.filter((item) => item.pattern === "solid");
  if (patterned.length === 1 && solid.length) {
    add("pattern", [...patterned, ...solid], `${patterned[0]!.name} has a ${labelOf.pattern(patterned[0]!.pattern)!.toLowerCase()} pattern alongside ${solid.map((item) => item.name).join(", ")} tagged solid.`, 2);
  }
  score -= Math.max(0, patterned.length - 1);
  // Optional pieces are not added just to fill slots. Reward appropriate footwear
  // and a winter/formal layer; otherwise an equally good simpler look wins.
  if (shoes) score += 2;
  if (layer && (context.season === "winter" || (formalLayer && min === 3))) score += 4;
  const onePiece = base.find((item) => slotOf(item) === "one_piece");
  const structure: Explanation = {
    kind: "structure", itemIds: base.map((item) => item.id),
    message: onePiece ? `${onePiece.name} supplies the complete one-piece / set base.`
      : `${base.map((item) => item.name).join(" and ")} supply the top-and-bottom base.`,
  };
  return { score, explanations: [...evidence.slice(0, 2), structure] };
}
