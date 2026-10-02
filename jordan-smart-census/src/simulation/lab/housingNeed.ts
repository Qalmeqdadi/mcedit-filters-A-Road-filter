/**
 * Housing need forecast (SIMULATED).
 *
 *   need(t)  = new households (Δ projected households)
 *            + replacement of obsolete stock (stock × replacement rate)
 *            + backlog ÷ clearance years, backlog = crowded households (> 2 persons/room) × share to resolve
 *                                                  + tents / caravans (inadequate dwellings)
 *            − release of excess vacancy (vacant stock above a natural 8 %) × release share, spread to 2040
 *   gap(t)   = Σ (need − completions)
 *   land     = units ÷ density (apartments 60 units/ha, houses 20 units/ha), mix follows the urban share
 *
 * Stock, vacancy, crowding and dwelling type come from the synthetic census frame and microdata.
 */
import type { GovId } from "@/types/census";
import type { World } from "../generate";
import { computeProfile } from "../analytics";
import type { SmallArea } from "./common";

export interface HousingParams {
  replacementRate: number;
  crowdingResolve: number;
  backlogYears: number;
  vacancyRelease: number;
  /** completions per year, national; null = auto (85 % of first-decade average need) */
  completions: number | null;
  aptDensity: number;
  houseDensity: number;
}

export const DEFAULT_HOUSING: HousingParams = { replacementRate: 0.005, crowdingResolve: 0.5, backlogYears: 15, vacancyRelease: 0.15, completions: null, aptDensity: 60, houseDensity: 20 };

export interface HousingYear {
  year: number;
  households: number;
  newHouseholds: number;
  replacement: number;
  backlog: number;
  vacancyRelease: number;
  need: number;
  completions: number;
  cumulativeGap: number;
}

export interface HousingResult {
  params: HousingParams;
  completions: number;
  national: HousingYear[];
  byGov: Record<GovId, { stock: number; vacant: number; crowdedShare: number; inadequate: number; need2035: number; need2050: number; per1000: number; aptShare: number; landHa2035: number }>;
  byDistrict: Record<string, number>;
  base: { stock: number; vacant: number; crowded: number; inadequate: number };
}

export function forecastHousing(world: World, areaFor: (year: number) => SmallArea, baseYear: number, endYear: number, p: HousingParams): HousingResult {
  const govs = world.governorates.map((g) => g.id);
  const stock0: Record<string, number> = Object.fromEntries(govs.map((g) => [g, 0]));
  const vac0: Record<string, number> = Object.fromEntries(govs.map((g) => [g, 0]));
  for (const e of world.eas) {
    stock0[e.govId] += e.dwellingsTrue;
    vac0[e.govId] += e.vacantTrue;
  }
  const sa0 = areaFor(baseYear);
  const crowdShare: Record<string, number> = {};
  const inadequate: Record<string, number> = {};
  const backlog: Record<string, number> = {};
  const release: Record<string, number> = {};
  const releaseYears = Math.max(1, 2040 - baseYear);
  for (const g of govs) {
    const prof = computeProfile(world, { govId: g });
    const hh = Math.max(1, prof.households);
    crowdShare[g] = prof.housing.crowded / hh;
    inadequate[g] = (prof.housing.type.TENT_CARAVAN / hh) * sa0.gov[g].households;
    backlog[g] = crowdShare[g] * sa0.gov[g].households * p.crowdingResolve + inadequate[g];
    release[g] = (Math.max(0, vac0[g] - 0.08 * stock0[g]) * p.vacancyRelease) / releaseYears;
  }
  const years: number[] = [];
  for (let y = baseYear + 1; y <= endYear; y++) years.push(y);
  const perGov: Record<string, { year: number; need: number }[]> = Object.fromEntries(govs.map((g) => [g, []]));
  const stock: Record<string, number> = { ...stock0 };
  let prev = sa0;
  const rows: Omit<HousingYear, "completions" | "cumulativeGap">[] = [];
  for (const y of years) {
    const sa = areaFor(y);
    const r = { year: y, households: 0, newHouseholds: 0, replacement: 0, backlog: 0, vacancyRelease: 0, need: 0 };
    for (const g of govs) {
      const nh = Math.max(0, sa.gov[g].households - prev.gov[g].households);
      const rep = stock[g] * p.replacementRate;
      const bl = y - baseYear <= p.backlogYears ? backlog[g] / p.backlogYears : 0;
      const rel = y <= 2040 ? release[g] : 0;
      const need = Math.max(0, nh + rep + bl - rel);
      stock[g] += need;
      perGov[g].push({ year: y, need });
      r.households += sa.gov[g].households;
      r.newHouseholds += nh;
      r.replacement += rep;
      r.backlog += bl;
      r.vacancyRelease += rel;
      r.need += need;
    }
    rows.push(r);
    prev = sa;
  }
  const firstDecade = rows.slice(0, 10);
  const completions = p.completions ?? Math.round((0.85 * firstDecade.reduce((s, r) => s + r.need, 0)) / Math.max(1, firstDecade.length) / 500) * 500;
  let cum = 0;
  const national: HousingYear[] = rows.map((r) => {
    cum += r.need - completions;
    return { ...r, completions, cumulativeGap: cum };
  });
  const byGov = {} as HousingResult["byGov"];
  const byDistrict: Record<string, number> = {};
  for (const g of govs) {
    const need2035 = perGov[g].filter((x) => x.year <= 2035).reduce((s, x) => s + x.need, 0);
    const need2050 = perGov[g].reduce((s, x) => s + x.need, 0);
    const aptShare = Math.min(0.95, Math.max(0.3, (sa0.gov[g].urban / sa0.gov[g].pop) * 0.85));
    byGov[g] = {
      stock: stock0[g],
      vacant: vac0[g],
      crowdedShare: crowdShare[g],
      inadequate: inadequate[g],
      need2035,
      need2050,
      per1000: (need2035 / Math.max(1, sa0.gov[g].households)) * 1000,
      aptShare,
      landHa2035: need2035 * (aptShare / p.aptDensity + (1 - aptShare) / p.houseDensity),
    };
    // district split by household growth (fallback: base households)
    const sa35 = areaFor(Math.min(endYear, 2035));
    const ds = world.districts.filter((d) => d.govId === g);
    const w = ds.map((d) => Math.max(0, sa35.district[d.id].households - sa0.district[d.id].households) + 0.15 * sa0.district[d.id].households * (need2035 / Math.max(1, sa0.gov[g].households)));
    const sw = w.reduce((a, b) => a + b, 0) || 1;
    ds.forEach((d, i) => (byDistrict[d.id] = (need2035 * w[i]) / sw / Math.max(1, sa0.district[d.id].households) * 1000));
  }
  return {
    params: p,
    completions,
    national,
    byGov,
    byDistrict,
    base: { stock: Object.values(stock0).reduce((a, b) => a + b, 0), vacant: Object.values(vac0).reduce((a, b) => a + b, 0), crowded: govs.reduce((s, g) => s + crowdShare[g] * sa0.gov[g].households, 0), inadequate: govs.reduce((s, g) => s + inadequate[g], 0) },
  };
}
