import { useSyncExternalStore } from "react";

/**
 * In-memory router for the single-file hosted build (replaces Next.js routing).
 * The hosted viewer only passes plain `#token` hashes, so `/planning` ⇄ `#planning`.
 */
const fromHash = (h: string) => {
  const t = h.replace(/^#/, "");
  return /^[a-z-]+$/.test(t) ? `/${t}` : "/";
};

let current = typeof window === "undefined" ? "/" : fromHash(window.location.hash);
const listeners = new Set<() => void>();

export function navigate(href: string) {
  const path = href.split("#")[0] || "/";
  if (path === current) return;
  current = path;
  try {
    history.replaceState(null, "", path === "/" ? " " : `#${path.slice(1)}`);
  } catch {
    /* sandboxed frame: keep the route in memory only */
  }
  try {
    window.scrollTo({ top: 0 });
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function useLocation() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => current,
  );
}
