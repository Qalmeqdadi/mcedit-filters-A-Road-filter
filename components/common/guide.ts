"use client";

import { GUIDED_STEPS } from "@/lib/guided";
import { useApp } from "@/lib/store";

/** Returns the highlight class when the guided demo's next action targets this element. */
export function useGuide(target: string): string {
  return useApp((s) => {
    if (!s.guided.active) return "";
    const step = GUIDED_STEPS[s.guided.step];
    const next = step?.actions.find((a) => !a.done(s));
    return next?.target === target ? "guide-highlight" : "";
  });
}
