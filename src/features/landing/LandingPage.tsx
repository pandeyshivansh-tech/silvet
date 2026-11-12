import { motion } from "motion/react";
import { Link } from "react-router";
import { paths } from "@/app/paths";
import { DEMO_ITEMS } from "@/data/demo/demoWardrobe";
import { fadeUp, stagger } from "@/motion/presets";
import { ButtonLink, GarmentFrame, Lockup } from "@/ui";

/** Four pieces from the sample wardrobe for the editorial collage (photos appear once WS3 delivers them). */
const COLLAGE_IDS = ["demo-white-chikankari-kurta", "demo-black-slip-dress", "demo-olive-cargos", "demo-gold-juttis"];
const collage = COLLAGE_IDS.map((id) => DEMO_ITEMS.find((i) => i.id === id)).filter((i) => i !== undefined);

const PRINCIPLES = [
  { n: "01", title: "Organise", body: "Every piece you own, in one calm, searchable wardrobe — kurtas to cargos." },
  { n: "02", title: "Combine", body: "Build looks from your own clothes, or let SILVET suggest one and tell you why." },
  { n: "03", title: "Keep", body: "Save the looks you love to your Lookbook and come back to them any morning." },
];

/**
 * Landing v1 (WS0, tokens aligned to the Fluid Atelier). WS4 rebuilds it to the PDF layout
 * (sample-look vignette, "Three things, done well", Western / Indian / fusion row, closing Midnight panel).
 * The two calls to action and their destinations are final.
 */
export default function LandingPage() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10 lg:py-7">
        <Link to={paths.landing()} aria-label="SILVET home">
          <Lockup markClassName="text-look" wordmarkClassName="text-lead" />
        </Link>
        <nav className="flex items-center gap-2" aria-label="Account">
          <Link to={paths.wardrobe("/demo")} className="hidden px-3 py-2 text-ui text-midnight underline-offset-4 hover:underline sm:inline-block">
            Sample wardrobe
          </Link>
          <ButtonLink to={paths.signIn()} variant="secondary" size="sm">
            Sign in
          </ButtonLink>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl gap-12 px-5 pt-8 pb-16 sm:px-8 lg:grid-cols-12 lg:gap-10 lg:px-10 lg:pt-16 lg:pb-24">
          <motion.div variants={stagger(0.08)} initial="hidden" animate="visible" className="lg:col-span-6 lg:pt-6">
            <motion.p variants={fadeUp} className="eyebrow">
              Your everyday outfit companion
            </motion.p>
            <motion.h1 variants={fadeUp} className="mt-5 font-display text-hero text-midnight lg:text-hero-lg">
              Your wardrobe.
              <br />
              Your style.
              <br />
              <em>Decided.</em>
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-6 max-w-md text-lead text-graphite-deep lg:text-lead-lg">
              Digitise the clothes you already own, combine them into looks you&rsquo;ll actually wear, and get honest outfit ideas — Western, Indian or both.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-10 flex flex-col gap-3 sm:flex-row">
              <ButtonLink to={paths.wardrobe("/demo")} className="sm:min-w-64">
                Explore the sample wardrobe
              </ButtonLink>
              <ButtonLink to={paths.signUp()} variant="secondary">
                Create your wardrobe
              </ButtonLink>
            </motion.div>
            <motion.p variants={fadeUp} className="mt-4 text-caption text-graphite-deep">
              No account needed to explore.
            </motion.p>
          </motion.div>

          <motion.div variants={stagger(0.06, 0.2)} initial="hidden" animate="visible" className="grid grid-cols-2 gap-3 lg:col-span-6 lg:gap-5" aria-hidden="true">
            {collage.map((item, i) => (
              <motion.div key={item.id} variants={fadeUp} className={i % 2 === 1 ? "translate-y-10" : undefined}>
                <GarmentFrame item={item} />
                <p className="mt-2 text-caption text-graphite-deep">{item.name}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        <section className="border-t border-line">
          <ol className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:grid-cols-3 sm:px-8 lg:px-10 lg:py-20">
            {PRINCIPLES.map((p) => (
              <li key={p.n}>
                <p className="font-display text-look text-midnight">{p.n}</p>
                <h2 className="mt-2 text-ui font-medium text-midnight">{p.title}</h2>
                <p className="mt-1 max-w-xs text-body text-graphite-deep">{p.body}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-8 text-caption text-graphite-deep sm:flex-row sm:justify-between sm:px-8 lg:px-10">
          <p>© {new Date().getFullYear()} SILVET</p>
          <p>Made in India, for every wardrobe.</p>
        </div>
      </footer>
    </div>
  );
}
