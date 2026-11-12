import { useSyncExternalStore } from "react";

/** Subscribes to a CSS media query. SSR-safe default: false. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query).matches : false),
    () => false,
  );
}

/** Phone: under 640 px (below Tailwind `sm:`). Sheets are bottom sheets here. */
export const useIsPhone = () => useMediaQuery("(max-width: 39.9375rem)");
/** Desktop: 1024 px and up (Tailwind `lg:`). The side rail appears here. */
export const useIsDesktop = () => useMediaQuery("(min-width: 64rem)");
