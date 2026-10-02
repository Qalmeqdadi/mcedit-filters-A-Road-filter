/**
 * Capital investment planner — budget-constrained portfolio (SIMULATED).
 *
 * Candidate projects are generated from the other Planning Lab models (2035 horizon):
 *   schools / health centres / hospitals — district capacity gaps, in packages
 *   social housing                       — 25 % of the 2026–2035 housing need, 2,000-unit packages
 *   water loss reduction                 — governorate water gaps in 2035
 *   rapid transit & cooling centres      — passed in from the Mobility and Climate models
 *
 *   score = w_eff · efficiency + w_eq · equity + w_urg · urgency      (each 0..1)
 *     efficiency = beneficiaries per JOD, rank-normalised within the project's sector
 *     equity     = deprivation index of the governorate (service gaps, unemployment, access)
 *     urgency    = 1 if the gap exists by 2030, 0.7 by 2035, 0.4 later
 *   selection = highest score first while it fits in the budget (greedy knapsack)
 *
 * Unit costs are illustrative assumptions, not ministry costings.
 */
import type { GovId, L } from "@/types/census";
import type { World } from "../generate";
import { computeProfile } from "../analytics";
import { DEFAULT_NORMS, type FacilityKind, type SitingAnalysis } from "./facilities";
import type { HousingResult } from "./housingNeed";
import type { WaterResult } from "./water";

export type Sector = "EDUCATION" | "HEALTH" | "HOUSING" | "WATER" | "TRANSPORT" | "CLIMATE";

export interface Project {
  id: string;
  sector: Sector;
  govId: GovId;
  name: L;
  costM: number;
  beneficiaries: number;
  urgency: number;
  equity: number;
  efficiency: number;
  score: number;
  unit: L;
  quantity: number;
}

export interface CapitalWeights {
  efficiency: number;
  equity: number;
  urgency: number;
  sector: Record<Sector, number>;
}

export const DEFAULT_WEIGHTS: CapitalWeights = { efficiency: 0.5, equity: 0.3, urgency: 0.2, sector: { EDUCATION: 1, HEALTH: 1, HOUSING: 1, WATER: 1, TRANSPORT: 1, CLIMATE: 1 } };

export const SOCIAL_HOUSING_UNIT_COST_M = 0.034;

export function deprivationIndex(world: World): Record<GovId, number> {
  const raw: Record<string, number> = {};
  for (const g of world.governorates) {
    const p = computeProfile(world, { govId: g.id });
    const h = Math.max(1, p.households);
    const water = 1 - p.housing.water.PUBLIC_NETWORK / h;
    const sewer = 1 - p.housing.sanitation.PUBLIC_SEWER / h;
    const unemp = p.labour.unemployed / Math.max(1, p.labour.employed + p.labour.unemployed);
    raw[g.id] = water * 0.25 + sewer * 0.25 + unemp * 1.5 * 0.25 + (1 - g.profile.accessibility) * 0.25;
  }
  const v = Object.values(raw);
  const lo = Math.min(...v);
  const hi = Math.max(...v);
  return Object.fromEntries(Object.entries(raw).map(([k, x]) => [k, hi > lo ? (x - lo) / (hi - lo) : 0.5])) as Record<GovId, number>;
}

export interface CapitalInputs {
  siting: Record<FacilityKind, SitingAnalysis>;
  sitingBase: Record<FacilityKind, SitingAnalysis>;
  housing: HousingResult;
  water: WaterResult;
  extra?: Omit<Project, "efficiency" | "score" | "equity">[];
}

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

