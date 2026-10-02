/**
 * Urban growth forecast — constrained cellular automaton (SIMULATED).
 *
 * Grid       ≈ 0.70 × 0.66 km cells over a metropolitan window. Starting density is a kernel
 *            surface of the synthetic enumeration-area populations; cells ≥ 2,500 persons/km²
 *            are "urban" in the base year.
 * Demand     each year the region's projected population growth (small-area projection of the
 *            districts the cells belong to) is split into infill (densifying existing urban
 *            cells) and greenfield land = growth × (1 − infill) ÷ new-development density.
 * Allocation the greenfield cells with the highest transition potential convert:
 *              P = (N + f)^wN · e^(−d_corridor / 3 km · wRoad) · e^(−d_centre / λ) · (1 + ε)
 *            N = urban share of the 5 × 5 neighbourhood, f = leapfrog floor, d = km, ε = seeded noise.
 * Instruments a green-belt ring and an urban growth boundary make cells non-developable.
 * Cost proxies road km = new km² × (8 + 6 × fragmented), fragmented = < 2 of 24 neighbours urban; pipe km = 0.8 × road km;
 *            cost (JOD M) = road km × 1.1 + pipe km × 0.5 — illustrative unit costs.
 */
import type { GovId, L } from "@/types/census";
import type { World } from "../generate";
import { COUNTRY } from "@/data/geo";
import { pointInFeature, type GeoFeature } from "../geo";
import { km, labRng, type SmallArea } from "./common";
import { buildNetwork } from "./network";

export type GrowthPolicy = "COMPACT" | "TREND" | "SPRAWL";

export interface PolicySpec {
  density: number;
  infill: number;
  wN: number;
  wRoad: number;
  lambda: number;
  noise: number;
  /** neighbourhood floor — higher values allow leapfrog development */
  leap: number;
}

export const POLICIES: Record<GrowthPolicy, PolicySpec> = {
  COMPACT: { density: 9000, infill: 0.4, wN: 3, wRoad: 0.25, lambda: 8, noise: 0.03, leap: 0.02 },
  TREND: { density: 6000, infill: 0.2, wN: 1.5, wRoad: 0.6, lambda: 12, noise: 0.08, leap: 0.06 },
  SPRAWL: { density: 3500, infill: 0.05, wN: 0.5, wRoad: 1, lambda: 22, noise: 0.25, leap: 0.16 },
};

export interface GrowthRegion {
  id: string;
  govId: GovId;
  name: L;
  halfW: number;
  halfH: number;
}

export const GROWTH_REGIONS: GrowthRegion[] = [
  { id: "AMMAN", govId: "AMM", name: { en: "Greater Amman – Zarqa – Russeifa", ar: "عمّان الكبرى – الزرقاء – الرصيفة" }, halfW: 0.27, halfH: 0.2 },
  { id: "IRBID", govId: "IRB", name: { en: "Irbid – Ramtha", ar: "إربد – الرمثا" }, halfW: 0.2, halfH: 0.13 },
  { id: "MAFRAQ", govId: "MAF", name: { en: "Mafraq", ar: "المفرق" }, halfW: 0.12, halfH: 0.09 },
  { id: "AQABA", govId: "AQB", name: { en: "Aqaba", ar: "العقبة" }, halfW: 0.1, halfH: 0.1 },
];

export const CELL_W = 0.0075;
export const CELL_H = 0.006;
const URBAN_THRESHOLD = 2500;

export interface GrowthGrid {
  region: GrowthRegion;
  centre: [number, number];
  nx: number;
  ny: number;
  x0: number;
  y0: number;
  cellKm2: number;
  inside: Uint8Array;
  pop: Float64Array;
  district: string[];
  urban0: Uint8Array;
  dCentre: Float32Array;
  dRoad: Float32Array;
  dEdge: Float32Array;
  r90: number;
}

const gridCache = new WeakMap<World, Map<string, GrowthGrid>>();

