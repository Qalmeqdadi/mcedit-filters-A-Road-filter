/**
 * Municipal & local finance (SIMULATED, illustrative fiscal parameters).
 *
 *   investment need_g     = Σ indicative cost of the governorate's corrective actions (all sectors)
 *   central capital_g     = national capital budget × population share × (1 + equalisation × (1 − income index))
 *   own-source capital_g  = own revenue per capita_g × population × capital share
 *       own revenue per capita_g = national average × income index^0.8 × (0.85 + 0.3 × urban share), unless imported
 *   fiscal space_g        = (central + own-source) × years to the horizon × share available for new investment
 *   coverage              = fiscal space ÷ investment need   ·   gap = need − fiscal space
 *   financing options     = land-value capture on new urban land, PPP-eligible projects (water, energy,
 *                           mobility, hospitals), development-partner grants for equity programmes
 */
import type { GovId } from "@/types/census";
import type { World } from "../generate";
import type { ActionItem } from "./actions";
import type { EconomyResult } from "./economy";
import type { LandResult } from "./land";
import type { SmallArea } from "./common";

export interface FinanceParams {
  nationalCapitalM: number; // JOD M per year, all governorates
  newInvestmentShare: number; // share of capital budgets available for new projects
  equalisation: number;
  ownRevenuePc: number; // JOD per resident per year, national average
  ownCapitalShare: number;
  lvcPerM2: number; // land-value uplift captured, JOD per m² of new urban land
  /** imported municipal own-source revenue per capita */
  ownRevenueImported?: Partial<Record<GovId, number>>;
}

export const DEFAULT_FINANCE: FinanceParams = { nationalCapitalM: 1300, newInvestmentShare: 0.35, equalisation: 0.4, ownRevenuePc: 48, ownCapitalShare: 0.3, lvcPerM2: 6 };

export interface GovFinance {
  needM: number;
  centralM: number; // per year
  ownM: number; // per year
  ownRevenuePc: number;
  spaceM: number; // over the horizon
  coverage: number;
  gapM: number;
  lvcM: number;
  pppM: number;
  grantsM: number;
  residualGapM: number;
  imported: boolean;
}

export interface FinanceResult {
  params: FinanceParams;
  years: number;
  byGov: Record<GovId, GovFinance>;
  national: { needM: number; spaceM: number; gapM: number; lvcM: number; pppM: number; grantsM: number; residualGapM: number; coverage: number };
}

const PPP_SECTORS = new Set(["WATER", "ENERGY", "MOBILITY"]);

export function assessFinance(world: World, sa0: SmallArea, year: number, actionsByGov: Record<GovId, ActionItem[]>, economy: EconomyResult, land: LandResult, p: FinanceParams = DEFAULT_FINANCE): FinanceResult {
  const years = Math.max(1, year - sa0.year);
  const byGov = {} as Record<GovId, GovFinance>;
  for (const g of world.governorates) {
    const acts = (actionsByGov[g.id] ?? []).filter((a) => a.sector !== "FINANCE");
    const needM = acts.reduce((s, a) => s + a.costM, 0);
    const pop = sa0.gov[g.id].pop;
    const popShare = pop / Math.max(1, sa0.national.pop);
    const idx = economy.byGov[g.id].index;
    const centralM = p.nationalCapitalM * popShare * (1 + p.equalisation * (1 - idx));
    const urban = sa0.gov[g.id].urban / Math.max(1, pop);
    const ownRevenuePc = p.ownRevenueImported?.[g.id] ?? p.ownRevenuePc * Math.max(0.3, idx) ** 0.8 * (0.85 + 0.3 * urban);
    const ownM = (ownRevenuePc * pop * p.ownCapitalShare) / 1e6;
    const spaceM = (centralM + ownM) * years * p.newInvestmentShare;
    const gapM = Math.max(0, needM - spaceM);
    const lvcM = Math.min(gapM, (land.byGov[g.id].demandKm2 * 1e6 * p.lvcPerM2) / 1e6);
    const pppM = Math.min(gapM - lvcM, acts.filter((a) => PPP_SECTORS.has(a.sector) || /hospital/i.test(a.title.en)).reduce((s, a) => s + a.costM, 0) * 0.4);
    const grantsM = Math.min(gapM - lvcM - pppM, acts.filter((a) => a.sector === "EQUITY" || a.sector === "CLIMATE").reduce((s, a) => s + a.costM, 0) * 0.5);
    byGov[g.id] = { needM, centralM, ownM, ownRevenuePc, spaceM, coverage: needM > 0 ? spaceM / needM : 9, gapM, lvcM, pppM, grantsM, residualGapM: Math.max(0, gapM - lvcM - pppM - grantsM), imported: p.ownRevenueImported?.[g.id] !== undefined };
  }
  const sum = (k: keyof GovFinance) => world.governorates.reduce((s, g) => s + (byGov[g.id][k] as number), 0);
  const needM = sum("needM");
  return { params: p, years, byGov, national: { needM, spaceM: sum("spaceM"), gapM: sum("gapM"), lvcM: sum("lvcM"), pppM: sum("pppM"), grantsM: sum("grantsM"), residualGapM: sum("residualGapM"), coverage: needM > 0 ? sum("spaceM") / needM : 9 } };
}
