"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useApp } from "@/store/app";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader, Panel, Callout } from "@/components/ui/panel";
import { Kpi } from "@/components/ui/kpi";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/form";
import { EChart } from "@/components/charts/echart";
import { barH, VIZ } from "@/components/charts/builders";
import { JordanMap } from "@/features/gis/JordanMap";
import { assessLand, DEFAULT_LAND, ZONE_LABEL, ZONE_SHORT, ZONES, type LandParams, type Zone } from "@/simulation/lab/land";
import { downloadCsv } from "@/lib/csv";
import { navIndex } from "@/lib/nav";
import { fmt1, fmtInt, fmtPct } from "@/lib/format";
import type { GovId } from "@/types/census";
import { AreaActions } from "@/features/lab/ActionCard";
import { Formula, LabBar, Method, SimpleTable, useLab } from "@/features/lab/shared";

const ZONE_ORDER: Zone[] = ["LOWLAND", "HIGHLAND", "DESERT"];
const ZONE_COLOR: Record<Zone, string> = { LOWLAND: "#159a83", HIGHLAND: "#8a5cc0", DESERT: "#d4a017" };

export function Land() {
  const { world, areaFor, run, year, scenarioName } = useLab();
  const { t, tx, L, ar } = useI18n();
  const govId = useApp((s) => s.govId);
  const selectGov = useApp((s) => s.selectGov);
  const [p, setP] = useState<LandParams>(DEFAULT_LAND);
  const dp = useDeferredValue(p);
  const set = <K extends keyof LandParams>(k: K, v: LandParams[K]) => setP((s) => ({ ...s, [k]: v }));
  const res = useMemo(() => assessLand(world, areaFor(run.baseYear), areaFor(year), dp), [world, areaFor, run.baseYear, year, dp]);
  const n = res.national;
  const govs = [...world.governorates].sort((a, b) => res.byGov[b.id].demandKm2 - res.byGov[a.id].demandKm2);
  const tight = world.districts.map((d) => ({ d, x: res.byDistrict[d.id] })).filter((r) => r.x.demandKm2 > 0.5).sort((a, b) => a.x.sufficiency - b.x.sufficiency);
  const chart = useMemo(() => barH(govs.map((g) => tx(g.name)), [
    { name: L("Built-up today", "المبني اليوم"), data: govs.map((g) => Math.round(res.byGov[g.id].builtKm2)), color: "#8c8a83" },
    { name: L(`Land needed to ${year}`, `الأراضي اللازمة حتى ${year}`), data: govs.map((g) => Math.round(res.byGov[g.id].demandKm2)), color: VIZ[1] },
    { name: L("Developable (serviceable)", "القابلة للتطوير (للخدمة)"), data: govs.map((g) => Math.round(Math.min(res.byGov[g.id].developableKm2, 600))), color: VIZ[2] },
  ], { rtl: ar, legend: true, fmt: (v) => `${fmtInt(v)} km²` }), [govs, res, tx, ar, L, year]);
  const zoneChart = useMemo(() => barH(world.governorates.map((g) => tx(g.name)), ZONE_ORDER.map((z) => ({ name: L(ZONE_LABEL[z].en, ZONE_LABEL[z].ar), data: world.governorates.map((g) => Math.round((res.byGov[g.id].zones[z] / Math.max(1, res.byGov[g.id].areaKm2)) * 100)), color: ZONE_COLOR[z] })), { rtl: ar, stack: true, legend: true, fmt: (v) => `${v}%` }), [world, res, tx, ar, L]);
  const distVals = Object.fromEntries(world.districts.map((d) => [d.id, Math.min(3, res.byDistrict[d.id].demandKm2 / Math.max(0.05, res.byDistrict[d.id].developableKm2))]));
  const govVals = Object.fromEntries(world.governorates.map((g) => [g.id, Math.min(3, res.byGov[g.id].demandKm2 / Math.max(0.05, res.byGov[g.id].developableKm2))])) as Record<GovId, number>;
  const exportCsv = () => downloadCsv(`land-terrain-${year}.csv`, world.districts.map((d) => { const x = res.byDistrict[d.id]; return { district: d.name.en, governorate: world.gov[d.govId].name.en, zone: x.zone, area_km2: x.areaKm2.toFixed(1), built_km2: x.builtKm2.toFixed(1), agricultural_km2: x.agriculturalKm2.toFixed(1), developable_km2: x.developableKm2.toFixed(1), demand_km2: x.demandKm2.toFixed(2), sufficiency: Math.min(99, x.sufficiency).toFixed(2), years_supply: Math.min(999, x.yearsSupply).toFixed(0), farmland_at_risk_km2: x.agriAtRiskKm2.toFixed(2), horizon: year, scenario: scenarioName, data_nature: "SIMULATED" }; }));

  return (
    <div>
      <PageHeader index={navIndex("/land")} title={t("navLand")} subtitle={L("Is there enough serviceable land where people will live? Each district's terrain zone sets how much land is steep, agricultural or protected; the remaining serviceable land is compared with the land that new households and jobs will need.", "هل تكفي الأراضي القابلة للخدمة حيث سيعيش الناس؟ يحدد الإقليم الطبيعي لكل لواء نسبة الأراضي شديدة الانحدار والزراعية والمحمية؛ وتُقارن الأراضي المتبقية القابلة للخدمة بالأراضي التي تحتاجها الأسر والوظائف الجديدة.")}>
        <Button onClick={exportCsv}>{t("exportCsv")}</Button>
      </PageHeader>
      <LabBar />
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label={L("Land area", "المساحة")} value={`${fmtInt(n.areaKm2)} km²`} sub={`${L("Badia", "البادية")} ${fmtPct(n.zones.DESERT / n.areaKm2, 0)}`} nature="REFERENCE" sources={["GEO_ADM2"]} />
        <Kpi label={L("Built-up today", "المبني اليوم")} value={`${fmtInt(n.builtKm2)} km²`} nature="SIMULATED" sources={["SIM_LAND"]} />
        <Kpi label={L(`Land needed to ${year}`, `الأراضي اللازمة حتى ${year}`)} value={`${fmtInt(n.demandKm2)} km²`} sub={L(`${fmtInt(p.grossDensity)} homes per km²`, `${fmtInt(p.grossDensity)} مسكن لكل كم²`)} nature="SIMULATED" />
        <Kpi label={L("Serviceable developable land", "أراضٍ قابلة للتطوير والخدمة")} value={`${fmtInt(n.developableKm2)} km²`} nature="SIMULATED" />
        <Kpi label={L("Farmland at risk", "أراضٍ زراعية معرضة للخطر")} value={`${fmt1(n.agriAtRiskKm2)} km²`} tone={n.agriAtRiskKm2 > 50 ? "warn" : undefined} nature="SIMULATED" />
        <Kpi label={L("Districts short of land", "ألوية تنقصها الأراضي")} value={fmtInt(tight.filter((r) => r.x.sufficiency < 1.5).length)} sub={L("serviceable < 1.5 × need", "القابلة للخدمة < 1.5 × الحاجة")} tone="crit" nature="SIMULATED" />
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-[300px_minmax(0,1fr)]">
        <Panel title={t("assumptions")} nature="SIMULATED" sources={["SIM_LAND"]} actions={<Button size="xs" onClick={() => setP(DEFAULT_LAND)}>{t("reset")}</Button>}>
          <div className="space-y-3.5">
            <Slider label={L("Gross density of new areas", "الكثافة الإجمالية للمناطق الجديدة")} value={p.grossDensity} min={800} max={5000} step={100} onChange={(v) => set("grossDensity", v)} format={(v) => `${fmtInt(v)} /km²`} hint={L("Homes per km² including roads and services; compact growth raises it.", "مساكن لكل كم² شاملة الطرق والخدمات؛ ويرفعها النمو المتراص.")} />
            <Slider label={L("Vacancy allowance", "هامش الشغور")} value={p.vacancyAllowance} min={0} max={0.2} step={0.01} onChange={(v) => set("vacancyAllowance", v)} format={(v) => fmtPct(v, 0)} />
            <Slider label={L("Land for jobs and services", "أراضٍ للوظائف والخدمات")} value={p.employmentLandShare} min={0} max={0.6} step={0.05} onChange={(v) => set("employmentLandShare", v)} format={(v) => fmtPct(v, 0)} />
          </div>
          <div className="mt-3" /><SimpleTable minWidth={250} head={[L("Zone", "الإقليم"), L("Steep", "منحدر"), L("Farm", "زراعي"), L("Prot.", "محمي"), L("Serv.", "للخدمة")]} rows={ZONE_ORDER.map((z) => [<span key="z" className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: ZONE_COLOR[z] }} />{L(ZONE_SHORT[z].en, ZONE_SHORT[z].ar)}</span>, fmtPct(ZONES[z].steep, 0), fmtPct(ZONES[z].agricultural, 0), fmtPct(ZONES[z].protected, 0), fmtPct(ZONES[z].serviceable, 0)])} />
        </Panel>
        <div className="grid min-w-0 gap-3 lg:grid-cols-2">
          <Panel title={L("Land balance by governorate", "ميزان الأراضي حسب المحافظة")} subtitle={L("Developable land capped at 600 km² for readability", "الأراضي القابلة للتطوير محددة بـ 600 كم² للوضوح")} nature="SIMULATED"><EChart option={chart} height={400} /></Panel>
          <Panel title={L("Terrain zones", "الأقاليم الطبيعية")} subtitle={L("Share of each governorate's area", "حصة مساحة كل محافظة")} nature="SIMULATED"><EChart option={zoneChart} height={400} /></Panel>
        </div>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <JordanMap height={440} title={L(`Land pressure ${year}: land needed ÷ serviceable land`, `ضغط الأراضي ${year}: الأراضي اللازمة ÷ القابلة للخدمة`)} govValues={govVals} districtValues={distVals} scale="risk" domain={[0, 1.5]} format={(v) => `${v.toFixed(2)} ×`} legendTitle={L("Pressure", "الضغط")} selectedGov={govId} onSelectGov={selectGov} districtMode="drill" sources={["SIM_LAND", "GEO_ADM2"]} />
        <Panel title={L("Districts with the least land headroom", "الألوية الأقل هامشاً من الأراضي")} nature="SIMULATED" sources={["SIM_LAND"]}>
          <SimpleTable minWidth={560} head={[L("District", "اللواء"), L("Zone", "الإقليم"), L("Needed", "اللازم"), L("Serviceable", "القابل للخدمة"), L("Years of supply", "سنوات المعروض"), L("Farmland at risk", "زراعي معرض")]}
            rows={tight.slice(0, 12).map(({ d, x }) => [<b key="d">{tx(d.name)}</b>, L(ZONE_SHORT[x.zone].en, ZONE_SHORT[x.zone].ar), `${fmt1(x.demandKm2)} km²`, `${fmt1(x.developableKm2)} km²`, x.yearsSupply > 200 ? "200+" : fmtInt(x.yearsSupply), `${fmt1(x.agriAtRiskKm2)} km²`])} />
        </Panel>
      </div>
      <Callout tone="sim" className="mt-3">{L("No elevation or land-cover data are bundled: terrain constraints are illustrative zone shares. Replace them with a DEM and land-cover connector for statutory land-use planning.", "لا تتضمن المنصة بيانات ارتفاع أو غطاء أرضي: قيود التضاريس نسب توضيحية للأقاليم. يجب استبدالها بموصل لنموذج الارتفاعات والغطاء الأرضي للتخطيط النظامي لاستعمالات الأراضي.")}</Callout>
      <AreaActions sectors={["LAND", "URBAN"]} />
      <Method>
        <Formula>{"built = urban pop ÷ urban density(zone) + rural pop ÷ 2,000   ·   developable = area × (1 − steep − farm − protected) × serviceable − ½ built"}</Formula>
        <Formula>{"need = new households × (1 + vacancy) ÷ gross density × (1 + land for jobs)   ·   years of supply = developable ÷ (need ÷ years)"}</Formula>
      </Method>
    </div>
  );
}