export function buildGrid(world: World, regionId: string): GrowthGrid {
  let wc = gridCache.get(world);
  if (!wc) {
    wc = new Map();
    gridCache.set(world, wc);
  }
  const hit = wc.get(regionId);
  if (hit) return hit;
  const region = GROWTH_REGIONS.find((r) => r.id === regionId) ?? GROWTH_REGIONS[0];
  const g = world.gov[region.govId];
  const centre = g.capitalPoint;
  const x0 = centre[0] - region.halfW;
  const y0 = centre[1] - region.halfH;
  const nx = Math.round((region.halfW * 2) / CELL_W);
  const ny = Math.round((region.halfH * 2) / CELL_H);
  const N = nx * ny;
  const cellKm2 = CELL_W * 111.32 * Math.cos((centre[1] * Math.PI) / 180) * CELL_H * 110.57;
  const country = COUNTRY.features[0] as GeoFeature<unknown>;
  const inside = new Uint8Array(N);
  const pop = new Float64Array(N);
  const district: string[] = new Array(N).fill("");
  const best = new Float64Array(N);
  const cx = (i: number) => x0 + ((i % nx) + 0.5) * CELL_W;
  const cy = (i: number) => y0 + (Math.floor(i / nx) + 0.5) * CELL_H;
  for (let i = 0; i < N; i++) inside[i] = pointInFeature(cx(i), cy(i), country) ? 1 : 0;
  // kernel deposit of EA populations (σ ≈ 0.6 km over a 5 × 5 stencil)
  const sigmaKm = 0.6;
  for (const e of world.eas) {
    if (e.lng < x0 - 0.02 || e.lng > x0 + nx * CELL_W + 0.02 || e.lat < y0 - 0.02 || e.lat > y0 + ny * CELL_H + 0.02) continue;
    const ix = Math.floor((e.lng - x0) / CELL_W);
    const iy = Math.floor((e.lat - y0) / CELL_H);
    const ws: [number, number][] = [];
    let wsum = 0;
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) {
        const x = ix + dx;
        const y = iy + dy;
        if (x < 0 || y < 0 || x >= nx || y >= ny) continue;
        const k = y * nx + x;
        if (!inside[k]) continue;
        const d = km(e.lng, e.lat, cx(k), cy(k));
        const w = Math.exp(-(d * d) / (2 * sigmaKm * sigmaKm));
        ws.push([k, w]);
        wsum += w;
      }
    for (const [k, w] of ws) {
      const p = (e.popEstimate * w) / wsum;
      pop[k] += p;
      if (p > best[k]) {
        best[k] = p;
        district[k] = e.districtId;
      }
    }
  }
  // empty cells: nearest district label point
  for (let i = 0; i < N; i++) {
    if (district[i] || !inside[i]) continue;
    let bd = Infinity;
    for (const d of world.districts) {
      const dd = km(cx(i), cy(i), d.label[0], d.label[1]);
      if (dd < bd) {
        bd = dd;
        district[i] = d.id;
      }
    }
  }
  const urban0 = new Uint8Array(N);
  for (let i = 0; i < N; i++) urban0[i] = inside[i] && pop[i] / cellKm2 >= URBAN_THRESHOLD ? 1 : 0;
  // distances
  const dCentre = new Float32Array(N);
  for (let i = 0; i < N; i++) dCentre[i] = km(cx(i), cy(i), centre[0], centre[1]);
  const net = buildNetwork(world);
  const segs = net.links
    .map((l) => [net.nodes.find((n) => n.id === l.a)!, net.nodes.find((n) => n.id === l.b)!] as const)
    .filter(([a, b]) => Math.min(a.lng, b.lng) < x0 + nx * CELL_W + 0.3 && Math.max(a.lng, b.lng) > x0 - 0.3 && Math.min(a.lat, b.lat) < y0 + ny * CELL_H + 0.3 && Math.max(a.lat, b.lat) > y0 - 0.3);
  const dRoad = new Float32Array(N).fill(50);
  for (let i = 0; i < N; i++) {
    const px = cx(i);
    const py = cy(i);
    for (const [a, b] of segs) {
      const vx = b.lng - a.lng;
      const vy = b.lat - a.lat;
      const t = Math.max(0, Math.min(1, ((px - a.lng) * vx + (py - a.lat) * vy) / (vx * vx + vy * vy || 1)));
      const d = km(px, py, a.lng + t * vx, a.lat + t * vy);
      if (d < dRoad[i]) dRoad[i] = d;
    }
  }
  // distance to the base-year urban edge (multi-source BFS, 8-neighbour, km)
  const dEdge = new Float32Array(N).fill(1e6);
  const q: number[] = [];
  for (let i = 0; i < N; i++) if (urban0[i]) {
    dEdge[i] = 0;
    q.push(i);
  }
  const stepX = CELL_W * 111.32 * Math.cos((centre[1] * Math.PI) / 180);
  const stepY = CELL_H * 110.57;
  for (let h = 0; h < q.length; h++) {
    const i = q[h];
    const x = i % nx;
    const y = Math.floor(i / nx);
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const X = x + dx;
        const Y = y + dy;
        if (X < 0 || Y < 0 || X >= nx || Y >= ny) continue;
        const k = Y * nx + X;
        const nd = dEdge[i] + Math.hypot(dx * stepX, dy * stepY);
        if (nd < dEdge[k] - 1e-6) {
          dEdge[k] = nd;
          q.push(k);
        }
      }
  }
  const ud = [...dCentre].filter((_, i) => urban0[i]).sort((a, b) => a - b);
  const r90 = ud.length ? ud[Math.floor(ud.length * 0.9)] : 5;
  const out: GrowthGrid = { region, centre, nx, ny, x0, y0, cellKm2, inside, pop, district, urban0, dCentre, dRoad, dEdge, r90 };
  wc.set(regionId, out);
  return out;
}

