"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useApp } from "@/store/app";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader, Panel, Callout } from "@/components/ui/panel";
import { Kpi } from "@/components/ui/kpi";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/form";
import { EChart } from "@/components/charts/echart";
import { barV, line, VIZ } from "@/components/charts/builders";
import { JordanMap } from "@/features/gis/JordanMap";
import { DEFAULT_HOUSING, forecastHousing, type HousingParams } from "@/simulation/lab/housingNeed";
import { downloadCsv } from "@/lib/csv";
import { navIndex } from "@/lib/nav";
import { fmtCompact, fmtInt, fmtPct } from "@/lib/format";
import type { GovId } from "@/types/census";
import { AreaActions } from "./ActionCard";
import { Formula, LabBar, Method, SimpleTable, useLab } from "./shared";

export function HousingNeed() {
  const { world, areaFor, baseYear, year, scenarioName } = useLab();
  const { t, tx, L, ar, locale } = useI18n();
  const govId = useApp((s) => s.govId);
  const selectGov = useApp((s) => s.selectGov);
  const [p, setP] = useState<HousingParams>(DEFAULT_HOUSING);
  const dp = useDeferredValue(p);
  const set = <K extends keyof HousingParams>(k: K, v: HousingParams[K]) => setP((s) => ({ ...s, [k]: v }));
  const res = useMemo(() => forecastHousing(world, areaFor, baseYear, 2050, dp), [world, areaFor, baseYear, dp]);
  const autoCompletions = useMemo(() => forecastHousing(world, areaFor, baseYear, 2050, { ...dp, completions: null }).completions, [world, areaFor, baseYear, dp]);
  const n = res.national;
  const to = (y: number) => n.filter((x) => x.year <= y);
  const needTo = to(year).reduce((s, x) => s + x.need, 0);
  const at = n.find((x) => x.year === year) ?? n[n.length - 1];
  const first = n[0];
  const years = n.map((x) => x.year);

  const compChart = useMemo(() => barV(years.map((y) => `'${String(y).slice(2)}`), [
    { name: L("New households", "أسر جديدة"), data: n.map((x) => Math.round(x.newHouseholds)), color: VIZ[0] },
    { name: L("Replacement", "إحلال"), data: n.map((x) => Math.round(x.replacement)), color: VIZ[3] },
    { name: L("Backlog clearance", "معالجة المتراكم"), data: n.map((x) => Math.round(x.backlog)), color: VIZ[1] },
  ], { rtl: ar, stack: true, fmt: (v) => fmtCompact(v, locale) }), [n, years, ar, locale, L]);
  const gapChart = useMemo(() => line(years, [
    { name: L("Need", "الحاجة"), data: n.map((x) => Math.round(x.need)), color: VIZ[5] },
    { name: L("Completions", "الإنجاز"), data: n.map((x) => Math.round(x.completions)), color: VIZ[2], dashed: true },
  ], { rtl: ar, fmt: (v) => fmtCompact(v, locale), markX: year }), [n, years, ar, locale, year, L]);
  const cumChart = useMemo(() => line(years, [{ name: L("Cumulative shortfall", "العجز التراكمي"), data: n.map((x) => Math.round(x.cumulativeGap)), color: VIZ[5], area: true }], { rtl: ar, fmt: (v) => fmtCompact(v, locale), markX: year }), [n, years, ar, locale, year, L]);

  const govVals = Object.fromEntries(world.governorates.map((g) => [g.id, res.byGov[g.id].per1000])) as Record<GovId, number>;
  const exportCsv = () => downloadCsv("housing-need.csv", [
    ...n.map((x) => ({ level: "NATIONAL", area: "Jordan", year: x.year, households: Math.round(x.households), new_households: Math.round(x.newHouseholds), replacement: Math.round(x.replacement), backlog: Math.round(x.backlog), vacancy_release: Math.round(x.vacancyRelease), need: Math.round(x.need), completions: Math.round(x.completions), cumulative_gap: Math.round(x.cumulativeGap), scenario: scenarioName, data_nature: "SIMULATED" })),
    ...world.governorates.map((g) => ({ level: "GOVERNORATE", area: g.name.en, year: `${baseYear + 1}-2035`, households: "", new_households: "", replacement: "", backlog: "", vacancy_release: "", need: Math.round(res.byGov[g.id].need2035), completions: "", cumulative_gap: "", scenario: scenarioName, data_nature: "SIMULATED" })),
  ]);

  return (
    <div>
      <PageHeader index={navIndex("/housing-need")} title={t("navHousingNeed")} subtitle={L("How many homes are needed each year, where, and of what type? New households from the projection, replacement of old stock and clearing today's overcrowding and inadequate dwellings — less vacant homes that can return to the market — compared with the expected building rate.", "كم مسكناً يلزم كل سنة، وأين، ومن أي نوع؟ الأسر الجديدة من الإسقاط وإحلال الرصيد القديم ومعالجة الاكتظاظ والمساكن غير الملائمة الحالية — مطروحاً منها المساكن الشاغرة التي يمكن أن تعود للسوق — مقارنة بوتيرة البناء المتوقعة.")}>
        <Button onClick={exportCsv}>{t("exportCsv")}</Button>
      </PageHeader>
      <LabBar />
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label={`${L("Homes needed", "المساكن اللازمة")} ${baseYear + 1}–${year}`} value={fmtCompact(needTo, locale)} sub={`${fmtCompact(needTo / Math.max(1, year - baseYear), locale)} ${L("per year", "سنوياً")}`} nature="SIMULATED" sources={["SIM_HOUSING_NEED", "SIM_SMALL_AREA"]} />
        <Kpi label={`${L("Need in", "الحاجة في")} ${year}`} value={fmtCompact(at.need, locale)} sub={`${L("first year", "السنة الأولى")} ${fmtCompact(first.need, locale)}`} nature="SIMULATED" />
        <Kpi label={L("Cumulative shortfall", "العجز التراكمي")} value={fmtCompact(Math.max(0, at.cumulativeGap), locale)} sub={`${L("at", "عند")} ${fmtCompact(res.completions, locale)} ${L("completions / yr", "إنجاز/سنة")}`} tone={at.cumulativeGap > 0 ? "crit" : "ok"} nature="SIMULATED" />
        <Kpi label={L("Overcrowded households", "أسر مكتظة")} value={fmtCompact(res.base.crowded, locale)} sub={L("> 2 persons / room (census)", "> 2 فرد/غرفة (التعداد)")} nature="SIMULATED" sources={["SIM_MICRODATA"]} />
        <Kpi label={L("Vacant dwellings", "مساكن شاغرة")} value={fmtCompact(res.base.vacant, locale)} sub={`${fmtPct(res.base.vacant / res.base.stock)} ${L("of stock (frame)", "من الرصيد (الإطار)")}`} nature="SIMULATED" sources={["SIM_FRAME"]} />
        <Kpi label={L("Tents / caravans", "خيام / كرفانات")} value={fmtCompact(res.base.inadequate, locale)} sub={L("inadequate dwellings", "مساكن غير ملائمة")} nature="SIMULATED" />
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-[300px_minmax(0,1fr)]">
        <Panel title={t("assumptions")} nature="SIMULATED" sources={["SIM_HOUSING_NEED"]} actions={<Button size="xs" onClick={() => setP(DEFAULT_HOUSING)}>{t("reset")}</Button>}>
          <div className="space-y-3.5">
            <Slider label={L("Completions per year", "الإنجاز السنوي")} value={p.completions ?? autoCompletions} min={20000} max={140000} step={2500} onChange={(v) => set("completions", v)} format={(v) => fmtInt(v)} hint={p.completions === null ? L("Default: 85% of first-decade average need (assumption).", "الافتراضي: 85% من متوسط حاجة العقد الأول (افتراض).") : undefined} />
            <Slider label={L("Replacement rate", "معدل الإحلال")} value={p.replacementRate} min={0} max={0.015} step={0.001} onChange={(v) => set("replacementRate", v)} format={(v) => `${(v * 100).toFixed(1)}%/yr`} />
            <Slider label={L("Share of overcrowding to resolve", "نسبة الاكتظاظ المراد معالجتها")} value={p.crowdingResolve} min={0} max={1} step={0.05} onChange={(v) => set("crowdingResolve", v)} format={(v) => fmtPct(v, 0)} />
            <Slider label={L("Backlog clearance period", "مدة معالجة المتراكم")} value={p.backlogYears} min={5} max={24} step={1} onChange={(v) => set("backlogYears", v)} format={(v) => `${v} ${L("yrs", "سنة")}`} />
            <Slider label={L("Excess vacancy returned to market", "الشواغر الزائدة العائدة للسوق")} value={p.vacancyRelease} min={0} max={0.6} step={0.05} onChange={(v) => set("vacancyRelease", v)} format={(v) => fmtPct(v, 0)} />
          </div>
        </Panel>
        <div className="grid min-w-0 gap-3 lg:grid-cols-2">
          <Panel title={L("Components of need", "مكونات الحاجة")} nature="SIMULATED"><EChart option={compChart} height={250} /></Panel>
          <Panel title={L("Need vs completions", "الحاجة مقابل الإنجاز")} nature="SIMULATED"><EChart option={gapChart} height={250} /></Panel>
          <Panel title={L("Cumulative shortfall", "العجز التراكمي")} subtitle={L("Negative = surplus", "السالب = فائض")} nature="SIMULATED"><EChart option={cumChart} height={220} /></Panel>
          <JordanMap height={300} title={L(`Homes needed per 1,000 households, ${baseYear + 1}–2035`, `المساكن اللازمة لكل 1,000 أسرة، ${baseYear + 1}–2035`)} govValues={govVals} districtValues={res.byDistrict} scale="seq" format={(v) => fmtInt(v)} legendTitle={L("per 1,000 hh", "لكل 1,000 أسرة")} selectedGov={govId} onSelectGov={selectGov} districtMode="drill" sources={["SIM_HOUSING_NEED"]} showLabelsDefault={false} />
        </div>
      </div>
      <Panel className="mt-3" title={L("Governorates — need to 2035, type and land", "المحافظات — الحاجة حتى 2035 والنوع والأرض")} nature="SIMULATED" sources={["SIM_HOUSING_NEED", "SIM_FRAME", "SIM_MICRODATA"]}>
        <SimpleTable
          minWidth={760}
          head={[t("governorate"), L("Need to 2035", "الحاجة حتى 2035"), L("per 1,000 hh", "لكل 1,000 أسرة"), L("Need to 2050", "الحاجة حتى 2050"), L("Apartments", "شقق"), L("Land (ha)", "الأرض (هكتار)"), L("Overcrowded", "مكتظة"), L("Vacancy", "الشواغر")]}
          rows={[...world.governorates].sort((a, b) => res.byGov[b.id].need2035 - res.byGov[a.id].need2035).map((g) => {
            const x = res.byGov[g.id];
            return [<b key="g">{tx(g.name)}</b>, fmtInt(x.need2035), fmtInt(x.per1000), fmtInt(x.need2050), fmtPct(x.aptShare, 0), fmtInt(x.landHa2035), fmtPct(x.crowdedShare), fmtPct(x.vacant / x.stock)];
          })}
        />
      </Panel>
      <Callout tone="sim" className="mt-3">{L("Stock, vacancy, crowding and dwelling types come from the synthetic census frame and microdata. Completions, replacement and clearance targets are adjustable assumptions.", "الرصيد والشواغر والاكتظاظ وأنواع المساكن من إطار التعداد الاصطناعي وبياناته الجزئية. أما الإنجاز والإحلال وأهداف المعالجة فافتراضات قابلة للتعديل.")}</Callout>
      <AreaActions sectors={["HOUSING"]} />
      <Method>
        <Formula>{"need(t) = Δhouseholds + stock × replacement + (crowded × share + tents/caravans) ÷ clearance years − excess vacancy × release ÷ years to 2040"}</Formula>
        <Formula>{"land (ha) = units × (apartment share ÷ 60 + house share ÷ 20)   ·   apartment share ≈ 0.85 × urban share"}</Formula>
      </Method>
    </div>
  );
}
