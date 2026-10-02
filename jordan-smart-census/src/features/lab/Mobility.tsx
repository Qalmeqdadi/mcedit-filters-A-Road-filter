"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader, Panel, Callout } from "@/components/ui/panel";
import { Kpi } from "@/components/ui/kpi";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/form";
import { JordanMap, type MapLine } from "@/features/gis/JordanMap";
import { calibrateMobility, CORRIDORS, DEFAULT_MOBILITY, linkCoords, simulateMobility, type MobilityParams } from "@/simulation/lab/mobility";
import { downloadCsv } from "@/lib/csv";
import { navIndex } from "@/lib/nav";
import { fmt1, fmtCompact, fmtInt, fmtPct, fmtSigned } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Formula, LabBar, Method, SimpleTable, useLab } from "./shared";

const vcColor = (vc: number) => (vc < 0.7 ? "#1f8a3b" : vc < 0.9 ? "#d4a017" : vc < 1.1 ? "#d07a1c" : "#b5453a");

export function Mobility() {
  const { world, areaFor, baseYear, year, scenarioName } = useLab();
  const { t, tx, L, locale } = useI18n();
  const [p, setP] = useState<MobilityParams>({ ...DEFAULT_MOBILITY, corridors: ["AMM-ZAR"] });
  const [layer, setLayer] = useState<"congestion" | "flows">("congestion");
  const dp = useDeferredValue(p);
  const set = <K extends keyof MobilityParams>(k: K, v: MobilityParams[K]) => setP((s) => ({ ...s, [k]: v }));
  const toggle = (id: string) => setP((s) => ({ ...s, corridors: s.corridors.includes(id) ? s.corridors.filter((x) => x !== id) : [...s.corridors, id] }));
  const sa0 = areaFor(baseYear);
  const sa = areaFor(year);
  const cal = useMemo(() => calibrateMobility(world, sa0, { ...dp, corridors: [] }), [world, sa0, dp]);
  const base = useMemo(() => simulateMobility(world, sa0, { ...dp, corridors: [] }, cal.asc, cal.capacity), [world, sa0, dp, cal]);
  const noBrt = useMemo(() => simulateMobility(world, sa, { ...dp, corridors: [] }, cal.asc, cal.capacity), [world, sa, dp, cal]);
  const withBrt = useMemo(() => (dp.corridors.length ? simulateMobility(world, sa, dp, cal.asc, cal.capacity) : noBrt), [world, sa, dp, cal, noBrt]);
  const over = (r: typeof base) => r.links.filter((l) => l.vc >= 1).length;

  const lines = useMemo<MapLine[]>(() => {
    if (layer === "flows") {
      const max = Math.max(...withBrt.topFlows.map((f) => f.trips), 1);
      return withBrt.topFlows.map((f) => ({ coords: [world.district[f.from].label, world.district[f.to].label], width: 1 + (f.trips / max) * 9, color: "#2f62a6" }));
    }
    const maxV = Math.max(...withBrt.links.map((l) => l.volume), 1);
    const out: MapLine[] = withBrt.links.map((l) => ({ coords: linkCoords(world, l.link), width: 1.2 + (l.volume / maxV) * 8, color: vcColor(l.vc) }));
    for (const l of withBrt.links) if (l.transit) out.push({ coords: linkCoords(world, l.link), width: 3, color: "#8a5cc0" });
    return out;
  }, [withBrt, layer, world]);

  const dName = (id: string) => tx(world.district[id].name);
  const exportCsv = () => downloadCsv(`mobility-${year}.csv`, [
    ...withBrt.links.map((l) => ({ record: "LINK", from: world.district[l.link.a].name.en, to: world.district[l.link.b].name.en, km: l.link.km.toFixed(1), peak_vehicles: Math.round(l.volume), capacity: Math.round(l.capacity), vc: l.vc.toFixed(2), rapid_transit: l.transit, trips: "", transit_share: "", year, corridors: p.corridors.join(" "), scenario: scenarioName, data_nature: "SIMULATED" })),
    ...withBrt.topFlows.map((f) => ({ record: "OD_FLOW", from: world.district[f.from].name.en, to: world.district[f.to].name.en, km: "", peak_vehicles: "", capacity: "", vc: "", rapid_transit: "", trips: Math.round(f.trips), transit_share: f.transitShare.toFixed(3), year, corridors: p.corridors.join(" "), scenario: scenarioName, data_nature: "SIMULATED" })),
  ]);

  const ridersBrt = withBrt.corridorTrips.all ?? 0;
  return (
    <div>
      <PageHeader index={navIndex("/mobility")} title={t("navMobility")} subtitle={L("Where do people commute, which corridors congest as the population grows, and what does a rapid-transit line change? A gravity model distributes home-to-work trips between districts, a logit model splits car and public transport, and trips are assigned to a schematic network.", "إلى أين يتنقل الناس يومياً، وأي المحاور تزدحم مع نمو السكان، وماذا يغيّر خط نقل سريع؟ يوزّع نموذج الجاذبية رحلات السكن-العمل بين الألوية، ويقسم نموذج لوجيت بين السيارة والنقل العام، وتُحمَّل الرحلات على شبكة تخطيطية.")}>
        <Button onClick={exportCsv}>{t("exportCsv")}</Button>
      </PageHeader>
      <LabBar />
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label={`${L("Daily commute trips", "رحلات العمل اليومية")} ${year}`} value={fmtCompact(withBrt.trips, locale)} sub={`${L("base", "الأساس")} ${fmtCompact(base.trips, locale)}`} nature="SIMULATED" sources={["SIM_MOBILITY", "SIM_SMALL_AREA"]} />
        <Kpi label={L("Public transport share", "حصة النقل العام")} value={fmtPct(withBrt.transitShare)} sub={`${L("without new lines", "دون خطوط جديدة")} ${fmtPct(noBrt.transitShare)}`} tone={withBrt.transitShare > noBrt.transitShare + 0.005 ? "ok" : undefined} nature="SIMULATED" />
        <Kpi label={L("Mean commute", "متوسط الرحلة")} value={`${fmtInt(withBrt.meanMinutes)} min`} sub={`${fmt1(withBrt.meanKm)} km · ${L("base", "الأساس")} ${fmtInt(base.meanMinutes)} min`} nature="SIMULATED" />
        <Kpi label={L("Links over capacity", "روابط فوق الطاقة")} value={fmtInt(over(withBrt))} sub={`${L("base", "الأساس")} ${over(base)} · ${L("no lines", "دون خطوط")} ${over(noBrt)}`} tone={over(withBrt) > over(base) ? "crit" : undefined} nature="SIMULATED" />
        <Kpi label={L("Car-km per day", "كم-سيارة يومياً")} value={fmtCompact(withBrt.carKmDay, locale)} sub={`${fmtSigned(withBrt.carKmDay - noBrt.carKmDay)} ${L("vs no lines", "مقابل دون خطوط")}`} nature="SIMULATED" />
        <Kpi label={L("CO₂ from commuting", "انبعاثات التنقل")} value={`${fmtCompact(withBrt.co2TonsYear, locale)} t`} sub={`${fmtSigned(withBrt.co2TonsYear - noBrt.co2TonsYear)} t/${L("yr", "سنة")}`} tone={withBrt.co2TonsYear < noBrt.co2TonsYear ? "ok" : undefined} nature="SIMULATED" />
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-3">
          <Panel title={L("Rapid-transit corridors", "محاور النقل السريع")} subtitle={L("Dedicated lanes, 32 km/h, 4-minute wait", "مسارات مخصصة، 32 كم/س، انتظار 4 دقائق")} nature="SIMULATED" sources={["SIM_MOBILITY"]}>
            <div className="space-y-1.5">
              {CORRIDORS.map((c) => (
                <label key={c.id} className={cn("flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-[12.5px]", p.corridors.includes(c.id) ? "border-[#8a5cc0]/50 bg-[#8a5cc0]/8 text-ink-900" : "border-line text-ink-700")}>
                  <input type="checkbox" checked={p.corridors.includes(c.id)} onChange={() => toggle(c.id)} className="h-3.5 w-3.5 accent-[#8a5cc0]" />
                  {tx(c.name)}
                </label>
              ))}
            </div>
          </Panel>
          <Panel title={t("assumptions")} nature="SIMULATED" actions={<Button size="xs" onClick={() => setP({ ...DEFAULT_MOBILITY, corridors: p.corridors })}>{t("reset")}</Button>}>
            <div className="space-y-3.5">
              <Slider label={L("Distance sensitivity (β)", "الحساسية للمسافة (β)")} value={p.beta} min={0.02} max={0.09} step={0.005} onChange={(v) => set("beta", v)} format={(v) => v.toFixed(3)} hint={L("Higher = shorter commutes.", "الأعلى = رحلات أقصر.")} />
              <Slider label={L("Public transport share today", "حصة النقل العام اليوم")} value={p.baseTransitShare} min={0.08} max={0.45} step={0.01} onChange={(v) => set("baseTransitShare", v)} format={(v) => fmtPct(v, 0)} hint={L("Calibration target (assumption).", "هدف المعايرة (افتراض).")} />
              <Slider label={L("Fare", "الأجرة")} value={p.fare} min={0} max={2} step={0.05} onChange={(v) => set("fare", v)} format={(v) => `${v.toFixed(2)} JOD`} />
              <Slider label={L("Car running cost", "كلفة تشغيل السيارة")} value={p.carCostPerKm} min={0.05} max={0.4} step={0.01} onChange={(v) => set("carCostPerKm", v)} format={(v) => `${v.toFixed(2)} JOD/km`} />
            </div>
          </Panel>
        </div>
        <div className="min-w-0 space-y-3">
          <JordanMap
            height={540}
            title={layer === "congestion" ? `${L("Peak-hour congestion", "الازدحام في ساعة الذروة")} ${year}` : `${L("Largest commuter flows", "أكبر تدفقات التنقل")} ${year}`}
            fitTo={[35.4, 30.9, 36.6, 32.75]}
            lines={lines}
            layers={[{ value: "congestion", label: L("Network congestion (V/C)", "ازدحام الشبكة (حجم/طاقة)") }, { value: "flows", label: L("Top commuter flows", "أكبر تدفقات التنقل") }]}
            layer={layer}
            onLayerChange={(v) => setLayer(v as "congestion" | "flows")}
            legendExtra={layer === "congestion" ? [{ color: "#1f8a3b", label: "< 0.7" }, { color: "#d4a017", label: "0.7–0.9" }, { color: "#d07a1c", label: "0.9–1.1" }, { color: "#b5453a", label: "≥ 1.1" }, { color: "#8a5cc0", label: L("Rapid transit", "نقل سريع") }] : [{ color: "#2f62a6", label: L("Width = daily trips", "العرض = الرحلات اليومية") }]}
            sources={["SIM_MOBILITY", "GEO_ADM2"]}
          />
          <div className="grid gap-3 lg:grid-cols-2">
            <Panel title={L("What the selected corridors change", "ما تغيّره المحاور المختارة")} subtitle={`${year} · ${L("vs the same year without new lines", "مقابل السنة نفسها دون خطوط جديدة")}`} nature="SIMULATED" sources={["SIM_MOBILITY"]}>
              {p.corridors.length === 0 ? <p className="py-4 text-[12.5px] text-ink-500">{L("Select one or more corridors.", "اختر محوراً واحداً أو أكثر.")}</p> : (
                <SimpleTable minWidth={320} head={[L("Indicator", "المؤشر"), L("Change", "التغير")]} rows={[
                  [L("Public-transport riders on corridors / day", "ركاب النقل العام على المحاور يومياً"), fmtInt(ridersBrt)],
                  [L("Public transport share", "حصة النقل العام"), `${fmtPct(noBrt.transitShare)} → ${fmtPct(withBrt.transitShare)}`],
                  [L("Car-km per day", "كم-سيارة يومياً"), fmtSigned(withBrt.carKmDay - noBrt.carKmDay)],
                  [L("Vehicle-hours per day", "ساعات-مركبة يومياً"), fmtSigned(withBrt.vehHoursDay - noBrt.vehHoursDay)],
                  [L("CO₂ per year (t)", "ثاني أكسيد الكربون سنوياً (طن)"), fmtSigned(withBrt.co2TonsYear - noBrt.co2TonsYear)],
                  [L("Links over capacity", "روابط فوق الطاقة"), `${over(noBrt)} → ${over(withBrt)}`],
                ]} />
              )}
            </Panel>
            <Panel title={L("Largest flows between districts", "أكبر التدفقات بين الألوية")} nature="SIMULATED">
              <SimpleTable minWidth={340} head={[L("Between", "بين"), L("Trips / day", "رحلات/يوم"), L("Transit", "نقل عام")]} rows={withBrt.topFlows.slice(0, 8).map((f) => [<span key="n">{dName(f.from)} ↔ {dName(f.to)}</span>, fmtInt(f.trips), fmtPct(f.transitShare, 0)])} />
            </Panel>
          </div>
        </div>
      </div>
      <Callout tone="sim" className="mt-3">{L("Links connect district centres — they are not the road network. Behavioural parameters, the base public-transport share and capacities are calibration assumptions. Use for corridor comparison, not traffic engineering.", "تربط الروابط مراكز الألوية — وليست شبكة الطرق. المعاملات السلوكية وحصة النقل العام الأساسية والطاقات افتراضات معايرة. يُستخدم لمقارنة المحاور لا لهندسة المرور.")}</Callout>
      <Method>
        <Formula>{"T_ij = workers_i × jobs_j e^(−β t_ij) ÷ Σ_k jobs_k e^(−β t_ik)          jobs_j ∝ pop_j^1.15 × (2.2 if governorate seat)"}</Formula>
        <Formula>{"P(PT) = 1 ÷ (1 + e^(U_car − U_pt)),  U_car = −0.03 t − 0.25 cost,  U_pt = ASC − 0.03 (t + wait) − 0.25 fare"}</Formula>
        <Formula>{"t = t₀ (1 + 0.15 (V/C)⁴)   ·   peak hour = 25% of one-way trips ÷ 1.3 occupancy   ·   CO₂ = car-km × 0.18 kg × 250 days"}</Formula>
      </Method>
    </div>
  );
}
