import type { ReactNode } from "react";
import { Link } from "react-router";
import { getColor } from "@/domain/taxonomy";
import { GarmentGlyph, Lockup, cn } from "@/ui";
import { paths } from "@/app/paths";
import { WeaveField } from "@/polish/WeaveField";

const TEAL = getColor("teal")?.hex;
const BLACK = getColor("black")?.hex;
const GOLD = getColor("gold")?.hex;

/**
 * The sample look from the demo wardrobe (teal silk saree, black blazer, gold juttis), drawn — never presented
 * as anyone's photo. Decorative: the serif line beside it carries the meaning.
 */
function SampleLook({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div aria-hidden="true" className="flex shrink-0 items-end gap-1.5 text-midnight">
        <GarmentGlyph slot="one_piece" subcategory="sarees" fill={TEAL} className="h-16 w-auto" />
        <GarmentGlyph slot="outerwear" fill={BLACK} className="h-12 w-auto" />
        <GarmentGlyph slot="footwear" fill={GOLD} className="-ml-1 h-6 w-auto" />
      </div>
    );
  }
  return (
    <div aria-hidden="true" className="relative mx-auto aspect-[5/4] w-full max-w-lg text-midnight">
      <GarmentGlyph slot="one_piece" subcategory="sarees" fill={TEAL} className="absolute top-[2%] left-[6%] h-[72%] w-auto" />
      <GarmentGlyph slot="outerwear" fill={BLACK} className="absolute top-[6%] right-[8%] h-[54%] w-auto" />
      <GarmentGlyph slot="footwear" fill={GOLD} className="absolute bottom-[2%] left-[40%] h-[32%] w-auto" />
      <span className="absolute bottom-0 left-0 rounded-xs bg-chalk px-1.5 py-0.5 text-caption text-graphite-deep">Sample look · illustrated</span>
    </div>
  );
}

const homeLink = "flex min-h-11 items-center rounded-xs focus-visible:outline-2 focus-visible:outline-offset-4";

/**
 * Sign-in, sign-up and account recovery (SILVET_DESIGN_REFERENCE.pdf p14, p17).
 * md+: split — the sample look on Chalk Deep (sticky, so it stays put while a long form scrolls) and the form
 * on Chalk. Phones: the form leads; the look shrinks to a short band with the symbol, so the primary action
 * stays near the top of the screen.
 */
export function AuthFrame({ title, description, children, sampleNote = false }: {
  title: string;
  description?: string;
  children: ReactNode;
  /** "Just looking? Explore the sample wardrobe" — for sign-in and sign-up, not recovery. */
  sampleNote?: boolean;
}) {
  return (
    <div className="relative isolate min-h-dvh bg-chalk md:grid md:grid-cols-2">
      <WeaveField />
      <aside aria-label="SILVET" className="hidden bg-chalk-deep p-8 md:sticky md:top-0 md:flex md:h-dvh md:flex-col lg:p-12">
        <Link to={paths.landing()} aria-label="SILVET home" className={cn(homeLink, "self-start")}><Lockup size="sm" mode="full" /></Link>
        <div className="flex min-h-0 flex-1 items-center py-10">
          <SampleLook />
        </div>
        <p className="max-w-sm font-display text-look text-midnight lg:text-look-lg">
          A saree on Saturday, a blazer on Monday. <em>One wardrobe.</em>
        </p>
      </aside>

      <header className="flex items-end justify-between gap-4 bg-chalk-deep px-5 pt-3 pb-3 sm:px-8 md:hidden">
        <div className="min-w-0">
          <Link to={paths.landing()} aria-label="SILVET home" className={cn(homeLink, "w-fit")}><Lockup size="sm" /></Link>
          <p className="mt-1 font-display text-lead text-midnight">One wardrobe, every occasion.</p>
        </div>
        <SampleLook compact />
      </header>

      <main className="px-5 pt-6 pb-12 sm:px-8 sm:pt-8 md:flex md:min-h-dvh md:flex-col md:justify-center md:px-12 md:py-16 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <h1 className="font-display text-page text-midnight">{title}</h1>
          {description && <p className="mt-2 text-body text-graphite-deep">{description}</p>}
          <div className="mt-6 sm:mt-8">{children}</div>
          {sampleNote && (
            <div className="mt-8 border-t border-line pt-5">
              <p className="text-body text-graphite-deep">
                Just looking? <Link to={paths.wardrobe("/demo")} className="font-medium text-midnight underline underline-offset-4">Explore the sample wardrobe</Link>
              </p>
              <p className="mt-1 text-caption text-graphite-deep">Looks you save in the sample don’t carry over to your account.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
