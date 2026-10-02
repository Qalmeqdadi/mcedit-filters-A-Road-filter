"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useApp } from "@/store/app";
import { useEngine } from "@/store/engine";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader, Panel, Callout } from "@/components/ui/panel";
import { Kpi } from "@/components/ui/kpi";
import { Button } from "@/components/ui/button";
import { Segmented, Slider } from "@/components/ui/form";
import { EChart } from "@/components/charts/echart";
import { line, VIZ } from "@/components/charts/builders";
import { PyramidChart } from "@/components/charts/common";
import { Uncertainty } from "./Uncertainty";
import { BASE_E0, BASE_TFR, DEFAULT_PARAMS, PROJECTION_YEARS, runScenario, TFR_2050_TREND, type FullScenario } from "@/simulation/scenarios";
import { downloadCsv } from "@/lib/csv";
import { fmt1, fmtCompact, fmtInt, fmtPct, fmtSignedPct } from "@/lib/format";
import { navIndex } from "@/lib/nav";

interface Assump { tfr2050: number; e02050: number; netMigration: number; hh2050: number; urban2050: number; employmentChange: number }
const DEFAULT_ASSUMP: Assump = { tfr2050: TFR_2050_TREND, e02050: BASE_E0 + DEFAULT_PARAMS.lifeExpectancyGain, netMigration: DEFAULT_PARAMS.netMigration, hh2050: DEFAULT_PARAMS.householdSize, urban2050: DEFAULT_PARAMS.urbanization, employmentChange: 0 };

export function toScenario(a: Assump): FullScenario {
  return { ...DEFAULT_PARAMS, fertilityMultiplier: a.tfr2050 / TFR_2050_TREND, lifeExpectancyGain: a.e02050 - BASE_E0, netMigration: a.netMigration, householdSize: a.hh2050, urbanization: a.urban2050, employmentGrowth: a.employmentChange };
}

