/**
 * Facility siting & service-gap model (SIMULATED).
 *
 * Demand    — schools: node population × district share aged 6–17 × enrolment (0.95)
 *             primary health centres & hospitals: node population
 * Supply    — a synthetic facility inventory generated from the census frame (seeded). Rural
 *             districts are deliberately under-provided so gaps are visible. It is NOT the
 *             Ministry of Education / Ministry of Health facility register.
 * Access    — a node is "within reach" if the nearest facility is within the access standard
 *             (urban / rural radius, adjustable).
 * Capacity  — district demand vs. the capacity of facilities located in that district.
 * Optimiser — greedy maximal-covering heuristic with capacity:
 *               score(c) = α · min(C, uncovered demand within reach of c)
 *                        + (1 − α) · min(C, remaining capacity gap of c's district)
 *             The best candidate is picked, coverage and gaps are updated, and the loop repeats.
 *             Every pick records the two terms so the choice is explainable.
 */
import type { GovId, L } from "@/types/census";
import type { World } from "../generate";
import { demandNodes, GridIndex, km, labRng, nodePopulations, type DemandNode, type SmallArea } from "./common";

export type FacilityKind = "SCHOOL" | "PHC" | "HOSPITAL";

export interface FacilityNorms {
  /** capacity in demand units (students for schools, residents for PHC / hospital catchment) */
  capacity: number;
  radiusUrban: number;
  radiusRural: number;
  /** capital cost per facility, JOD million (illustrative assumption) */
  costM: number;
}

export const DEFAULT_NORMS: Record<FacilityKind, FacilityNorms> = {
  SCHOOL: { capacity: 640, radiusUrban: 2, radiusRural: 5, costM: 3.2 },
  PHC: { capacity: 15000, radiusUrban: 3, radiusRural: 8, costM: 1.4 },
  // 150 beds at 1.8 beds / 1,000 residents ≈ 83,000-resident catchment
  HOSPITAL: { capacity: 83000, radiusUrban: 20, radiusRural: 40, costM: 45 },
};

export const SCHOOL_ENROLMENT = 0.95;

export interface Facility {
  id: string;
  kind: FacilityKind;
  lng: number;
  lat: number;
  govId: GovId;
  districtId: string;
  capacity: number;
  proposed?: boolean;
  /** why the optimiser picked it */
  reason?: L;
  gainAccess?: number;
  gainCapacity?: number;
  manual?: boolean;
}

// ------------------------------------------------------------------ synthetic inventory

const invCache = new WeakMap<World, Record<FacilityKind, Facility[]>>();

export function facilityInventory(world: World, sa0: SmallArea): Record<FacilityKind, Facility[]> {
  const hit = invCache.get(world);
  if (hit) return hit;
  const nodes = demandNodes(world);
  const out: Record<FacilityKind, Facility[]> = { SCHOOL: [], PHC: [], HOSPITAL: [] };
  const byDistrict = new Map<string, DemandNode[]>();
  for (const n of nodes) (byDistrict.get(n.districtId) ?? byDistrict.set(n.districtId, []).get(n.districtId)!).push(n);
  for (const d of world.districts) {
    const rng = labRng(world, "inventory", d.id);
    const ns = byDistrict.get(d.id) ?? [];
    if (!ns.length) continue;
    const st = sa0.district[d.id];
    const urban = d.urbanShare >= 0.7;
    // provision factor: rural districts tend to be under-provided in this synthetic inventory
    const f = urban ? rng.range(0.9, 1.12) : rng.range(0.7, 1.02);
    const place = (kind: FacilityKind, count: number, cap: () => number, w: (n: DemandNode) => number) => {
      for (let i = 0; i < count; i++) {
        const n = rng.weighted(ns, ns.map(w));
        out[kind].push({ id: `${kind[0]}-${d.id}-${i + 1}`, kind, lng: n.lng + rng.normal(0, 0.003), lat: n.lat + rng.normal(0, 0.003), govId: d.govId, districtId: d.id, capacity: Math.round(cap()) });
      }
    };
    const students = st.a6_17 * SCHOOL_ENROLMENT;
    const avgSchool = urban ? 720 : 300;
    place("SCHOOL", Math.max(1, Math.round((students * f) / avgSchool)), () => avgSchool * rng.range(0.7, 1.3), (n) => Math.pow(n.basePop, 0.6));
    const avgPhc = urban ? 17000 : 8000;
    place("PHC", Math.max(1, Math.round((st.pop * f) / avgPhc)), () => avgPhc * rng.range(0.85, 1.15), (n) => Math.pow(n.basePop, 0.75));
  }
  // hospitals: governorate level, sited in the largest nodes
  for (const g of world.governorates) {
    const rng = labRng(world, "hospitals", g.id);
    const pop = sa0.gov[g.id].pop;
    const count = Math.max(1, Math.round((pop * rng.range(0.78, 1.0)) / DEFAULT_NORMS.HOSPITAL.capacity));
    const ns = nodes.filter((n) => n.govId === g.id).sort((a, b) => b.basePop - a.basePop);
    for (let i = 0; i < count; i++) {
      const n = ns[Math.min(ns.length - 1, Math.floor(rng.next() ** 2 * Math.min(ns.length, 12)))];
      out.HOSPITAL.push({ id: `H-${g.id}-${i + 1}`, kind: "HOSPITAL", lng: n.lng + rng.normal(0, 0.004), lat: n.lat + rng.normal(0, 0.004), govId: g.id, districtId: n.districtId, capacity: Math.round(DEFAULT_NORMS.HOSPITAL.capacity * rng.range(0.8, 1.3)) });
    }
  }
  invCache.set(world, out);
  return out;
}

