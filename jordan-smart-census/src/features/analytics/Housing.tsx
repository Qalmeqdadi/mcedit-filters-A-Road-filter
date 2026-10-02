"use client";

import { useMemo } from "react";
import { useEngine } from "@/store/engine";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader, Panel } from "@/components/ui/panel";
import { Kpi } from "@/components/ui/kpi";
import { EChart } from "@/components/charts/echart";
import { barV, VIZ } from "@/components/charts/builders";
import { CategoryBars } from "@/components/charts/common";
import { JordanMap } from "@/features/gis/JordanMap";
import { GovTable, ScopeBar, SmallSample, useProfiles } from "./shared";
import { COOLING, DWELLING_TYPES, HEATING, SANITATION, TENURES, WATER } from "@/simulation/analytics";
import { fmt1, fmtCompact, fmtPct } from "@/lib/format";
import { useApp } from "@/store/app";
import { useScope } from "@/hooks/useScope";
import type { GovId } from "@/types/census";
import { navIndex } from "@/lib/nav";

export function Housing() {
  const engine = useEngine();
  const { t, L, lb, ar, locale } = useI18n();
  const { profile: p } = useProfiles();
  const { govId, districtId } = useScope();
  const { selectGov, selectDistrict } = useApp();
  const H = p.housing;
  const hh = Math.max(1, p.households);
  const started = engine.phase !== "READY";
  const byGov = engine.aggregateBy("govId");
  const byDist = engine.aggregateBy("districtId");
  const scopeAgg = engine.aggregate((a) => (!govId || a.govId === govId) && (!districtId || a.districtId === districtId));
  const vacancy = (a: (typeof byGov)[string]) => (started && a.visited > 0 ? a.vacant / a.visited : (a.dwellings - a.hhEstimate) / a.dwellings);
  const rooms = useMemo(() => barV(["1", "2", "3", "4", "5", "6", "7", "8+"], [{ name: t("households"), data: H.rooms.map((x) => x / hh), color: VIZ[0] }], { rtl: ar, fmt: (x) => fmtPct(x, 0) }), [H, hh, ar, t]);
  const vehicles = useMemo(() => barV(["0", "1", "2", "3+"], [{ name: t("households"), data: H.vehicles.map((x) => x / hh), color: VIZ[2] }], { rtl: ar, fmt: (x) => fmtPct(x, 0) }), [H, hh, ar, t]);
  return (
    <div>
      <PageHeader index={navIndex("/housing")} title={t("nav12")} subtitle={L("Dwelling characteristics, tenure, crowding, utilities and amenities. Vacancy comes from the live fieldwork (or the frame before fieldwork).", "خصائص المساكن والحيازة والاكتظاظ والمرافق والكماليات. نسبة الشواغر من العمل الميداني المباشر (أو من الإطار قبل بدئه).")} />
      <ScopeBar />
      <SmallSample p={p} />
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 xl:grid-cols-8">
        <Kpi label={L("Occupied dwellings", "المساكن المشغولة")} value={fmtCompact(p.households, locale)} nature="SIMULATED" sources={["SIM_MICRODATA"]} />
        <Kpi label={L("Vacant housing", "المساكن الشاغرة")} value={fmtPct(vacancy(scopeAgg))} sub={started ? L("found in fieldwork", "مكتشفة ميدانياً") : L("frame estimate", "تقدير الإطار")} nature={started ? "SYNTHETIC_OPERATIONAL" : "SIMULATED"} sources={["OPS_FIELDWORK", "SIM_FRAME"]} />
        <Kpi label={L("Home ownership", "تملك المسكن")} value={fmtPct(H.tenure.OWNED / hh, 0)} nature="SIMULATED" />
        <Kpi label={L("Rental", "الإيجار")} value={fmtPct(H.tenure.RENTED / hh, 0)} nature="SIMULATED" />
        <Kpi label={L("Persons per room", "الأفراد لكل غرفة")} value={fmt1(H.personsPerRoom)} nature="SIMULATED" />
        <Kpi label={L("Crowding (> 2 per room)", "الاكتظاظ (> 2 لكل غرفة)")} value={fmtPct(H.crowded / hh)} nature="SIMULATED" />
        <Kpi label={L("Internet at home", "الإنترنت في المنزل")} value={fmtPct(H.internet / hh, 0)} nature="SIMULATED" />
        <Kpi label={L("Vehicle ownership", "تملك المركبات")} value={fmtPct(H.withVehicle / hh, 0)} nature="SIMULATED" />
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <JordanMap height={430} title={L("Vacancy rate", "نسبة الشواغر")} govValues={Object.fromEntries(engine.world.governorates.map((g) => [g.id, vacancy(byGov[g.id])])) as Record<GovId, number>} districtValues={Object.fromEntries(engine.world.districts.map((d) => [d.id, vacancy(byDist[d.id])]))} scale="risk" format={(x) => fmtPct(x, 0)} legendTitle={t("layerHousing")} selectedGov={govId} selectedDistrict={districtId} onSelectGov={selectGov} onSelectDistrict={(d) => selectDistrict(d)} sources={["OPS_FIELDWORK", "SIM_FRAME"]} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Panel title={L("Dwelling type", "نوع المسكن")} nature="SIMULATED"><CategoryBars items={DWELLING_TYPES.map((k) => ({ label: lb("dwellingType", k), value: H.type[k] }))} pct /></Panel>
          <Panel title={L("Tenure", "الحيازة")} nature="SIMULATED"><CategoryBars items={TENURES.map((k) => ({ label: lb("tenure", k), value: H.tenure[k] }))} pct color={VIZ[1]} /></Panel>
          <Panel title={L("Rooms per dwelling", "عدد الغرف في المسكن")} nature="SIMULATED"><EChart option={rooms} height={170} /></Panel>
          <Panel title={L("Vehicles per household", "المركبات لكل أسرة")} nature="SIMULATED"><EChart option={vehicles} height={170} /></Panel>
        </div>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2 2xl:grid-cols-4">
        <Panel title={L("Water source", "مصدر المياه")} nature="SIMULATED"><CategoryBars items={WATER.map((k) => ({ label: lb("water", k), value: H.water[k] }))} pct color={VIZ[2]} /><div className="mt-2 text-[12px] text-ink-500">{L("Electricity (public grid)", "الكهرباء (الشبكة العامة)")}: <b className="text-ink-900">{fmtPct(H.electricity / hh)}</b></div></Panel>
        <Panel title={L("Sanitation", "الصرف الصحي")} nature="SIMULATED"><CategoryBars items={SANITATION.map((k) => ({ label: lb("sanitation", k), value: H.sanitation[k] }))} pct color={VIZ[3]} /></Panel>
        <Panel title={L("Heating", "التدفئة")} nature="SIMULATED"><CategoryBars items={HEATING.map((k) => ({ label: lb("heating", k), value: H.heating[k] }))} pct color={VIZ[5]} /></Panel>
        <Panel title={L("Cooling", "التبريد")} nature="SIMULATED"><CategoryBars items={COOLING.map((k) => ({ label: lb("cooling", k), value: H.cooling[k] }))} pct color={VIZ[0]} /></Panel>
      </div>
      <Panel className="mt-3" title={L("Governorate comparison", "مقارنة المحافظات")} nature="SIMULATED">
        <GovTable cols={[
          { key: "own", label: L("Owned", "ملك"), get: (x) => x.housing.tenure.OWNED / x.households, fmt: (v) => fmtPct(v, 0) },
          { key: "rent", label: L("Rented", "إيجار"), get: (x) => x.housing.tenure.RENTED / x.households, fmt: (v) => fmtPct(v, 0) },
          { key: "apt", label: L("Apartments", "شقق"), get: (x) => x.housing.type.APARTMENT / x.households, fmt: (v) => fmtPct(v, 0) },
          { key: "ppr", label: L("Persons/room", "أفراد/غرفة"), get: (x) => x.housing.personsPerRoom, fmt: fmt1 },
          { key: "crowd", label: L("Crowded", "مكتظة"), get: (x) => x.housing.crowded / x.households, fmt: (v) => fmtPct(v) },
          { key: "sewer", label: L("Public sewer", "صرف عام"), get: (x) => x.housing.sanitation.PUBLIC_SEWER / x.households, fmt: (v) => fmtPct(v, 0) },
          { key: "net", label: L("Internet", "إنترنت"), get: (x) => x.housing.internet / x.households, fmt: (v) => fmtPct(v, 0) },
          { key: "veh", label: L("Vehicle", "مركبة"), get: (x) => x.housing.withVehicle / x.households, fmt: (v) => fmtPct(v, 0) },
        ]} />
      </Panel>
    </div>
  );
}
