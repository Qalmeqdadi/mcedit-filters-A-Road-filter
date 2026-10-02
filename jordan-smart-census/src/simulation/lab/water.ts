/**
 * Municipal water balance & scarcity simulator (SIMULATED).
 *
 *   consumption_g(t)  = population_g(t) × lpcd(t) × 365 / 10⁹                      (MCM / yr)
 *   requirement_g(t)  = consumption_g(t) / (1 − NRW(t))                            (water to supply)
 *   supply_g(t)       = conventional_g × (1 − decline)^(t − base) [× drought factor] + new supply_g(t)
 *   conventional_g    = requirement_g(base) × headroom_g      (synthetic: seeded 0.90–1.10 × national headroom)
 *   new supply        = large desalination & conveyance capacity from its start year (ramped over 3 years),
 *                       allocated to governorates in proportion to their deficit in the start year
 *   delivered lpcd    = supply × (1 − NRW) / population
 *
 * Drought risk: Monte-Carlo (400 seeded runs). Each year is a drought year with probability p;
 * drought cuts conventional supply by severity × U(0.6, 1.4).
 *
 * All parameters are adjustable assumptions — replace with Ministry of Water & Irrigation data.
 */
import type { GovId } from "@/types/census";
import type { World } from "../generate";
import { labRng, percentile, type SmallArea } from "./common";

export interface WaterParams {
  lpcd: number;
  /** demand-management change in per-capita consumption by 2040 (e.g. −0.10) */
  lpcdChange: number;
  nrwBase: number;
  nrwTarget: number;
  /** annual decline of conventional (ground/surface) yield */
  decline: number;
  /** national conventional supply ÷ base-year requirement */
  headroom: number;
  newSupplyMcm: number;
  newSupplyYear: number;
  droughtProb: number;
  droughtSeverity: number;
}

export const DEFAULT_WATER: WaterParams = {
  lpcd: 95,
  lpcdChange: 0,
  nrwBase: 0.46,
  nrwTarget: 0.46,
  decline: 0.012,
  headroom: 1.0,
  newSupplyMcm: 300,
  newSupplyYear: 2031,
  droughtProb: 0.2,
  droughtSeverity: 0.15,
};

export interface WaterYear {
  year: number;
  population: number;
  consumption: number;
  requirement: number;
  supply: number;
  gap: number;
  ratio: number;
  deliveredLpcd: number;
  nrw: number;
}

