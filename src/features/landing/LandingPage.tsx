import { AnimatePresence, motion, useInView, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { ArrowDown, ArrowRight } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent, type ReactNode, type RefObject } from "react";
import { Link } from "react-router";
import { paths } from "@/app/paths";
import { useAuth } from "@/lib/auth/AuthProvider";
import { fadeUp, lineRise, sheetBottom, spring, stagger, transition } from "@/motion/presets";
import { useScrollRecede, useScrollSettle } from "@/motion/useScrollSettle";
import { WeaveField } from "@/polish/WeaveField";
import { ButtonLink, Lockup, RotatingWord, SilvetMark, buttonClasses, cn } from "@/ui";
import { FUSION, HeroLook, IdeasVignette, LookbookRow, StepAdd, StepCombine, StepKeep, StudioVignette, WardrobeVignette } from "./LandingVisuals";

const gutter = "mx-auto max-w-7xl px-5 sm:px-8 lg:px-10";

const STEPS = [
  { title: "Add the clothes you already own", body: "A photo helps, but a name and a category are enough. Kurtas, sarees, cargos and sneakers sit side by side.", visual: <StepAdd /> },
  // The rotating occasions are real Ideas occasions (college, wedding, festive, date, work, travel).
  { title: "Build or discover a look", body: "Put one together slot by slot in Studio, or ask Ideas for one that suits the occasion.", visual: <StepCombine />,
    occasions: ["college", "a wedding", "Diwali", "a first date", "work", "a weekend trip"] },
  { title: "Save the looks you’ll wear again", body: "Your Lookbook keeps them, ready to open, edit or wear on a busy morning.", visual: <StepKeep /> },
];

/**
 * "How it works" links: like the shell's skip link, move focus (and so the view) to the section without a hash
 * navigation — the router's ScrollRestoration treats that as a navigation and puts the page back at the top.
 */
function jumpToSteps(event: MouseEvent<HTMLAnchorElement>) {
  const target = document.getElementById("how-it-works");
  if (target) { event.preventDefault(); target.focus({ preventScroll: true }); target.scrollIntoView({ block: "start" }); }
}

/**
 * How it works as one pinned story from 768 px: the drawing stays put while the three steps scroll past and
 * changes to the step crossing the line 35% down the screen (fade + small spring settle). A rule beside the
 * steps fills with your progress through them, linked to the scrollbar. Below 768 px each step keeps its own
 * drawing, which settles in as it arrives. Reduced motion: the drawing crossfades, nothing moves.
 */
function StepStory() {
  const [active, setActive] = useState(0);
  const list = useRef<HTMLOListElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: list, offset: ["start 0.35", "end 0.35"] });
  return (
    <div className="mt-12 md:grid md:grid-cols-12 md:gap-8 lg:mt-16 lg:gap-10">
      <div aria-hidden="true" className="hidden md:sticky md:top-[22svh] md:col-span-6 md:block md:self-start">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={active} variants={storyFrame} initial="hidden" animate="visible" exit="exit">{STEPS[active]?.visual}</motion.div>
        </AnimatePresence>
      </div>
      <ol ref={list} className="relative grid gap-12 md:col-span-6 md:col-start-7 md:gap-0 md:pl-6 lg:col-span-5 lg:col-start-8">
        {/* Progress through the story: a hairline that fills in Midnight as you scroll (md and up). */}
        <span aria-hidden="true" className="absolute inset-y-0 left-0 hidden w-px bg-line md:block">
          <motion.span style={reduce ? undefined : { scaleY: scrollYProgress }} className="block size-full origin-top bg-midnight" />
        </span>
        {STEPS.map((step, index) => (
          <Step key={step.title} index={index} active={index === active} onActive={setActive} {...step} />
        ))}
      </ol>
    </div>
  );
}

const storyFrame = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { ...spring, opacity: transition.select } },
  exit: { opacity: 0, y: -8, transition: transition.exit },
};

