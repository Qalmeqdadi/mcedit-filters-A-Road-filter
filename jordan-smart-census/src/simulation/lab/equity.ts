/**
 * Equity & SDG localisation (SIMULATED census + model outputs; open data where noted).
 *
 *   Opportunity Index_g = 100 × mean over 7 dimensions of (value_g − worst) ÷ (best − worst)
 *     income (GRP per capita) · work (1 − unemployment, 1 − youth NEET) · education (secondary+
 *     attainment, school seats) · health (insurance, primary-care access) · housing (not crowded,
 *     adequate) · basic services (piped water, sewer) · environment (not at heat risk)
 *   District index uses the census dimensions available at district level.
 *   SDG status: on track if the value meets the target, moderate if within the tolerance band,
 *   otherwise off track. Targets are illustrative national planning targets, not official ones.
 */
import type { GovId, L } from "@/types/census";
import type { World } from "../generate";
import { computeProfile } from "../analytics";
import { calibration } from "@/data/openData";
import type { SitingAnalysis } from "./facilities";
import type { WaterResult } from "./water";
import type { ClimateResult } from "./climate";
import type { HousingResult } from "./housingNeed";
import type { EconomyResult } from "./economy";
import type { EnergyResult } from "./energy";

export type Dimension = "income" | "work" | "education" | "health" | "housing" | "services" | "environment";
export const DIMENSIONS: Dimension[] = ["income", "work", "education", "health", "housing", "services", "environment"];
export const DIMENSION_LABEL: Record<Dimension, L> = {
  income: { en: "Income", ar: "الدخل" },
  work: { en: "Work", ar: "العمل" },
  education: { en: "Education", ar: "التعليم" },
  health: { en: "Health", ar: "الصحة" },
  housing: { en: "Housing", ar: "السكن" },
  services: { en: "Basic services", ar: "الخدمات الأساسية" },
  environment: { en: "Environment", ar: "البيئة" },
};

export type SdgStatus = "ON_TRACK" | "MODERATE" | "OFF_TRACK";

export interface SdgIndicator {
  key: string;
  sdg: number;
  target: string;
  label: L;
  /** higher is better? */
  up: boolean;
  goal: number;
  tolerance: number;
  unit: "pct" | "ratio";
  national: number;
  byGov: Record<GovId, number>;
  status: SdgStatus;
  source: string;
}

export interface EquityResult {
  year: number;
  raw: Record<GovId, Record<string, number>>;
  dims: Record<GovId, Record<Dimension, number>>;
  index: Record<GovId, number>;
  nationalIndex: number;
  districts: { id: string; govId: GovId; index: number; pop: number; weakest: Dimension }[];
  sdgs: SdgIndicator[];
}

export const statusOf = (v: number, goal: number, tol: number, up: boolean): SdgStatus => {
  const d = up ? v - goal : goal - v;
  return d >= 0 ? "ON_TRACK" : d >= -tol ? "MODERATE" : "OFF_TRACK";
};

interface Inputs { school: SitingAnalysis; phc: SitingAnalysis; water: WaterResult; climate: ClimateResult; housing: HousingResult; economy: EconomyResult; energy: EnergyResult }

