"use client";

import { ArrowRight } from "lucide-react";
import { useApp } from "@/store/app";
import { useEngine } from "@/store/engine";
import { useI18n } from "@/hooks/useI18n";
import { fmtCompact, fmtInt, fmtPct, fmtSignedPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePlans } from "./shared";

interface Item { label: string; now: number; then: number; fmt: (v: number) => string; better: "up" | "down" | null }

/** "Today → horizon" strip under the Planning bar: the same indicators at the census base year and at the selected horizon. */
export function HorizonRibbon() {
  const engine = useEngine();
  const { L, tx, locale } = useI18n();
  const govId = useApp((s) => s.govId);
  const { snap, year } = usePlans();
  if (!snap) return <div className="mb-3 h-[58px] animate-pulse rounded-lg border border-line bg-card" data-testid="horizon-ribbon" />;
  const B = snap.baseYear;
  const a0 = govId ? snap.sa0.gov[govId] : snap.sa0.national;
  const aH = govId ? snap.saH.gov[govId] : snap.saH.national;
  const ec = govId ? { b: snap.economy.byGov[govId].perCapBase, h: snap.economy.byGov[govId].perCapH } : { b: snap.economy.national.perCapBase, h: snap.economy.national.perCapH };
  const en = govId ? { b: snap.energy.byGov[govId].peakBase, h: snap.energy.byGov[govId].peakH } : { b: snap.energy.national.peakBase, h: snap.energy.national.peakH };
  const ws = govId ? snap.water.byGov[govId] : snap.water.national;
  const w0 = ws.find((x) => x.year === B) ?? ws[0];
  const wH = ws.find((x) => x.year === year) ?? ws[ws.length - 1];
  const c = (v: number) => fmtCompact(v, locale);
  const items: Item[] = [
    { label: L("Population", "السكان"), now: a0.pop, then: aH.pop, fmt: c, better: null },
    { label: L("Households", "الأسر"), now: a0.households, then: aH.households, fmt: c, better: null },
    { label: L("School age 6–17", "سن المدرسة 6–17"), now: a0.a6_17, then: aH.a6_17, fmt: c, better: null },
    { label: L("Aged 65+", "65+"), now: a0.a65, then: aH.a65, fmt: c, better: null },
    { label: L("Output per resident", "الناتج للفرد"), now: ec.b, then: ec.h, fmt: (v) => `JOD ${fmtInt(v)}`, better: "up" },
    { label: L("Peak electricity", "ذروة الكهرباء"), now: en.b, then: en.h, fmt: (v) => `${fmtInt(v)} MW`, better: null },
    { label: L("Water supply ÷ need", "الإمداد المائي ÷ الحاجة"), now: w0.ratio, then: wH.ratio, fmt: (v) => fmtPct(v, 0), better: "up" },
  ];
  const asIs = year === B;
  return (
    <div className="mb-3 rounded-lg border border-line bg-card px-3 py-2" data-testid="horizon-ribbon">
      <div className="mb-1 flex flex-wrap items-center gap-x-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
        <span>{govId ? tx(engine.world.gov[govId].name) : L("Jordan", "الأردن")}</span>
        <span className="text-ink-300">·</span>
        <span>{asIs ? L(`As-is view — census base year ${B}`, `الوضع الراهن — سنة أساس التعداد ${B}`) : L(`Today ${B} → ${year}`, `اليوم ${B} ← ${year}`)}</span>
      </div>
      <div className="thin-scroll flex gap-4 overflow-x-auto pb-0.5">
        {items.map((it) => {
          const d = it.now ? it.then / it.now - 1 : 0;
          const good = it.better === null ? null : it.better === "up" ? d >= 0 : d <= 0;
          return (
            <div key={it.label} className="min-w-[118px] shrink-0">
              <div className="text-[11px] text-ink-500">{it.label}</div>
              {asIs ? <div className="text-[14px] font-semibold tabular text-ink-900">{it.fmt(it.now)}</div> : (
                <div className="flex flex-wrap items-baseline gap-x-1 text-[13px] tabular">
                  <span className="text-ink-500">{it.fmt(it.now)}</span>
                  <ArrowRight size={11} className="self-center text-ink-400 rtl:rotate-180" />
                  <span className="font-semibold text-ink-900">{it.fmt(it.then)}</span>
                  <span className={cn("text-[11px] font-medium", good === null ? "text-ink-500" : good ? "text-ok" : "text-crit")}>{it.label.includes("÷") ? `${d >= 0 ? "+" : "−"}${Math.abs(Math.round((it.then - it.now) * 100))} pts` : fmtSignedPct(d, 0)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
