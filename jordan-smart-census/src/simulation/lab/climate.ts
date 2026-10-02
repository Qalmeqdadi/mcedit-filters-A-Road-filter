/**
 * Climate risk exposure — heat and flash floods (SIMULATED hazard, census-based vulnerability).
 *
 * Hazard (illustrative classes, NOT observed climatology):
 *   lowland (Jordan Valley / Dead Sea / Aqaba / Wadi Araba), desert (large eastern & southern districts),
 *   highland (others). Days above 40 °C per year: 45 / 25 / 4 at baseline, +14 / +10 / +4 per °C of warming.
 * Vulnerability (synthetic census microdata, governorate or district scope):
 *   share 65+, share under 5, households without AC or evaporative cooling, outdoor workers
 *   (agriculture + construction), functional difficulty, tents / caravans — min–max normalised and averaged.
 * Heat risk  = ∛(hazard × exposure × vulnerability)  (INFORM-style geometric mean, each 0..1)
 * People at heat risk = population × min(1, hot days ÷ 45) × (1 − (1 − s₆₅)(1 − s₅)(1 − s_noAC))
 * Flash floods: synthetic flood-susceptible EA flags (valley districts, Wadi Musa, central Amman) —
 *   replace with the national flood hazard map. Exposure = population in flagged EAs.
 */
import type { L } from "@/types/census";
import type { World } from "../generate";
import { computeProfile } from "../analytics";
import { km, labRng, type SmallArea } from "./common";

export type HeatClass = "LOWLAND" | "DESERT" | "HIGHLAND";

const LOWLAND_HINTS = ["Ghor", "Shuna", "Aqaba", "Araba", "Deir Alla", "Safi", "Quwayra"];
export const HOT_DAYS: Record<HeatClass, { base: number; perDegree: number }> = {
  LOWLAND: { base: 45, perDegree: 14 },
  DESERT: { base: 25, perDegree: 10 },
  HIGHLAND: { base: 4, perDegree: 4 },
};

export interface ClimateParams {
  warming: number;
  coolingCentreReach: number;
}

export const DEFAULT_CLIMATE: ClimateParams = { warming: 1.5, coolingCentreReach: 20000 };

export interface DistrictClimate {
  id: string;
  cls: HeatClass;
  hotDaysBase: number;
  hotDays: number;
  pop: number;
  s65: number;
  s5: number;
  noAC: number;
  outdoor: number;
  disability: number;
  inadequate: number;
  vulnerability: number;
  heatRisk: number;
  atRisk: number;
  floodExposed: number;
  floodEAs: number;
  coolingCentres: number;
}

export interface ClimateResult {
  params: ClimateParams;
  districts: DistrictClimate[];
  floodPoints: { id: string; lng: number; lat: number; pop: number; districtId: string }[];
  totals: { atRisk: number; floodExposed: number; coolingCentres: number; hotDaysPopWeighted: number };
  actions: { districtId: string; kind: "HEAT" | "FLOOD"; text: L; priority: number }[];
}

export function heatClass(world: World, districtId: string): HeatClass {
  const d = world.district[districtId];
  if (d.govId === "AQB" || LOWLAND_HINTS.some((h) => d.name.en.includes(h))) return "LOWLAND";
  if (d.areaKm2 > 2000 || d.label[0] > 36.6) return "DESERT";
  return "HIGHLAND";
}

const floodCache = new WeakMap<World, Set<string>>();
export function floodEAs(world: World): Set<string> {
  const hit = floodCache.get(world);
  if (hit) return hit;
  const rng = labRng(world, "flood-flags");
  const amm = world.gov.AMM.capitalPoint;
  const out = new Set<string>();
  for (const e of world.eas) {
    const d = world.district[e.districtId];
    let p = 0.015;
    if (heatClass(world, d.id) === "LOWLAND") p = 0.12;
    if (d.name.en.includes("Petra")) p = 0.2;
    if (e.districtId === "AMM-D01" && km(e.lng, e.lat, amm[0], amm[1]) < 2) p = 0.3;
    if (rng.chance(p)) out.add(e.id);
  }
  floodCache.set(world, out);
  return out;
}