// ------------------------------------------------------------------ demand

export function nodeDemand(world: World, sa: SmallArea, kind: FacilityKind): Float64Array {
  const nodes = demandNodes(world);
  const pop = nodePopulations(world, sa);
  if (kind !== "SCHOOL") return pop;
  const out = new Float64Array(pop.length);
  nodes.forEach((n, i) => {
    const d = sa.district[n.districtId];
    out[i] = pop[i] * (d.a6_17 / Math.max(1, d.pop)) * SCHOOL_ENROLMENT;
  });
  return out;
}

// ------------------------------------------------------------------ analysis

export interface DistrictGap {
  demand: number;
  capacity: number;
  gap: number;
  accessDemand: number;
  accessCovered: number;
  facilities: number;
  proposed: number;
}

export interface SitingAnalysis {
  kind: FacilityKind;
  year: number;
  demandTotal: number;
  capacityTotal: number;
  capacityGap: number;
  accessCovered: number;
  accessPct: number;
  nodeDist: Float32Array;
  nodeServed: Uint8Array;
  byDistrict: Record<string, DistrictGap>;
  byGov: Record<string, DistrictGap>;
  /** facilities needed to close all district capacity gaps */
  facilitiesNeeded: number;
}

export function analyseSiting(world: World, sa: SmallArea, kind: FacilityKind, facilities: Facility[], norms: FacilityNorms): SitingAnalysis {
  const nodes = demandNodes(world);
  const demand = nodeDemand(world, sa, kind);
  const idx = new GridIndex(facilities, 0.05);
  const nodeDist = new Float32Array(nodes.length);
  const nodeServed = new Uint8Array(nodes.length);
  const blank = (): DistrictGap => ({ demand: 0, capacity: 0, gap: 0, accessDemand: 0, accessCovered: 0, facilities: 0, proposed: 0 });
  const byDistrict: Record<string, DistrictGap> = Object.fromEntries(world.districts.map((d) => [d.id, blank()]));
  let covered = 0;
  let total = 0;
  nodes.forEach((n, i) => {
    const near = facilities.length ? idx.nearest(n.lng, n.lat) : { i: -1, d: Infinity };
    nodeDist[i] = near.d;
    const r = n.urban ? norms.radiusUrban : norms.radiusRural;
    const ok = near.d <= r;
    nodeServed[i] = ok ? 1 : 0;
    const b = byDistrict[n.districtId];
    b.demand += demand[i];
    b.accessDemand += demand[i];
    if (ok) {
      b.accessCovered += demand[i];
      covered += demand[i];
    }
    total += demand[i];
  });
  for (const f of facilities) {
    const b = byDistrict[f.districtId];
    if (!b) continue;
    b.capacity += f.capacity;
    b.facilities += 1;
    if (f.proposed) b.proposed += 1;
  }
  let gapTotal = 0;
  let needed = 0;
  for (const b of Object.values(byDistrict)) {
    b.gap = Math.max(0, b.demand - b.capacity);
    gapTotal += b.gap;
    needed += Math.ceil(b.gap / norms.capacity);
  }
  const byGov: Record<string, DistrictGap> = Object.fromEntries(world.governorates.map((g) => [g.id, blank()]));
  for (const d of world.districts) {
    const s = byDistrict[d.id];
    const g = byGov[d.govId];
    g.demand += s.demand;
    g.capacity += s.capacity;
    g.gap += s.gap;
    g.accessDemand += s.accessDemand;
    g.accessCovered += s.accessCovered;
    g.facilities += s.facilities;
    g.proposed += s.proposed;
  }
  return {
    kind,
    year: sa.year,
    demandTotal: total,
    capacityTotal: facilities.reduce((s, f) => s + f.capacity, 0),
    capacityGap: gapTotal,
    accessCovered: covered,
    accessPct: covered / Math.max(1, total),
    nodeDist,
    nodeServed,
    byDistrict,
    byGov,
    facilitiesNeeded: needed,
  };
}

