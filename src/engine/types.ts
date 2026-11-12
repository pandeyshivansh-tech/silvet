import type { ClothingItem, OutfitPiece } from "@/domain/types";
import type { OccasionSlug, SeasonSlug, StyleSlug } from "@/domain/taxonomy";

/** All context is supplied by the caller: no clock, randomness, storage or network. */
export interface RecommendationContext {
  occasion: OccasionSlug;
  style?: StyleSlug;
  preferredStyles?: readonly StyleSlug[];
  season?: Exclude<SeasonSlug, "all-season">;
}
export interface Explanation {
  kind: "structure" | "occasion" | "style" | "colour" | "pattern" | "season" | "tradition";
  itemIds: string[];
  message: string;
}
export interface Recommendation {
  fingerprint: string;
  pieces: OutfitPiece[];
  explanations: Explanation[];
  score: number;
}
export type RecommendationResult =
  | { status: "ready"; recommendation: Recommendation }
  | { status: "incomplete" | "incompatible" | "exhausted"; suggestions: string[] };
export type Wardrobe = readonly ClothingItem[];
