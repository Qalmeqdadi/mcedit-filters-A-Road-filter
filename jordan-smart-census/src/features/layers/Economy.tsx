"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useApp } from "@/store/app";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader, Panel, Callout } from "@/components/ui/panel";
import { Kpi } from "@/components/ui/kpi";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/form";
import { Pill } from "@/components/ui/badges";
import { EChart } from "@/components/charts/echart";
import { barH, line, VIZ } from "@/components/charts/builders";
import { JordanMap } from "@/features/gis/JordanMap";
import { assessEconomy, DEFAULT_ECONOMY, PRODUCTIVITY, PUBLIC, TRADABLE } from "@/simulation/lab/economy";
import { SECTORS } from "@/simulation/analytics";
import { useDataOverrides } from "@/store/connectors";
import { downloadCsv } from "@/lib/csv";
import { navIndex } from "@/lib/nav";
import { fmt1, fmtInt, fmtPct } from "@/lib/format";
import type { GovId } from "@/types/census";
import { AreaActions } from "@/features/lab/ActionCard";
import { Formula, LabBar, Method, SimpleTable, useLab } from "@/features/lab/shared";

const SECTOR_NAME: Record<(typeof SECTORS)[number], { en: string; ar: string }> = {
  AGRICULTURE: { en: "Agriculture", ar: "الزراعة" }, MANUFACTURING: { en: "Manufacturing", ar: "الصناعة" }, CONSTRUCTION: { en: "Construction", ar: "الإنشاءات" }, TRADE: { en: "Trade", ar: "التجارة" }, TRANSPORT: { en: "Transport", ar: "النقل" }, HOSPITALITY: { en: "Hospitality", ar: "الضيافة" }, ICT_FINANCE: { en: "ICT & finance", ar: "الاتصالات والمال" }, PUBLIC_ADMIN: { en: "Public administration", ar: "الإدارة العامة" }, EDUCATION: { en: "Education", ar: "التعليم" }, HEALTH: { en: "Health", ar: "الصحة" }, OTHER_SERVICES: { en: "Other services", ar: "خدمات أخرى" },
};

