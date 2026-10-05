/**
 * Planning Lab — shared small-area layer (SIMULATED).
 *
 *   governorate totals  = scenario projection apportioned by the Scenario Simulator rule
 *                         (reference share × growth differential, plus migration-shock focus)
 *   district share      ∝ base district population × exp(k_d × years),
 *                         k_d = 0.010 × (urban share_d − governorate mean) + 0.002 × [capital district]
 *   age groups          = governorate composition × national projected composition
 *   demand nodes        = enumeration areas aggregated on a 0.02° grid (≈ 2 km), scaled to the
 *                         projected district population of the selected year
 *
 * Everything here is derived from the synthetic census frame and the selected scenario.
 */
import type { GovId, ProjectionPoint } from "@/types/census";
import type { World } from "../generate";
import { computeProfile } from "../analytics";
import { calculateInfrastructureDemand, type ScenarioRun } from "../scenarios";
import { MAX_AGE } from "../projection";
import { derive, type Rng } from "../rng";

/** Planning horizons; the first is the census base year (the as-is view). */
export const LAB_YEARS = [2026, 2030, 2035, 2040, 2045, 2050];
export const BASE_LAB_YEAR = LAB_YEARS[0];

export interface AreaStats {
  pop: number;
  households: number;
  a0_5: number;
  a6_17: number;
  a15_24: number;
  a15_64: number;
  a65: number;
  a80: number;
  urban: number;
}

export const labRng = (world: World, ...keys: (string | number)[]): Rng => derive(world.config.seed, "lab", ...keys);

// ------------------------------------------------------------------ fast planar distance

const KM_LAT = 110.57;
/** Equirectangular distance in km — accurate to <0.5% at Jordan's scale. */
export function km(aLng: number, aLat: number, bLng: number, bLat: number): number {
  const c = Math.cos(((aLat + bLat) / 2) * (Math.PI / 180));
  const dx = (aLng - bLng) * 111.32 * c;
  const dy = (aLat - bLat) * KM_LAT;
  return Math.sqrt(dx * dx + dy * dy);
}

export function sumAges(pt: ProjectionPoint, a: number, b: number) {
  let s = 0;
  for (let x = a; x <= Math.min(b, MAX_AGE); x++) s += pt.ages.m[x] + pt.ages.f[x];
  return s;
}

export function pointStats(pt: ProjectionPoint): AreaStats {
  return {
    pop: pt.population,
    households: pt.households,
    a0_5: pt.age0_5,
    a6_17: pt.age6_17,
    a15_24: sumAges(pt, 15, 24),
    a15_64: pt.age15_64,
    a65: pt.age65plus,
    a80: sumAges(pt, 80, MAX_AGE),
    urban: pt.population * pt.urbanShare,
  };
}

// ------------------------------------------------------------------ small-area projection

export interface SmallArea {
  year: number;
  national: AreaStats;
  gov: Record<GovId, AreaStats>;
  district: Record<string, AreaStats>;
  /** base-year (census) values for the same geography */
  base: { national: AreaStats; gov: Record<GovId, AreaStats>; district: Record<string, AreaStats> };
}

const saCache = new WeakMap<ScenarioRun, Map<number, SmallArea>>();

function scaleStats(s: AreaStats, k: number): AreaStats {
  return { pop: s.pop * k, households: s.households * k, a0_5: s.a0_5 * k, a6_17: s.a6_17 * k, a15_24: s.a15_24 * k, a15_64: s.a15_64 * k, a65: s.a65 * k, a80: s.a80 * k, urban: s.urban * k };
}

function govComposition(world: World, govId: GovId, nat: AreaStats, natProfilePop: number) {
  const gp = computeProfile(world, { govId });
  const np = computeProfile(world);
  const pop = Math.max(1, gp.population);
  const ratio = (g: number, n: number) => (n > 0 ? g / pop / (n / Math.max(1, natProfilePop)) : 1);
  void nat;
  return {
    young: ratio(gp.groups.a0_5, np.groups.a0_5),
    school: ratio(gp.groups.a6_17, np.groups.a6_17),
    youth: ratio(gp.groups.a15_24, np.groups.a15_24),
    work: ratio(gp.groups.a15_64, np.groups.a15_64),
    old: ratio(gp.groups.a65, np.groups.a65),
    hhSize: gp.avgHHSize / Math.max(0.1, np.avgHHSize),
    urban: gp.urban / pop / Math.max(0.01, np.urban / Math.max(1, np.population)),
  };
}