export function Projections() {
  const engine = useEngine();
  const { t, L, ar, locale } = useI18n();
  const year = useApp((s) => s.projectionYear);
  const setYear = useApp((s) => s.setProjectionYear);
  const [a, setA] = useState<Assump>(DEFAULT_ASSUMP);
  const da = useDeferredValue(a);
  const world = engine.world;
  const baseTotal = world.totals.population;
  const scenario = useMemo(() => toScenario(da), [da]);
  const run = useMemo(() => runScenario(world, baseTotal, scenario), [world, baseTotal, scenario]);
  const baseline = useMemo(() => runScenario(world, baseTotal, DEFAULT_PARAMS), [world, baseTotal]);
  const baseYear = run.baseYear;
  const yr = year === baseYear ? baseYear : year;
  const pt = run.series.find((s) => s.year === yr) ?? run.series[0];
  const b0 = run.series[0];
  const set = <K extends keyof Assump>(k: K, v: Assump[K]) => setA((s) => ({ ...s, [k]: v }));
  const years = run.series.map((s) => s.year);

  const popChart = useMemo(() => line(years, [
    { name: L("Selected assumptions", "الافتراضات المختارة"), data: run.series.map((s) => s.population), color: VIZ[0], area: true },
    { name: L("Baseline", "خط الأساس"), data: baseline.series.map((s) => s.population), color: "#8a8270", dashed: true },
  ], { rtl: ar, fmt: (v) => fmtCompact(v, locale), markX: yr }), [run, baseline, years, ar, locale, L, yr]);
  const segChart = useMemo(() => line(years, [
    { name: L("School-age 6–17", "سن المدرسة 6–17"), data: run.series.map((s) => s.age6_17), color: VIZ[2] },
    { name: L("Elderly 65+", "كبار السن 65+"), data: run.series.map((s) => s.age65plus), color: VIZ[1] },
    { name: L("Under 6", "دون 6 سنوات"), data: run.series.map((s) => s.age0_5), color: VIZ[3] },
  ], { rtl: ar, fmt: (v) => fmtCompact(v, locale), markX: yr }), [run, years, ar, locale, L, yr]);
  const waChart = useMemo(() => line(years, [
    { name: L("Working age 15–64", "سن العمل 15–64"), data: run.series.map((s) => s.age15_64), color: VIZ[0] },
    { name: t("households"), data: run.series.map((s) => s.households), color: VIZ[5] },
  ], { rtl: ar, fmt: (v) => fmtCompact(v, locale), markX: yr }), [run, years, ar, locale, L, t, yr]);

  const tableYears = [baseYear, ...PROJECTION_YEARS];
  return (
    <div>
      <PageHeader index={navIndex("/projections")} title={t("nav18")} subtitle={L("Annual cohort-component projection from the simulated census base (single years of age, by sex) to 2050. Adjust the assumptions; every chart recomputes.", "إسقاط سنوي بطريقة المكونات العمرية من قاعدة التعداد المحاكى (عمر بعمر حسب الجنس) حتى 2050. عدّل الافتراضات لتُعاد الحسابات في كل الرسوم.")}>
        <Button onClick={() => downloadCsv("population-projection.csv", run.series.map((s) => ({ year: s.year, population: Math.round(s.population), male: Math.round(s.male), female: Math.round(s.female), households: Math.round(s.households), age_0_5: Math.round(s.age0_5), age_6_17: Math.round(s.age6_17), age_18_23: Math.round(s.age18_23), age_15_64: Math.round(s.age15_64), age_65_plus: Math.round(s.age65plus), births: Math.round(s.births), deaths: Math.round(s.deaths), urban_share: s.urbanShare, data_nature: "SIMULATED" })))}>{t("exportCsv")}</Button>
      </PageHeader>
      <Callout tone="sim" className="mb-3">{L("Illustrative projection on synthetic base data — not an official DoS projection.", "إسقاط توضيحي على بيانات أساس اصطناعية — ليس إسقاطاً رسمياً لدائرة الإحصاءات العامة.")}</Callout>
      <div className="grid gap-3 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Panel title={t("assumptions")} nature="SIMULATED" sources={["SIM_PROJECTION"]} actions={<Button size="xs" onClick={() => setA(DEFAULT_ASSUMP)}>{t("reset")}</Button>}>
          <div className="space-y-3.5">
            <Slider label={L("Fertility — TFR in 2050", "الخصوبة — معدل الخصوبة الكلي 2050")} value={a.tfr2050} min={1.4} max={3.6} step={0.05} onChange={(v) => set("tfr2050", v)} format={(v) => v.toFixed(2)} hint={L(`Base year TFR ${BASE_TFR}; linear path to target.`, `معدل سنة الأساس ${BASE_TFR}؛ مسار خطي إلى الهدف.`)} />
            <Slider label={L("Mortality — life expectancy 2050", "الوفيات — العمر المتوقع 2050")} value={a.e02050} min={74} max={86} step={0.5} onChange={(v) => set("e02050", v)} format={(v) => `${v.toFixed(1)} ${L("yrs", "سنة")}`} hint={L(`Base ${BASE_E0} years (both sexes)`, `الأساس ${BASE_E0} سنة (للجنسين)`)} />
            <Slider label={L("Net migration per year", "صافي الهجرة سنوياً")} value={a.netMigration} min={-50000} max={150000} step={5000} onChange={(v) => set("netMigration", v)} format={(v) => (v >= 0 ? "+" : "−") + fmtInt(Math.abs(v))} />
            <Slider label={L("Average household size 2050", "متوسط حجم الأسرة 2050")} value={a.hh2050} min={3.2} max={5.2} step={0.05} onChange={(v) => set("hh2050", v)} format={(v) => v.toFixed(2)} />
            <Slider label={L("Urban share 2050", "نسبة الحضر 2050")} value={a.urban2050} min={0.8} max={0.99} step={0.01} onChange={(v) => set("urban2050", v)} format={(v) => fmtPct(v, 0)} />
            <Slider label={L("Employment ratio change by 2050", "التغير في نسبة التشغيل حتى 2050")} value={a.employmentChange} min={-0.1} max={0.15} step={0.01} onChange={(v) => set("employmentChange", v)} format={(v) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(0)} pp`} />
          </div>
        </Panel>
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-medium text-ink-500">{t("year")}</span>
            <Segmented value={yr} onChange={setYear} options={[{ value: baseYear, label: `${L("Base", "الأساس")} ${baseYear}` }, ...PROJECTION_YEARS.map((y) => ({ value: y, label: String(y) }))]} />
          </div>
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
            <Kpi label={`${t("population")} ${yr}`} value={fmtCompact(pt.population, locale)} sub={fmtSignedPct(pt.population / b0.population - 1)} nature="SIMULATED" sources={["SIM_PROJECTION"]} />
            <Kpi label={`${t("households")} ${yr}`} value={fmtCompact(pt.households, locale)} sub={fmtSignedPct(pt.households / b0.households - 1)} nature="SIMULATED" />
            <Kpi label={L("School-age 6–17", "سن المدرسة 6–17")} value={fmtCompact(pt.age6_17, locale)} sub={fmtSignedPct(pt.age6_17 / b0.age6_17 - 1)} nature="SIMULATED" />
            <Kpi label={L("Working age 15–64", "سن العمل 15–64")} value={fmtCompact(pt.age15_64, locale)} sub={fmtSignedPct(pt.age15_64 / b0.age15_64 - 1)} nature="SIMULATED" />
            <Kpi label={t("elderly")} value={fmtCompact(pt.age65plus, locale)} sub={`${fmtPct(pt.age65plus / pt.population)} · ${fmtSignedPct(pt.age65plus / b0.age65plus - 1, 0)}`} nature="SIMULATED" />
            <Kpi label={L("Births / deaths (year)", "المواليد / الوفيات (سنوياً)")} value={fmtCompact(pt.births, locale)} sub={`${fmtCompact(pt.deaths, locale)} ${L("deaths", "وفاة")}`} nature="SIMULATED" />
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <Panel title={L("Total population", "إجمالي السكان")} nature="SIMULATED" sources={["SIM_PROJECTION"]}><EChart option={popChart} height={260} /></Panel>
            <Panel title={`${t("agePyramid")} ${yr} ${L("vs base", "مقابل الأساس")}`} nature="SIMULATED" sources={["SIM_PROJECTION"]} subtitle={L("Bars: selected year · dashed: base year (shares)", "الأعمدة: السنة المختارة · المتقطع: سنة الأساس (نسب)")}><PyramidChart m={pt.ages.m} f={pt.ages.f} compare={{ m: b0.ages.m, f: b0.ages.f, label: `${L("Base", "الأساس")} ${baseYear}` }} share height={260} /></Panel>
            <Panel title={L("Service-relevant age groups", "الفئات العمرية ذات الصلة بالخدمات")} nature="SIMULATED"><EChart option={segChart} height={240} /></Panel>
            <Panel title={L("Working-age population and households", "السكان في سن العمل والأسر")} nature="SIMULATED"><EChart option={waChart} height={240} /></Panel>
          </div>
          <Uncertainty params={scenario} central={run.series} year={yr} />
          <Panel title={L("Projection table", "جدول الإسقاط")} nature="SIMULATED">
            <div className="thin-scroll overflow-x-auto">
              <table className="w-full min-w-[640px] text-[12.5px]">
                <thead><tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-500"><th className="py-1.5 text-start">{L("Indicator", "المؤشر")}</th>{tableYears.map((y) => <th key={y} className="px-2 text-end">{y === baseYear ? `${L("Base", "الأساس")} ${y}` : y}</th>)}</tr></thead>
                <tbody>
                  {([
                    [t("population"), (s: typeof pt) => fmtInt(s.population)],
                    [t("households"), (s: typeof pt) => fmtInt(s.households)],
                    [L("0–5", "0–5"), (s: typeof pt) => fmtInt(s.age0_5)],
                    [L("6–17", "6–17"), (s: typeof pt) => fmtInt(s.age6_17)],
                    [L("15–64", "15–64"), (s: typeof pt) => fmtInt(s.age15_64)],
                    [L("65+", "65+"), (s: typeof pt) => fmtInt(s.age65plus)],
                    [L("65+ share", "نسبة 65+"), (s: typeof pt) => fmtPct(s.age65plus / s.population)],
                    [L("Urban share", "نسبة الحضر"), (s: typeof pt) => fmtPct(s.urbanShare, 0)],
                    [L("Avg household size", "متوسط حجم الأسرة"), (s: typeof pt) => fmt1(s.population / s.households)],
                  ] as [string, (s: typeof pt) => string][]).map(([label, f]) => (
                    <tr key={label} className="border-b border-line/60"><td className="py-1.5 text-ink-700">{label}</td>{tableYears.map((y) => { const s = run.series.find((x) => x.year === y)!; return <td key={y} className={`px-2 text-end tabular ${y === yr ? "bg-navy-100/50 font-semibold" : ""}`}>{f(s)}</td>; })}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
