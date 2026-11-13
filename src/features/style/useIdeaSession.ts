import { useEffect, useMemo, useRef, useState } from "react";
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

/*
 * The engine searches every combination, which takes long enough on a phone to freeze a tap (and every animation)
 * for most of a second. It runs in a worker instead; without one (tests, old browsers) it runs inline as before.
 */
type Job = { items: Wardrobe; context: RecommendationContext; seen: string[] };
let worker: Worker | null | undefined;
let lastJob = 0;
const waiting = new Map<number, { job: Job; resolve: (result: RecommendationResult) => void }>();
function engine(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = typeof Worker === "undefined" ? null : new Worker(new URL("./ideas.worker.ts", import.meta.url), { type: "module" });
  } catch {
    worker = null;
  }
  worker?.addEventListener("message", ({ data }: MessageEvent<{ id: number; result: RecommendationResult }>) => {
    waiting.get(data.id)?.resolve(data.result);
    waiting.delete(data.id);
  });
  // A worker that fails to load or crashes hands its queue back to the main thread, so no idea is ever lost.
  worker?.addEventListener("error", () => {
    worker = null;
    for (const { job, resolve } of waiting.values()) resolve(recommend(job.items, job.context, job.seen));
    waiting.clear();
  });
  return worker;
}
function run(job: Job): Promise<RecommendationResult> {
  const thread = engine();
  if (!thread) return Promise.resolve(recommend(job.items, job.context, job.seen));
  const id = ++lastJob;
  return new Promise((resolve) => {
    waiting.set(id, { job, resolve });
    thread.postMessage({ id, ...job });
  });
}

/** What to deal next: the brief, the history the engine avoids, and the history to keep afterwards. */
interface Request { context: RecommendationContext; seen: string[]; keep: string[] }
interface Session { context: RecommendationContext; result: RecommendationResult | null; seen: string[] }

/** Browser/session concerns are deliberately outside the pure engine. */
export function useIdeaSession(items: Wardrobe, namespace: string, initialContext: RecommendationContext = { occasion: "everyday" }, preferences: readonly StyleSlug[] = noPreferences) {
  const key = `silvet.ideas.seen.${namespace}.v1`;
  // `result` is null only until the first idea arrives.
  const [session, setSession] = useState<Session>(() => ({ context: { ...initialContext, preferredStyles: preferences }, result: null, seen: readHistory(key).seen }));
  const [pending, setPending] = useState<Request | null>(null);
  const [historyWarning, setHistoryWarning] = useState(() => readHistory(key).warning);
  const [notice, setNotice] = useState("");
  const latest = useRef(0);
  // The likely next idea ("Another idea" with the same brief), worked out while the current one is on screen.
  const ahead = useRef<(Job & { promise: Promise<RecommendationResult>; result?: RecommendationResult }) | null>(null);

  const deal = (request: Request) => {
    const token = ++latest.current;
    const done = (result: RecommendationResult) => {
      if (token !== latest.current) return; // a newer request replaced this one
      setPending(null);
      setSession({ context: request.context, result, seen: remember(request.keep, result) });
    };
    const early = ahead.current;
    const match = early && early.items === items && early.context === request.context && early.seen === request.seen ? early : null;
    if (match?.result) return done(match.result);
    setPending(request);
    void (match?.promise ?? run({ items, context: request.context, seen: request.seen })).then(done);
  };

  useEffect(() => {
    try { sessionStorage.setItem(key, JSON.stringify(session.seen)); }
    catch { setHistoryWarning(true); }
  }, [key, session.seen]);
  useEffect(() => {
    if (!session.result || !engine()) return; // inline, working ahead would only add main-thread work
    const job: Job = { items, context: session.context, seen: session.seen };
    const early = { ...job, promise: run(job), result: undefined as RecommendationResult | undefined };
    ahead.current = early;
    void early.promise.then((result) => { early.result = result; });
  }, [items, session]);
  useEffect(() => {
    const base = pending ?? { context: session.context, seen: session.seen, keep: session.seen };
    if (JSON.stringify(base.context.preferredStyles) !== JSON.stringify(preferences)) {
      const fingerprint = session.result?.status === "ready" ? session.result.recommendation.fingerprint : null;
      deal({ context: { ...base.context, preferredStyles: preferences }, seen: base.keep.filter((entry) => entry !== fingerprint), keep: base.keep });
    } else if (pending || session.result?.status !== "ready" || !makeRecommendation(session.result.recommendation.pieces, items, session.context)) {
      deal(base);
    }
  }, [items, preferences]); // eslint-disable-line react-hooks/exhaustive-deps -- reconciles against the state of this render
  // Never render a stale invalid outfit, even before wardrobe-change reconciliation.
  const result = useMemo<RecommendationResult | null>(() => {
    if (session.result?.status !== "ready") return session.result;
    const valid = makeRecommendation(session.result.recommendation.pieces, items, session.context);
    return valid ? { status: "ready", recommendation: valid } :
      { status: "incompatible", suggestions: ["Your wardrobe changed. Finding another complete combination."] };
  }, [items, session.context, session.result]);
  const next = (context = session.context, restart = false) => {
    setNotice("");
    const seen = restart ? [] : session.seen;
    deal({ context, seen, keep: seen });
  };
  const swap = (index: number) => {
    if (result?.status !== "ready") return;
    const alternative = swapPiece(result.recommendation, index, items, session.context, session.seen);
    if (!alternative) {
      setNotice("No unseen compatible replacement is available for this piece. The rest of your look is unchanged.");
      return;
    }
    setNotice("One piece swapped. The rest of your look is unchanged.");
    latest.current++; // a swap supersedes any idea still being found
    setPending(null);
    setSession((current) => {
      const result: RecommendationResult = { status: "ready", recommendation: alternative };
      return { ...current, result, seen: remember(current.seen, result) };
    });
  };
  /** `brief` is what the controls show (a new brief shows at once); `context` is the brief of the idea on screen. */
  return { context: session.context, brief: pending?.context ?? session.context, pending: pending !== null, result, next, swap, notice, historyWarning };
}
