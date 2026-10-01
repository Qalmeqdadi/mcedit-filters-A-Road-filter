"use client";

import type { ReactNode } from "react";
import type { DataNature } from "@/types/census";
import { cn } from "@/lib/utils";
import { NatureBadge } from "./badges";
import { ProvenanceButton } from "./provenance";

export function Panel({ title, subtitle, nature, sources, actions, children, className, bodyClass, id }: { title?: ReactNode; subtitle?: ReactNode; nature?: DataNature; sources?: string[]; actions?: ReactNode; children: ReactNode; className?: string; bodyClass?: string; id?: string }) {
  return (
    <section id={id} className={cn("print-page flex min-w-0 flex-col rounded-lg border border-line bg-card shadow-[0_1px_2px_rgba(20,26,36,0.04)]", className)}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 border-b border-line/70 px-4 pb-2.5 pt-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[13.5px] font-semibold tracking-[-0.005em] text-ink-900">{title}</h3>
              {nature ? <NatureBadge nature={nature} /> : null}
            </div>
            {subtitle ? <p className="mt-0.5 text-[12px] leading-snug text-ink-500">{subtitle}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {actions}
            {sources?.length ? <ProvenanceButton ids={sources} /> : null}
          </div>
        </header>
      )}
      <div className={cn("min-h-0 flex-1 px-4 py-3", bodyClass)}>{children}</div>
    </section>
  );
}

export function PageHeader({ index, title, subtitle, children }: { index?: string; title: ReactNode; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          {index ? <span className="font-mono text-[12px] font-semibold text-sand-500">{index}</span> : null}
          <h1 className="text-[21px] font-semibold tracking-[-0.015em] text-ink-900">{title}</h1>
        </div>
        {subtitle ? <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-ink-500">{subtitle}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

export function Callout({ tone = "info", children, className }: { tone?: "info" | "warn" | "sim"; children: ReactNode; className?: string }) {
  const cls = tone === "warn" ? "border-warn/30 bg-warn-bg text-[#6b4700]" : tone === "sim" ? "border-nat-simulated/30 bg-[#fbf3e4] text-[#5e3f0d]" : "border-navy-300/60 bg-navy-100/60 text-navy-800";
  return <div className={cn("rounded-md border px-3 py-2 text-[12.5px] leading-relaxed", cls, className)}>{children}</div>;
}
