import type { ReactNode } from "react";
import { Link } from "react-router";
import { Lockup } from "@/ui";
import { paths } from "@/app/paths";

export function AuthFrame({ eyebrow, title, description, children }: { eyebrow: string; title: string; description?: string; children: ReactNode }) {
  return (
    <main className="min-h-dvh bg-chalk px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between">
        <Link to={paths.landing()} aria-label="SILVET home" className="rounded-xs focus-visible:outline-2 focus-visible:outline-offset-4"><Lockup /></Link>
        <Link to={paths.wardrobe("/demo")} className="min-h-11 inline-flex items-center text-ui text-midnight underline underline-offset-4">Explore the demo</Link>
      </header>
      <div className="mx-auto grid w-full max-w-7xl gap-10 pb-10 pt-10 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.78fr)] lg:items-center lg:gap-20 lg:py-20">
        <section className="max-w-2xl">
          <p className="eyebrow mb-4">{eyebrow}</p>
          <h1 className="max-w-xl font-display text-page text-midnight lg:text-page-lg">{title}</h1>
          {description && <p className="mt-4 max-w-lg text-lead text-graphite-deep">{description}</p>}
          <div className="mt-10 hidden border-l-2 border-lilac pl-5 sm:block">
            <p className="font-display text-look text-midnight lg:text-look-lg">Clothes without categories.</p>
            <p className="mt-2 max-w-md text-body text-graphite-deep">Build a personal space where a kurta and a denim jacket belong in the same conversation.</p>
          </div>
        </section>
        <section aria-label={eyebrow} className="w-full bg-chalk-deep p-5 sm:p-8 lg:p-10">
          {children}
        </section>
      </div>
      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-caption text-graphite-deep">
        <span>A personal wardrobe, not a shopping list.</span>
        <Link to={paths.landing()} className="min-h-11 inline-flex items-center text-midnight underline underline-offset-4">Back to SILVET</Link>
      </footer>
    </main>
  );
}
