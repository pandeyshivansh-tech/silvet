import { EmptyState, GarmentGlyph, Page, PageHeader } from "@/ui";
import type { Slot } from "@/domain/taxonomy";

/**
 * Honest scaffold for a screen that a later workstream builds. It renders inside the real shell
 * so navigation can be reviewed, but it never pretends the feature works.
 */
export function ScreenPlaceholder({ eyebrow, title, workstream, description, glyph = "top" }: { eyebrow: string; title: string; workstream: string; description: string; glyph?: Slot }) {
  return (
    <Page>
      <PageHeader eyebrow={eyebrow} title={title} />
      <div className="rounded-xs border border-dashed border-line-strong">
        <EmptyState art={<GarmentGlyph slot={glyph} className="h-full w-auto" />} title="Screen in progress" body={`${description} Not built yet — ${workstream}.`} />
      </div>
    </Page>
  );
}
