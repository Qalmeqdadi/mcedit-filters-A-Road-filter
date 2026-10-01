"use client";

import type { ReactNode } from "react";
import type { DataNature } from "@/types/census";
import { cn } from "@/lib/utils";
import { NatureBadge } from "./badges";
import { ProvenanceButton } from "./provenance";
import { useI18n } from "@/hooks/useI18n";

export function Kpi({ label, value, sub, nature, sources, tone, className, spark }: { label: ReactNode; value: ReactNode; sub?: ReactNode; nature?: DataNature; sources?: string[]; tone?: "ok" | "warn" | "crit"; className?: string; spark?: ReactNode }) {
  const { ar } = useI18n();
  return (
    <div className={cn("relative flex min-w-0 flex-col rounded-lg border border-line bg-card px-3.5 py-3", className)}>
      <div className="flex items-start justify-between gap-1">
        <div className="text-[11.5px] font-medium leading-tight text-ink-500">{label}</div>
        {sources?.length ? <ProvenanceButton ids={sources} className="-mt-0.5 -me-1" /> : null}
      </div>
      <div data-kpi-value className={cn("mt-1.5 whitespace-nowrap font-semibold leading-none tracking-[-0.02em] tabular", ar ? "text-[18px]" : "text-[21px]", tone === "ok" && "text-ok", tone === "warn" && "text-warn", tone === "crit" && "text-crit", !tone && "text-ink-900")}>{value}</div>
      {sub ? <div className="mt-1.5 text-[11.5px] leading-snug text-ink-500 tabular">{sub}</div> : null}
      {spark}
      {nature ? <div className="mt-2"><NatureBadge nature={nature} compact /></div> : null}
    </div>
  );
}

export function ProgressBar({ value, expected, color = "#2f62a6", className }: { value: number; expected?: number; color?: string; className?: string }) {
  return (
    <div className={cn("relative h-1.5 w-full rounded-full bg-sand-100", className)}>
      <div className="absolute inset-y-0 start-0 rounded-full transition-[width] duration-500" style={{ width: `${Math.min(100, value * 100)}%`, background: color }} />
      {expected !== undefined ? <div className="absolute -top-0.5 h-2.5 w-[2px] rounded bg-ink-900/60" style={{ insetInlineStart: `calc(${Math.min(100, expected * 100)}% - 1px)` }} /> : null}
    </div>
  );
}
