"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useEngine } from "@/store/engine";
import { useI18n } from "@/hooks/useI18n";
import { Panel } from "@/components/ui/panel";
import { Segmented, Slider } from "@/components/ui/form";
import { EChart } from "@/components/charts/echart";
import { line, VIZ } from "@/components/charts/builders";
import { DEFAULT_UNCERTAINTY, probAbove, probabilisticProjection, type Indicator } from "@/simulation/lab/uncertainty";
import { PROJECTION_YEARS, type FullScenario } from "@/simulation/scenarios";
import { downloadCsv } from "@/lib/csv";
import { Button } from "@/components/ui/button";
import { fmtCompact, fmtInt, fmtPct } from "@/lib/format";
import type { ProjectionPoint } from "@/types/census";
import { SimpleTable } from "@/features/lab/shared";

/** Monte-Carlo fan chart and probability statements for the Population Projections module. */
export function Uncertainty({ params, central, year }: { params: FullScenario; central: ProjectionPoint[]; year: number }) {
  const engine = useEngine();
  const { L, ar, locale } = useI18n();
  const [ind, setInd] = useState<Indicator>("population");
  const [migSigma, setMigSigma] = useState(DEFAULT_UNCERTAINTY.migSigma);
  const [tfrSigma, setTfrSigma] = useState(DEFAULT_UNCERTAINTY.tfrSigma);
  const dParams = useDeferredValue(params);
  const u = useMemo(() => ({ ...DEFAULT_UNCERTAINTY, migSigma, tfrSigma }), [migSigma, tfrSigma]);
  const du = useDeferredValue(u);
  const res = useMemo(() => probabilisticProjection(engine.world, engine.world.totals.population, dParams, du), [engine.world, dParams, du]);
  const bands = res.bands[ind];
  const yr = PROJECTION_YEARS.includes(year) ? year : 2050;
  const b = bands.find((x) => x.year === yr)!;
  const [threshold, setThreshold] = useState<number | null>(null);
  const th = threshold ?? Math.round(b.p50 / 1e5) * 1e5;
  const label: Record<Indicator, string> = { population: L("Total population", "إجمالي السكان"), age6_17: L("School-age 6–17", "سن المدرسة 6–17"), age65plus: L("Elderly 65+", "كبار السن 65+"), age15_64: L("Working age 15–64", "سن العمل 15–64"), households: L("Households", "الأسر") };

  const chart = useMemo(() => {
    const o = line(res.years, [
      { name: L("Median", "الوسيط"), data: bands.map((x) => Math.round(x.p50)), color: VIZ[0] },
      { name: L("Deterministic (selected assumptions)", "حتمي (الافتراضات المختارة)"), data: central.map((p) => Math.round(p[ind])), color: "#8a8270", dashed: true },
    ], { rtl: ar, fmt: (v) => fmtCompact(v, locale), markX: yr });
    const s = o.series as Record<string, unknown>[];
    const band = (name: string, lo: number[], hi: number[], op: number, stack: string) => {
      s.push({ type: "line", name: `${name}-lo`, stack, data: lo.map(Math.round), lineStyle: { opacity: 0 }, symbol: "none", areaStyle: { opacity: 0 }, tooltip: { show: false } });
      s.push({ type: "line", name, stack, data: hi.map((h, i) => Math.round(h - lo[i])), lineStyle: { opacity: 0 }, symbol: "none", itemStyle: { color: VIZ[0] }, areaStyle: { color: VIZ[0], opacity: op }, tooltip: { show: false } });
    };
    band(L("95% range", "نطاق 95%"), bands.map((x) => x.p025), bands.map((x) => x.p975), 0.1, "b95");
    band(L("80% range", "نطاق 80%"), bands.map((x) => x.p10), bands.map((x) => x.p90), 0.16, "b80");
    (o as { yAxis: Record<string, unknown> }).yAxis.scale = true;
    (o as { legend?: Record<string, unknown> }).legend = { ...(o as { legend?: Record<string, unknown> }).legend, data: [L("Median", "الوسيط"), L("80% range", "نطاق 80%"), L("95% range", "نطاق 95%"), L("Deterministic (selected assumptions)", "حتمي (الافتراضات المختارة)")] };
    return o;
  }, [res, bands, central, ind, ar, locale, yr, L]);

  const p = probAbove(res, ind, yr, th);
  const exportCsv = () => downloadCsv("probabilistic-projection.csv", (Object.keys(res.bands) as Indicator[]).flatMap((k) => res.bands[k].map((x) => ({ indicator: k, year: x.year, p2_5: Math.round(x.p025), p10: Math.round(x.p10), median: Math.round(x.p50), p90: Math.round(x.p90), p97_5: Math.round(x.p975), runs: res.params.runs, tfr_sigma: res.params.tfrSigma, e0_sigma: res.params.e0Sigma, migration_sigma: res.params.migSigma, data_nature: "SIMULATED" }))));

  return (
    <Panel title={L("Probabilistic projection — uncertainty ranges", "الإسقاط الاحتمالي — نطاقات عدم اليقين")} subtitle={L(`${res.params.runs} Monte-Carlo runs varying fertility, life expectancy and migration around the selected assumptions`, `${res.params.runs} محاكاة مونت كارلو تغيّر الخصوبة والعمر المتوقع والهجرة حول الافتراضات المختارة`)} nature="SIMULATED" sources={["SIM_UNCERTAINTY", "SIM_PROJECTION"]} actions={<Button size="xs" onClick={exportCsv}>CSV</Button>} id="uncertainty">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Segmented size="xs" value={ind} onChange={(v) => { setInd(v); setThreshold(null); }} options={(["population", "age6_17", "age65plus", "age15_64"] as Indicator[]).map((k) => ({ value: k, label: label[k] }))} />
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
        <EChart option={chart} height={300} />
        <div className="space-y-3">
          <div className="rounded-md bg-navy-100/60 px-3 py-2.5 text-[13px] text-navy-800">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-navy-700">{label[ind]} · {yr}</div>
            <div className="mt-1 text-[20px] font-semibold tabular text-ink-900">{fmtCompact(b.p50, locale)}</div>
            <div className="tabular">80%: {fmtCompact(b.p10, locale)} – {fmtCompact(b.p90, locale)}</div>
            <div className="tabular">95%: {fmtCompact(b.p025, locale)} – {fmtCompact(b.p975, locale)}</div>
          </div>
          <Slider label={L("Probability above", "احتمال تجاوز")} value={th} min={Math.round(b.p025 * 0.95 / 1e4) * 1e4} max={Math.round(b.p975 * 1.05 / 1e4) * 1e4} step={10000} onChange={setThreshold} format={(v) => fmtCompact(v, locale)} />
          <p className="text-[13px] text-ink-900">{L(`Chance that ${label[ind].toLowerCase()} exceeds ${fmtCompact(th, locale)} in ${yr}:`, `احتمال أن يتجاوز ${label[ind]} ${fmtCompact(th, locale)} في ${yr}:`)} <b className="text-[15px] tabular">{fmtPct(p, 0)}</b></p>
          <Slider label={L("Migration uncertainty (σ / yr)", "عدم اليقين في الهجرة (σ سنوياً)")} value={migSigma} min={0} max={60000} step={5000} onChange={setMigSigma} format={(v) => `±${fmtInt(v)}`} />
          <Slider label={L("Fertility uncertainty (σ)", "عدم اليقين في الخصوبة (σ)")} value={tfrSigma} min={0} max={0.3} step={0.01} onChange={setTfrSigma} format={(v) => fmtPct(v, 0)} />
        </div>
      </div>
      <div className="mt-3">
        <SimpleTable minWidth={560} head={[L("Year", "السنة"), "2.5%", "10%", L("Median", "الوسيط"), "90%", "97.5%"]} rows={bands.filter((x) => PROJECTION_YEARS.includes(x.year)).map((x) => [String(x.year), fmtInt(x.p025), fmtInt(x.p10), <b key="m">{fmtInt(x.p50)}</b>, fmtInt(x.p90), fmtInt(x.p975)])} highlight={(i) => PROJECTION_YEARS[i] === yr} />
        <p className="mt-2 text-[11.5px] text-ink-500">{L("Ranges reflect uncertainty in the assumptions only (TFR × lognormal σ, life expectancy ± 1.2 years, migration ± σ). Base-population and model error would widen them.", "تعكس النطاقات عدم اليقين في الافتراضات فقط (الخصوبة × لوغاريتمي طبيعي σ، العمر المتوقع ± 1.2 سنة، الهجرة ± σ). خطأ سكان الأساس وخطأ النموذج يوسعانها.")}</p>
      </div>
    </Panel>
  );
}
