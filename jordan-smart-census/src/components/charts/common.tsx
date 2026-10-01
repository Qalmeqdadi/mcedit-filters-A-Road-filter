"use client";

import { useMemo } from "react";
import { EChart } from "./echart";
import { barH, pyramid, VIZ } from "./builders";
import { useI18n } from "@/hooks/useI18n";
import { fmtCompact, fmtInt, fmtPct } from "@/lib/format";
import { FIVE_YEAR_LABELS, toFiveYear } from "@/simulation/projection";
import type { Profile } from "@/simulation/analytics";

export function PyramidChart({ m, f, height = 300, compare, share }: { m: number[]; f: number[]; height?: number; compare?: { m: number[]; f: number[]; label: string }; share?: boolean }) {
  const { t, ar, locale } = useI18n();
  const option = useMemo(() => {
    const M = toFiveYear(m);
    const F = toFiveYear(f);
    const total = M.reduce((a, b) => a + b, 0) + F.reduce((a, b) => a + b, 0);
    const norm = (arr: number[], tot: number) => (share ? arr.map((v) => v / tot) : arr);
    const cmp = compare ? { m: norm(toFiveYear(compare.m), toFiveYear(compare.m).reduce((a, b) => a + b, 0) + toFiveYear(compare.f).reduce((a, b) => a + b, 0)), f: norm(toFiveYear(compare.f), toFiveYear(compare.m).reduce((a, b) => a + b, 0) + toFiveYear(compare.f).reduce((a, b) => a + b, 0)), label: compare.label } : undefined;
    return pyramid(FIVE_YEAR_LABELS, norm(M, total), norm(F, total), { rtl: ar, maleLabel: t("males"), femaleLabel: t("females"), fmt: share ? (v) => fmtPct(v, 1) : (v) => fmtCompact(v, locale), compare: cmp });
  }, [m, f, compare, share, ar, t, locale]);
  return <EChart option={option} height={height} />;
}

/** Horizontal category bars with value labels. */
export function CategoryBars({ items, height, pct, color, total }: { items: { label: string; value: number }[]; height?: number; pct?: boolean; color?: string; total?: number }) {
  const { ar, locale } = useI18n();
  const option = useMemo(() => {
    const tot = total ?? items.reduce((a, b) => a + b.value, 0);
    const data = items.map((i) => (pct ? i.value / Math.max(1e-9, tot) : i.value));
    return barH(items.map((i) => i.label), [{ name: "", data, color: color ?? VIZ[0] }], { rtl: ar, showLabels: true, fmt: pct ? (v) => fmtPct(v, 1) : (v) => fmtCompact(v, locale) });
  }, [items, pct, color, total, ar, locale]);
  return <EChart option={option} height={height ?? Math.max(120, items.length * 26 + 20)} />;
}

export function AgeGroupStrip({ p }: { p: Profile }) {
  const { t } = useI18n();
  const groups = [
    { k: t("children"), v: p.groups.a0_14, c: VIZ[2] },
    { k: t("youth"), v: p.groups.a15_24, c: VIZ[0] },
    { k: t("workingAge"), v: p.groups.a15_64, c: VIZ[3] },
    { k: t("elderly"), v: p.groups.a65, c: VIZ[1] },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {groups.map((g) => (
        <div key={g.k} className="rounded-md border border-line/80 bg-sand-50/60 px-2.5 py-2">
          <div className="flex items-center gap-1.5 text-[11px] text-ink-500"><span className="h-2 w-2 rounded-sm" style={{ background: g.c }} />{g.k}</div>
          <div className="mt-0.5 text-[16px] font-semibold text-ink-900 tabular">{fmtPct(g.v / Math.max(1, p.population))}</div>
          <div className="text-[11px] text-ink-500 tabular">{fmtInt(g.v)}</div>
        </div>
      ))}
    </div>
  );
}

export function SexSplit({ male, female }: { male: number; female: number }) {
  const { t } = useI18n();
  const tot = male + female || 1;
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full">
        <div style={{ width: `${(male / tot) * 100}%`, background: VIZ[0] }} />
        <div className="w-[2px] bg-card" />
        <div style={{ width: `${(female / tot) * 100}%`, background: VIZ[1] }} />
      </div>
      <div className="mt-1.5 flex justify-between text-[12px]">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: VIZ[0] }} />{t("males")} <b className="tabular">{fmtPct(male / tot)}</b></span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: VIZ[1] }} />{t("females")} <b className="tabular">{fmtPct(female / tot)}</b></span>
      </div>
    </div>
  );
}

export function StatRow({ label, value, sub }: { label: React.ReactNode; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line/60 py-1.5 last:border-0">
      <span className="text-[12.5px] text-ink-500">{label}</span>
      <span className="text-end text-[13px] font-semibold text-ink-900 tabular">{value}{sub ? <span className="ms-1.5 text-[11px] font-normal text-ink-500">{sub}</span> : null}</span>
    </div>
  );
}
