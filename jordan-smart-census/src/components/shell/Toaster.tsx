"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import type { ToastDetail } from "@/lib/hosted";

/** Small notification area used by the hosted view (exports copied to the clipboard). */
export function Toaster() {
  const [t, setT] = useState<ToastDetail | null>(null);
  useEffect(() => {
    const on = (e: Event) => setT((e as CustomEvent<ToastDetail>).detail);
    window.addEventListener("jsc-toast", on);
    return () => window.removeEventListener("jsc-toast", on);
  }, []);
  useEffect(() => {
    if (!t || t.fallback) return;
    const h = setTimeout(() => setT(null), 5000);
    return () => clearTimeout(h);
  }, [t]);
  if (!t) return null;
  return (
    <div role="status" className="no-print fixed left-1/2 top-[calc(env(safe-area-inset-top,0px)+64px)] z-[80] w-[min(520px,calc(100vw-24px))] -translate-x-1/2 rounded-lg border border-navy-700 bg-navy-900 p-3 text-[12.5px] text-white shadow-2xl">
      <div className="flex items-start gap-2">
        <p className="flex-1 leading-relaxed">{t.message}</p>
        <button type="button" onClick={() => setT(null)} className="rounded p-0.5 text-navy-300 hover:text-white" aria-label="Close"><X size={15} /></button>
      </div>
      {t.fallback ? <textarea readOnly value={t.fallback} onFocus={(e) => e.currentTarget.select()} className="mt-2 h-40 w-full rounded border border-white/15 bg-navy-950 p-2 font-mono text-[11px] text-navy-100" /> : null}
    </div>
  );
}