export function Economy() {
  const { world, areaFor, run, year, scenarioName } = useLab();
  const { t, tx, L, ar } = useI18n();
  const govId = useApp((s) => s.govId);
  const selectGov = useApp((s) => s.selectGov);
  const { overrides } = useDataOverrides();
  const [growth, setGrowth] = useState(DEFAULT_ECONOMY.gdpGrowth);
  const g = useDeferredValue(growth);
  const res = useMemo(() => assessEconomy(world, areaFor, run.baseYear, year, { gdpGrowth: g, grpShare: overrides.grpShare }), [world, areaFor, run.baseYear, year, g, overrides.grpShare]);
  const govs = [...world.governorates].sort((a, b) => res.byGov[b.id].index - res.byGov[a.id].index);
  const at = res.series.find((x) => x.year === year)!;
  const base = res.series[0];
  const imported = Object.values(res.byGov).some((x) => x.imported);
  const gdpChart = useMemo(() => line(res.series.map((x) => x.year), [
    { name: L("GDP (JOD bn)", "الناتج (مليار دينار)"), data: res.series.map((x) => +(x.gdp / 1000).toFixed(1)), color: VIZ[0], area: true },
  ], { rtl: ar, markX: year }), [res, ar, year, L]);
  const pcChart = useMemo(() => line(res.series.map((x) => x.year), [
    { name: L("GDP per resident (JOD)", "الناتج للفرد (دينار)"), data: res.series.map((x) => Math.round(x.perCap)), color: VIZ[2] },
  ], { rtl: ar, markX: year, fmt: (v) => fmtInt(v) }), [res, ar, year, L]);
  const idxChart = useMemo(() => barH(govs.map((x) => tx(x.name)), [{ name: L("Output per resident, % of Jordan", "الناتج للفرد، % من الأردن"), data: govs.map((x) => Math.round(res.byGov[x.id].index * 100)), color: VIZ[0] }], { rtl: ar, showLabels: true, fmt: (v) => `${v}%` }), [govs, res, tx, ar, L]);
  const mixChart = useMemo(() => barH(govs.map((x) => tx(x.name)), [
    { name: L("Tradable sectors", "القطاعات القابلة للتصدير"), data: govs.map((x) => Math.round(res.byGov[x.id].tradableShare * 100)), color: VIZ[2] },
    { name: L("Public, education & health", "العام والتعليم والصحة"), data: govs.map((x) => Math.round(res.byGov[x.id].publicShare * 100)), color: VIZ[1] },
    { name: L("Other", "أخرى"), data: govs.map((x) => Math.round((1 - res.byGov[x.id].tradableShare - res.byGov[x.id].publicShare) * 100)), color: "#b9b6ad" },
  ], { rtl: ar, stack: true, legend: true, fmt: (v) => `${v}%` }), [govs, res, tx, ar, L]);
  const govVals = Object.fromEntries(world.governorates.map((x) => [x.id, res.byGov[x.id].index])) as Record<GovId, number>;
  const exportCsv = () => downloadCsv(`regional-economy-${year}.csv`, world.governorates.map((x) => { const e = res.byGov[x.id]; return { governorate: x.name.en, employed: Math.round(e.employed), grp_base_jod_m: Math.round(e.grpBase), grp_horizon_jod_m: Math.round(e.grpH), per_resident_base_jod: Math.round(e.perCapBase), per_resident_horizon_jod: Math.round(e.perCapH), index_vs_jordan: e.index.toFixed(3), hhi: e.hhi.toFixed(3), top_sector: e.topSector, tradable_share: e.tradableShare.toFixed(3), public_share: e.publicShare.toFixed(3), grp_share_source: e.imported ? "imported" : "modelled", horizon: year, scenario: scenarioName, data_nature: "SIMULATED" }; }));

  return (
    <div>
      <PageHeader index={navIndex("/economy")} title={t("navEconomy")} subtitle={L("Where is Jordan's output produced, how evenly is it shared, and which governorates depend most on public employment? Census employment by sector is turned into regional output, calibrated to Jordan's GDP from World Bank open data, and projected with the scenario.", "أين يُنتج ناتج الأردن، وما مدى عدالة توزيعه، وأي المحافظات تعتمد أكثر على التوظيف العام؟ يتحول التشغيل حسب القطاع من التعداد إلى ناتج إقليمي معايَر على الناتج المحلي للأردن من بيانات البنك الدولي المفتوحة، ويُسقط وفق السيناريو.")}>
        <Button onClick={exportCsv}>{t("exportCsv")}</Button>
      </PageHeader>
      <LabBar />
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label={L(`GDP ${res.gdpYear ?? "base"}`, `الناتج ${res.gdpYear ?? "الأساس"}`)} value={`JOD ${fmt1(res.gdpBase / 1000)}bn`} sub={L("World Bank, at the JOD peg", "البنك الدولي، بسعر الربط")} nature="REFERENCE" sources={["OPEN_WB_GDP"]} />
        <Kpi label={`${L("GDP", "الناتج")} ${year}`} value={`JOD ${fmt1(at.gdp / 1000)}bn`} sub={`${fmtPct(g)} ${L("a year", "سنوياً")}`} nature="SIMULATED" sources={["SIM_ECONOMY"]} />
        <Kpi label={`${L("Per resident", "للفرد")} ${year}`} value={`JOD ${fmtInt(at.perCap)}`} sub={`${L("today", "اليوم")} JOD ${fmtInt(base.perCap)}`} nature="SIMULATED" />
        <Kpi label={L("Highest / lowest", "الأعلى / الأدنى")} value={`${fmtPct(res.byGov[govs[0].id].index, 0)} / ${fmtPct(res.byGov[govs[govs.length - 1].id].index, 0)}`} sub={`${tx(govs[0].name)} · ${tx(govs[govs.length - 1].name)}`} nature="SIMULATED" />
        <Kpi label={L("Spatial inequality (Theil)", "عدم المساواة المكانية (ثايل)")} value={res.national.theilH.toFixed(4)} sub={L("0 = equal output per resident", "0 = تساوٍ في الناتج للفرد")} nature="SIMULATED" />
        <Kpi label={L("Public-sector dependency", "الاعتماد على القطاع العام")} value={fmtPct(res.national.publicShare, 0)} sub={`${L("tradable", "القابلة للتصدير")} ${fmtPct(res.national.tradableShare, 0)}`} nature="SIMULATED" sources={["SIM_MICRODATA"]} />
      </div>
      {imported ? <Callout className="mt-3">{L("Governorate output shares come from your imported dataset (Data Connectors).", "حصص ناتج المحافظات من مجموعة البيانات المستوردة (موصلات البيانات).")}</Callout> : null}
      <div className="mt-3 grid gap-3 xl:grid-cols-[300px_minmax(0,1fr)]">
        <Panel title={t("assumptions")} nature="SIMULATED" sources={["SIM_ECONOMY"]} actions={<Button size="xs" onClick={() => setGrowth(DEFAULT_ECONOMY.gdpGrowth)}>{t("reset")}</Button>}>
          <Slider label={L("Real GDP growth", "نمو الناتج الحقيقي")} value={growth} min={0.005} max={0.06} step={0.0025} onChange={setGrowth} format={(v) => fmtPct(v)} />
          <div className="mt-3 text-[12px] text-ink-500">{L("Output per worker relative to the national average:", "الناتج لكل عامل نسبة إلى المتوسط الوطني:")}</div>
          <div className="mt-1 flex flex-wrap gap-1">{SECTORS.map((s) => <Pill key={s}>{tx(SECTOR_NAME[s])} ×{PRODUCTIVITY[s]}</Pill>)}</div>
          <p className="mt-2 text-[11.5px] text-ink-500">{L("Tradable: ", "القابلة للتصدير: ")}{TRADABLE.map((s) => tx(SECTOR_NAME[s])).join(", ")}. {L("Public: ", "العامة: ")}{PUBLIC.map((s) => tx(SECTOR_NAME[s])).join(", ")}.</p>
        </Panel>
        <div className="grid min-w-0 gap-3 lg:grid-cols-2">
          <Panel title={L("National output", "الناتج الوطني")} nature="SIMULATED" sources={["OPEN_WB_GDP", "SIM_ECONOMY"]}><EChart option={gdpChart} height={230} /></Panel>
          <Panel title={L("Output per resident", "الناتج للفرد")} subtitle={L("Population from the scenario", "السكان من السيناريو")} nature="SIMULATED"><EChart option={pcChart} height={230} /></Panel>
          <Panel title={`${L("Output per resident by governorate", "الناتج للفرد حسب المحافظة")} ${year}`} nature="SIMULATED"><EChart option={idxChart} height={330} /></Panel>
          <Panel title={L("Employment mix", "مزيج التشغيل")} subtitle={L("Share of jobs, census", "حصة الوظائف، التعداد")} nature="SIMULATED" sources={["SIM_MICRODATA"]}><EChart option={mixChart} height={330} /></Panel>
        </div>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <JordanMap height={420} title={L(`Output per resident ${year} (Jordan = 100%)`, `الناتج للفرد ${year} (الأردن = 100%)`)} govValues={govVals} scale="pct" format={(v) => fmtPct(v, 0)} legendTitle={L("Index", "المؤشر")} selectedGov={govId} onSelectGov={selectGov} sources={["SIM_ECONOMY"]} />
        <Panel title={L("Governorates", "المحافظات")} nature="SIMULATED" sources={["SIM_ECONOMY"]}>
          <SimpleTable minWidth={620} head={[t("governorate"), L("Employed", "المشتغلون"), `GRP ${year} (JOD M)`, L("Per resident", "للفرد"), L("Index", "المؤشر"), L("Largest sector", "أكبر قطاع"), L("Public", "العام")]}
            rows={govs.map((x) => { const e = res.byGov[x.id]; return [<b key="g">{tx(x.name)}{e.imported ? " *" : ""}</b>, fmtInt(e.employed), fmtInt(e.grpH), fmtInt(e.perCapH), fmtPct(e.index, 0), tx(SECTOR_NAME[e.topSector]), fmtPct(e.publicShare, 0)]; })} />
        </Panel>
      </div>
      <Callout tone="sim" className="mt-3">{L("Regional output is modelled, not official regional accounts. National GDP is the World Bank figure (open-data connector); productivity ratios are illustrative.", "الناتج الإقليمي منمذج وليس حسابات إقليمية رسمية. الناتج الوطني رقم البنك الدولي (موصل البيانات المفتوحة)؛ ونسب الإنتاجية توضيحية.")}</Callout>
      <AreaActions sectors={["ECONOMY", "JOBS"]} />
      <Method>
        <Formula>{"GRP_g = Σ employed_g,s × productivity_s × (1 + 0.35 × (urban share_g − national)) → scaled to GDP (WDI × 0.709 JOD/USD)"}</Formula>
        <Formula>{"GRP_g(t) = GDP(t) × share_g × (pop growth_g ÷ national pop growth)^0.6   ·   Theil = Σ (p_g/P)(y_g/ȳ) ln(y_g/ȳ)"}</Formula>
      </Method>
    </div>
  );
}
