/// <reference lib="webworker" />
import { recommend } from "@/engine/recommend";
import type { RecommendationContext, Wardrobe } from "@/engine/types";

/** Runs the unchanged engine off the main thread, so finding an idea never freezes a tap or an animation. */
self.onmessage = ({ data }: MessageEvent<{ id: number; items: Wardrobe; context: RecommendationContext; seen: string[] }>) => {
  self.postMessage({ id: data.id, result: recommend(data.items, data.context, data.seen) });
};
