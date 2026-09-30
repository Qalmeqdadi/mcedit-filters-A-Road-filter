"use client";

import { navigate, useLocation } from "./router";

export function useRouter() {
  return {
    push: (href: string) => navigate(href),
    replace: (href: string) => navigate(href, { replace: true }),
    back: () => undefined,
    refresh: () => undefined,
    prefetch: () => undefined,
  };
}

export function usePathname() {
  return useLocation().split("?")[0];
}

export function useSearchParams() {
  const loc = useLocation();
  const q = loc.includes("?") ? loc.slice(loc.indexOf("?") + 1) : "";
  return new URLSearchParams(q);
}