function areaFor(world: World, pt: ProjectionPoint, run: ScenarioRun): { national: AreaStats; gov: Record<GovId, AreaStats>; district: Record<string, AreaStats> } {
  const national = pointStats(pt);
  const base = run.series[0];
  const impact = calculateInfrastructureDemand(world, pt, base, run.params, run.baseEmploymentRatio, run.baseYear);
  const np = computeProfile(world);
  const gov = {} as Record<GovId, AreaStats>;
  for (const g of world.governorates) {
    const pop = impact.byGov[g.id].population;
    const share = pop / Math.max(1, national.pop);
    const c = govComposition(world, g.id, national, np.population);
    const raw = scaleStats(national, share);
    gov[g.id] = {
      pop,
      households: (pop / (national.pop / Math.max(1, national.households))) / c.hhSize,
      a0_5: raw.a0_5 * c.young,
      a6_17: raw.a6_17 * c.school,
      a15_24: raw.a15_24 * c.youth,
      a15_64: raw.a15_64 * c.work,
      a65: raw.a65 * c.old,
      a80: raw.a80 * c.old,
      urban: Math.min(pop * 0.995, raw.urban * c.urban),
    };
  }
  // districts
  const years = pt.year - run.baseYear;
  const district: Record<string, AreaStats> = {};
  for (const g of world.governorates) {
    const ds = world.districts.filter((d) => d.govId === g.id);
    const govPop = ds.reduce((s, d) => s + d.population, 0);
    const govUrban = ds.reduce((s, d) => s + d.population * d.urbanShare, 0) / Math.max(1, govPop);
    const w = ds.map((d) => d.population * Math.exp((0.01 * (d.urbanShare - govUrban) + (d.isCapitalDistrict ? 0.002 : 0)) * years));
    const sw = w.reduce((a, b) => a + b, 0);
    ds.forEach((d, i) => {
      const share = w[i] / Math.max(1, sw);
      const gs = gov[g.id];
      const st = scaleStats(gs, share);
      // urban districts: slightly fewer children, more working-age
      const u = d.urbanShare - govUrban;
      st.a0_5 *= 1 - 0.15 * u;
      st.a6_17 *= 1 - 0.12 * u;
      st.a15_64 *= 1 + 0.05 * u;
      st.urban = st.pop * Math.min(0.99, d.urbanShare * (gs.urban / Math.max(1, gs.pop)) / Math.max(0.05, govUrban));
      district[d.id] = st;
    });
  }
  return { national, gov, district };
}

/** Small-area projection for one year of a scenario run (memoised per run). */
export function smallArea(world: World, run: ScenarioRun, year: number): SmallArea {
  let m = saCache.get(run);
  if (!m) {
    m = new Map();
    saCache.set(run, m);
  }
  const hit = m.get(year);
  if (hit) return hit;
  const pt = run.series.find((s) => s.year === year) ?? run.series[run.series.length - 1];
  const now = areaFor(world, pt, run);
  const baseArea = year === run.baseYear ? now : smallArea(world, run, run.baseYear);
  const out: SmallArea = { year: pt.year, ...now, base: { national: baseArea.national, gov: baseArea.gov, district: baseArea.district } };
  m.set(year, out);
  return out;
}

// ------------------------------------------------------------------ demand nodes

export interface DemandNode {
  id: string;
  lng: number;
  lat: number;
  govId: GovId;
  districtId: string;
  urban: boolean;
  /** base-year population represented by the node */
  basePop: number;
}

const nodeCache = new WeakMap<World, DemandNode[]>();

