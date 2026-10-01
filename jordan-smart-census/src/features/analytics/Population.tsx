"use client";

import { useMemo } from "react";
import { useEngine } from "@/store/engine";
import { useI18n } from "@/hooks/useI18n";
import { useScope } from "@/hooks/useScope";
import { PageHeader, Panel } from "@/components/ui/panel";
import { Kpi } from "@/components/ui/kpi";
import { Button } from "@/components/ui/button";
import { EChart } from "@/components/charts/echart";
import { barV, VIZ } from "@/components/charts/builders";
import { AgeGroupStrip, CategoryBars, PyramidChart, SexSplit } from "@/components/charts/common";
import { EADetail } from "@/features/gis/EADetail";
import { GovTable, MetricMap, ScopeBar, SmallSample, useProfiles } from "./shared";
import { HH_TYPES, NATIONALITIES } from "@/simulation/analytics";
import { downloadCsv } from "@/lib/csv";
import { fmt1, fmtCompact, fmtInt, fmtPct } from "@/lib/format";

export function Population() {
  const engine = useEngine();
  const { t, L, lb, ar, locale } = useI18n();
  const { eaId } = useScope();
  const { profile: p, govProfiles } = useProfiles();
  const finished = engine.phase === "FINISHED";
  const agg = engine.aggregate();
  const density = p.areaKm2 ? p.population / p.areaKm2 : 0;
  const broad = useMemo(() => barV([t("children"), t("youth"), L("Adults 25–64", "البالغون 25–64"), t("elderly")], [{ name: t("population"), data: [p.groups.a0_14, p.groups.a15_24, p.groups.a15_64 - p.groups.a15_24, p.groups.a65], color: VIZ[0] }], { rtl: ar, fmt: (x) => fmtCompact(x, locale) }), [p, ar, t, L, locale]);

  return (
    <div>
      <PageHeader index="11" title={t("nav11")} subtitle={L("Census-style results with drill-down from Jordan to governorate, district and enumeration area.", "نتائج على نمط التعداد مع التعمق من الأردن إلى المحافظة واللواء ومنطقة العدّ.")}>
        <Button onClick={() => downloadCsv("governorate-summary.csv", engine.world.governorates.map((g) => { const x = govProfiles[g.id]; return { governorate_id: g.id, governorate: g.name.en, governorate_ar: g.name.ar, reference_population_2024: g.refPopulation, simulated_population: Math.round(x.population), households: Math.round(x.households), avg_household_size: x.avgHHSize, density_per_km2: x.population / g.areaKm2, sex_ratio: x.sexRatio, median_age: x.medianAge, dependency_ratio: x.dependencyRatio, share_0_14: x.groups.a0_14 / x.population, share_65_plus: x.groups.a65 / x.population, urban_share: x.urban / x.population, data_nature: "SIMULATED (except reference_population_2024 = REFERENCE)" }; }))}>{L("Governorate summary CSV", "ملخص المحافظات CSV")}</Button>
      </PageHeader>
      <ScopeBar />
      <SmallSample p={p} />
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 xl:grid-cols-8">
        <Kpi label={t("population")} value={fmtCompact(p.population, locale)} sub={finished ? `${fmtCompact(agg.persons, locale)} ${L("enumerated nationally", "معدودون وطنياً")}` : t("kFrameEstimate")} nature="SIMULATED" sources={["SIM_MICRODATA", "SIM_FRAME"]} />
        <Kpi label={t("households")} value={fmtCompact(p.households, locale)} nature="SIMULATED" />
        <Kpi label={t("hhSize")} value={fmt1(p.avgHHSize)} nature="SIMULATED" />
        <Kpi label={t("density")} value={p.areaKm2 ? fmt1(density) : "—"} sub={t("perKm2")} nature="SIMULATED" sources={["SIM_MICRODATA", "GEO_ADM1"]} />
        <Kpi label={L("Sex ratio", "نسبة الجنس")} value={fmt1(p.sexRatio)} sub={L("males per 100 females", "ذكور لكل 100 أنثى")} nature="SIMULATED" />
        <Kpi label={L("Median age", "العمر الوسيط")} value={fmt1(p.medianAge)} nature="SIMULATED" />
        <Kpi label={L("Dependency ratio", "نسبة الإعالة")} value={fmt1(p.dependencyRatio)} sub={L("(0–14 + 65+) / 15–64 × 100", "(0–14 + 65+) / 15–64 × 100")} nature="SIMULATED" />
        <Kpi label={t("urban")} value={fmtPct(p.urban / Math.max(1, p.population), 0)} nature="SIMULATED" />
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        {eaId ? <Panel title={`${t("ea")} ${eaId}`} nature="SIMULATED" sources={["SIM_FRAME"]}><EADetail eaId={eaId} /></Panel> : <MetricMap metric={(x) => x.population / Math.max(1, x.areaKm2)} format={(v) => fmt1(v)} legend={`${t("density")} (${t("perKm2")})`} height={460} />}
        <Panel title={t("agePyramid")} nature="SIMULATED" sources={["SIM_MICRODATA"]} subtitle={t("sampleNote")}><PyramidChart m={p.single.m} f={p.single.f} height={410} /></Panel>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2 2xl:grid-cols-4">
        <Panel title={t("ageGroups")} nature="SIMULATED"><AgeGroupStrip p={p} /><div className="mt-3"><EChart option={broad} height={150} /></div></Panel>
        <Panel title={t("sexDistribution")} nature="SIMULATED"><SexSplit male={p.male} female={p.female} /><div className="mt-4"><div className="mb-1 text-[11.5px] font-medium text-ink-500">{t("urbanRural")}</div><CategoryBars items={[{ label: t("urban"), value: p.urban }, { label: t("rural"), value: p.rural }]} pct height={90} color={VIZ[2]} /></div></Panel>
        <Panel title={t("nationalitySim")} nature="SIMULATED" sources={["SIM_MICRODATA", "SIM_PROFILES"]}><CategoryBars items={NATIONALITIES.map((k) => ({ label: lb("nationality", k), value: p.nationality[k] }))} pct color={VIZ[3]} /></Panel>
        <Panel title={L("Household type", "نوع الأسرة")} nature="SIMULATED"><CategoryBars items={HH_TYPES.map((k) => ({ label: lb("hhType", k), value: p.hhType[k] }))} pct color={VIZ[0]} /></Panel>
      </div>

      <Panel className="mt-3" title={L("Governorate comparison", "مقارنة المحافظات")} nature="SIMULATED" sources={["SIM_MICRODATA", "REF_GOV_POP"]} subtitle={L("Click a row to drill down.", "انقر على صف للتعمق.")}>
        <GovTable cols={[
          { key: "pop", label: t("population"), get: (x) => x.population, fmt: fmtInt },
          { key: "hh", label: t("households"), get: (x) => x.households, fmt: fmtInt },
          { key: "size", label: L("Avg size", "متوسط الحجم"), get: (x) => x.avgHHSize, fmt: fmt1 },
          { key: "dens", label: t("density"), get: (x) => x.population / x.areaKm2, fmt: fmt1 },
          { key: "sr", label: L("Sex ratio", "نسبة الجنس"), get: (x) => x.sexRatio, fmt: fmt1 },
          { key: "med", label: L("Median age", "العمر الوسيط"), get: (x) => x.medianAge, fmt: fmt1 },
          { key: "dep", label: L("Dependency", "الإعالة"), get: (x) => x.dependencyRatio, fmt: fmt1 },
          { key: "c", label: "0–14", get: (x) => x.groups.a0_14 / x.population, fmt: (v) => fmtPct(v) },
          { key: "e", label: "65+", get: (x) => x.groups.a65 / x.population, fmt: (v) => fmtPct(v) },
          { key: "u", label: t("urban"), get: (x) => x.urban / x.population, fmt: (v) => fmtPct(v, 0) },
        ]} />
      </Panel>
    </div>
  );
}
