"use client";

import { useMemo, useState } from "react";
import { useEngine } from "@/store/engine";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader, Panel } from "@/components/ui/panel";
import { Kpi } from "@/components/ui/kpi";
import { Segmented } from "@/components/ui/form";
import { EChart } from "@/components/charts/echart";
import { barV, heatmap, sankey, VIZ } from "@/components/charts/builders";
import { CategoryBars } from "@/components/charts/common";
import { JordanMap, type MapLine } from "@/features/gis/JordanMap";
import { ScopeBar, SmallSample, useProfiles } from "./shared";
import { MOVE_REASONS, PREV_COUNTRIES } from "@/simulation/analytics";
import { fmtCompact, fmtInt, fmtPct } from "@/lib/format";
import type { GovId } from "@/types/census";

/** quadratic Bézier arc between two points */
function arc(a: [number, number], b: [number, number]): [number, number][] {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const c: [number, number] = [mx - dy * 0.25, my + dx * 0.25];
  const pts: [number, number][] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    pts.push([(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]]);
  }
  return pts;
}

export function Migration() {
  const engine = useEngine();
  const { t, tx, L, lb, ar, locale } = useI18n();
  const { profile: p, national } = useProfiles();
  const [view, setView] = useState<"matrix" | "sankey">("sankey");
  const world = engine.world;
  const M = p.migration;
  const flows = useMemo(() => Object.entries(national.migration.flows).map(([k, v]) => ({ from: k.split(">")[0] as GovId, to: k.split(">")[1] as GovId, v })).sort((a, b) => b.v - a.v), [national]);
  const lines: MapLine[] = useMemo(() => {
    const max = flows[0]?.v ?? 1;
    return flows.slice(0, 24).map((f) => ({ coords: arc(world.gov[f.from].capitalPoint, world.gov[f.to].capitalPoint), width: 1 + (6 * f.v) / max, color: world.gov[f.to].id === "AMM" ? "#2f62a6" : "#d07a1c" }));
  }, [flows, world]);
  const ids = world.governorates.map((g) => g.id);
  const names = world.governorates.map((g) => tx(g.name));
  const matrix = useMemo(() => heatmap(names, names, flows.map((f) => [ids.indexOf(f.to), ids.indexOf(f.from), Math.round(f.v)] as [number, number, number]), { rtl: ar, fmt: (v) => fmtCompact(v, locale) }), [flows, names, ids, ar, locale]);
  const sk = useMemo(() => {
    const top = flows.slice(0, 30);
    const origins = Array.from(new Set(top.map((f) => f.from)));
    const dests = Array.from(new Set(top.map((f) => f.to)));
    const on = (g: GovId) => `${tx(world.gov[g].name)} ›`;
    const dn = (g: GovId) => `› ${tx(world.gov[g].name)}`;
    return sankey([...origins.map((g, i) => ({ name: on(g), color: VIZ[i % 6] })), ...dests.map((g) => ({ name: dn(g), color: "#22406b" }))], top.map((f) => ({ source: on(f.from), target: dn(f.to), value: Math.round(f.v) })), { rtl: ar, fmt: (v) => fmtCompact(v, locale) });
  }, [flows, world, tx, ar, locale]);
  const years = useMemo(() => barV([L("< 5 years", "< 5 سنوات"), "5–9", "10–14", "15+"], [{ name: t("persons"), data: M.years, color: VIZ[0] }], { rtl: ar, fmt: (v) => fmtCompact(v, locale) }), [M, ar, L, t, locale]);
  const movers = M.internal + M.abroad;
  return (
    <div>
      <PageHeader index="16" title={t("nav16")} subtitle={L("Current residence, previous governorate or country, years since move and reason for move. Flows are synthetic and illustrative.", "مكان الإقامة الحالي، والمحافظة أو الدولة السابقة، والسنوات منذ الانتقال، وسبب الانتقال. التدفقات اصطناعية وتوضيحية.")} />
      <ScopeBar />
      <SmallSample p={p} />
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <Kpi label={L("Lifetime movers", "المنتقلون مدى الحياة")} value={fmtCompact(movers, locale)} sub={fmtPct(movers / Math.max(1, p.population))} nature="SIMULATED" sources={["SIM_MICRODATA"]} />
        <Kpi label={L("From another governorate", "من محافظة أخرى")} value={fmtCompact(M.internal, locale)} nature="SIMULATED" />
        <Kpi label={L("From abroad", "من خارج الأردن")} value={fmtCompact(M.abroad, locale)} nature="SIMULATED" />
        <Kpi label={L("Moved in last 5 years", "انتقلوا خلال آخر 5 سنوات")} value={fmtCompact(M.years[0], locale)} nature="SIMULATED" />
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <JordanMap height={480} title={L("Top 24 governorate-to-governorate flows", "أكبر 24 تدفقاً بين المحافظات")} lines={lines} sources={["SIM_MICRODATA", "GEO_ADM1"]} showLabelsDefault eaLegend={[{ color: "#2f62a6", label: L("Into Amman", "إلى العاصمة") }, { color: "#d07a1c", label: L("Other destinations", "وجهات أخرى") }]} />
        <Panel title={L("Internal migration flows", "تدفقات الهجرة الداخلية")} nature="SIMULATED" sources={["SIM_MICRODATA"]} actions={<Segmented size="xs" value={view} onChange={setView} options={[{ value: "sankey", label: "Sankey" }, { value: "matrix", label: L("Matrix", "مصفوفة") }]} />} subtitle={view === "matrix" ? L("Rows: previous governorate · columns: current governorate", "الصفوف: المحافظة السابقة · الأعمدة: المحافظة الحالية") : L("Previous governorate › current governorate (top 30 flows)", "المحافظة السابقة › المحافظة الحالية (أكبر 30 تدفقاً)")}>
          <EChart option={view === "matrix" ? matrix : sk} height={420} />
        </Panel>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <Panel title={L("Previous country (arrivals from abroad)", "الدولة السابقة (القادمون من الخارج)")} nature="SIMULATED"><CategoryBars items={PREV_COUNTRIES.map((k) => ({ label: lb("prevCountry", k), value: M.prevCountry[k] }))} pct color={VIZ[3]} /></Panel>
        <Panel title={L("Years since move", "السنوات منذ الانتقال")} nature="SIMULATED"><EChart option={years} height={210} /></Panel>
        <Panel title={L("Reason for move", "سبب الانتقال")} nature="SIMULATED"><CategoryBars items={MOVE_REASONS.map((k) => ({ label: lb("moveReason", k), value: M.reasons[k] }))} pct color={VIZ[1]} /></Panel>
      </div>
      <Panel className="mt-3" title={L("Largest flows", "أكبر التدفقات")} nature="SIMULATED">
        <table className="w-full text-[12.5px]"><thead><tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-500"><th className="py-1.5 text-start">{L("From", "من")}</th><th className="text-start">{L("To", "إلى")}</th><th className="text-end">{t("persons")}</th></tr></thead>
          <tbody>{flows.slice(0, 10).map((f) => <tr key={`${f.from}${f.to}`} className="border-b border-line/60"><td className="py-1.5">{tx(world.gov[f.from].name)}</td><td>{tx(world.gov[f.to].name)}</td><td className="text-end tabular">{fmtInt(f.v)}</td></tr>)}</tbody>
        </table>
      </Panel>
    </div>
  );
}