/** Enumeration areas aggregated on a 0.02° grid inside each district (population-weighted centroid). */
export function demandNodes(world: World): DemandNode[] {
  const hit = nodeCache.get(world);
  if (hit) return hit;
  const cell = 0.02;
  const acc = new Map<string, { lng: number; lat: number; pop: number; urbanPop: number; govId: GovId; districtId: string }>();
  for (const e of world.eas) {
    const key = `${e.districtId}|${Math.floor(e.lng / cell)}|${Math.floor(e.lat / cell)}`;
    const a = acc.get(key) ?? { lng: 0, lat: 0, pop: 0, urbanPop: 0, govId: e.govId, districtId: e.districtId };
    a.lng += e.lng * e.popEstimate;
    a.lat += e.lat * e.popEstimate;
    a.pop += e.popEstimate;
    if (e.urban) a.urbanPop += e.popEstimate;
    acc.set(key, a);
  }
  // scale to district reference totals so nodes add up to the census frame
  const dSum = new Map<string, number>();
  for (const a of acc.values()) dSum.set(a.districtId, (dSum.get(a.districtId) ?? 0) + a.pop);
  const out: DemandNode[] = [];
  let i = 0;
  for (const a of acc.values()) {
    const k = world.district[a.districtId].population / Math.max(1, dSum.get(a.districtId) ?? 1);
    out.push({ id: `N${String(i++).padStart(4, "0")}`, lng: a.lng / a.pop, lat: a.lat / a.pop, govId: a.govId, districtId: a.districtId, urban: a.urbanPop / a.pop >= 0.5, basePop: a.pop * k });
  }
  nodeCache.set(world, out);
  return out;
}

/** Node population in the target year: base population × projected district growth. */
export function nodePopulations(world: World, sa: SmallArea): Float64Array {
  const nodes = demandNodes(world);
  const out = new Float64Array(nodes.length);
  nodes.forEach((n, i) => {
    const b = sa.base.district[n.districtId]?.pop ?? 1;
    out[i] = n.basePop * ((sa.district[n.districtId]?.pop ?? b) / Math.max(1, b));
  });
  return out;
}

// ------------------------------------------------------------------ spatial grid index

export class GridIndex {
  private cells = new Map<string, number[]>();
  constructor(private readonly pts: { lng: number; lat: number }[], private readonly size = 0.05) {
    pts.forEach((p, i) => {
      const k = `${Math.floor(p.lng / size)}|${Math.floor(p.lat / size)}`;
      const l = this.cells.get(k);
      if (l) l.push(i);
      else this.cells.set(k, [i]);
    });
  }
  /** indices of points within r km of (lng, lat) */
  within(lng: number, lat: number, r: number): number[] {
    const span = Math.ceil(r / (this.size * 92)) + 1;
    const cx = Math.floor(lng / this.size);
    const cy = Math.floor(lat / this.size);
    const out: number[] = [];
    for (let dx = -span; dx <= span; dx++)
      for (let dy = -span; dy <= span; dy++) {
        const l = this.cells.get(`${cx + dx}|${cy + dy}`);
        if (!l) continue;
        for (const i of l) if (km(lng, lat, this.pts[i].lng, this.pts[i].lat) <= r) out.push(i);
      }
    return out;
  }
  /** nearest point and its distance, searching rings up to maxKm */
  nearest(lng: number, lat: number, maxKm = 400): { i: number; d: number } {
    let best = { i: -1, d: Infinity };
    const cx = Math.floor(lng / this.size);
    const cy = Math.floor(lat / this.size);
    const maxRing = Math.ceil(maxKm / (this.size * 92)) + 1;
    for (let ring = 0; ring <= maxRing; ring++) {
      for (let dx = -ring; dx <= ring; dx++)
        for (let dy = -ring; dy <= ring; dy++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
          const l = this.cells.get(`${cx + dx}|${cy + dy}`);
          if (!l) continue;
          for (const i of l) {
            const d = km(lng, lat, this.pts[i].lng, this.pts[i].lat);
            if (d < best.d) best = { i, d };
          }
        }
      // any point outside ring r is at least (r · cell) away
      if (best.i >= 0 && best.d < ring * this.size * 92) break;
    }
    return best;
  }
}

// ------------------------------------------------------------------ helpers

export const sum = (xs: Iterable<number>) => {
  let s = 0;
  for (const x of xs) s += x;
  return s;
};

export function percentile(sorted: number[], p: number) {
  if (!sorted.length) return 0;
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

/** Standard-normal CDF (Abramowitz–Stegun 7.1.26). */
export function normCdf(z: number) {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

export const govIds = (world: World) => world.governorates.map((g) => g.id);
