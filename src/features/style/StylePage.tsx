import { useSearchParams } from "react-router";
import { useItems, useOutfit, useItemImages, useBasePath } from "@/data";
import { ButtonLink, Chip, ConfirmDialog, ErrorState, Page, PageHeader, Skeleton, useToast } from "@/ui";
import { useMemo, useRef, useState } from "react";
import { paths } from "@/app/paths";
import { OutfitEditor, type EditorGuard } from "./OutfitEditor";
import { IdeasPanel } from "./IdeasPanel";
import { createSuggestionDraft, type OutfitDraft } from "./outfitDraft";
import type { OutfitPiece } from "@/domain/types";

export default function StylePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const outfitId = searchParams.get("outfit") ?? undefined;
  const base = useBasePath();
  const itemsQuery = useItems();
  const outfitQuery = useOutfit(outfitId);
  const items = itemsQuery.data;
  const images = useItemImages(items);
  const imageMap = useMemo(() => images.byItem, [images.byItem]);
  const mode = searchParams.get("mode") === "ideas" ? "ideas" : "build";
  const [ideasVisited, setIdeasVisited] = useState(mode === "ideas");
  const [seed, setSeed] = useState<{ draft: OutfitDraft; version: number } | null>(null);
  const [pendingIdea, setPendingIdea] = useState<readonly OutfitPiece[] | null>(null);
  const editor = useRef<EditorGuard>(null);
  const ideas = useRef<EditorGuard>(null);
  const toast = useToast();
  const busy = () => editor.current?.isSaving() || ideas.current?.isSaving();
  const chooseMode = (next: "build" | "ideas") => {
    if (busy()) { toast.error("Please wait for the look to finish saving."); return; }
    if (next === "ideas") setIdeasVisited(true);
    setSearchParams((current) => { const params = new URLSearchParams(current); params.set("mode", next); return params; });
  };
  const transfer = (pieces: readonly OutfitPiece[]) => {
    setSeed((current) => ({ draft: createSuggestionDraft(pieces), version: (current?.version ?? 0) + 1 }));
    setSearchParams({ mode: "build" });
    setPendingIdea(null);
  };
  const openInBuild = (pieces: readonly OutfitPiece[]) => {
    if (busy()) return;
    if (editor.current?.isDirty()) setPendingIdea(pieces);
    else transfer(pieces);
  };

  if (itemsQuery.isPending || (outfitId && outfitQuery.isPending)) {
    return (
      <Page wide>
        <PageHeader title="Build a look" lede="Start with the pieces you want to wear. The rest is yours to decide." />
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
          <Skeleton className="min-h-[28rem] w-full" />
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-12 w-2/3" />
          </div>
        </div>
      </Page>
    );
  }

  if (itemsQuery.isError) {
    return <Page wide><ErrorState error={itemsQuery.error} onRetry={() => void itemsQuery.refetch()} /></Page>;
  }
  if (outfitId && outfitQuery.isError) {
    return <Page wide><ErrorState error={outfitQuery.error} title="This look couldn't be opened." onRetry={() => void outfitQuery.refetch()} /></Page>;
  }
  if (outfitId && !outfitQuery.data) {
    return (
      <Page wide>
        <PageHeader title="Look not found" lede="It may have been removed, or the link may be out of date." />
        <ButtonLink variant="secondary" to={paths.style(base)}>Start a new look</ButtonLink>
      </Page>
    );
  }

  return (
    <Page wide>
      <div className="mb-6 flex gap-1 border-b border-line pb-2 lg:mb-8" role="group" aria-label="Studio mode">
        <Chip variant="tab" selected={mode === "build"} onClick={() => chooseMode("build")}>Build</Chip>
        <Chip variant="tab" selected={mode === "ideas"} onClick={() => chooseMode("ideas")}>Ideas</Chip>
      </div>
      <div hidden={mode !== "build"}>
        <OutfitEditor
        ref={editor}
        key={outfitId ?? `new-${seed?.version ?? 0}`}
        outfit={outfitQuery.data ?? undefined}
        seed={seed?.draft}
        items={items ?? []}
        imageByItem={imageMap}
        base={base}
      />
      </div>
      {(ideasVisited || mode === "ideas") && <div hidden={mode !== "ideas"}>
        <IdeasPanel ref={ideas} items={items ?? []} images={imageMap} base={base} onOpen={openInBuild} />
      </div>}
      <ConfirmDialog open={pendingIdea !== null} onOpenChange={(open) => { if (!open) setPendingIdea(null); }}
        title="Replace your unsaved Build draft?"
        body="Your unsaved selections will be replaced by this idea. Existing saved looks will not be changed."
        confirmLabel="Use this idea" cancelLabel="Keep my draft"
        onConfirm={() => { if (pendingIdea && !busy()) transfer(pendingIdea); }} />
    </Page>
  );
}