export function assessEquity(world: World, year: number, x: Inputs): EquityResult {
  const govs = world.governorates.map((g) => g.id);
  const prof = (scope: { govId?: GovId; districtId?: string }) => {
    const p = computeProfile(world, scope);
    const hh = Math.max(1, p.households);
    const lf = p.labour.employed + p.labour.unemployed;
    let fA = 0, fT = 0;
    for (const b of p.labour.byBand) { fA += b.fE + b.fU; fT += b.fE + b.fU + b.fO; }
    return {
      unemployment: p.labour.unemployed / Math.max(1, lf),
      neet: p.labour.youth.neet / Math.max(1, p.labour.youth.pop),
      secondary: p.education.secondaryPlus25 / Math.max(1, p.education.pop25),
      insured: p.health.insured / Math.max(1, p.population),
      crowded: p.housing.crowded / hh,
      piped: (p.housing.water.PUBLIC_NETWORK ?? 0) / hh,
      sewer: (p.housing.sanitation.PUBLIC_SEWER ?? 0) / hh,
      electricity: p.housing.electricity / hh,
      internet: p.housing.internet / hh,
      femaleLfp: fA / Math.max(1, fT),
      pop: p.population,
    };
  };
  const heat: Record<string, { risk: number; pop: number }> = Object.fromEntries(govs.map((g) => [g, { risk: 0, pop: 0 }]));
  for (const d of x.climate.districts) { const g = world.district[d.id].govId; heat[g].risk += d.atRisk; heat[g].pop += d.pop; }
  const raw = {} as Record<GovId, Record<string, number>>;
  for (const g of govs) {
    const p = prof({ govId: g });
    const wy = x.water.byGov[g].find((w) => w.year === year) ?? x.water.byGov[g][x.water.byGov[g].length - 1];
    raw[g] = {
      ...p,
      income: x.economy.byGov[g].perCapH,
      schoolGap: x.school.byGov[g].gap / Math.max(1, x.school.byGov[g].demand),
      phcAccess: x.phc.byGov[g].accessCovered / Math.max(1, x.phc.byGov[g].accessDemand),
      inadequate: x.housing.byGov[g].inadequate / Math.max(1, x.housing.byGov[g].stock),
      heatRisk: heat[g].risk / Math.max(1, heat[g].pop),
      waterRatio: wy.ratio,
    };
  }
  const norm = (key: string, up: boolean) => {
    const vs = govs.map((g) => raw[g][key]);
    const lo = Math.min(...vs), hi = Math.max(...vs);
    return (g: GovId) => (hi === lo ? 1 : up ? (raw[g][key] - lo) / (hi - lo) : (hi - raw[g][key]) / (hi - lo));
  };
  const n = {
    income: norm("income", true), un: norm("unemployment", false), neet: norm("neet", false), sec: norm("secondary", true), gap: norm("schoolGap", false),
    ins: norm("insured", true), acc: norm("phcAccess", true), crowd: norm("crowded", false), inad: norm("inadequate", false), piped: norm("piped", true), sewer: norm("sewer", true), heat: norm("heatRisk", false),
  };
  const dims = {} as EquityResult["dims"];
  const index = {} as Record<GovId, number>;
  for (const g of govs) {
    dims[g] = { income: n.income(g), work: (n.un(g) + n.neet(g)) / 2, education: (n.sec(g) + n.gap(g)) / 2, health: (n.ins(g) + n.acc(g)) / 2, housing: (n.crowd(g) + n.inad(g)) / 2, services: (n.piped(g) + n.sewer(g)) / 2, environment: n.heat(g) };
    index[g] = (100 * DIMENSIONS.reduce((s, d) => s + dims[g][d], 0)) / DIMENSIONS.length;
  }
  const totalPop = govs.reduce((s, g) => s + raw[g].pop, 0);
  const nationalIndex = govs.reduce((s, g) => s + index[g] * raw[g].pop, 0) / Math.max(1, totalPop);

  // districts
  const dRaw = world.districts.map((d) => ({ d, p: prof({ districtId: d.id }) }));
  const dn = (f: (p: ReturnType<typeof prof>) => number, up: boolean) => {
    const vs = dRaw.map((r) => f(r.p));
    const lo = Math.min(...vs), hi = Math.max(...vs);
    return (p: ReturnType<typeof prof>) => (hi === lo ? 1 : up ? (f(p) - lo) / (hi - lo) : (hi - f(p)) / (hi - lo));
  };
  const dd = { work: dn((p) => p.unemployment, false), neet: dn((p) => p.neet, false), edu: dn((p) => p.secondary, true), health: dn((p) => p.insured, true), housing: dn((p) => p.crowded, false), piped: dn((p) => p.piped, true), sewer: dn((p) => p.sewer, true) };
  const districts = dRaw.filter((r) => r.p.pop > 0).map(({ d, p }) => {
    const parts: Partial<Record<Dimension, number>> = { work: (dd.work(p) + dd.neet(p)) / 2, education: dd.edu(p), health: dd.health(p), housing: dd.housing(p), services: (dd.piped(p) + dd.sewer(p)) / 2 };
    const vals = Object.entries(parts) as [Dimension, number][];
    return { id: d.id, govId: d.govId, pop: p.pop, index: (100 * vals.reduce((s, [, v]) => s + v, 0)) / vals.length, weakest: vals.sort((a, b) => a[1] - b[1])[0][0] };
  }).sort((a, b) => a.index - b.index);

  // SDG localisation
  const w = (key: string) => govs.reduce((s, g) => s + raw[g][key] * raw[g].pop, 0) / Math.max(1, totalPop);
  const cal = calibration();
  const mk = (key: string, sdg: number, target: string, label: L, up: boolean, goal: number, tolerance: number, source: string, nat?: number, unit: "pct" | "ratio" = "pct"): SdgIndicator => {
    const national = nat ?? w(key);
    const byGov = Object.fromEntries(govs.map((g) => [g, raw[g][key] ?? national])) as Record<GovId, number>;
    return { key, sdg, target, label, up, goal, tolerance, unit, national, byGov, status: statusOf(national, goal, tolerance, up), source };
  };
  const sdgs: SdgIndicator[] = [
    mk("unemployment", 8, "8.5", { en: "Unemployment rate", ar: "معدل البطالة" }, false, 0.12, 0.04, "SIM_MICRODATA"),
    mk("neet", 8, "8.6", { en: "Youth not in employment, education or training", ar: "الشباب خارج العمل والتعليم والتدريب" }, false, 0.2, 0.08, "SIM_MICRODATA"),
    mk("femaleLfp", 5, "5.5", { en: "Women's labour-force participation", ar: "مشاركة المرأة في القوى العاملة" }, true, 0.27, 0.07, "SIM_MICRODATA"),
    mk("secondary", 4, "4.1", { en: "Adults 25+ with secondary education or more", ar: "البالغون 25+ بتعليم ثانوي فأعلى" }, true, 0.7, 0.1, "SIM_MICRODATA"),
    mk("schoolGap", 4, "4.a", { en: `School seat gap ${year}`, ar: `فجوة المقاعد المدرسية ${year}` }, false, 0.01, 0.04, "SIM_FACILITIES"),
    mk("insured", 3, "3.8", { en: "Population with health insurance", ar: "السكان المؤمَّنون صحياً" }, true, 0.9, 0.15, "SIM_MICRODATA"),
    mk("phcAccess", 3, "3.8", { en: "Within reach of a health centre", ar: "ضمن نطاق مركز صحي" }, true, 0.97, 0.05, "SIM_FACILITIES"),
    mk("piped", 6, "6.1", { en: "Households on the public water network", ar: "الأسر الموصولة بشبكة المياه العامة" }, true, 0.95, 0.08, "SIM_MICRODATA"),
    mk("sewer", 6, "6.2", { en: "Households on the public sewer", ar: "الأسر الموصولة بشبكة الصرف الصحي" }, true, 0.75, 0.15, "SIM_MICRODATA"),
    mk("waterRatio", 6, "6.4", { en: `Water supply ÷ requirement ${year}`, ar: `الإمداد المائي ÷ الاحتياج ${year}` }, true, 1, 0.15, "SIM_WATER", undefined, "ratio"),
    mk("electricity", 7, "7.1", { en: "Households with electricity", ar: "الأسر الموصولة بالكهرباء" }, true, 0.99, 0.02, "SIM_MICRODATA"),
    mk("renewables", 7, "7.2", { en: `Renewable share of electricity (${cal.renewablesYear ?? "latest"})`, ar: `حصة المصادر المتجددة من الكهرباء (${cal.renewablesYear ?? "الأحدث"})` }, true, 0.31, 0.08, "OPEN_OWID_ENERGY", cal.renewablesShare),
    mk("internet", 9, "9.c", { en: "Households with internet", ar: "الأسر الموصولة بالإنترنت" }, true, 0.95, 0.1, "SIM_MICRODATA"),
    mk("theil", 10, "10.1", { en: `Spatial income inequality (Theil) ${year}`, ar: `عدم المساواة المكانية في الدخل (ثايل) ${year}` }, false, 0.02, 0.03, "SIM_ECONOMY", x.economy.national.theilH, "ratio"),
    mk("crowded", 11, "11.1", { en: "Overcrowded households", ar: "الأسر المكتظة" }, false, 0.05, 0.05, "SIM_MICRODATA"),
    mk("heatRisk", 13, "13.1", { en: `Population at high heat risk ${year}`, ar: `السكان المعرضون لخطر حر مرتفع ${year}` }, false, 0.05, 0.05, "SIM_CLIMATE"),
  ];
  for (const s of sdgs) if (s.key === "renewables") for (const g of govs) s.byGov[g] = cal.renewablesShare;
  for (const s of sdgs) if (s.key === "theil") for (const g of govs) s.byGov[g] = x.economy.national.theilH;
  return { year, raw, dims, index, nationalIndex, districts, sdgs };
}
