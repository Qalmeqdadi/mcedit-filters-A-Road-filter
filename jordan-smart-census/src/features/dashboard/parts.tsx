"use client";

import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import * as P from "@radix-ui/react-popover";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import { GOVERNORATE_GEO } from "@/data/geo";
import type { GovId } from "@/types/census";
import { entity, FRESH_LABEL, freshness, fmtValue, STATUS_HELP, STATUS_LABEL, type Freshness, type Indicator, type Status } from "@/data/registry";

const STATUS_CLS: Record<Status, string> = {
  OFFICIAL: "border-nat-official/40 bg-nat-official/10 text-nat-official",
  REPORTED: "border-navy-500/35 bg-navy-100/70 text-navy-700",
  DERIVED: "border-nat-reference/35 bg-nat-reference/8 text-nat-reference",
  INTERNATIONAL: "border-[#6b5aa6]/35 bg-[#6b5aa6]/8 text-[#5a4a94]",
  MISSING: "border-crit/30 bg-crit-bg text-crit",
};
const FRESH_CLS: Record<Freshness, string> = { CURRENT: "text-ok", LATE: "text-warn", STALE: "text-serious", MISSING: "text-crit" };

export function StatusBadge({ s, className }: { s: Status; className?: string }) {
  const { tx } = useI18n();
  return (
    <span title={tx(STATUS_HELP[s])} data-status={s} className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-[3px] border px-1.5 py-[1px] text-[9.5px] font-semibold uppercase leading-[14px] tracking-[0.06em]", STATUS_CLS[s], className)}>
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-80" />{tx(STATUS_LABEL[s])}
    </span>
  );
}

export function FreshDot({ f }: { f: Freshness }) {
  const { tx } = useI18n();
  return <span className={cn("inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-medium", FRESH_CLS[f])}><span className="inline-block h-2 w-2 rounded-full bg-current" />{tx(FRESH_LABEL[f])}</span>;
}

/** Tiny line chart of an annual or quarterly series (scaled to its own range). */
export function Spark({ data, color = "#2f62a6", w = 120, h = 28 }: { data: number[]; color?: string; w?: number; h?: number }) {
  const d = data.filter((v) => Number.isFinite(v));
  if (d.length < 2) return null;
  const lo = Math.min(...d);
  const hi = Math.max(...d);
  const x = (i: number) => 2 + (i * (w - 4)) / (d.length - 1);
  const y = (v: number) => (hi === lo ? h / 2 : h - 3 - ((v - lo) / (hi - lo)) * (h - 6));
  const path = d.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block max-w-full" aria-hidden>
      <path d={path} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(d.length - 1)} cy={y(d[d.length - 1])} r={2.4} fill={color} />
    </svg>
  );
}

export function OwnerChip({ id }: { id: string }) {
  const { tx } = useI18n();
  const e = entity(id);
  return <span title={tx(e.name)} className="inline-flex items-center rounded bg-sand-100 px-1.5 py-[1px] text-[11px] font-semibold text-ink-700">{tx(e.short)}</span>;
}

/** Source line with a link and retrieval date, inside a popover. */
export function SourcePop({ i, children }: { i: Indicator; children?: ReactNode }) {
  const { tx, L, dir } = useI18n();
  const f = freshness(i);
  return (
    <P.Root>
      <P.Trigger asChild>
        <button type="button" className="text-start underline decoration-dotted decoration-ink-300 underline-offset-2 hover:decoration-navy-500" data-testid="source-pop">{children ?? L("Source", "المصدر")}</button>
      </P.Trigger>
      <P.Portal>
        <P.Content dir={dir} side="bottom" align="start" sideOffset={6} className="z-[60] w-[360px] max-w-[92vw] rounded-md border border-line bg-card p-3 text-[12px] shadow-xl">
          <div className="flex items-start justify-between gap-2"><div className="font-semibold text-ink-900">{tx(i.name)}</div><StatusBadge s={i.status} /></div>
          <div className="mt-1.5 space-y-1 text-ink-700">
            <div><span className="text-ink-500">{L("Accountable entity", "الجهة المسؤولة")}: </span>{tx(entity(i.owner).name)}</div>
            <div><span className="text-ink-500">{L("Latest period", "آخر فترة")}: </span>{i.period ?? "—"} · <FreshDot f={f.state} /></div>
            <div><span className="text-ink-500">{L("Source", "المصدر")}: </span>{i.source.name}</div>
            {i.source.retrieved ? <div className="text-ink-500">{L("Retrieved", "تاريخ الجلب")} {i.source.retrieved}{i.source.sha ? ` · sha256 ${i.source.sha}…` : ""}</div> : null}
            {i.note ? <div className="italic text-ink-500">{tx(i.note)}</div> : null}
            {i.source.url ? <a href={i.source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-navy-600 hover:underline">{L("Open the source", "فتح المصدر")}<ExternalLink size={11} /></a> : null}
          </div>
          <P.Arrow className="fill-card" />
        </P.Content>
      </P.Portal>
    </P.Root>
  );
}

export function IndValue({ i, v }: { i: Indicator; v?: number }) {
  return <>{fmtValue(i, v ?? i.value)}</>;
}

export function ConceptBanner() {
  const { L } = useI18n();
  return (
    <div className="mb-3 rounded-md border border-sand-300 bg-sand-50 px-3 py-2 text-[12px] leading-relaxed text-ink-700" data-testid="concept-banner">
      <b className="text-ink-900">{L("Concept proposal", "مقترح مفاهيمي")}</b> — {L("not an official product of the Royal Hashemite Court or of any government entity. Ownership and accountability arrangements shown are proposals for discussion. Every figure shows its source and status; model outputs elsewhere in UFUQ are simulated.", "ليس منتجاً رسمياً للديوان الملكي الهاشمي أو لأي جهة حكومية. ترتيبات الملكية والمساءلة المعروضة مقترحات للنقاش. يظهر لكل رقم مصدره وحالته؛ ومخرجات النماذج في بقية أفق محاكاة.")}
    </div>
  );
}

const GOV_NAMES = Object.fromEntries(GOVERNORATE_GEO.features.map((f) => [f.properties.id, { en: f.properties.nameEn, ar: f.properties.nameAr }])) as Record<GovId, { en: string; ar: string }>;
export const govName = (g: GovId, ar: boolean) => (ar ? GOV_NAMES[g].ar : GOV_NAMES[g].en);
