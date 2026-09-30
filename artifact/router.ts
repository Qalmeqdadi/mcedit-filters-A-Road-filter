"use client";

import { useSyncExternalStore } from "react";

/** In-memory router used by the single-file hosted build (replaces Next.js routing). */
let current = "/";
const listeners = new Set<() => void>();

export function navigate(href: string, opts: { replace?: boolean } = {}) {
  if (!href || href === current) return;
  current = href;
  void opts;
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
