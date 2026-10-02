"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useApp } from "@/store/app";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader, Panel, Callout } from "@/components/ui/panel";
import { Kpi } from "@/components/ui/kpi";
import { Button } from "@/components/ui/button";
import { Segmented, Slider } from "@/components/ui/form";
import { EChart } from "@/components/charts/echart";
import { barH, barV, line, VIZ } from "@/components/charts/builders";
import { JordanMap } from "@/features/gis/JordanMap";
import { DEFAULT_JOBS, forecastJobs, type JobsParams } from "@/simulation/lab/jobs";
import { LABOUR_BANDS } from "@/simulation/analytics";
import { downloadCsv } from "@/lib/csv";
import { navIndex } from "@/lib/nav";
import { fmtCompact, fmtInt, fmtPct } from "@/lib/format";
import type { GovId } from "@/types/census";
import { Formula, LabBar, Method, SimpleTable, useLab } from "./shared";

export function Jobs() {
  const { world, run, areaFor, year, scenarioName } = useLab();
  const { t, tx, L, ar, lb, locale } = useI18n();
  const govId = useApp((s) => s.govId);
  const selectGov = useApp((s) => s.selectGov);
  const [p, setP] = useState<JobsParams>(DEFAULT_JOBS);
  const dp = useDeferredValue(p);
  const set = <K extends keyof JobsParams>(k: K, v: JobsParams[K]) => setP((s) => ({ ...s, [k]: v }));
  const res = useMemo(() => forecastJobs(world, run.series, areaFor, dp), [world, run, areaFor, dp]);
  const s = res.series;
  const at = s.find((x) => x.year === year)!;
  const span = s.filter((x) => x.year > s[0].year && x.year <= year);
  const avg = (k: "netNeedHold" | "netNeedTarget" | "netCreated" | "entrants" | "exits") => span.reduce((a, x) => a + x[k], 0) / Math.max(1, span.length);
  const years = s.map((x) => x.year);
  const flowChart = useMemo(() => barV(years.slice(1).map(String), [
    { name: L("Jobs needed to hold unemployment", "وظائف لتثبيت البطالة"), data: s.slice(1).map((x) => Math.round(x.netNeedHold)), color: VIZ[0] },
    { name: L(`Jobs needed to reach ${Math.round(p.targetUnemployment * 100)}% by ${p.targetYear}`, `وظائف لبلوغ ${Math.round(p.targetUnemployment * 100)}% بحلول ${p.targetYear}`), data: s.slice(1).map((x) => Math.round(x.netNeedTarget)), color: VIZ[5] },
    { name: L("Jobs created (growth × elasticity)", "الوظائف المستحدثة (النمو × المرونة)"), data: s.slice(1).map((x) => Math.round(x.netCreated)), color: VIZ[2] },
  ], { rtl: ar, fmt: (v) => fmtCompact(v, locale) }), [s, years, ar, locale, p.targetUnemployment, p.targetYear, L]);
  const uChart = useMemo(() => line(years, [{ name: L("Implied unemployment rate", "معدل البطالة الضمني"), data: s.map((x) => +(x.impliedUnemployment * 100).toFixed(1)), color: VIZ[5], area: true }], { rtl: ar, fmt: (v) => `${v}%`, markX: year }), [s, years, ar, year, L]);
  const sectorChart = useMemo(() => barH(res.sectors.map((x) => lb("sector", x.sector)), [{ name: L("New jobs to 2035", "وظائف جديدة حتى 2035"), data: res.sectors.map((x) => Math.round(x.newJobs2035)), color: VIZ[0] }], { rtl: ar, fmt: (v) => fmtCompact(v, locale) }), [res, ar, locale, lb, L]);
  const lfprChart = useMemo(() => barV(LABOUR_BANDS, [{ name: L("Men", "الذكور"), data: res.lfpr.m.map((x) => +(x * 100).toFixed(1)), color: VIZ[0] }, { name: L("Women", "الإناث"), data: res.lfpr.f.map((x) => +(x * 100).toFixed(1)), color: VIZ[1] }], { rtl: ar, fmt: (v) => `${v}%` }), [res, ar, L]);
  const govVals = Object.fromEntries(world.governorates.map((g) => [g.id, res.byGov[g.id].per1000])) as Record<GovId, number>;
  const exportCsv = () => downloadCsv("jobs-needed.csv", s.map((x) => ({ year: x.year, working_age: Math.round(x.workingAge), labour_force: Math.round(x.labourForce), jobs_hold_rate: Math.round(x.holdRate), jobs_reach_target: Math.round(x.reachTarget), jobs_created: Math.round(x.created), implied_unemployment: x.impliedUnemployment.toFixed(4), entrants: Math.round(x.entrants), exits: Math.round(x.exits), gdp_growth: p.gdpGrowth, elasticity: p.elasticity, female_participation_multiplier: p.femaleParticipation, scenario: scenarioName, data_nature: "SIMULATED" })));

  return (
    <div>
      <PageHeader index={navIndex("/jobs")} title={t("navJobs")} subtitle={L("How many jobs must the economy create each year to absorb young people entering the labour market? Labour supply from the projected age structure and census participation rates is compared with jobs created under a growth assumption.", "كم وظيفة يجب أن يستحدث الاقتصاد سنوياً لاستيعاب الشباب الداخلين إلى سوق العمل؟ يُقارن عرض العمل المستمد من البنية العمرية المسقطة ومعدلات المشاركة في التعداد بالوظائف المستحدثة وفق افتراض للنمو.")}>
        <Button onClick={exportCsv}>{t("exportCsv")}</Button>
      </PageHeader>
      <LabBar />
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label={L("Jobs needed / year (hold rate)", "وظائف لازمة سنوياً (تثبيت المعدل)")} value={fmtCompact(avg("netNeedHold"), locale)} sub={`${L("average to", "المتوسط حتى")} ${year}`} nature="SIMULATED" sources={["SIM_JOBS"]} />
        <Kpi label={L("Jobs needed / year (target)", "وظائف لازمة سنوياً (الهدف)")} value={fmtCompact(avg("netNeedTarget"), locale)} sub={`${Math.round(p.targetUnemployment * 100)}% ${L("by", "بحلول")} ${p.targetYear}`} nature="SIMULATED" />
        <Kpi label={L("Jobs created / year", "وظائف مستحدثة سنوياً")} value={fmtCompact(avg("netCreated"), locale)} sub={`${(p.gdpGrowth * 100).toFixed(1)}% × ${p.elasticity}`} tone={avg("netCreated") < avg("netNeedHold") ? "crit" : "ok"} nature="SIMULATED" />
        <Kpi label={`${L("Unemployment", "البطالة")} ${year}`} value={fmtPct(at.impliedUnemployment)} sub={`${L("today", "اليوم")} ${fmtPct(res.u0)}`} tone={at.impliedUnemployment > res.u0 ? "crit" : "ok"} nature="SIMULATED" sources={["SIM_MICRODATA"]} />
        <Kpi label={L("Entrants / exits per year", "الداخلون / الخارجون سنوياً")} value={fmtCompact(avg("entrants"), locale)} sub={`${fmtCompact(avg("exits"), locale)} ${L("retiring", "متقاعد")}`} nature="SIMULATED" />
        <Kpi label={`${L("Labour force", "قوة العمل")} ${year}`} value={fmtCompact(at.labourForce, locale)} sub={`${L("today", "اليوم")} ${fmtCompact(s[0].labourForce, locale)}`} nature="SIMULATED" />
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-[300px_minmax(0,1fr)]">
        <Panel title={t("assumptions")} nature="SIMULATED" sources={["SIM_JOBS"]} actions={<Button size="xs" onClick={() => setP(DEFAULT_JOBS)}>{t("reset")}</Button>}>
          <div className="space-y-3.5">
            <Slider label={L("Real GDP growth", "نمو الناتج الحقيقي")} value={p.gdpGrowth} min={0} max={0.07} step={0.001} onChange={(v) => set("gdpGrowth", v)} format={(v) => `${(v * 100).toFixed(1)}%`} />
            <Slider label={L("Employment elasticity", "مرونة التشغيل")} value={p.elasticity} min={0.2} max={1.2} step={0.05} onChange={(v) => set("elasticity", v)} format={(v) => v.toFixed(2)} />
            <Slider label={L("Target unemployment", "البطالة المستهدفة")} value={p.targetUnemployment} min={0.04} max={0.25} step={0.005} onChange={(v) => set("targetUnemployment", v)} format={(v) => fmtPct(v)} />
            <Slider label={L("Target year", "سنة الهدف")} value={p.targetYear} min={2028} max={2050} step={1} onChange={(v) => set("targetYear", v)} format={(v) => String(v)} />
            <Slider label={L("Women's participation by 2040", "مشاركة المرأة حتى 2040")} value={p.femaleParticipation} min={1} max={2.5} step={0.05} onChange={(v) => set("femaleParticipation", v)} format={(v) => `× ${v.toFixed(2)}`} hint={L("Raising women's participation enlarges the labour force — and the number of jobs needed.", "رفع مشاركة المرأة يوسّع قوة العمل — ويزيد عدد الوظائف اللازمة.")} />
            <div>
              <div className="mb-1.5 text-[12px] font-medium text-ink-700">{L("Sector strategy", "الاستراتيجية القطاعية")}</div>
              <Segmented value={p.strategy} onChange={(v) => set("strategy", v)} size="xs" options={[{ value: "CURRENT", label: L("Current mix", "المزيج الحالي") }, { value: "SERVICES", label: L("Services-led", "قيادة الخدمات") }, { value: "INDUSTRY", label: L("Industry & logistics", "صناعة ولوجستيات") }]} />
            </div>
          </div>
        </Panel>
        <div className="grid min-w-0 gap-3 lg:grid-cols-2">
          <Panel className="lg:col-span-2" title={L("Net new jobs per year — needed vs created", "صافي الوظائف الجديدة سنوياً — اللازم مقابل المستحدث")} nature="SIMULATED" sources={["SIM_JOBS"]}><EChart option={flowChart} height={260} /></Panel>
          <Panel title={L("Unemployment if jobs grow with GDP", "البطالة إذا نمت الوظائف مع الناتج")} nature="SIMULATED"><EChart option={uChart} height={220} /></Panel>
          <Panel title={L("Participation by age (census)", "المشاركة حسب العمر (التعداد)")} nature="SIMULATED" sources={["SIM_MICRODATA"]}><EChart option={lfprChart} height={220} /></Panel>
        </div>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <JordanMap height={420} title={L("Jobs needed to 2035 per 1,000 working-age residents", "الوظائف اللازمة حتى 2035 لكل 1,000 في سن العمل")} govValues={govVals} scale="seq" format={(v) => fmtInt(v)} legendTitle={L("per 1,000", "لكل 1,000")} selectedGov={govId} onSelectGov={selectGov} districtMode="drill" tooltipExtra={(kind, id) => (kind === "gov" ? <span>{L("Youth unemployment", "بطالة الشباب")}: <b>{fmtPct(res.byGov[id as GovId].youthUnemployment)}</b></span> : null)} sources={["SIM_JOBS", "SIM_SMALL_AREA"]} />
        <Panel title={L("Where the new jobs could come from (to 2035)", "من أين يمكن أن تأتي الوظائف الجديدة (حتى 2035)")} subtitle={L("Hold-rate need split by sector strategy", "الحاجة لتثبيت المعدل موزعة حسب الاستراتيجية القطاعية")} nature="SIMULATED"><EChart option={sectorChart} height={360} /></Panel>
      </div>
      <Panel className="mt-3" title={L("Governorates", "المحافظات")} nature="SIMULATED" sources={["SIM_JOBS"]}>
        <SimpleTable
          minWidth={560}
          head={[t("governorate"), L("Jobs needed to 2035", "وظائف لازمة حتى 2035"), L("per 1,000 working-age", "لكل 1,000 في سن العمل"), L("Youth 15–24 growth", "نمو الشباب 15–24"), L("Youth unemployment", "بطالة الشباب")]}
          rows={[...world.governorates].sort((a, b) => res.byGov[b.id].jobsNeeded2035 - res.byGov[a.id].jobsNeeded2035).map((g) => [<b key="g">{tx(g.name)}</b>, fmtInt(res.byGov[g.id].jobsNeeded2035), fmtInt(res.byGov[g.id].per1000), fmtPct(res.byGov[g.id].youthGrowth), fmtPct(res.byGov[g.id].youthUnemployment)])}
        />
      </Panel>
      <Callout tone="sim" className="mt-3">{L("Participation and unemployment are from the synthetic census microdata, not the DoS Employment & Unemployment Survey. GDP growth and elasticity are user assumptions.", "المشاركة والبطالة من البيانات الجزئية الاصطناعية للتعداد، وليست من مسح العمالة والبطالة. نمو الناتج والمرونة افتراضات المستخدم.")}</Callout>
      <Method>
        <Formula>{"LF(t) = Σ_age,sex population(t) × participation(band, sex) [× women's participation path]"}</Formula>
        <Formula>{"hold: E = LF × (1 − u₀)   ·   target: E = LF × (1 − u(t)), u linear to target   ·   created: E(t) = E(t−1) × (1 + g × ε)"}</Formula>
      </Method>
    </div>
  );
}