function Step({ index, title, body, visual, active, onActive, occasions }: (typeof STEPS)[number] & { index: number; active: boolean; onActive: (index: number) => void }) {
  const ref = useRef<HTMLLIElement>(null);
  const art = useRef<HTMLDivElement>(null);
  const settle = useScrollSettle(art);
  // The steps sit edge to edge, so exactly one crosses the line level with the pinned drawing (35% down).
  const centred = useInView(ref, { margin: "-35% 0px -64% 0px" });
  useEffect(() => { if (centred) onActive(index); }, [centred, index, onActive]);
  return (
    <li ref={ref} className="flex min-w-0 flex-col md:min-h-[55svh] md:last:min-h-[30svh]">
      <div className={cn("order-2 mt-5 grid grid-cols-[2.25rem_minmax(0,1fr)] border-t pt-4 transition-colors duration-200 ease-editorial md:mt-0",
        active ? "border-midnight" : "border-line")}>
        {/* The step you're on is marked by its number and rule; the others stay fully readable (no fading text). */}
        <span aria-hidden="true" className={cn("font-display text-look transition-colors duration-200 ease-editorial", active ? "text-midnight" : "md:text-graphite")}>{String(index + 1).padStart(2, "0")}</span>
        <div>
          <h3 className={cn("text-ui font-medium transition-colors duration-200 ease-editorial", active ? "text-midnight" : "text-midnight md:text-graphite-deep")}>{title}</h3>
          <p className="mt-1 max-w-sm text-body text-graphite-deep">{body}</p>
          {occasions && (
            <p className="mt-4 font-display text-look text-midnight lg:text-look-lg">
              <span className="sr-only">A look for {occasions.join(", ")}.</span>
              <span aria-hidden="true">A look for <RotatingWord words={occasions} /></span>
            </p>
          )}
        </div>
      </div>
      <motion.div ref={art} style={settle} className="order-1 md:hidden">{visual}</motion.div>
    </li>
  );
}

/**
 * One headline line rising out of its own clip. The clip only cuts vertically and has em room below for
 * descenders, so the italic overhang and the "y" are never shaved.
 */
function HeadlineLine({ children }: { children: ReactNode }) {
  return (
    <span className="-mb-[0.14em] block overflow-x-visible overflow-y-clip pb-[0.14em]">
      <motion.span variants={lineRise} className="block">{children}</motion.span>
    </span>
  );
}

/**
 * Landing chrome follows the reader. The header steps away while you read down and returns the moment you
 * scroll up, on a Chalk backing with a hairline once you are off the top. On phones, once the hero's buttons
 * have scrolled away, the main action waits at the bottom until the closing panel offers its own.
 */
function useLandingChrome(heroActions: RefObject<HTMLElement | null>, closing: RefObject<HTMLElement | null>) {
  const { scrollY } = useScroll();
  const [chrome, setChrome] = useState({ hidden: false, away: false, cta: false });
  const update = (y: number, delta: number) => {
    const actionsGone = (heroActions.current?.getBoundingClientRect().bottom ?? 1) < 0;
    const closingNear = (closing.current?.getBoundingClientRect().top ?? 0) < window.innerHeight;
    setChrome((was) => {
      const hidden = y < 120 ? false : delta > 4 ? true : delta < -4 ? false : was.hidden;
      const next = { hidden, away: y > 8, cta: actionsGone && !closingNear };
      return next.hidden === was.hidden && next.away === was.away && next.cta === was.cta ? was : next;
    });
  };
  useMotionValueEvent(scrollY, "change", (y) => update(y, y - (scrollY.getPrevious() ?? y)));
  // A restored scroll position mid-page gets its backing before the first scroll event.
  useEffect(() => update(window.scrollY, 0), []); // eslint-disable-line react-hooks/exhaustive-deps
  const reveal = () => setChrome((was) => (was.hidden ? { ...was, hidden: false } : was));
  return { ...chrome, reveal };
}

/**
 * The headline waits for its typeface (at most `limit` ms), so on a slow first visit the lines never swap shape
 * mid-rise. On a warm cache the face is already there and nothing waits.
 */
function useFaceReady(font: string, limit = 700) {
  const [ready, setReady] = useState(() => !document.fonts || document.fonts.check(font));
  useEffect(() => {
    if (ready) return;
    const done = () => setReady(true);
    const timer = window.setTimeout(done, limit);
    document.fonts.load(font).then(done, done);
    return () => window.clearTimeout(timer);
  }, [font, limit, ready]);
  return ready;
}

