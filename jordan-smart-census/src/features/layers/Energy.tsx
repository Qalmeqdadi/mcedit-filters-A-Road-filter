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
import { JordanMap } from "@/features/gis/JordanMap";
import { assessEnergy, DEFAULT_ENERGY, type EnergyParams } from "@/simulation/lab/energy";
import { openData } from "@/data/openData";
import { useConnectors, useDataOverrides } from "@/store/connectors";
import { downloadCsv } from "@/lib/csv";
import { navIndex } from "@/lib/nav";
import { fmt1, fmtInt, fmtPct } from "@/lib/format";
import type { GovId } from "@/types/census";
import { AreaActions } from "@/features/lab/ActionCard";
import { Formula, LabBar, Method, SimpleTable, useLab } from "@/features/lab/shared";

export function Energy() {
  const { world, areaFor, run, year, scenarioName } = useLab();
  const { t, tx, L, ar } = useI18n();
  const govId = useApp((s) => s.govId);
  const selectGov = useApp((s) => s.selectGov);
  const { overrides } = useDataOverrides();
  useConnectors((s) => s.dataVersion);
  const [p, setP] = useState<EnergyParams>(DEFAULT_ENERGY);
  const dp = useDeferredValue(p);
  const set = <K extends keyof EnergyParams>(k: K, v: EnergyParams[K]) => setP((s) => ({ ...s, [k]: v }));
  const res = useMemo(() => assessEnergy(world, areaFor, run.baseYear, year, { ...dp, peakMW: overrides.peakMW, capacityMW: overrides.capacityMW }), [world, areaFor, run.baseYear, year, dp, overrides.peakMW, overrides.capacityMW]);
  const od = openData().electricity;
  const n = res.national;
  const at = res.series.find((x) => x.year === year)!;
  const exceeded = world.governorates.filter((g) => res.byGov[g.id].capacityYear && res.byGov[g.id].capacityYear! <= year);
  const imported = Object.values(res.byGov).some((x) => x.imported);
  const histChart = useMemo(() => line(od.map((x) => x.year), [
    { name: L("Electricity demand (TWh)", "الطلب على الكهرباء (تيراواط ساعة)"), data: od.map((x) => x.demandTWh), color: VIZ[0] },
    { name: L("Renewable share (%)", "حصة المتجددة (%)"), data: od.map((x) => x.renewablesShare), color: VIZ[2], dashed: true },
  ], { rtl: ar, legend: true }), [od, ar, L]);
  const projChart = useMemo(() => line(res.series.map((x) => x.year), [
    { name: L("Demand (TWh)", "الطلب (تيراواط ساعة)"), data: res.series.map((x) => +x.twh.toFixed(1)), color: VIZ[0], area: true },
    { name: L("Peak (GW)", "الذروة (غيغاواط)"), data: res.series.map((x) => +(x.peakMW / 1000).toFixed(2)), color: VIZ[1] },
  ], { rtl: ar, legend: true, markX: year }), [res, ar, year, L]);
  const govVals = Object.fromEntries(world.governorates.map((g) => [g.id, res.byGov[g.id].peakH / Math.max(1, res.byGov[g.id].capacity)])) as Record<GovId, number>;
  const rows = [...world.governorates].sort((a, b) => (res.byGov[a.id].capacityYear ?? 9999) - (res.byGov[b.id].capacityYear ?? 9999));
  const exportCsv = () => downloadCsv(`energy-utilities-${year}.csv`, world.governorates.map((g) => { const e = res.byGov[g.id]; return { governorate: g.name.en, peak_base_mw: Math.round(e.peakBase), peak_horizon_mw: Math.round(e.peakH), capacity_mw: Math.round(e.capacity), capacity_exceeded_year: e.capacityYear ?? "", reinforcement_mva: Math.round(e.reinforceMVA), rooftop_solar_mw: Math.round(e.rooftopMW), ac_share: e.acShare.toFixed(3), waste_tonnes_per_day: Math.round(e.wasteTpdH), landfill_full_year: e.landfillFullYear ?? "", sewer_share: e.sewerShare.toFixed(3), source: e.imported ? "imported" : "modelled", horizon: year, scenario: scenarioName, data_nature: "SIMULATED" }; }));

  return (
    <div>
      <PageHeader index={navIndex("/energy")} title={t("navEnergy")} subtitle={L("Will the grid, landfills and sewers keep up with growth and hotter summers? Household electricity use from the census is calibrated to Jordan's observed demand (Our World in Data) and projected with population, appliances and warming.", "هل تواكب الشبكة والمكبات والصرف الصحي النمو والصيف الأشد حرارة؟ يُعاير استهلاك الأسر من الكهرباء في التعداد على الطلب المرصود في الأردن (Our World in Data) ويُسقط وفق السكان والأجهزة والاحترار.")}>
        <Button onClick={exportCsv}>{t("exportCsv")}</Button>
      </PageHeader>
      <LabBar />
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label={L(`Electricity demand ${res.calibration.year ?? ""}`, `الطلب على الكهرباء ${res.calibration.year ?? ""}`)} value={`${fmt1(res.calibration.twh)} TWh`} sub={L("Our World in Data", "Our World in Data")} nature="REFERENCE" sources={["OPEN_OWID_ENERGY"]} />
        <Kpi label={`${L("Demand", "الطلب")} ${year}`} value={`${fmt1(at.twh)} TWh`} sub={`${L("peak", "الذروة")} ${fmt1(at.peakMW / 1000)} GW`} nature="SIMULATED" sources={["SIM_ENERGY"]} />
        <Kpi label={L("Renewable share", "حصة المتجددة")} value={fmtPct(res.calibration.renewables, 0)} sub={`${L("target", "المستهدف")} ${fmtPct(p.renewableTarget, 0)} · ${res.calibration.renewablesYear ?? ""}`} tone={res.calibration.renewables >= p.renewableTarget ? "ok" : "warn"} nature="REFERENCE" sources={["OPEN_OWID_ENERGY"]} />
        <Kpi label={L(`Grid capacity exceeded by ${year}`, `تجاوز سعة الشبكة بحلول ${year}`)} value={`${exceeded.length} / 12`} sub={`+${fmtInt(n.reinforceMVA)} MVA ${L("needed", "لازمة")}`} tone={exceeded.length ? "crit" : "ok"} nature="SIMULATED" />
        <Kpi label={L("Rooftop solar potential", "إمكانات الطاقة الشمسية على الأسطح")} value={`${fmtInt(n.rooftopMW)} MW`} nature="SIMULATED" />
        <Kpi label={L("Sewer coverage", "تغطية الصرف الصحي")} value={fmtPct(n.sewerShare, 0)} sub={`${fmtInt(n.wasteTpdH)} ${L("t/day waste", "طن/يوم نفايات")} ${year}`} nature="SIMULATED" sources={["SIM_MICRODATA"]} />
      </div>
      {imported ? <Callout className="mt-3">{L("Peak demand and/or grid capacity come from your imported datasets (Data Connectors) where provided.", "يأتي حمل الذروة و/أو سعة الشبكة من مجموعات البيانات المستوردة (موصلات البيانات) حيثما توفرت.")}</Callout> : null}
      <div className="mt-3 grid gap-3 xl:grid-cols-[300px_minmax(0,1fr)]">
        <Panel title={t("assumptions")} nature="SIMULATED" sources={["SIM_ENERGY"]} actions={<Button size="xs" onClick={() => setP(DEFAULT_ENERGY)}>{t("reset")}</Button>}>
          <div className="space-y-3.5">
            <Slider label={L("Appliance growth per household", "نمو الأجهزة لكل أسرة")} value={p.applianceGrowth} min={0} max={0.04} step={0.002} onChange={(v) => set("applianceGrowth", v)} format={(v) => `${fmtPct(v)}/yr`} />
            <Slider label={L("Extra cooling demand by 2050", "طلب تبريد إضافي بحلول 2050")} value={p.coolingUplift} min={0} max={0.25} step={0.01} onChange={(v) => set("coolingUplift", v)} format={(v) => fmtPct(v, 0)} />
            <Slider label={L("Load factor", "معامل الحمل")} value={p.loadFactor} min={0.45} max={0.75} step={0.01} onChange={(v) => set("loadFactor", v)} format={(v) => fmtPct(v, 0)} hint={L("Lower = peakier demand (more air-conditioning).", "أقل = طلب أشد ذروة (تكييف أكثر).")} />
            <Slider label={L("Roofs used for solar", "الأسطح المستخدمة للطاقة الشمسية")} value={p.rooftopShare} min={0.05} max={0.6} step={0.05} onChange={(v) => set("rooftopShare", v)} format={(v) => fmtPct(v, 0)} />
            <Slider label={L("Renewable target (2030)", "مستهدف المتجددة (2030)")} value={p.renewableTarget} min={0.2} max={0.6} step={0.01} onChange={(v) => set("renewableTarget", v)} format={(v) => fmtPct(v, 0)} />
          </div>
        </Panel>
        <div className="grid min-w-0 gap-3 lg:grid-cols-2">
          <Panel title={L("Observed: demand and renewables", "المرصود: الطلب والمتجددة")} subtitle={`${od[0]?.year}–${od[od.length - 1]?.year}`} nature="REFERENCE" sources={["OPEN_OWID_ENERGY"]}><EChart option={histChart} height={250} /></Panel>
          <Panel title={L("Projected demand and peak", "الطلب والذروة المسقطان")} nature="SIMULATED" sources={["SIM_ENERGY"]}><EChart option={projChart} height={250} /></Panel>
        </div>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <JordanMap height={420} title={L(`Peak demand ÷ grid capacity ${year}`, `حمل الذروة ÷ سعة الشبكة ${year}`)} govValues={govVals} scale="risk" domain={[0.7, 1.4]} format={(v) => `${fmtPct(v, 0)}`} legendTitle={L("Loading", "التحميل")} selectedGov={govId} onSelectGov={selectGov} sources={["SIM_ENERGY"]} />
        <Panel title={L("Governorates — utilities", "المحافظات — المرافق")} nature="SIMULATED" sources={["SIM_ENERGY"]}>
          <SimpleTable minWidth={640} head={[t("governorate"), L("Peak now", "الذروة الآن"), `${L("Peak", "الذروة")} ${year}`, L("Capacity", "السعة"), L("Exceeded", "التجاوز"), L("Rooftop", "الأسطح"), L("Landfill full", "امتلاء المكب"), L("Sewer", "الصرف")]}
            rows={rows.map((g) => { const e = res.byGov[g.id]; return [<b key="g">{tx(g.name)}{e.imported ? " *" : ""}</b>, `${fmtInt(e.peakBase)} MW`, `${fmtInt(e.peakH)} MW`, `${fmtInt(e.capacity)} MW`, <span key="y" className={e.capacityYear && e.capacityYear <= year ? "font-semibold text-crit" : ""}>{e.capacityYear ?? "—"}</span>, `${fmtInt(e.rooftopMW)} MW`, e.landfillFullYear ?? "—", fmtPct(e.sewerShare, 0)]; })} />
        </Panel>
      </div>
      <Callout tone="sim" className="mt-3">{L("National demand and the renewable share are observed (open data); governorate peaks, grid capacities and landfill volumes are synthetic until imported from NEPCO and the municipalities.", "الطلب الوطني وحصة المتجددة مرصودان (بيانات مفتوحة)؛ أما ذروات المحافظات وسعات الشبكة وأحجام المكبات فاصطناعية حتى تُستورد من شركة الكهرباء الوطنية والبلديات.")}</Callout>
      <AreaActions sectors={["ENERGY"]} />
      <Method>
        <Formula>{"kWh/household = (3,300 + 900 × urban share) × (1 + 0.45 × AC share); total = Σ households × kWh ÷ 0.47, scaled to observed national TWh"}</Formula>
        <Formula>{"demand(t) × (1 + appliance growth)^(t−base) × (1 + cooling uplift × elapsed share)   ·   peak MW = GWh × 1,000 ÷ (8,760 × load factor)"}</Formula>
        <Formula>{"reinforcement MVA = max(0, 1.15 × peak − capacity) ÷ 0.9   ·   rooftop MW = households × suitable roofs × share × 3 kWp"}</Formula>
      </Method>
    </div>
  );
}
