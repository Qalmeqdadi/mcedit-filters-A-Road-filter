"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader, Panel, Callout } from "@/components/ui/panel";
import { Kpi } from "@/components/ui/kpi";
import { Button } from "@/components/ui/button";
import { Segmented, Slider } from "@/components/ui/form";
import { EChart } from "@/components/charts/echart";
import { barV, line, VIZ } from "@/components/charts/builders";
import { JordanMap, type MapPolygon } from "@/features/gis/JordanMap";
import { buildGrid, cellPolygon, CELL_H, CELL_W, GROWTH_REGIONS, POLICIES, simulateGrowth, type GrowthPolicy } from "@/simulation/lab/urbanGrowth";
import { downloadCsv } from "@/lib/csv";
import { navIndex } from "@/lib/nav";
import { fmt1, fmtInt, fmtPct } from "@/lib/format";
import { AreaActions } from "./ActionCard";
import { Formula, LabBar, Method, SimpleTable, useLab } from "./shared";

const POLICY_KEYS: GrowthPolicy[] = ["COMPACT", "TREND", "SPRAWL"];
const PERIOD = [
  { to: 2030, color: "#4a7cc0" },
  { to: 2040, color: "#d07a1c" },
  { to: 2050, color: "#b5453a" },
];

export function UrbanGrowth() {
  const { world, areaFor, baseYear, year, scenarioName } = useLab();
  const { t, tx, L, ar } = useI18n();
  const [regionId, setRegion] = useState("AMMAN");
  const [policy, setPolicy] = useState<GrowthPolicy>("TREND");
  const [greenBelt, setGreenBelt] = useState(false);
  const [boundary, setBoundary] = useState(0);
  const [layer, setLayer] = useState<"extent" | "pressure">("extent");
  const grid = useMemo(() => buildGrid(world, regionId), [world, regionId]);
  const opts = useMemo(() => ({ greenBelt, boundaryKm: boundary > 0 ? boundary : null }), [greenBelt, boundary]);
  const runs = useMemo(() => Object.fromEntries(POLICY_KEYS.map((p) => [p, simulateGrowth(world, grid, areaFor, baseYear, 2050, { policy: p, ...opts })])) as Record<GrowthPolicy, ReturnType<typeof simulateGrowth>>, [world, grid, areaFor, baseYear, opts]);
  const res = runs[policy];
  const at = (y: number) => res.series.find((s) => s.year === y) ?? res.series[res.series.length - 1];
  const s0 = res.series[0];
  const sy = at(year);
  const policyName = (p: GrowthPolicy) => (p === "COMPACT" ? L("Compact city", "مدينة متراصة") : p === "TREND" ? L("Current trend", "الاتجاه الحالي") : L("Dispersed growth", "نمو متشتت"));

  const polygons = useMemo<MapPolygon[]>(() => {
    const out: MapPolygon[] = [];
    const N = grid.nx * grid.ny;
    if (layer === "extent") {
      for (let i = 0; i < N; i++) {
        const y = res.yearUrban[i];
        if (res.protectedMask[i] === 1) out.push({ coords: cellPolygon(grid, i), color: "#1f8a3b", opacity: 0.16 });
        if (!y || y > year) continue;
        const color = y === baseYear ? "#22406b" : PERIOD.find((p) => y <= p.to)!.color;
        out.push({ coords: cellPolygon(grid, i), color, opacity: y === baseYear ? 0.5 : 0.78 });
      }
    } else {
      const vals: number[] = [];
      for (let i = 0; i < N; i++) if (res.potential[i] > 0) vals.push(res.potential[i]);
      vals.sort((a, b) => a - b);
      const q = (p: number) => vals[Math.floor(p * (vals.length - 1))] ?? 0;
      const breaks = [q(0.7), q(0.85), q(0.95)];
      const colors = ["#f4d9c6", "#e08a66", "#b5453a"];
      for (let i = 0; i < N; i++) {
        if (res.yearUrban[i]) out.push({ coords: cellPolygon(grid, i), color: "#22406b", opacity: 0.35 });
        else if (res.potential[i] >= breaks[0]) {
          const k = res.potential[i] >= breaks[2] ? 2 : res.potential[i] >= breaks[1] ? 1 : 0;
          out.push({ coords: cellPolygon(grid, i), color: colors[k], opacity: 0.75 });
        }
      }
    }
    return out;
  }, [grid, res, year, baseYear, layer]);
  const fit: [number, number, number, number] = [grid.x0, grid.y0, grid.x0 + grid.nx * CELL_W, grid.y0 + grid.ny * CELL_H];

  const years = res.series.map((s) => s.year);
  const areaChart = useMemo(() => line(years, POLICY_KEYS.map((p, i) => ({ name: policyName(p), data: runs[p].series.map((s) => Math.round(s.urbanKm2)), color: [VIZ[2], VIZ[0], VIZ[5]][i] })), { rtl: ar, fmt: (v) => `${fmtInt(v)} km²`, markX: year }), [runs, years, ar, year]); // eslint-disable-line react-hooks/exhaustive-deps
  const costChart = useMemo(() => barV(POLICY_KEYS.map(policyName), [{ name: L("Infrastructure cost to 2050 (JOD M)", "كلفة البنية التحتية حتى 2050 (مليون دينار)"), data: POLICY_KEYS.map((p) => Math.round(runs[p].totals.costM)), color: VIZ[1] }], { rtl: ar, fmt: (v) => `${fmtInt(v)}M` }), [runs, ar]); // eslint-disable-line react-hooks/exhaustive-deps

  const exportCsv = () =>
    downloadCsv(`urban-growth-${regionId.toLowerCase()}.csv`, POLICY_KEYS.flatMap((p) => runs[p].series.map((s) => ({ region: regionId, policy: p, year: s.year, urban_km2: s.urbanKm2.toFixed(1), new_km2: s.newKm2.toFixed(2), population: Math.round(s.population), density_per_km2: Math.round(s.density), mean_distance_to_centre_km: s.meanDistKm.toFixed(2), road_km_cum: s.roadKm.toFixed(1), pipe_km_cum: s.pipeKm.toFixed(1), cost_jod_m_cum: s.costM.toFixed(0), green_belt: greenBelt, growth_boundary_km: boundary || "", scenario: scenarioName, data_nature: "SIMULATED" }))));

  const region = GROWTH_REGIONS.find((r) => r.id === regionId)!;
  return (
    <div>
      <PageHeader index={navIndex("/urban-growth")} title={t("navGrowth")} subtitle={L("Where will the cities grow to 2050, and what does each growth pattern cost? A constrained cellular-automaton model converts land to urban use year by year to house the projected population, under compact, trend or dispersed policies and optional green-belt and growth-boundary controls.", "إلى أين ستتوسع المدن حتى 2050، وما كلفة كل نمط نمو؟ يحوّل نموذج الخلايا الذاتية المقيد الأرض إلى استخدام حضري سنة بسنة لإسكان السكان المسقطين، ضمن سياسات المدينة المتراصة أو الاتجاه الحالي أو النمو المتشتت، مع خيار الحزام الأخضر وحد النمو العمراني.")}>
        <Button onClick={exportCsv}>{t("exportCsv")}</Button>
      </PageHeader>
      <LabBar />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Segmented value={regionId} onChange={setRegion} options={GROWTH_REGIONS.map((r) => ({ value: r.id, label: tx(r.name).split(" – ")[0] }))} />
        <Segmented value={policy} onChange={setPolicy} options={POLICY_KEYS.map((p) => ({ value: p, label: policyName(p) }))} />
      </div>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label={`${L("Urban area", "المساحة الحضرية")} ${year}`} value={`${fmtInt(sy.urbanKm2)} km²`} sub={`${L("base", "الأساس")} ${fmtInt(s0.urbanKm2)} km²`} nature="SIMULATED" sources={["SIM_URBAN_CA"]} />
        <Kpi label={L("New urban land", "أرض حضرية جديدة")} value={`+${fmtInt(sy.urbanKm2 - s0.urbanKm2)} km²`} sub={fmtPct(sy.urbanKm2 / s0.urbanKm2 - 1, 0)} tone={sy.urbanKm2 / s0.urbanKm2 > 1.6 ? "warn" : undefined} nature="SIMULATED" />
        <Kpi label={L("Population density", "الكثافة السكانية")} value={fmtInt(sy.density)} sub={`${L("persons / km² · base", "نسمة/كم² · الأساس")} ${fmtInt(s0.density)}`} nature="SIMULATED" />
        <Kpi label={L("Mean distance to centre", "متوسط البعد عن المركز")} value={`${fmt1(sy.meanDistKm)} km`} sub={`${L("base", "الأساس")} ${fmt1(s0.meanDistKm)} km`} nature="SIMULATED" />
        <Kpi label={L("Roads + pipes to build", "طرق وأنابيب لازمة")} value={`${fmtInt(sy.roadKm)} km`} sub={`+ ${fmtInt(sy.pipeKm)} km ${L("pipes", "أنابيب")}`} nature="SIMULATED" />
        <Kpi label={L("Infrastructure cost", "كلفة البنية التحتية")} value={`${fmt1(sy.costM / 1000)}bn`} sub={`JOD · ${L("fragmented", "متشتت")} ${fmtPct(res.totals.leapfrogShare, 0)}`} tone={policy === "SPRAWL" ? "crit" : undefined} nature="SIMULATED" />
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
        <JordanMap
          height={560}
          title={`${tx(region.name)} — ${layer === "extent" ? L("urban extent to", "الامتداد الحضري حتى") + " " + year : L("development pressure", "ضغط التطوير")}`}
          fitTo={fit}
          polygons={polygons}
          layers={[{ value: "extent", label: L("Urban extent by period", "الامتداد الحضري حسب الفترة") }, { value: "pressure", label: L("Development pressure (2050)", "ضغط التطوير (2050)") }]}
          layer={layer}
          onLayerChange={(v) => setLayer(v as "extent" | "pressure")}
          legendExtra={layer === "extent" ? [{ color: "#22406b", label: `${L("Urban", "حضري")} ${baseYear}` }, { color: "#4a7cc0", label: `${baseYear + 1}–2030` }, { color: "#d07a1c", label: "2031–2040" }, { color: "#b5453a", label: "2041–2050" }, ...(greenBelt ? [{ color: "#1f8a3b", label: L("Green belt", "الحزام الأخضر") }] : [])] : [{ color: "#f4d9c6", label: L("Top 30%", "أعلى 30%") }, { color: "#e08a66", label: L("Top 15%", "أعلى 15%") }, { color: "#b5453a", label: L("Top 5%", "أعلى 5%") }]}
          sources={["SIM_URBAN_CA", "SIM_SMALL_AREA"]}
          showLabelsDefault={false}
        />
        <div className="space-y-3">
          <Panel title={L("Planning instruments", "أدوات التخطيط")} nature="SIMULATED" sources={["SIM_URBAN_CA"]}>
            <div className="space-y-3.5">
              <label className="flex items-center justify-between gap-2 text-[12.5px] font-medium text-ink-700">
                {L("Green belt ring", "حزام أخضر دائري")}
                <input type="checkbox" checked={greenBelt} onChange={(e) => setGreenBelt(e.target.checked)} className="h-4 w-4 accent-navy-600" />
              </label>
              <p className="-mt-2 text-[11.5px] text-ink-500">{L(`Non-developable ring ${fmt1(grid.r90 + 1.5)}–${fmt1(grid.r90 + 4.5)} km from the centre.`, `حلقة غير قابلة للبناء على بعد ${fmt1(grid.r90 + 1.5)}–${fmt1(grid.r90 + 4.5)} كم من المركز.`)}</p>
              <Slider label={L("Urban growth boundary", "حد النمو العمراني")} value={boundary} min={0} max={8} step={0.5} onChange={setBoundary} format={(v) => (v > 0 ? `${fmt1(v)} km ${L("beyond today's edge", "من الحافة الحالية")}` : L("off", "متوقف"))} />
              <div className="rounded-md bg-sand-50 px-3 py-2 text-[12px] text-ink-700">
                <div className="font-semibold text-ink-900">{policyName(policy)}</div>
                <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 tabular">
                  <span>{L("New-area density", "كثافة المناطق الجديدة")}</span><span className="text-end">{fmtInt(POLICIES[policy].density)}/km²</span>
                  <span>{L("Infill share", "نسبة التكثيف")}</span><span className="text-end">{fmtPct(POLICIES[policy].infill, 0)}</span>
                  <span>{L("Pull of corridors", "جاذبية المحاور")}</span><span className="text-end">{fmt1(POLICIES[policy].wRoad)}</span>
                </div>
              </div>
            </div>
          </Panel>
          <Panel title={L("Urban area by policy", "المساحة الحضرية حسب السياسة")} nature="SIMULATED"><EChart option={areaChart} height={210} /></Panel>
        </div>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Panel title={L("Policy comparison to 2050", "مقارنة السياسات حتى 2050")} subtitle={`${tx(region.name)} · ${scenarioName}`} nature="SIMULATED" sources={["SIM_URBAN_CA"]}>
          <SimpleTable
            minWidth={640}
            highlight={(i) => POLICY_KEYS[i] === policy}
            head={[L("Policy", "السياسة"), L("New land", "أرض جديدة"), L("Density 2050", "الكثافة 2050"), L("Distance to centre", "البعد عن المركز"), L("Road km", "كم طرق"), L("Cost (JOD M)", "الكلفة (مليون دينار)"), L("Fragmented", "متشتت")]}
            rows={POLICY_KEYS.map((p) => {
              const r = runs[p];
              const e = r.series[r.series.length - 1];
              return [<b key="p">{policyName(p)}</b>, `${fmtInt(r.totals.newKm2)} km²`, fmtInt(e.density), `${fmt1(e.meanDistKm)} km`, fmtInt(r.totals.roadKm), fmtInt(r.totals.costM), fmtPct(r.totals.leapfrogShare, 0)];
            })}
          />
          <p className="mt-2 text-[12px] text-ink-500">{L(`Compact growth houses the same people on ${fmtPct(1 - runs.COMPACT.totals.newKm2 / Math.max(1, runs.SPRAWL.totals.newKm2), 0)} less new land than dispersed growth and saves about JOD ${fmtInt(runs.SPRAWL.totals.costM - runs.COMPACT.totals.costM)}M in network infrastructure.`, `يُسكن النمو المتراص العدد نفسه من السكان على أرض جديدة أقل بنسبة ${fmtPct(1 - runs.COMPACT.totals.newKm2 / Math.max(1, runs.SPRAWL.totals.newKm2), 0)} من النمو المتشتت ويوفر نحو ${fmtInt(runs.SPRAWL.totals.costM - runs.COMPACT.totals.costM)} مليون دينار في البنية التحتية الشبكية.`)}</p>
        </Panel>
        <Panel title={L("Network infrastructure cost", "كلفة البنية التحتية الشبكية")} nature="SIMULATED"><EChart option={costChart} height={220} /></Panel>
      </div>
      <Callout tone="sim" className="mt-3">{L("Illustrative land-use model: corridors are the schematic district network (not roads), there is no terrain, land-ownership or zoning data, and unit costs are assumptions. Use it to compare growth policies, not to predict individual parcels.", "نموذج استخدام أراضٍ توضيحي: المحاور هي الشبكة التخطيطية للألوية (وليست طرقاً)، ولا تتوفر بيانات التضاريس أو ملكية الأراضي أو التنظيم، وتكاليف الوحدة افتراضات. استخدمه لمقارنة سياسات النمو لا للتنبؤ بقطع أراضٍ بعينها.")}</Callout>
      <AreaActions sectors={["URBAN"]} />
      <Method>
        <Formula>{"greenfield km² per year = Δpopulation × (1 − infill share) ÷ new-area density"}</Formula>
        <Formula>{"P(cell) = (N + f)^wN · e^(−d_corridor / 3 km · wRoad) · e^(−d_centre / λ) · (1 + ε)"}</Formula>
        <Formula>{"road km = new km² × (8 + 6 × fragmented)  ·  pipe km = 0.8 × road km  ·  cost = road km × 1.1 + pipe km × 0.5 (JOD M)"}</Formula>
        <p>{L("Cells are about 0.7 × 0.66 km. Base-year urban cells are those whose kernel-smoothed synthetic population density is at least 2,500 persons/km². Each year the highest-potential cells convert until the land demand of that year is met. N is the urban share of the 5 × 5 neighbourhood; f lets dispersed policies leapfrog; ε is seeded noise. A cell is “fragmented” when fewer than 2 of its 24 neighbours are already urban.", "الخلية نحو 0.7 × 0.66 كم. خلايا سنة الأساس الحضرية هي التي تبلغ كثافتها السكانية الاصطناعية المنعّمة 2,500 نسمة/كم² على الأقل. تتحول كل سنة الخلايا الأعلى إمكانية حتى يُلبّى طلب الأرض لتلك السنة. N نسبة الخلايا الحضرية في الجوار 5 × 5؛ و f يتيح القفز في السياسات المتشتتة؛ و ε ضوضاء مبذورة. تُعد الخلية «متشتتة» إذا كان أقل من 2 من جيرانها الـ24 حضرياً.")}</p>
      </Method>
    </div>
  );
}