// ------------------------------------------------------------------ optimiser

export interface OptimiseOptions {
  count: number;
  /** 0 = capacity only, 1 = access only */
  alpha: number;
  govId?: GovId | null;
}

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

export function suggestSites(world: World, sa: SmallArea, kind: FacilityKind, facilities: Facility[], norms: FacilityNorms, opt: OptimiseOptions): Facility[] {
  const nodes = demandNodes(world);
  const demand = nodeDemand(world, sa, kind);
  const base = analyseSiting(world, sa, kind, facilities, norms);
  const covered = Uint8Array.from(base.nodeServed);
  const gap = new Map(Object.entries(base.byDistrict).map(([k, v]) => [k, v.gap]));
  const nodeIdx = new GridIndex(nodes, 0.05);
  const rMax = Math.max(norms.radiusUrban, norms.radiusRural);
  const candidates = nodes.map((n, i) => ({ n, i })).filter(({ n }) => !opt.govId || n.govId === opt.govId);
  const reach = new Map<number, number[]>();
  for (const { n, i } of candidates) {
    reach.set(i, nodeIdx.within(n.lng, n.lat, rMax).filter((j) => km(n.lng, n.lat, nodes[j].lng, nodes[j].lat) <= (nodes[j].urban ? norms.radiusUrban : norms.radiusRural)));
  }
  const picks: Facility[] = [];
  const used = new Set<number>();
  const C = norms.capacity;
  for (let p = 0; p < opt.count; p++) {
    let best: { i: number; score: number; acc: number; cap: number; newly: number } | null = null;
    for (const { n, i } of candidates) {
      if (used.has(i)) continue;
      let un = 0;
      for (const j of reach.get(i)!) if (!covered[j]) un += demand[j];
      const acc = Math.min(C, un);
      const cap = Math.min(C, gap.get(n.districtId) ?? 0);
      const score = opt.alpha * acc + (1 - opt.alpha) * cap;
      if (!best || score > best.score) best = { i, score, acc, cap, newly: un };
    }
    if (!best || best.score <= 0) break;
    const n = nodes[best.i];
    used.add(best.i);
    for (const j of reach.get(best.i)!) covered[j] = 1;
    gap.set(n.districtId, Math.max(0, (gap.get(n.districtId) ?? 0) - C));
    const d = world.district[n.districtId];
    const unit = kind === "SCHOOL" ? { en: "students", ar: "طالب" } : { en: "residents", ar: "ساكن" };
    picks.push({
      id: `P-${kind[0]}-${String(p + 1).padStart(2, "0")}-${n.id}`,
      kind,
      lng: n.lng,
      lat: n.lat,
      govId: n.govId,
      districtId: n.districtId,
      capacity: C,
      proposed: true,
      gainAccess: best.acc,
      gainCapacity: best.cap,
      reason: {
        en: `${d.name.en}: brings ${fmt(best.newly)} ${unit.en} within the access standard${best.newly > C ? ` (serves up to ${fmt(C)})` : ""} and absorbs ${fmt(best.cap)} of the district's capacity gap.`,
        ar: `${d.name.ar}: يضع ${fmt(best.newly)} ${unit.ar} ضمن معيار الوصول${best.newly > C ? ` (يخدم حتى ${fmt(C)})` : ""} ويغطي ${fmt(best.cap)} من فجوة الطاقة الاستيعابية في اللواء.`,
      },
    });
  }
  return picks;
}

/** Circle polygon (for catchment rings on the map). */
export function circle(lng: number, lat: number, rKm: number, steps = 36): [number, number][] {
  const out: [number, number][] = [];
  const c = Math.cos((lat * Math.PI) / 180);
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    out.push([lng + (Math.cos(a) * rKm) / (111.32 * c), lat + (Math.sin(a) * rKm) / 110.57]);
  }
  return out;
}
