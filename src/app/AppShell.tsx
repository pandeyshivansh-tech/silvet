import { BookOpen, CircleUser, Layers, Shirt, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { NavLink, Outlet, Link } from "react-router";
import { useBasePath, useIsDemo } from "@/data";
import { tabPress } from "@/motion/presets";
import { Lockup, cn } from "@/ui";
import { paths } from "./paths";

/**
 * App shell (SILVET_DESIGN_REFERENCE.pdf · Three layouts, one product):
 * - Phone & tablet (< 1024): Midnight tab bar, 64 px + safe area. Inactive #B3ACB9, active Chalk label
 *   with a 2 px Citron bar above it; pressed icon scales to 0.94.
 * - Desktop (≥ 1024): 240 px Chalk rail; active item = Midnight block with a Citron dot. No sign-up in the rail:
 *   the demo shows a quiet "Sign in" at the bottom, signed-in users get Profile there.
 * - Demo banner spans the content column: Midnight, Citron dot, "Create your wardrobe".
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
    <div className="surface-midnight sticky top-0 z-30">
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

function SideRail({ items, profile }: { items: NavItem[]; profile: NavItem | null }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-chalk px-5 py-7 lg:flex">
      <Link to={paths.landing()} className="px-2" aria-label="SILVET home">
        <Lockup markClassName="text-look" wordmarkClassName="text-lead" />
      </Link>
      <nav aria-label="Main" className="mt-12 flex flex-col gap-1">
        {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={label}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex h-11 items-center gap-3 rounded-xs px-3 text-ui transition-colors duration-120",
                  isActive ? "surface-midnight font-medium" : "text-midnight hover:bg-chalk-deep",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="size-[1.125rem]" strokeWidth={1.5} aria-hidden="true" />
                  <span>{label}</span>
                  {isActive && <span aria-hidden="true" className="ml-auto size-1.5 rounded-full bg-citron" />}
                </>
              )}
            </NavLink>
        ))}
      </nav>
      <div className="mt-auto border-t border-line px-2 pt-5">
        {profile ? (
          <NavLink
            to={profile.to}
            className={({ isActive }) => cn("-mx-2 flex h-11 items-center gap-3 rounded-xs px-2 text-ui", isActive ? "surface-midnight font-medium" : "text-midnight hover:bg-chalk-deep")}
          >
            <profile.icon className="size-[1.125rem]" strokeWidth={1.5} aria-hidden="true" />
            <span>{profile.label}</span>
          </NavLink>
        ) : (
          <>
            <p className="text-caption text-graphite-deep">Have an account?</p>
            <Link to={paths.signIn()} className="mt-1 inline-block text-ui font-medium text-midnight underline decoration-line-strong underline-offset-4 hover:decoration-midnight">
              Sign in
            </Link>
          </>
        )}
      </div>
    </aside>
  );
}

function TabBar({ items }: { items: NavItem[] }) {
  return (
    <nav aria-label="Main" className="surface-midnight fixed inset-x-0 bottom-0 z-30 safe-bottom lg:hidden">
      <ul className={cn("mx-auto grid h-[var(--tabbar-height)] max-w-[45rem]", items.length === 4 ? "grid-cols-4" : "grid-cols-3")}>
        {items.map(({ to, label, icon: Icon }) => (
          <li key={label}>
            <NavLink to={to} className={({ isActive }) => cn("relative flex h-full flex-col items-center justify-center gap-1", isActive ? "text-chalk" : "text-midnight-muted")}>
              {({ isActive }) => (
                <>
                  {isActive && <span aria-hidden="true" className="absolute inset-x-5 top-0 h-0.5 bg-citron" />}
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
    </nav>
  );
}

/** Phone/tablet: content + Midnight tab bar. Desktop (lg): left rail + content. */
export function AppShell() {
  const { main, profile } = useNavItems();
  const demo = useIsDemo();
  return (
    <div className="flex min-h-dvh">
      <SideRail items={main} profile={profile} />
      <div className="flex min-w-0 flex-1 flex-col pb-[calc(var(--tabbar-height)+env(safe-area-inset-bottom))] lg:pb-0">
        {demo && <DemoBanner />}
        <Outlet />
      </div>
      <TabBar items={profile ? [...main, profile] : main} />
    </div>
  );
}
