/**
 * Regional economy (SIMULATED, calibrated to open national data).
 *
 *   GRP_g (base)  = Σ_sector employed_g,s × productivity_s × urban premium_g, scaled so that
 *                   Σ_g GRP_g = national GDP (World Bank WDI, latest year, at the JOD peg)
 *   GDP (t)       = GDP (base) × (1 + growth)^(t − base)
 *   GRP_g (t)     = GDP (t) × share_g × (population growth_g ÷ national population growth)^0.6
 *   diversification (HHI) = Σ_s (employment share_s)²   ·   public dependency = public admin + education + health share
 *   spatial inequality    = Theil index of GRP per capita across governorates (population-weighted)
 *
 * Employment by sector comes from the synthetic census microdata; productivity ratios are
 * illustrative planning assumptions. Imported official GRP shares replace the modelled shares.
 */
import type { GovId } from "@/types/census";
import type { World } from "../generate";
import { computeProfile, SECTORS } from "../analytics";
import { calibration } from "@/data/openData";
import type { SmallArea } from "./common";

export type EconSector = (typeof SECTORS)[number];

/** Output per worker relative to the national average (illustrative). */
export const PRODUCTIVITY: Record<EconSector, number> = {
  AGRICULTURE: 0.55, MANUFACTURING: 1.35, CONSTRUCTION: 0.9, TRADE: 0.85, TRANSPORT: 1.2, HOSPITALITY: 0.75,
  ICT_FINANCE: 2.4, PUBLIC_ADMIN: 1.0, EDUCATION: 0.85, HEALTH: 0.95, OTHER_SERVICES: 0.7,
};
export const TRADABLE: EconSector[] = ["AGRICULTURE", "MANUFACTURING", "TRANSPORT", "HOSPITALITY", "ICT_FINANCE"];
export const PUBLIC: EconSector[] = ["PUBLIC_ADMIN", "EDUCATION", "HEALTH"];

export interface EconomyParams {
  gdpGrowth: number;
  /** overrides the World Bank calibration (JOD bn) when set */
  gdpJodBn?: number;
  /** imported official GRP shares by governorate */
  grpShare?: Partial<Record<GovId, number>>;
}

export const DEFAULT_ECONOMY: EconomyParams = { gdpGrowth: 0.027 };

export interface GovEconomy {
  employed: number;
  sectorShare: Record<EconSector, number>;
  grpBase: number; // JOD M
  grpH: number;
  perCapBase: number; // JOD
  perCapH: number;
  index: number; // GRP per capita ÷ national
  hhi: number;
  topSector: EconSector;
  tradableShare: number;
  publicShare: number;
  dependency: number; // residents per employed
  imported: boolean;
}

export interface EconomyResult {
  params: EconomyParams;
  gdpBase: number; // JOD M
  gdpYear: number | null;
  baseYear: number;
  year: number;
  series: { year: number; gdp: number; perCap: number }[];
  byGov: Record<GovId, GovEconomy>;
  national: { perCapBase: number; perCapH: number; hhi: number; publicShare: number; tradableShare: number; theilBase: number; theilH: number };
}

function theil(vals: { pop: number; perCap: number }[]) {
  const P = vals.reduce((s, v) => s + v.pop, 0);
  const mu = vals.reduce((s, v) => s + v.pop * v.perCap, 0) / Math.max(1, P);
  return vals.reduce((s, v) => s + (v.pop / P) * (v.perCap / mu) * Math.log(Math.max(1e-9, v.perCap / mu)), 0);
}

