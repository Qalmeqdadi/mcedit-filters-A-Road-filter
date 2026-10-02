"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useApp } from "@/store/app";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader, Panel, Callout } from "@/components/ui/panel";
import { Kpi } from "@/components/ui/kpi";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/form";
import { EChart } from "@/components/charts/echart";
import { line, VIZ } from "@/components/charts/builders";
import { PyramidChart } from "@/components/charts/common";
import { JordanMap } from "@/features/gis/JordanMap";
import { DEFAULT_AGEING, forecastAgeing, type AgeingParams } from "@/simulation/lab/ageing";
import { HEALTH_BANDS } from "@/simulation/analytics";
import { downloadCsv } from "@/lib/csv";
import { navIndex } from "@/lib/nav";
import { fmt1, fmtCompact, fmtInt, fmtPct } from "@/lib/format";
import type { GovId } from "@/types/census";
import { AreaActions } from "./ActionCard";
import { Formula, LabBar, Method, SimpleTable, useLab } from "./shared";

export function Ageing() {
  const { world, run, areaFor, year, scenarioName } = useLab();
  const { t, tx, L, ar, locale } = useI18n();
  const govId = useApp((s) => s.govId);
  const selectGov = useApp((s) => s.selectGov);
  const [p, setP] = useState<AgeingParams>(DEFAULT_AGEING);
  const dp = useDeferredValue(p);
  const set = <K extends keyof AgeingParams>(k: K, v: AgeingParams[K]) => setP((s) => ({ ...s, [k]: v }));
  const res = useMemo(() => forecastAgeing(world, run.series, areaFor, dp), [world, run, areaFor, dp]);
  const s = res.series;
  const b = s[0];
  const at = s.find((x) => x.year === year)!;
  const pt = run.series.find((x) => x.year === year)!;
  const years = s.map((x) => x.year);
  const growth = (k: "a65" | "a80" | "beds" | "workforce") => at[k] / Math.max(1, b[k]) - 1;
  const popChart = useMemo(() => line(years, [
    { name: "65+", data: s.map((x) => Math.round(x.a65)), color: VIZ[1], area: true },
    { name: "80+", data: s.map((x) => Math.round(x.a80)), color: VIZ[5] },
  ], { rtl: ar, fmt: (v) => fmtCompact(v, locale), markX: year }), [s, years, ar, locale, year]);
  const ratioChart = useMemo(() => line(years, [
    { name: L("Old-age dependency ratio", "نسبة إعالة كبار السن"), data: s.map((x) => +x.oadr.toFixed(1)), color: VIZ[3] },
    { name: L("Median age", "العمر الوسيط"), data: s.map((x) => +x.medianAge.toFixed(1)), color: VIZ[0], dashed: true },
  ], { rtl: ar, markX: year }), [s, years, ar, year, L]);
  const careChart = useMemo(() => line(years, [
    { name: L("Residential care beds", "أسرّة الرعاية الإيوائية"), data: s.map((x) => Math.round(x.beds)), color: VIZ[5] },
    { name: L("Care workforce", "كوادر الرعاية"), data: s.map((x) => Math.round(x.workforce)), color: VIZ[2] },
  ], { rtl: ar, fmt: (v) => fmtCompact(v, locale), markX: year }), [s, years, ar, locale, year, L]);
  const govVals = Object.fromEntries(world.governorates.map((g) => [g.id, res.byGov[g.id].growth])) as Record<GovId, number>;
  const exportCsv = () => downloadCsv("ageing-care-demand.csv", s.map((x) => ({ year: x.year, pop_65_plus: Math.round(x.a65), pop_80_plus: Math.round(x.a80), share_65_plus: x.share65.toFixed(4), old_age_dependency_ratio: x.oadr.toFixed(2), median_age: x.medianAge.toFixed(1), long_term_care_need: Math.round(x.careNeed), residential_beds: Math.round(x.beds), home_care_clients: Math.round(x.homeClients), care_workforce: Math.round(x.workforce), functional_difficulty: Math.round(x.disabled), geriatric_visits: Math.round(x.visits), scenario: scenarioName, data_nature: "SIMULATED" })));

  return (
    <div>
      <PageHeader index={navIndex("/ageing")} title={t("navAgeing")} subtitle={L("Jordan's population is young but ageing. How fast do the 65+ and 80+ populations grow, and what does that mean for long-term care beds, home care, the care workforce and accessible services?", "سكان الأردن شباب لكنهم يتقدمون في العمر. ما سرعة نمو الفئتين 65+ و80+، وماذا يعني ذلك لأسرّة الرعاية طويلة الأمد والرعاية المنزلية وكوادر الرعاية والخدمات الميسّرة؟")}>
        <Button onClick={exportCsv}>{t("exportCsv")}</Button>
      </PageHeader>
      <LabBar />
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label={`65+ ${year}`} value={fmtCompact(at.a65, locale)} sub={`${fmtPct(at.share65)} · +${fmtPct(growth("a65"), 0)}`} nature="SIMULATED" sources={["SIM_AGEING", "SIM_PROJECTION"]} />
        <Kpi label={`80+ ${year}`} value={fmtCompact(at.a80, locale)} sub={`+${fmtPct(growth("a80"), 0)} ${L("vs today", "عن اليوم")}`} nature="SIMULATED" />
        <Kpi label={L("Old-age dependency", "إعالة كبار السن")} value={fmt1(at.oadr)} sub={`${L("per 100 aged 15–64 · today", "لكل 100 في سن 15–64 · اليوم")} ${fmt1(b.oadr)}`} nature="SIMULATED" />
        <Kpi label={L("Care beds needed", "أسرّة الرعاية اللازمة")} value={fmtInt(at.beds)} sub={`+${fmtInt(at.beds - b.beds)} ${L("vs today", "عن اليوم")}`} tone="warn" nature="SIMULATED" />
        <Kpi label={L("Care workforce", "كوادر الرعاية")} value={fmtInt(at.workforce)} sub={`${fmtInt(at.homeClients)} ${L("home-care clients", "عميل رعاية منزلية")}`} nature="SIMULATED" />
        <Kpi label={L("Functional difficulty", "صعوبات الأداء الوظيفي")} value={fmtCompact(at.disabled, locale)} sub={`${fmtPct(at.disabledShare)} ${L("of population", "من السكان")}`} nature="SIMULATED" sources={["SIM_MICRODATA"]} />
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-[300px_minmax(0,1fr)]">
        <Panel title={t("assumptions")} nature="SIMULATED" sources={["SIM_AGEING"]} actions={<Button size="xs" onClick={() => setP(DEFAULT_AGEING)}>{t("reset")}</Button>}>
          <div className="space-y-3.5">
            <Slider label={L("Care need, aged 65–79", "الحاجة للرعاية، 65–79")} value={p.need65} min={0.02} max={0.15} step={0.005} onChange={(v) => set("need65", v)} format={(v) => fmtPct(v)} />
            <Slider label={L("Care need, aged 80+", "الحاجة للرعاية، 80+")} value={p.need80} min={0.1} max={0.5} step={0.01} onChange={(v) => set("need80", v)} format={(v) => fmtPct(v, 0)} />
            <Slider label={L("Residential care share", "نسبة الرعاية الإيوائية")} value={p.residentialShare} min={0.02} max={0.3} step={0.01} onChange={(v) => set("residentialShare", v)} format={(v) => fmtPct(v, 0)} hint={L("Most care in Jordan is provided by families at home.", "يقدم الأهل معظم الرعاية في المنزل.")} />
            <Slider label={L("Home-care coverage", "تغطية الرعاية المنزلية")} value={p.homeCareCoverage} min={0.05} max={0.9} step={0.05} onChange={(v) => set("homeCareCoverage", v)} format={(v) => fmtPct(v, 0)} />
            <Slider label={L("Health visits per older person", "الزيارات الصحية لكل مسن")} value={p.visitsPerOlder} min={2} max={14} step={0.5} onChange={(v) => set("visitsPerOlder", v)} format={(v) => `${v}/yr`} />
          </div>
        </Panel>
        <div className="grid min-w-0 gap-3 lg:grid-cols-2">
          <Panel title={L("Older population", "كبار السن")} nature="SIMULATED" sources={["SIM_PROJECTION"]}><EChart option={popChart} height={230} /></Panel>
          <Panel title={L("Dependency and median age", "الإعالة والعمر الوسيط")} nature="SIMULATED"><EChart option={ratioChart} height={230} /></Panel>
          <Panel title={L("Care capacity needed", "طاقة الرعاية اللازمة")} nature="SIMULATED" sources={["SIM_AGEING"]}><EChart option={careChart} height={230} /></Panel>
          <Panel title={`${t("agePyramid")} ${year}`} subtitle={L("Dashed: today", "المتقطع: اليوم")} nature="SIMULATED"><PyramidChart m={pt.ages.m} f={pt.ages.f} compare={{ m: run.series[0].ages.m, f: run.series[0].ages.f, label: L("Today", "اليوم") }} share height={230} /></Panel>
        </div>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <JordanMap height={400} title={L("Growth of the 65+ population to 2040", "نمو فئة 65+ حتى 2040")} govValues={govVals} scale="risk" format={(v) => fmtPct(v, 0)} legendTitle={L("Growth", "النمو")} selectedGov={govId} onSelectGov={selectGov} districtMode="drill" sources={["SIM_AGEING", "SIM_SMALL_AREA"]} />
        <Panel title={L("Governorates — 2040", "المحافظات — 2040")} nature="SIMULATED" sources={["SIM_AGEING"]}>
          <SimpleTable
            minWidth={480}
            head={[t("governorate"), "65+ " + L("today", "اليوم"), "65+ 2040", L("Growth", "النمو"), L("Share 2040", "النسبة 2040"), L("Care beds", "أسرّة")]}
            rows={[...world.governorates].sort((a, b2) => res.byGov[b2.id].growth - res.byGov[a.id].growth).map((g) => [<b key="g">{tx(g.name)}</b>, fmtInt(res.byGov[g.id].a65_0), fmtInt(res.byGov[g.id].a65_40), `+${fmtPct(res.byGov[g.id].growth, 0)}`, fmtPct(res.byGov[g.id].share2040), fmtInt(res.byGov[g.id].beds2040)])}
          />
          <p className="mt-2 text-[12px] text-ink-500">{L("Functional difficulty prevalence used (Washington Group, synthetic census):", "انتشار صعوبات الأداء المستخدم (مجموعة واشنطن، تعداد اصطناعي):")} {HEALTH_BANDS.map((band, i) => `${band} ${fmtPct(res.prevalence[i])}`).join(" · ")}</p>
        </Panel>
      </div>
      <Callout tone="sim" className="mt-3">{L("Care-need shares, residential share and staffing ratios are adjustable planning norms, not Ministry of Social Development standards.", "نسب الحاجة للرعاية ونسبة الرعاية الإيوائية ونسب الكوادر معايير تخطيطية قابلة للتعديل وليست معايير وزارة التنمية الاجتماعية.")}</Callout>
      <AreaActions sectors={["AGEING"]} />
      <Method>
        <Formula>{"care need = (65–79) × need₆₅ + (80+) × need₈₀   ·   beds = need × residential share   ·   home clients = need × (1 − residential) × coverage"}</Formula>
        <Formula>{"workforce = beds ÷ 2.5 + home clients ÷ 8   ·   functional difficulty = Σ population(band) × prevalence(band)   ·   OADR = 65+ ÷ 15–64 × 100"}</Formula>
      </Method>
    </div>
  );
}
