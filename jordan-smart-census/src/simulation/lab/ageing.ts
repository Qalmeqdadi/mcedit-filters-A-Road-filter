/**
 * Ageing & care demand (SIMULATED).
 *
 *   old-age dependency ratio = population 65+ ÷ population 15–64 × 100
 *   long-term care need      = (65–79) × need share₆₅ + (80+) × need share₈₀
 *   residential beds         = care need × residential share
 *   home-care clients        = care need × (1 − residential share) × home-care coverage
 *   care workforce           = beds ÷ 2.5 + home-care clients ÷ 8
 *   functional difficulty    = Σ projected population by age band × prevalence (Washington Group, census microdata)
 *   geriatric visits         = 65+ × visits per older person per year
 */
import type { GovId, ProjectionPoint } from "@/types/census";
import type { World } from "../generate";
import { computeProfile } from "../analytics";
import { MAX_AGE } from "../projection";
import { sumAges, type SmallArea } from "./common";

export interface AgeingParams {
  need65: number;
  need80: number;
  residentialShare: number;
  homeCareCoverage: number;
  visitsPerOlder: number;
}

export const DEFAULT_AGEING: AgeingParams = { need65: 0.06, need80: 0.25, residentialShare: 0.08, homeCareCoverage: 0.35, visitsPerOlder: 6 };

const HEALTH_AGES: [number, number][] = [[5, 17], [18, 39], [40, 59], [60, 74], [75, MAX_AGE]];

export interface AgeingYear {
  year: number;
  a65: number;
  a80: number;
  share65: number;
  oadr: number;
  supportRatio: number;
  medianAge: number;
  careNeed: number;
  beds: number;
  homeClients: number;
  workforce: number;
  disabled: number;
  disabledShare: number;
  visits: number;
}

export interface AgeingResult {
  params: AgeingParams;
  prevalence: number[];
  series: AgeingYear[];
  byGov: Record<GovId, { a65_0: number; a65_40: number; growth: number; beds2040: number; share2040: number }>;
}

export function medianAge(pt: ProjectionPoint) {
  const half = pt.population / 2;
  let acc = 0;
  for (let x = 0; x <= MAX_AGE; x++) {
    const n = pt.ages.m[x] + pt.ages.f[x];
    if (acc + n >= half) return x + (half - acc) / Math.max(1e-9, n);
    acc += n;
  }
  return MAX_AGE;
}

export function forecastAgeing(world: World, series: ProjectionPoint[], areaFor: (year: number) => SmallArea, p: AgeingParams): AgeingResult {
  const prof = computeProfile(world);
  const prevalence = prof.health.byBand.map((b) => b.disabled / Math.max(1, b.pop));
  const out: AgeingYear[] = series.map((pt) => {
    const a65 = pt.age65plus;
    const a80 = sumAges(pt, 80, MAX_AGE);
    const careNeed = (a65 - a80) * p.need65 + a80 * p.need80;
    const beds = careNeed * p.residentialShare;
    const homeClients = careNeed * (1 - p.residentialShare) * p.homeCareCoverage;
    let disabled = 0;
    HEALTH_AGES.forEach(([a, b], k) => (disabled += sumAges(pt, a, b) * prevalence[k]));
    return {
      year: pt.year,
      a65,
      a80,
      share65: a65 / pt.population,
      oadr: (a65 / Math.max(1, pt.age15_64)) * 100,
      supportRatio: pt.age15_64 / Math.max(1, a65),
      medianAge: medianAge(pt),
      careNeed,
      beds,
      homeClients,
      workforce: beds / 2.5 + homeClients / 8,
      disabled,
      disabledShare: disabled / pt.population,
      visits: a65 * p.visitsPerOlder,
    };
  });
  const base = series[0].year;
  const sa0 = areaFor(base);
  const sa40 = areaFor(Math.min(series[series.length - 1].year, 2040));
  const byGov = {} as AgeingResult["byGov"];
  for (const g of world.governorates) {
    const a0 = sa0.gov[g.id].a65;
    const a1 = sa40.gov[g.id].a65;
    const a80 = sa40.gov[g.id].a80;
    byGov[g.id] = { a65_0: a0, a65_40: a1, growth: a1 / Math.max(1, a0) - 1, beds2040: ((a1 - a80) * p.need65 + a80 * p.need80) * p.residentialShare, share2040: a1 / Math.max(1, sa40.gov[g.id].pop) };
  }
  return { params: p, prevalence, series: out, byGov };
}