export interface GrowthOptions {
  policy: GrowthPolicy;
  greenBelt: boolean;
  /** growth boundary distance beyond today's edge (km); null = none */
  boundaryKm: number | null;
}

export interface GrowthYear {
  year: number;
  urbanKm2: number;
  newKm2: number;
  population: number;
  density: number;
  meanDistKm: number;
  roadKm: number;
  pipeKm: number;
  costM: number;
  leapfrog: number;
}

export interface GrowthResult {
  grid: GrowthGrid;
  options: GrowthOptions;
  /** 0 = not urban; base year = urban at start; otherwise year urbanised */
  yearUrban: Int16Array;
  protectedMask: Uint8Array;
  potential: Float32Array;
  series: GrowthYear[];
  totals: { newKm2: number; roadKm: number; pipeKm: number; costM: number; leapfrogShare: number; protectedKm2: number };
}

export const ROAD_COST_M = 1.1;
export const PIPE_COST_M = 0.5;

export function simulateGrowth(world: World, grid: GrowthGrid, areaFor: (year: number) => SmallArea, baseYear: number, endYear: number, opt: GrowthOptions): GrowthResult {
  const { nx, ny, inside, pop: pop0, district, urban0, dCentre, dRoad, dEdge, cellKm2 } = grid;
  const N = nx * ny;
  const spec = POLICIES[opt.policy];
  const rng = labRng(world, "growth", grid.region.id, opt.policy);
  const noise = new Float32Array(N);
  for (let i = 0; i < N; i++) noise[i] = rng.next();
  const protectedMask = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    if (!inside[i] || urban0[i]) continue;
    if (opt.greenBelt && dCentre[i] >= grid.r90 + 1.5 && dCentre[i] <= grid.r90 + 4.5) protectedMask[i] = 1;
    if (opt.boundaryKm !== null && dEdge[i] > opt.boundaryKm) protectedMask[i] = 2;
  }
  const yearUrban = new Int16Array(N);
  for (let i = 0; i < N; i++) if (urban0[i]) yearUrban[i] = baseYear;
  const pop = Float64Array.from(pop0);
  const sa0 = areaFor(baseYear);
  const growthOf = (sa: SmallArea, d: string) => (sa.district[d]?.pop ?? 1) / Math.max(1, sa0.district[d]?.pop ?? 1);
  const series: GrowthYear[] = [];
  let roadKm = 0;
  let pipeKm = 0;
  let leapTotal = 0;
  let newTotal = 0;
  const potential = new Float32Array(N);
  const nbShare = (i: number) => {
    const x = i % nx;
    const y = Math.floor(i / nx);
    let u = 0;
    let n = 0;
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) {
        if (!dx && !dy) continue;
        const X = x + dx;
        const Y = y + dy;
        if (X < 0 || Y < 0 || X >= nx || Y >= ny) continue;
        n++;
        if (yearUrban[Y * nx + X]) u++;
      }
    return n ? u / n : 0;
  };
  const record = (year: number, newKm2: number, leap: number) => {
    let uk = 0;
    let p = 0;
    let wd = 0;
    for (let i = 0; i < N; i++) {
      if (!inside[i]) continue;
      p += pop[i];
      wd += pop[i] * dCentre[i];
      if (yearUrban[i]) uk += cellKm2;
    }
    series.push({ year, urbanKm2: uk, newKm2, population: p, density: p / Math.max(1e-9, uk), meanDistKm: wd / Math.max(1, p), roadKm, pipeKm, costM: roadKm * ROAD_COST_M + pipeKm * PIPE_COST_M, leapfrog: leap });
  };
  record(baseYear, 0, 0);
  let prevSa = sa0;
  for (let year = baseYear + 1; year <= endYear; year++) {
    const sa = areaFor(year);
    // population growth this year by district, distributed over the region's cells
    let growth = 0;
    const cellGrowth = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      if (!inside[i] || !pop0[i]) continue;
      const g = pop0[i] * (growthOf(sa, district[i]) - growthOf(prevSa, district[i]));
      cellGrowth[i] = g;
      growth += g;
    }
    prevSa = sa;
    if (growth <= 0) {
      // decline: thin existing cells proportionally
      for (let i = 0; i < N; i++) pop[i] = Math.max(0, pop[i] + cellGrowth[i]);
      record(year, 0, 0);
      continue;
    }
    // infill: densify existing urban cells in proportion to their population
    const infill = growth * spec.infill;
    let urbanPop = 0;
    for (let i = 0; i < N; i++) if (yearUrban[i]) urbanPop += pop[i];
    if (urbanPop > 0) for (let i = 0; i < N; i++) if (yearUrban[i]) pop[i] += (infill * pop[i]) / urbanPop;
    // greenfield
    const greenPop = growth - infill;
    const cells = Math.round(greenPop / spec.density / cellKm2);
    const cand: number[] = [];
    for (let i = 0; i < N; i++) {
      if (!inside[i] || yearUrban[i] || protectedMask[i]) {
        potential[i] = 0;
        continue;
      }
      const nb = nbShare(i);
      const p = Math.pow(nb + spec.leap, spec.wN) * Math.exp((-dRoad[i] / 3) * spec.wRoad) * Math.exp(-dCentre[i] / spec.lambda) * (1 + spec.noise * 6 * noise[i] * noise[i]);
      potential[i] = p;
      cand.push(i);
    }
    cand.sort((a, b) => potential[b] - potential[a]);
    const take = cand.slice(0, Math.max(0, cells));
    let leap = 0;
    for (const i of take) {
      // fragmented fringe: fewer than 2 of the 24 neighbouring cells already urban
      const isolated = nbShare(i) < 2 / 24;
      if (isolated) leap++;
      yearUrban[i] = year;
      const r = cellKm2 * (8 + (isolated ? 6 : 0));
      roadKm += r;
      pipeKm += r * 0.8;
    }
    if (take.length) for (const i of take) pop[i] += greenPop / take.length;
    else if (urbanPop > 0) for (let i = 0; i < N; i++) if (yearUrban[i]) pop[i] += (greenPop * pop[i]) / urbanPop;
    leapTotal += leap;
    newTotal += take.length;
    record(year, take.length * cellKm2, leap);
  }
  let protectedKm2 = 0;
  for (let i = 0; i < N; i++) if (protectedMask[i]) protectedKm2 += cellKm2;
  return {
    grid,
    options: opt,
    yearUrban,
    protectedMask,
    potential,
    series,
    totals: { newKm2: newTotal * cellKm2, roadKm, pipeKm, costM: roadKm * ROAD_COST_M + pipeKm * PIPE_COST_M, leapfrogShare: newTotal ? leapTotal / newTotal : 0, protectedKm2 },
  };
}

/** Rectangle polygon for cell i. */
export function cellPolygon(grid: GrowthGrid, i: number): [number, number][] {
  const x = grid.x0 + (i % grid.nx) * CELL_W;
  const y = grid.y0 + Math.floor(i / grid.nx) * CELL_H;
  return [[x, y], [x + CELL_W, y], [x + CELL_W, y + CELL_H], [x, y + CELL_H], [x, y]];
}