export function buildProjects(world: World, inp: CapitalInputs): Omit<Project, "efficiency" | "score">[] {
  const dep = deprivationIndex(world);
  const out: Omit<Project, "efficiency" | "score">[] = [];
  const pkgSize: Record<FacilityKind, number> = { SCHOOL: 10, PHC: 4, HOSPITAL: 1 };
  const names: Record<FacilityKind, [string, string, Sector, L]> = {
    SCHOOL: ["schools", "مدارس", "EDUCATION", { en: "students", ar: "طالب" }],
    PHC: ["primary health centres", "مراكز صحية أولية", "HEALTH", { en: "residents", ar: "ساكن" }],
    HOSPITAL: ["hospital (150 beds)", "مستشفى (150 سريراً)", "HEALTH", { en: "residents", ar: "ساكن" }],
  };
  for (const kind of ["SCHOOL", "PHC", "HOSPITAL"] as FacilityKind[]) {
    const norms = DEFAULT_NORMS[kind];
    for (const g of world.governorates) {
      const gap = inp.siting[kind].byGov[g.id].gap;
      if (gap < norms.capacity * 0.5) continue;
      const urgency = inp.sitingBase[kind].byGov[g.id].gap > 0 ? 1 : 0.7;
      let n = Math.ceil(gap / norms.capacity);
      let k = 0;
      while (n > 0 && k < 6) {
        const q = Math.min(pkgSize[kind], n);
        const [en, ar, sector, unit] = names[kind];
        out.push({ id: `${kind}-${g.id}-${k + 1}`, sector, govId: g.id, name: { en: `${q} ${en} — ${g.name.en}${k ? ` (package ${k + 1})` : ""}`, ar: `${q} ${ar} — ${g.name.ar}${k ? ` (حزمة ${k + 1})` : ""}` }, costM: q * norms.costM, beneficiaries: Math.min(gap - k * pkgSize[kind] * norms.capacity, q * norms.capacity), urgency, equity: dep[g.id], unit, quantity: q });
        n -= q;
        k++;
      }
    }
  }
  for (const g of world.governorates) {
    const h = inp.housing.byGov[g.id];
    const units = Math.round((h.need2035 * 0.25) / 2000);
    for (let k = 0; k < Math.min(units, 5); k++) {
      out.push({ id: `HOUSING-${g.id}-${k + 1}`, sector: "HOUSING", govId: g.id, name: { en: `2,000 affordable homes — ${g.name.en}${k ? ` (package ${k + 1})` : ""}`, ar: `2,000 مسكن ميسور — ${g.name.ar}${k ? ` (حزمة ${k + 1})` : ""}` }, costM: 2000 * SOCIAL_HOUSING_UNIT_COST_M, beneficiaries: 2000 * 4.8, urgency: h.per1000 > 120 ? 1 : 0.7, equity: dep[g.id], unit: { en: "residents housed", ar: "ساكن" }, quantity: 2000 });
    }
    const w = inp.water.byGov[g.id].find((x) => x.year === 2035);
    if (w && w.gap > 0.5) {
      const mcm = Math.min(w.gap, w.requirement * 0.12);
      const peopleEq = (mcm * 1e9) / 365 / Math.max(40, w.deliveredLpcd / (1 - w.nrw));
      out.push({ id: `WATER-${g.id}`, sector: "WATER", govId: g.id, name: { en: `Water-loss reduction, ${fmt(mcm)} MCM/yr — ${g.name.en}`, ar: `خفض فاقد المياه ${fmt(mcm)} م.م³/سنة — ${g.name.ar}` }, costM: mcm * 1.2, beneficiaries: peopleEq, urgency: (inp.water.stressYear[g.id] ?? 2060) <= 2030 ? 1 : 0.7, equity: dep[g.id], unit: { en: "residents' supply restored", ar: "ساكن استعاد إمداده" }, quantity: mcm });
    }
  }
  for (const e of inp.extra ?? []) out.push({ ...e, equity: dep[e.govId] });
  return out;
}

export function scoreProjects(raw: Omit<Project, "efficiency" | "score">[], w: CapitalWeights): Project[] {
  // efficiency is ranked within each sector: "people served" is not comparable across sectors
  const ratios = raw.map((p) => p.beneficiaries / Math.max(0.01, p.costM));
  const bySector = new Map<Sector, number[]>();
  raw.forEach((p, i) => (bySector.get(p.sector) ?? bySector.set(p.sector, []).get(p.sector)!).push(ratios[i]));
  for (const v of bySector.values()) v.sort((a, b) => a - b);
  const rank = (sector: Sector, x: number) => {
    const v = bySector.get(sector)!;
    return v.length > 1 ? v.indexOf(x) / (v.length - 1) : 1;
  };
  return raw.map((p, i) => {
    const efficiency = rank(p.sector, ratios[i]);
    const score = (w.efficiency * efficiency + w.equity * p.equity + w.urgency * p.urgency) * (w.sector[p.sector] ?? 1);
    return { ...p, efficiency, score };
  });
}

export interface Portfolio {
  budgetM: number;
  selected: Project[];
  spentM: number;
  beneficiaries: number;
  bySector: Record<Sector, { costM: number; beneficiaries: number; count: number }>;
  byGov: Record<string, number>;
}

export function selectPortfolio(projects: Project[], budgetM: number): Portfolio {
  const order = [...projects].sort((a, b) => b.score - a.score || a.costM - b.costM);
  const selected: Project[] = [];
  let spent = 0;
  for (const p of order) {
    if (p.score <= 0) continue;
    if (spent + p.costM <= budgetM + 1e-9) {
      selected.push(p);
      spent += p.costM;
    }
  }
  const bySector = Object.fromEntries((["EDUCATION", "HEALTH", "HOUSING", "WATER", "TRANSPORT", "CLIMATE"] as Sector[]).map((s) => [s, { costM: 0, beneficiaries: 0, count: 0 }])) as Portfolio["bySector"];
  const byGov: Record<string, number> = {};
  for (const p of selected) {
    bySector[p.sector].costM += p.costM;
    bySector[p.sector].beneficiaries += p.beneficiaries;
    bySector[p.sector].count += 1;
    byGov[p.govId] = (byGov[p.govId] ?? 0) + p.costM;
  }
  return { budgetM, selected, spentM: spent, beneficiaries: selected.reduce((s, p) => s + p.beneficiaries, 0), bySector, byGov };
}

export function frontier(projects: Project[], maxM: number, steps = 24) {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const b = (maxM * i) / steps;
    const p = selectPortfolio(projects, b);
    return { budgetM: b, beneficiaries: p.beneficiaries, score: p.selected.reduce((s, x) => s + x.score, 0) };
  });
}
