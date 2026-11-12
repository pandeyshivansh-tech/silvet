import { useEffect, useMemo, useState } from "react";
import { makeRecommendation, recommend } from "@/engine/recommend";
import { swapPiece } from "@/engine/swap";
import type { RecommendationContext, RecommendationResult, Wardrobe } from "@/engine/types";
import type { StyleSlug } from "@/domain/taxonomy";
const noPreferences: readonly StyleSlug[] = [];

function remember(seen: string[], result: RecommendationResult): string[] {
  return result.status === "ready" ? [...new Set([...seen, result.recommendation.fingerprint])] : seen;
}
function readHistory(key: string): { seen: string[]; warning: boolean } {
  try {
    const raw = sessionStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed) || !parsed.every((entry) => typeof entry === "string")) throw new Error("Invalid history");
    return { seen: parsed, warning: false };
  } catch {
    return { seen: [], warning: true };
  }
}

/** Browser/session concerns are deliberately outside the pure engine. */
export function useIdeaSession(items: Wardrobe, namespace: string, initialContext: RecommendationContext = { occasion: "everyday" }, preferences: readonly StyleSlug[] = noPreferences) {
  const key = `silvet.ideas.seen.${namespace}.v1`;
  const [session, setSession] = useState(() => {
    const history = readHistory(key);
    const context: RecommendationContext = { ...initialContext, preferredStyles: preferences };
    const result = recommend(items, context, history.seen);
    return { context, result, seen: remember(history.seen, result) };
  });
  const [historyWarning, setHistoryWarning] = useState(() => readHistory(key).warning);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    try { sessionStorage.setItem(key, JSON.stringify(session.seen)); }
    catch { setHistoryWarning(true); }
  }, [key, session.seen]);
  useEffect(() => {
    setSession((current) => {
      if (JSON.stringify(current.context.preferredStyles) !== JSON.stringify(preferences)) {
        const context = { ...current.context, preferredStyles: preferences };
        const fingerprint = current.result.status === "ready" ? current.result.recommendation.fingerprint : null;
        const history = current.seen.filter((entry) => entry !== fingerprint);
        const result = recommend(items, context, history);
        return { context, result, seen: remember(current.seen, result) };
      }
      const valid = current.result.status === "ready"
        ? makeRecommendation(current.result.recommendation.pieces, items, current.context) : null;
      const result: RecommendationResult = valid ? { status: "ready", recommendation: valid } : recommend(items, current.context, current.seen);
      return { ...current, result, seen: remember(current.seen, result) };
    });
  }, [items, preferences]);
  // Never render a stale invalid outfit, even before wardrobe-change reconciliation.
  const result = useMemo<RecommendationResult>(() => {
    if (session.result.status !== "ready") return session.result;
    const valid = makeRecommendation(session.result.recommendation.pieces, items, session.context);
    return valid ? { status: "ready", recommendation: valid } :
      { status: "incompatible", suggestions: ["Your wardrobe changed. Finding another complete combination."] };
  }, [items, session.context, session.result]);
  const next = (context = session.context, restart = false) => {
    setNotice("");
    setSession((current) => {
      const seen = restart ? [] : current.seen;
      const result = recommend(items, context, seen);
      return { context, result, seen: remember(seen, result) };
    });
  };
  const swap = (index: number) => {
    if (result.status !== "ready") return;
    const alternative = swapPiece(result.recommendation, index, items, session.context, session.seen);
    if (!alternative) {
      setNotice("No unseen compatible replacement is available for this piece. The rest of your look is unchanged.");
      return;
    }
    setNotice("One piece swapped. The rest of your look is unchanged.");
    setSession((current) => {
      const result: RecommendationResult = { status: "ready", recommendation: alternative };
      return { ...current, result, seen: remember(current.seen, result) };
    });
  };
  return { context: session.context, result, next, swap, notice, historyWarning };
}