export interface WaterResult {
  params: WaterParams;
  years: number[];
  national: WaterYear[];
  byGov: Record<GovId, WaterYear[]>;
  /** first year in which supply covers < 90% of requirement (null = never before 2050) */
  stressYear: Record<GovId, number | null>;
  nationalStressYear: number | null;
  risk: { year: number; p10: number; p50: number; p90: number; pShortfall: number }[];
  govRisk: Record<GovId, number>;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.max(0, Math.min(1, t));

export function simulateWater(world: World, areaFor: (year: number) => SmallArea, baseYear: number, endYear: number, p: WaterParams, riskYear = 2040): WaterResult {
  const years: number[] = [];
  for (let y = baseYear; y <= endYear; y++) years.push(y);
  const govs = world.governorates.map((g) => g.id);
  const rng = labRng(world, "water-headroom");
  const head: Record<string, number> = {};
  for (const g of govs) head[g] = p.headroom * rng.range(0.9, 1.1);
  const sa0 = areaFor(baseYear);
  const lpcdAt = (y: number) => p.lpcd * (1 + p.lpcdChange * Math.min(1, (y - baseYear) / Math.max(1, 2040 - baseYear)));
  const nrwAt = (y: number) => lerp(p.nrwBase, p.nrwTarget, (y - baseYear) / Math.max(1, 2040 - baseYear));
  const req = (pop: number, y: number) => (pop * lpcdAt(y) * 365) / 1e9 / (1 - nrwAt(y));
  const conv0: Record<string, number> = {};
  for (const g of govs) conv0[g] = req(sa0.gov[g].pop, baseYear) * head[g];
  // allocate new supply by deficit in its start year (before new supply)
  const startSa = areaFor(Math.min(endYear, Math.max(baseYear, p.newSupplyYear)));
  const def: Record<string, number> = {};
  let defSum = 0;
  for (const g of govs) {
    const d = Math.max(0, req(startSa.gov[g].pop, p.newSupplyYear) - conv0[g] * Math.pow(1 - p.decline, p.newSupplyYear - baseYear));
    def[g] = d;
    defSum += d;
  }
  const share: Record<string, number> = {};
  for (const g of govs) share[g] = defSum > 0 ? def[g] / defSum : sa0.gov[g].pop / sa0.national.pop;
  const ramp = (y: number) => (y < p.newSupplyYear ? 0 : Math.min(1, (y - p.newSupplyYear + 1) / 3));

  const byGov = {} as Record<GovId, WaterYear[]>;
  const national: WaterYear[] = [];
  const pops: Record<number, SmallArea> = {};
  for (const y of years) pops[y] = areaFor(y);
  for (const g of govs) byGov[g] = [];
  for (const y of years) {
    const sa = pops[y];
    const nat = { population: 0, consumption: 0, requirement: 0, supply: 0 };
    for (const g of govs) {
      const pop = sa.gov[g].pop;
      const consumption = (pop * lpcdAt(y) * 365) / 1e9;
      const requirement = consumption / (1 - nrwAt(y));
      const supply = conv0[g] * Math.pow(1 - p.decline, y - baseYear) + p.newSupplyMcm * ramp(y) * share[g];
      byGov[g].push({ year: y, population: pop, consumption, requirement, supply, gap: Math.max(0, requirement - supply), ratio: supply / requirement, deliveredLpcd: (supply * (1 - nrwAt(y)) * 1e9) / 365 / pop, nrw: nrwAt(y) });
      nat.population += pop;
      nat.consumption += consumption;
      nat.requirement += requirement;
      nat.supply += supply;
    }
    national.push({ year: y, ...nat, gap: Math.max(0, nat.requirement - nat.supply), ratio: nat.supply / nat.requirement, deliveredLpcd: (nat.supply * (1 - nrwAt(y)) * 1e9) / 365 / nat.population, nrw: nrwAt(y) });
  }
  const firstStress = (s: WaterYear[]) => s.find((x) => x.ratio < 0.9)?.year ?? null;
  const stressYear = Object.fromEntries(govs.map((g) => [g, firstStress(byGov[g])])) as Record<GovId, number | null>;

  // Monte-Carlo drought risk
  const R = 400;
  const mc = labRng(world, "water-drought", p.droughtProb, p.droughtSeverity);
  const ratios: number[][] = years.map(() => []);
  const govBad: Record<string, number> = Object.fromEntries(govs.map((g) => [g, 0]));
  const ry = years.indexOf(Math.min(endYear, riskYear));
  for (let r = 0; r < R; r++) {
    years.forEach((y, k) => {
      const drought = mc.chance(p.droughtProb) ? p.droughtSeverity * mc.range(0.6, 1.4) : 0;
      let sup = 0;
      for (const g of govs) {
        const s = conv0[g] * Math.pow(1 - p.decline, y - baseYear) * (1 - drought) + p.newSupplyMcm * ramp(y) * share[g];
        sup += s;
        if (k === ry && s / byGov[g][k].requirement < 0.85) govBad[g]++;
      }
      ratios[k].push(sup / national[k].requirement);
    });
  }
  const risk = years.map((year, k) => {
    const s = ratios[k].sort((a, b) => a - b);
    return { year, p10: percentile(s, 0.1), p50: percentile(s, 0.5), p90: percentile(s, 0.9), pShortfall: s.filter((x) => x < 0.85).length / s.length };
  });
  const govRisk = Object.fromEntries(govs.map((g) => [g, govBad[g] / R])) as Record<GovId, number>;
  return { params: p, years, national, byGov, stressYear, nationalStressYear: firstStress(national), risk, govRisk };
}

// ------------------------------------------------------------------ levers

export interface Lever {
  id: "NRW" | "DEMAND" | "DESAL" | "REUSE";
  /** change applied to the parameters */
  apply: (p: WaterParams) => WaterParams;
  /** capital cost per MCM/yr gained, JOD million (illustrative) */
  costPerMcm: number;
}

export const LEVERS: Lever[] = [
  { id: "NRW", apply: (p) => ({ ...p, nrwTarget: Math.max(0.2, p.nrwTarget - 0.15) }), costPerMcm: 1.2 },
  { id: "DEMAND", apply: (p) => ({ ...p, lpcdChange: p.lpcdChange - 0.1 }), costPerMcm: 0.5 },
  { id: "DESAL", apply: (p) => ({ ...p, newSupplyMcm: p.newSupplyMcm + 100 }), costPerMcm: 4.5 },
  { id: "REUSE", apply: (p) => ({ ...p, headroom: p.headroom + 0.05 }), costPerMcm: 1.8 },
];

export interface LeverResult {
  id: Lever["id"];
  gapClosed: number;
  costM: number;
  costPerMcm: number;
}

export function compareLevers(world: World, areaFor: (year: number) => SmallArea, baseYear: number, p: WaterParams, year = 2040): { baseGap: number; levers: LeverResult[]; package: Lever["id"][] } {
  const at = (r: WaterResult) => r.national.find((x) => x.year === year)!;
  const base = simulateWater(world, areaFor, baseYear, year, p, year);
  const baseGap = at(base).requirement - at(base).supply;
  const levers = LEVERS.map((l) => {
    const r = simulateWater(world, areaFor, baseYear, year, l.apply(p), year);
    const gap = at(r).requirement - at(r).supply;
    const closed = baseGap - gap;
    return { id: l.id, gapClosed: closed, costM: Math.max(0, closed) * l.costPerMcm, costPerMcm: l.costPerMcm };
  });
  // cheapest-first package until the gap is closed
  const pkg: Lever["id"][] = [];
  let remaining = baseGap;
  for (const l of [...levers].sort((a, b) => a.costPerMcm - b.costPerMcm)) {
    if (remaining <= 0) break;
    if (l.gapClosed <= 0) continue;
    pkg.push(l.id);
    remaining -= l.gapClosed;
  }
  return { baseGap, levers, package: pkg };
}