export function assessEconomy(world: World, areaFor: (y: number) => SmallArea, baseYear: number, year: number, p: EconomyParams = DEFAULT_ECONOMY): EconomyResult {
  const cal = calibration();
  const gdpBase = (p.gdpJodBn ?? cal.gdpJodBn) * 1000;
  const sa0 = areaFor(baseYear);
  const saH = areaFor(year);
  const np = computeProfile(world);
  const natUrban = np.urban / Math.max(1, np.population);
  const raw: Record<string, number> = {};
  const pre: Record<string, Omit<GovEconomy, "grpBase" | "grpH" | "perCapBase" | "perCapH" | "index" | "imported">> = {};
  for (const g of world.governorates) {
    const gp = computeProfile(world, { govId: g.id });
    const totalSec = SECTORS.reduce((s, k) => s + gp.labour.sector[k], 0) || 1;
    const sectorShare = Object.fromEntries(SECTORS.map((k) => [k, gp.labour.sector[k] / totalSec])) as Record<EconSector, number>;
    const empRate = gp.labour.employed / Math.max(1, gp.groups.a15_64);
    const employed = sa0.gov[g.id].a15_64 * empRate;
    const urbanPremium = 1 + 0.35 * (gp.urban / Math.max(1, gp.population) - natUrban);
    raw[g.id] = employed * SECTORS.reduce((s, k) => s + sectorShare[k] * PRODUCTIVITY[k], 0) * urbanPremium;
    const top = [...SECTORS].sort((a, b) => sectorShare[b] - sectorShare[a])[0];
    pre[g.id] = {
      employed, sectorShare,
      hhi: SECTORS.reduce((s, k) => s + sectorShare[k] ** 2, 0),
      topSector: top,
      tradableShare: TRADABLE.reduce((s, k) => s + sectorShare[k], 0),
      publicShare: PUBLIC.reduce((s, k) => s + sectorShare[k], 0),
      dependency: sa0.gov[g.id].pop / Math.max(1, employed),
    };
  }
  const rawTotal = Object.values(raw).reduce((s, v) => s + v, 0);
  const importedTotal = p.grpShare ? Object.values(p.grpShare).reduce((s: number, v) => s + (v ?? 0), 0) : 0;
  const share = (id: GovId) => (p.grpShare?.[id] !== undefined && importedTotal > 0 ? p.grpShare[id]! / importedTotal : raw[id] / rawTotal);
  const yrs = year - baseYear;
  const gdpH = gdpBase * (1 + p.gdpGrowth) ** yrs;
  const natGrowth = saH.national.pop / Math.max(1, sa0.national.pop);
  const hRaw: Record<string, number> = {};
  for (const g of world.governorates) hRaw[g.id] = share(g.id) * ((saH.gov[g.id].pop / Math.max(1, sa0.gov[g.id].pop)) / natGrowth) ** 0.6;
  const hTot = Object.values(hRaw).reduce((s, v) => s + v, 0);
  const perCapBaseNat = (gdpBase * 1e6) / sa0.national.pop;
  const perCapHNat = (gdpH * 1e6) / saH.national.pop;
  const byGov = {} as Record<GovId, GovEconomy>;
  for (const g of world.governorates) {
    const grpBase = gdpBase * share(g.id);
    const grpH = gdpH * (hRaw[g.id] / hTot);
    const perCapBase = (grpBase * 1e6) / Math.max(1, sa0.gov[g.id].pop);
    const perCapH = (grpH * 1e6) / Math.max(1, saH.gov[g.id].pop);
    byGov[g.id] = { ...pre[g.id], grpBase, grpH, perCapBase, perCapH, index: perCapH / perCapHNat, imported: p.grpShare?.[g.id] !== undefined };
  }
  const natShares = Object.fromEntries(SECTORS.map((k) => [k, world.governorates.reduce((s, g) => s + byGov[g.id].sectorShare[k] * byGov[g.id].employed, 0) / Math.max(1, world.governorates.reduce((s, g) => s + byGov[g.id].employed, 0))])) as Record<EconSector, number>;
  const series: EconomyResult["series"] = [];
  for (let y = baseYear; y <= 2050; y++) {
    const pop = areaFor(Math.min(2050, Math.max(baseYear, y))).national.pop;
    const gdp = gdpBase * (1 + p.gdpGrowth) ** (y - baseYear);
    series.push({ year: y, gdp, perCap: (gdp * 1e6) / pop });
  }
  return {
    params: p, gdpBase, gdpYear: p.gdpJodBn ? null : cal.gdpYear, baseYear, year, series, byGov,
    national: {
      perCapBase: perCapBaseNat, perCapH: perCapHNat,
      hhi: SECTORS.reduce((s, k) => s + natShares[k] ** 2, 0),
      publicShare: PUBLIC.reduce((s, k) => s + natShares[k], 0),
      tradableShare: TRADABLE.reduce((s, k) => s + natShares[k], 0),
      theilBase: theil(world.governorates.map((g) => ({ pop: sa0.gov[g.id].pop, perCap: byGov[g.id].perCapBase }))),
      theilH: theil(world.governorates.map((g) => ({ pop: saH.gov[g.id].pop, perCap: byGov[g.id].perCapH }))),
    },
  };
}
