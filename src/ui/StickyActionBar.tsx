import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "./cn";

/**
 * Primary actions that stay in reach on phones and tablets: the bar sticks just above the Midnight tab
 * bar (and the home-indicator safe area) while its section is on screen, then rests in place at the end
 * of it. From 1024 px it is an ordinary inline row. While it is stuck, toasts lift above it
 * (--action-bar-height, read by Toast). One visible bar per screen.
 */
export function StickyActionBar({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = bar.current;
    if (!element) return;
    const root = document.documentElement;
    // A bar inside a hidden panel (Studio keeps Build and Ideas mounted) reports nothing; the visible one owns the value.
    const measure = () => {
      if (!element.offsetParent && getComputedStyle(element).position !== "fixed") return;
      root.style.setProperty("--action-bar-height", getComputedStyle(element).position === "sticky" ? `${element.offsetHeight}px` : "0px");
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => { observer.disconnect(); root.style.removeProperty("--action-bar-height"); };
  }, []);
  return (
    <div
      ref={bar}
      role={label ? "group" : undefined}
      aria-label={label}
      className={cn(
        "sticky bottom-[calc(var(--tabbar-height)+env(safe-area-inset-bottom))] z-20 -mx-5 flex flex-wrap items-center gap-3 border-t border-line bg-chalk px-5 py-3",
        "sm:-mx-8 sm:px-8 lg:static lg:mx-0 lg:border-t-0 lg:bg-transparent lg:px-0 lg:py-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