export function assessClimate(world: World, sa: SmallArea, p: ClimateParams): ClimateResult {
  const flags = floodEAs(world);
  const rows: DistrictClimate[] = [];
  const floodPoints: ClimateResult["floodPoints"] = [];
  for (const d of world.districts) {
    const cls = heatClass(world, d.id);
    const dp = computeProfile(world, { districtId: d.id });
    const prof = dp.households >= 80 * 4 ? dp : computeProfile(world, { govId: d.govId });
    const h = Math.max(1, prof.households);
    const pop = Math.max(1, prof.population);
    const wa = Math.max(1, prof.groups.a15_64);
    const st = sa.district[d.id];
    const growth = st.pop / Math.max(1, sa.base.district[d.id].pop);
    let fe = 0;
    let fn = 0;
    for (const e of world.eas) {
      if (e.districtId !== d.id || !flags.has(e.id)) continue;
      fe += e.popEstimate * growth;
      fn++;
      floodPoints.push({ id: e.id, lng: e.lng, lat: e.lat, pop: e.popEstimate * growth, districtId: d.id });
    }
    const hz = HOT_DAYS[cls];
    rows.push({
      id: d.id,
      cls,
      hotDaysBase: hz.base,
      hotDays: hz.base + hz.perDegree * p.warming,
      pop: st.pop,
      s65: st.a65 / Math.max(1, st.pop),
      s5: st.a0_5 / Math.max(1, st.pop),
      noAC: (prof.housing.cooling.NONE + prof.housing.cooling.FANS) / h,
      outdoor: (prof.labour.sector.AGRICULTURE + prof.labour.sector.CONSTRUCTION) / wa,
      disability: prof.health.disability / Math.max(1, prof.health.pop5plus),
      inadequate: prof.housing.type.TENT_CARAVAN / h,
      vulnerability: 0,
      heatRisk: 0,
      atRisk: 0,
      floodExposed: fe,
      floodEAs: fn,
      coolingCentres: 0,
    });
    void pop;
  }
  const norm = (k: keyof DistrictClimate) => {
    const v = rows.map((r) => r[k] as number);
    const lo = Math.min(...v);
    const hi = Math.max(...v);
    return (x: number) => (hi > lo ? (x - lo) / (hi - lo) : 0.5);
  };
  const n65 = norm("s65");
  const n5 = norm("s5");
  const nAC = norm("noAC");
  const nOut = norm("outdoor");
  const nDis = norm("disability");
  const nInad = norm("inadequate");
  const maxDays = Math.max(...rows.map((r) => r.hotDays));
  const maxPop = Math.max(...rows.map((r) => r.pop));
  for (const r of rows) {
    r.vulnerability = (n65(r.s65) + n5(r.s5) + nAC(r.noAC) + nOut(r.outdoor) + nDis(r.disability) + nInad(r.inadequate)) / 6;
    const hazard = r.hotDays / maxDays;
    const exposure = Math.sqrt(r.pop / maxPop);
    r.heatRisk = Math.cbrt(Math.max(0, hazard) * exposure * Math.max(0.02, r.vulnerability));
    r.atRisk = r.pop * Math.min(1, r.hotDays / 45) * (1 - (1 - r.s65) * (1 - r.s5) * (1 - r.noAC * 0.6));
    r.coolingCentres = r.hotDays >= 20 ? Math.ceil(r.atRisk / p.coolingCentreReach) : 0;
  }
  const actions: ClimateResult["actions"] = [];
  const ranked = [...rows].sort((a, b) => b.heatRisk - a.heatRisk);
  for (const r of ranked.slice(0, 8)) {
    const d = world.district[r.id];
    actions.push({ districtId: r.id, kind: "HEAT", priority: r.heatRisk, text: { en: `${d.name.en}: ${Math.round(r.hotDays)} days > 40 °C in this scenario; ${Math.round(r.atRisk).toLocaleString("en-US")} people at heat risk — ${r.coolingCentres} cooling centres, heat-health alerts for the 65+ and outdoor-work hour limits.`, ar: `${d.name.ar}: ${Math.round(r.hotDays)} يوماً فوق 40 درجة مئوية في هذا السيناريو؛ ${Math.round(r.atRisk).toLocaleString("en-US")} شخصاً معرضون لخطر الحر — ${r.coolingCentres} مراكز تبريد، وتنبيهات صحية لكبار السن، وتحديد ساعات العمل في الخارج.` } });
  }
  for (const r of [...rows].sort((a, b) => b.floodExposed - a.floodExposed).slice(0, 4)) {
    if (r.floodExposed <= 0) continue;
    const d = world.district[r.id];
    actions.push({ districtId: r.id, kind: "FLOOD", priority: 0.5, text: { en: `${d.name.en}: ${r.floodEAs} flood-susceptible EAs (${Math.round(r.floodExposed).toLocaleString("en-US")} residents) — flash-flood early warning, drainage maintenance before the rainy season.`, ar: `${d.name.ar}: ${r.floodEAs} منطقة عدّ معرضة للسيول (${Math.round(r.floodExposed).toLocaleString("en-US")} ساكن) — إنذار مبكر من السيول المفاجئة وصيانة التصريف قبل موسم الأمطار.` } });
  }
  const totalPop = rows.reduce((s, r) => s + r.pop, 0);
  return {
    params: p,
    districts: rows,
    floodPoints,
    totals: { atRisk: rows.reduce((s, r) => s + r.atRisk, 0), floodExposed: rows.reduce((s, r) => s + r.floodExposed, 0), coolingCentres: rows.reduce((s, r) => s + r.coolingCentres, 0), hotDaysPopWeighted: rows.reduce((s, r) => s + r.hotDays * r.pop, 0) / Math.max(1, totalPop) },
    actions,
  };
}