/** Wraps a landing visual in the shared scroll settle. */
function Settle({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return <motion.div ref={ref} style={useScrollSettle(ref)} className={className}>{children}</motion.div>;
}

/** The hero look recedes as you scroll on. */
function HeroDepth({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return <div ref={ref} className={className}><motion.div style={useScrollRecede(ref)} className="origin-top">{children}</motion.div></div>;
}

/** One built capability: copy on one side, the real component rendering sample data on the other. */
function Feature({ name, title, children, visual, flip = false }: { name: string; title: string; children: ReactNode; visual: ReactNode; flip?: boolean }) {
  return (
    <article className="grid gap-8 border-t border-line py-12 lg:grid-cols-12 lg:gap-10 lg:py-16">
      <div className={cn("lg:col-span-4 lg:row-start-1", flip ? "lg:col-start-9" : "lg:col-start-1")}>
        <p className="text-caption font-medium text-graphite-deep">{name}</p>
        <h3 className="mt-2 max-w-sm font-display text-section text-midnight lg:text-section-lg">{title}</h3>
        <div className="mt-4 max-w-md space-y-3 text-body text-graphite-deep">{children}</div>
      </div>
      <Settle className={cn("min-w-0 lg:col-span-7 lg:row-start-1", flip ? "lg:col-start-1" : "lg:col-start-6")}>{visual}</Settle>
    </article>
  );
}

/**
 * Landing (SILVET_DESIGN_REFERENCE.pdf p15 hero, p4 layouts, p2 colour jobs). Hero → how it works → what is
 * built today → one closing Midnight panel. Every visual is the app's own components on the sample wardrobe.
 * Signed out: sample wardrobe (/demo/wardrobe), Create your wardrobe (sign-up), Sign in. Signed in: Open my
 * wardrobe (/app/wardrobe) leads, the sample wardrobe stays secondary. On arrival only the hero plays (headline lines rise, the look
 * assembles, "Saved"); below it, visuals follow the scrollbar (useScrollSettle). Header and phone CTA: useLandingChrome.
 */
export default function LandingPage() {
  // Signed-in visitors get their own wardrobe instead of "Sign in" / "Create your wardrobe" (which only bounce
  // them to the account). While the session is still loading, the signed-out actions show — both still work.
  const signedIn = useAuth().status === "signed-in";
  const ownWardrobe = paths.wardrobe("/app");
  const heroActions = useRef<HTMLDivElement>(null);
  const closing = useRef<HTMLElement>(null);
  const chrome = useLandingChrome(heroActions, closing);
  const headlineFace = useFaceReady('1em "Instrument Serif"');
  return (
    <div className="relative isolate min-h-dvh">
      <WeaveField />
      <motion.header
        animate={{ y: chrome.hidden ? "-100%" : 0 }}
        transition={transition.move}
        onFocusCapture={chrome.reveal}
        className="sticky top-0 z-40"
      >
        <span aria-hidden="true" className={cn("absolute inset-0 -z-10 border-b border-line bg-chalk transition-opacity duration-200 ease-editorial", chrome.away ? "opacity-100" : "opacity-0")} />
        <div className={cn(gutter, "flex items-center justify-between py-5 lg:py-7")}>
          <Link to={paths.landing()} aria-label="SILVET home" className="flex min-h-11 min-w-11 flex-1 items-center rounded-xs">
            <Lockup reveal />
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Account">
            <a href="#how-it-works" onClick={jumpToSteps} className="hidden min-h-11 items-center px-3 text-ui text-midnight underline-offset-4 hover:underline md:inline-flex">
              How it works
            </a>
            <Link to={paths.wardrobe("/demo")} className="hidden min-h-11 items-center px-3 text-ui text-midnight underline-offset-4 hover:underline sm:inline-flex">
              Sample wardrobe
            </Link>
            {signedIn ? (
              <ButtonLink to={ownWardrobe} variant="secondary" size="sm">Open my wardrobe</ButtonLink>
            ) : (
              <ButtonLink to={paths.signIn()} variant="secondary" size="sm">Sign in</ButtonLink>
            )}
          </nav>
        </div>
      </motion.header>

      <main>
        <section aria-labelledby="hero-title" className={cn(gutter, "grid gap-12 pt-6 pb-20 lg:grid-cols-12 lg:gap-10 lg:pt-14 lg:pb-28")}>
          <motion.div variants={stagger(0.1)} initial="hidden" animate={headlineFace ? "visible" : "hidden"} className="lg:col-span-5 lg:pt-8">
            <motion.p variants={fadeUp} className="eyebrow">Indian, Western, or both</motion.p>
            <motion.h1 variants={stagger(0.08)} id="hero-title" className="mt-5 font-display text-hero text-midnight xl:text-hero-lg">
              <HeadlineLine>Kurta, Monday.</HeadlineLine>
              <HeadlineLine>Cargos, Friday.</HeadlineLine>
              <HeadlineLine>Both, Sunday.</HeadlineLine>
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-6 max-w-md text-lead text-graphite-deep lg:text-lead-lg">
              SILVET styles the clothes already in your cupboard: Indian, Western, or the two worn together. Every look comes with the reasons it works.
            </motion.p>
            <motion.div ref={heroActions} variants={fadeUp} className="mt-9 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              {signedIn ? (
                <>
                  <ButtonLink to={ownWardrobe} className="sm:min-w-64">Open my wardrobe</ButtonLink>
                  <ButtonLink to={paths.wardrobe("/demo")} variant="secondary">Explore the sample wardrobe</ButtonLink>
                </>
              ) : (
                <>
                  <ButtonLink to={paths.wardrobe("/demo")} className="sm:min-w-64">Explore the sample wardrobe</ButtonLink>
                  <ButtonLink to={paths.signUp()} variant="secondary">Create your wardrobe</ButtonLink>
                </>
              )}
            </motion.div>
            <motion.div variants={fadeUp} className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-caption text-graphite-deep">
              {!signedIn && <span>No account needed to explore.</span>}
              <a href="#how-it-works" onClick={jumpToSteps} className="inline-flex min-h-11 items-center gap-1 font-medium text-midnight underline underline-offset-4">
                See how it works <ArrowDown aria-hidden="true" className="size-3.5" />
              </a>
            </motion.div>
          </motion.div>
          <HeroDepth className="min-w-0 lg:col-span-7 lg:col-start-6 lg:pt-4">
            <HeroLook />
          </HeroDepth>
        </section>

        <section id="how-it-works" tabIndex={-1} aria-labelledby="how-title" className="scroll-mt-4 border-t border-line outline-none">
          <div className={cn(gutter, "py-16 lg:py-24")}>
            <div className="grid gap-4 lg:grid-cols-12 lg:gap-10">
              <h2 id="how-title" className="font-display text-section text-midnight lg:col-span-5 lg:text-section-lg">From cupboard to Lookbook.</h2>
              <p className="max-w-xl text-lead text-graphite-deep lg:col-span-6 lg:col-start-7 lg:pt-3">
                How it works: everything starts from what’s already in your cupboard. SILVET never sells you anything.
              </p>
            </div>
            <StepStory />
            <p className="mt-10 text-caption text-graphite-deep">Pieces from the sample wardrobe, illustrated.</p>
          </div>
        </section>

        <section aria-labelledby="inside-title" className={cn(gutter, "pb-16 lg:pb-24")}>
          <div className="grid gap-4 border-t border-line pt-16 lg:grid-cols-12 lg:gap-10 lg:pt-24">
            <h2 id="inside-title" className="font-display text-section text-midnight lg:col-span-5 lg:text-section-lg">Built for both wardrobes.</h2>
            <p className="max-w-xl text-lead text-graphite-deep lg:col-span-6 lg:col-start-7 lg:pt-3">
              Four parts, all working from the same clothes: yours, or the sample wardrobe’s while you look around.
            </p>
          </div>
          <div className="mt-12 lg:mt-16">
            <Feature name="Wardrobe" title="Sarees and sneakers, same shelf." visual={<WardrobeVignette />}>
              <p>Tops to sarees, sneakers to juttis: Western, Indian and fusion wear get the same categories, filters and care.</p>
              <p>Filter by category, colour, occasion or Indian wear. Photos are optional. They’re resized on your phone, stripped of location data and private to your account.</p>
            </Feature>
            <Feature name="Studio" title="Slot by slot, saree or separates." visual={<StudioVignette />} flip>
              <p>Fill a top and a bottom, or a saree or set, then add a layer, footwear and up to two accessories.</p>
              <p>Studio tells you when a look is complete, then you name it and save it.</p>
            </Feature>
            {FUSION && (
              <Feature name="Ideas" title="Ideas that show their working." visual={<IdeasVignette outfit={FUSION} />}>
                <p>Ideas follow clear rules about colour, formality, occasion, season and style, applied to your own clothes. No AI guesswork, no hidden profile.</p>
                <p>Every idea lists why it works. When your wardrobe can’t make a look yet, it says what’s missing.</p>
              </Feature>
            )}
            <article className="border-t border-line py-12 lg:py-16">
              <div className="grid gap-4 lg:grid-cols-12 lg:gap-10">
                <div className="lg:col-span-4">
                  <p className="text-caption font-medium text-graphite-deep">Lookbook</p>
                  <h3 className="mt-2 max-w-sm font-display text-section text-midnight lg:text-section-lg">Wear it again on a busy morning.</h3>
                </div>
                <div className="max-w-md space-y-3 text-body text-graphite-deep lg:col-span-5 lg:col-start-6 lg:pt-8">
                  <p>Saved looks wait in your Lookbook to open, edit in Studio or wear again. Western, Indian and fusion sit side by side.</p>
                  <p>In the sample wardrobe, saved looks last until you close the tab.</p>
                </div>
              </div>
              <Settle className="mt-10"><LookbookRow /></Settle>
            </article>
          </div>
        </section>

        <section ref={closing} aria-labelledby="start-title" className="md:px-8 md:pb-16 lg:px-10 lg:pb-24">
          {/* PDF p6: an inset Midnight panel on tablet and desktop; full-bleed on phones (p4). */}
          <Settle className="surface-midnight mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 md:rounded-xs md:px-10 lg:grid-cols-12 lg:items-end lg:px-14 lg:py-20">
            <div className="lg:col-span-7">
              <SilvetMark className="text-page lg:text-page-lg" />
              <h2 id="start-title" className="mt-8 max-w-xl font-display text-page text-chalk lg:text-page-lg">Start with five pieces you wear every week.</h2>
              <p className="mt-4 max-w-lg text-lead text-midnight-muted">That’s enough for Studio and Ideas to start putting looks together. Your wardrobe stays private to your account.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:col-span-5 lg:justify-end">
              <Link to={signedIn ? ownWardrobe : paths.signUp()} className={buttonClasses("secondary")}>
                {signedIn ? "Open my wardrobe" : "Create your wardrobe"} <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <Link to={paths.wardrobe("/demo")} className="inline-flex h-12 items-center justify-center rounded-xs border border-midnight-muted/60 px-5 text-ui font-medium text-chalk transition-colors duration-120 ease-editorial hover:border-chalk hover:bg-midnight-hover">
                Explore the sample
              </Link>
            </div>
          </Settle>
        </section>
      </main>

      <AnimatePresence>
        {chrome.cta && (
          <motion.div key="cta" variants={sheetBottom} initial="hidden" animate="visible" exit="exit" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-chalk safe-bottom md:hidden">
            <div className="px-5 py-3">
              {signedIn ? (
                <ButtonLink to={ownWardrobe} fullWidth>Open my wardrobe</ButtonLink>
              ) : (
                <ButtonLink to={paths.wardrobe("/demo")} fullWidth>Explore the sample wardrobe</ButtonLink>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer>
        <div className={cn(gutter, "flex flex-col gap-2 py-8 text-caption text-graphite-deep sm:flex-row sm:justify-between")}>
          <p>© {new Date().getFullYear()} SILVET</p>
          <p>Made in India, for every wardrobe.</p>
        </div>
      </footer>
    </div>
  );
}
