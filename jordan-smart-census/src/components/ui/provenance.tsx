"use client";

import * as P from "@radix-ui/react-popover";
import { Info } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { useApp } from "@/store/app";
import { useSources } from "@/hooks/useSources";
import { NatureBadge } from "./badges";

/** Small ⓘ button beside any KPI / chart / layer exposing its data provenance. */
export function ProvenanceButton({ ids, className }: { ids: string[]; className?: string }) {
  const { tx, t, dir } = useI18n();
  const openPanel = useApp((s) => s.openProvenance);
  const sources = useSources();
  const list = ids.map((id) => sources[id]).filter(Boolean);
  return (
    <P.Root>
      <P.Trigger asChild>
        <button type="button" aria-label={t("provenanceFor")} className={`no-print inline-flex h-5 w-5 items-center justify-center rounded-full text-ink-400 hover:bg-sand-100 hover:text-navy-700 ${className ?? ""}`}>
          <Info size={13} />
        </button>
      </P.Trigger>
      <P.Portal>
        <P.Content dir={dir} side="bottom" align="end" sideOffset={6} className="z-[60] w-[340px] rounded-md border border-line bg-card p-3 shadow-xl">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">{t("provenanceFor")}</div>
          <div className="space-y-3">
            {list.map((s) => (
              <div key={s.id} className="space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-[13px] font-semibold leading-snug text-ink-900">{tx(s.name)}</div>
                  <NatureBadge nature={s.nature} />
                </div>
                <div className="text-[11.5px] text-ink-500">{s.source} · {s.year}</div>
                <div className="text-[12px] leading-relaxed text-ink-700">{tx(s.methodology)}</div>
                <div className="text-[11.5px] italic text-ink-500">{tx(s.notes)}</div>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => openPanel(ids)} className="mt-3 text-[12px] font-medium text-navy-600 hover:underline">{t("openProvenance")} →</button>
          <P.Arrow className="fill-card" />
        </P.Content>
      </P.Portal>
    </P.Root>
  );
}
