import { BookOpen, CircleUser, Layers, Shirt, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { NavLink, Outlet, Link } from "react-router";
import { useBasePath, useIsDemo } from "@/data";
import { spring, tabPress } from "@/motion/presets";
import { Lockup, cn } from "@/ui";
import { paths } from "./paths";

/**
 * App shell (SILVET_DESIGN_REFERENCE.pdf · Three layouts, one product; M8 Batch 2):
 * - Phone (< 640): compact Chalk top bar with the Selvedge symbol; Midnight tab bar, 64 px + safe area.
 * - Tablet (640–1023): same top bar, the lockup adapts (full when it fits); same tab bar, centred.
 *   Tab bar: inactive #B3ACB9, active Chalk label with a 2 px Citron bar that slides between tabs.
 * - Desktop (≥ 1024): 240 px Midnight sidebar with the full lockup; active item = Chalk label on a lifted
 *   Midnight block with a sliding Citron edge. The demo shows a quiet "Sign in" at the foot, signed-in users get Profile.
 * - Demo notice: a Midnight banner under the top bar below 1024 px; on desktop it moves into the sidebar's foot
 *   (same words and link) so the Midnight sidebar and a Midnight strip never form an L around the content.
 * - "Skip to content" is the first focusable element; it focuses the screen's single <main id="main">.
 */
interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

/** Wardrobe · Studio · Lookbook everywhere; Profile joins the mobile tab bar when signed in. */
function useNavItems(): { main: NavItem[]; profile: NavItem | null } {
  const base = useBasePath();
  const demo = useIsDemo();
  return {
    main: [
      { to: paths.wardrobe(base), label: "Wardrobe", icon: Shirt },
      { to: paths.style(base), label: "Studio", icon: Layers },
      { to: paths.lookbook(base), label: "Lookbook", icon: BookOpen },
    ],
    // "Join" is removed (founder decision); sign-up is contextual. The PDF's sample Profile tab
    // ("You're exploring the sample") needs a /demo/profile route — routes are frozen in this pass.
    profile: demo ? null : { to: paths.profile(), label: "Profile", icon: CircleUser },
  };
}

/** Persistent strip in the demo so nobody mistakes sample clothes for their own (MVP_REQUIREMENTS §8). */
function DemoBanner() {
  return (
    <div className="surface-midnight lg:hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-2.5 sm:px-8 lg:px-10">
        <p className="min-w-0 truncate text-caption">
          <span className="mr-2 inline-block size-1.5 rounded-full bg-citron align-middle" aria-hidden="true" />
          <span className="font-medium">Demo wardrobe</span>
          <span className="sm:hidden"> · session only</span>
          <span className="hidden sm:inline">. Pieces and looks stay in this tab only. Photos are not stored.</span>
        </p>
        <Link to={paths.signUp()} className="shrink-0 text-caption font-medium underline decoration-chalk/40 underline-offset-4 hover:decoration-chalk">
          <span className="sm:hidden">Start yours</span>
          <span className="hidden sm:inline">Create your wardrobe</span>
        </Link>
      </div>
    </div>
  );
}

/** Phone and tablet brand bar. The lockup decides symbol vs. full wordmark from the space it gets. */
function TopBar({ demo }: { demo: boolean }) {
  return (
    <div className="flex h-[var(--topbar-height)] items-center gap-4 border-b border-line px-5 sm:px-8 lg:hidden">
      <Link to={paths.landing()} className="flex min-h-11 min-w-11 flex-1 items-center rounded-xs" aria-label="SILVET home">
        <Lockup size="sm" />
      </Link>
      {demo && (
        <Link to={paths.signIn()} className="flex min-h-11 shrink-0 items-center text-ui font-medium text-midnight underline decoration-line-strong underline-offset-4 hover:decoration-midnight">
          Sign in
        </Link>
      )}
    </div>
  );
}

const railItem = (isActive: boolean) =>
  cn(
    "relative flex h-11 items-center gap-3 rounded-xs px-3 text-ui transition-colors duration-120 ease-editorial",
    isActive ? "bg-midnight-hover font-medium text-chalk" : "text-midnight-muted hover:bg-midnight-hover hover:text-chalk",
  );

function RailLink({ to, label, icon: Icon }: NavItem) {
  return (
    <NavLink to={to} viewTransition className={({ isActive }) => railItem(isActive)}>
      {({ isActive }) => (
        <>
          {isActive && <motion.span layoutId="rail-active" transition={spring} aria-hidden="true" className="absolute inset-y-2.5 left-0 w-0.5 bg-citron" />}
          <Icon className="size-[1.125rem]" strokeWidth={1.5} aria-hidden="true" />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  );
}

/** Desktop home of the demo banner: same message and link, sized for the 240 px sidebar. */
function RailDemoNote() {
  return (
    <div className="rounded-xs bg-midnight-hover px-3 pt-3.5 pb-1.5">
      <p className="text-caption">
        <span className="mr-2 inline-block size-1.5 rounded-full bg-citron align-middle" aria-hidden="true" />
        <span className="font-medium">Demo wardrobe</span>
      </p>
      <p className="mt-1 text-caption text-midnight-muted">Pieces and looks stay in this tab only. Photos are not stored.</p>
      <Link to={paths.signUp()} className="inline-flex min-h-11 items-center text-caption font-medium text-chalk underline decoration-chalk/40 underline-offset-4 hover:decoration-chalk">
        Create your wardrobe
      </Link>
    </div>
  );
}

function SideRail({ items, profile, demo }: { items: NavItem[]; profile: NavItem | null; demo: boolean }) {
  return (
    // layoutRoot: the sliding Citron edge is measured against the pinned rail, not the page, so a scroll reset
    // on navigation never reads as movement.
    <motion.aside layoutRoot style={{ viewTransitionName: "shell-rail" }} className="surface-midnight sticky top-0 hidden h-dvh w-60 shrink-0 flex-col px-5 py-7 lg:flex">
      <Link to={paths.landing()} className="block rounded-xs px-2" aria-label="SILVET home">
        <Lockup />
      </Link>
      <nav aria-label="Main" className="mt-12 flex flex-col gap-1">
        {items.map((item) => <RailLink key={item.label} {...item} />)}
      </nav>
      <div className="mt-auto space-y-5">
        {demo && <RailDemoNote />}
        <div className="border-t border-chalk/12 pt-5">
        {profile ? (
          <RailLink {...profile} />
        ) : (
          <div className="px-2">
            <p className="text-caption text-midnight-muted">Have an account?</p>
            <Link to={paths.signIn()} className="mt-1 inline-block text-ui font-medium text-chalk underline decoration-chalk/40 underline-offset-4 hover:decoration-chalk">
              Sign in
            </Link>
          </div>
        )}
        </div>
      </div>
    </motion.aside>
  );
}

function TabBar({ items }: { items: NavItem[] }) {
  return (
    <motion.nav layoutRoot aria-label="Main" style={{ viewTransitionName: "shell-tabbar" }} className="surface-midnight fixed inset-x-0 bottom-0 z-30 safe-bottom lg:hidden">
      <ul className={cn("mx-auto grid h-[var(--tabbar-height)] max-w-[45rem]", items.length === 4 ? "grid-cols-4" : "grid-cols-3")}>
        {items.map(({ to, label, icon: Icon }) => (
          <li key={label}>
            <NavLink to={to} viewTransition className={({ isActive }) => cn("relative flex h-full flex-col items-center justify-center gap-1", isActive ? "text-chalk" : "text-midnight-muted")}>
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId="tab-active" transition={spring} aria-hidden="true" className="absolute inset-x-5 top-0 h-0.5 bg-citron" />}
                  <motion.span {...tabPress} className="inline-flex">
                    <Icon className="size-5" strokeWidth={1.5} aria-hidden="true" />
                  </motion.span>
                  <span className={cn("text-caption", isActive && "font-medium")}>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </motion.nav>
  );
}

/** Phone/tablet: top bar + content + Midnight tab bar. Desktop (lg): Midnight sidebar + content. */
export function AppShell() {
  const { main, profile } = useNavItems();
  const demo = useIsDemo();
  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        onClick={(event) => { const main = document.getElementById("main"); if (main) { event.preventDefault(); main.focus(); } }}
        className="surface-midnight fixed top-3 left-3 z-[70] -translate-y-24 rounded-xs px-4 py-3 text-ui font-medium focus:translate-y-0"
      >
        Skip to content
      </a>
      <SideRail items={main} profile={profile} demo={demo} />
      <div className="flex min-w-0 flex-1 flex-col pb-[calc(var(--tabbar-height)+env(safe-area-inset-bottom))] lg:pb-0">
        <header style={{ viewTransitionName: "shell-top" }} className="sticky top-0 z-30 bg-chalk safe-top lg:hidden">
          <TopBar demo={demo} />
          {demo && <DemoBanner />}
        </header>
        <Outlet />
      </div>
      <TabBar items={profile ? [...main, profile] : main} />
    </div>
  );
}
