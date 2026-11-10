/**
 * Fiscal & debt-dynamics engine (MODEL on an official baseline; scenario paths are ASSUMPTIONS).
 *
 * Accounting identities (no behavioural estimation — every effect enters through an explicit assumption):
 *   Y_t   = Y_{t−1} · (1 + g_t) · (1 + π_t)                          nominal GDP
 *   I_t   = r_t · D_{t−1}                                              interest (effective rate on last year's debt)
 *   PB_t  = pb_t · Y_t                                                 primary balance after grants
 *   D_t   = D_{t−1} + I_t − PB_t + sfa_t · Y_t                          debt (incl. SSIF holdings)
 * In ratios (d = D / Y):   d_t = d_{t−1} · (1 + r_t) / ((1 + g_t)(1 + π_t)) − pb_t + sfa_t
 *   → the ratio is stable when pb* = d · (r − n) / (1 + n), with n = nominal growth. With r ≈ n, as in Jordan
 *     in 2026, almost any sustained primary surplus lowers the ratio — and every 1 pp of extra real growth
 *     lowers it by about d / (1 + n) ≈ 1 pp a year.
 *
 *   SSIF holdings S_t = (S_{t−1}/Y_{t−1} + drift) · Y_t;  debt net of SSC = D − S   (the IMF programme definition)
 *   employment E_t = E_{t−1} · (1 + ε_t · g_t);  labour force LF_t = LF_{t−1} · (1 + p + Δpart_t);  u = 1 − E/LF
 *   u never falls below a frictional floor (6 %): beyond it, extra labour demand draws people into the
 *   labour force (mostly women, whose participation is ~14–16 %) instead of lowering u further.
 *
 * Scenario C adds named Ufuq mechanisms (better project selection, better targeting, better labour matching,
 * better investment targeting) to Scenario B with low / central / high effect sizes. These are HYPOTHESES to be
 * tested in a pilot — they are not estimates of what Ufuq achieves.
 */
import { BASELINE } from "@/data/fiscalBaseline";

export type ScenarioId = "A" | "B" | "C";
export type Band = "low" | "central" | "high";

export interface YearRow {
  year: number;
  realGdp: number; // JOD M, 2026 prices
  nominalGdp: number; // JOD M
  nominalGdpUsd: number; // US$ bn
  gdpPcUsd: number;
  realGrowth: number; // %
  population: number; // million
  revenue: number; // JOD M, domestic
  grants: number;
  interest: number;
  primaryBalance: number; // after grants
  fiscalBalance: number; // after grants (= PB − I)
  expenditure: number; // revenue + grants − fiscal balance
  publicInvestment: number; // JOD M
  debt: number; // JOD M, incl. SSIF holdings
  debtPct: number;
  debtExSscPct: number;
  interestPctRevenue: number;
  employed: number; // million
  labourForce: number; // million
  unemployment: number; // %
}

export interface Mechanism {
  id: string;
  name: string;
  how: string; // the decision channel through which better information acts
  growthPp: Record<Band, number>; // added to real growth when fully phased in
  pbPp: Record<Band, number>; // added to the primary balance (% of GDP)
  elasticity: Record<Band, number>; // added to the employment elasticity
  evidence: string;
}

/** Ufuq mechanisms (Scenario C). Effect sizes are hypotheses with deliberately wide bands. */
export const UFUQ_MECHANISMS: Mechanism[] = [
  {
    id: "PIM", name: "Public-investment prioritisation",
    how: "Score capital projects on need, cost and return before they enter the budget; drop or re-sequence weak ones.",
    growthPp: { low: 0.03, central: 0.1, high: 0.2 }, pbPp: { low: 0, central: 0, high: 0 }, elasticity: { low: 0, central: 0, high: 0 },
    evidence: "IMF PIMA work finds on average about a third of the value of public investment is lost to inefficiency. Recovering 5–20 % of that on a capital budget of ~4–5 % of GDP, at a social return of ~0.2, gives ~0.03–0.2 pp of growth.",
  },
  {
    id: "TGT", name: "Better targeting of current spending",
    how: "Match subsidies, transfers and service spending to verified need by governorate; flag duplicated programmes.",
    growthPp: { low: 0, central: 0, high: 0 }, pbPp: { low: 0.05, central: 0.15, high: 0.3 }, elasticity: { low: 0, central: 0, high: 0 },
    evidence: "Leakage and duplication in transfer programmes commonly run at several % of programme cost; 0.05–0.3 % of GDP assumes only part is recoverable and stays saved.",
  },
  {
    id: "LAB", name: "Labour-market matching",
    how: "Identify skill gaps by governorate early; steer training, wage subsidies and university intake to them.",
    growthPp: { low: 0, central: 0.03, high: 0.08 }, pbPp: { low: 0, central: 0, high: 0 }, elasticity: { low: 0.02, central: 0.04, high: 0.08 },
    evidence: "Active labour-market programmes show modest, programme-specific employment effects; the gain here is from better targeting of existing programmes, not new ones.",
  },
  {
    id: "INV", name: "Investment-opportunity targeting",
    how: "Evidence-based opportunity map (workforce, land, utilities, logistics) used by the Ministry of Investment to steer promotion.",
    growthPp: { low: 0, central: 0.05, high: 0.15 }, pbPp: { low: 0, central: 0, high: 0 }, elasticity: { low: 0, central: 0, high: 0 },
    evidence: "Assumes a small rise in realised FDI from better-matched offers; FDI was about US$ 1.6 bn in 2024 (World Bank WDI).",
  },
];

export interface ScenarioSpec {
  id: ScenarioId;
  name: string;
  summary: string;
  realGrowth: (y: number) => number; // %
  deflator: (y: number) => number; // %
  primaryBalance: (y: number) => number; // % of GDP, after grants
  effectiveRate: (y: number) => number; // %
  revenuePct: (y: number) => number; // domestic revenue, % of GDP
  grantsPct: (y: number) => number;
  publicInvestmentPct: (y: number) => number;
  elasticity: (y: number) => number;
  participationGain: (y: number) => number; // extra labour-force growth from participation, % a year
  ssifDrift: number; // pp of GDP a year
  sfa: number; // stock-flow adjustment, % of GDP a year
}

export const UNEMPLOYMENT_FLOOR = 6; // %, ASSUMPTION
const ramp = (y: number, from: number, to: number, a: number, b: number) => (y <= from ? a : y >= to ? b : a + ((b - a) * (y - from)) / (to - from));
const Y0 = BASELINE.year;
const rev0 = (BASELINE.domesticRevenue.value / BASELINE.nominalGdp.value) * 100;
const gr0 = (BASELINE.grants.value / BASELINE.nominalGdp.value) * 100;
const pb0 = ((BASELINE.interest.value - BASELINE.deficit.value) / BASELINE.nominalGdp.value) * 100;

/** A — Baseline: the IMF programme path (growth 2.7 → ~3 %, primary surplus rising as agreed). */
const A: ScenarioSpec = {
  id: "A", name: "Baseline", summary: "IMF programme path: growth near 3 %, consolidation to a primary surplus of about 1.2 % of GDP, grants slowly declining.",
  realGrowth: (y) => (y === 2026 ? BASELINE.realGrowth.value : y === 2027 ? BASELINE.realGrowth2027.value : 3.0),
  deflator: () => BASELINE.deflator.value,
  primaryBalance: (y) => (y <= 2026 ? pb0 : y === 2027 ? 0.2 : y === 2028 ? 0.8 : 1.2),
  effectiveRate: () => 4.6,
  revenuePct: () => rev0,
  grantsPct: (y) => ramp(y, 2026, 2035, gr0, 1.0),
  publicInvestmentPct: () => 3.5,
  elasticity: () => 0.5,
  participationGain: () => 0,
  ssifDrift: 0.35,
  sfa: 0,
};

/** B — Accelerated reform: EMV-style productivity, investment and participation gains, phased 2027–2030. */
const B: ScenarioSpec = {
  ...A, id: "B", name: "Accelerated reform",
  summary: "Growth rises to 4.2 % by 2030 (still below the EMV ambition of ~5 %), public investment +1 pp of GDP paid for by +1 pp of revenue and efficiency, more women in work, a lower risk premium.",
  realGrowth: (y) => (y <= 2027 ? A.realGrowth(y) : ramp(y, 2027, 2030, 3.1, 4.2)),
  effectiveRate: (y) => ramp(y, 2027, 2032, 4.6, 4.3),
  revenuePct: (y) => ramp(y, 2027, 2030, rev0, rev0 + 1.0),
  publicInvestmentPct: (y) => ramp(y, 2027, 2030, 3.5, 4.5),
  primaryBalance: (y) => A.primaryBalance(y), // the extra investment and the extra revenue offset each other
  elasticity: (y) => ramp(y, 2027, 2030, 0.5, 0.6),
  participationGain: (y) => (y >= 2028 ? 0.3 : 0),
};

/** C — B plus the named Ufuq mechanisms (phased in 2028–2031 after a pilot). */
function scenarioC(band: Band): ScenarioSpec {
  const sum = (k: "growthPp" | "pbPp" | "elasticity") => UFUQ_MECHANISMS.reduce((s, m) => s + m[k][band], 0);
  const phase = (y: number) => ramp(y, 2027, 2031, 0, 1);
  return {
    ...B, id: "C", name: "Ufuq-enabled transformation",
    summary: `Scenario B plus four decision mechanisms (${band} effect sizes), phased in after a 2027 pilot.`,
    realGrowth: (y) => B.realGrowth(y) + phase(y) * sum("growthPp"),
    primaryBalance: (y) => B.primaryBalance(y) + phase(y) * sum("pbPp"),
    elasticity: (y) => B.elasticity(y) + phase(y) * sum("elasticity"),
  };
}

export function scenario(id: ScenarioId, band: Band = "central"): ScenarioSpec {
  return id === "A" ? A : id === "B" ? B : scenarioC(band);
}

export function runFiscal(spec: ScenarioSpec, toYear = 2040): YearRow[] {
  const b = BASELINE;
  const Y0n = b.nominalGdp.value;
  let Yr = Y0n, Yn = Y0n;
  let D = (b.debtTotalPct.value / 100) * Y0n;
  let S = D - (b.debtExSscPct.value / 100) * Y0n;
  let LF = b.labourForce.value, E = LF * (1 - b.unemployment.value / 100), pop = b.population.value;
  const rows: YearRow[] = [];
  for (let y = Y0; y <= toYear; y++) {
    const g = spec.realGrowth(y) / 100, pi = spec.deflator(y) / 100;
    let interest: number;
    if (y === Y0) interest = b.interest.value;
    else {
      Yr *= 1 + g; Yn *= (1 + g) * (1 + pi); pop *= 1 + b.populationGrowth.value / 100;
      interest = (spec.effectiveRate(y) / 100) * D;
      const sRatio = S / (Yn / ((1 + g) * (1 + pi))) + spec.ssifDrift / 100;
      D = D + interest - (spec.primaryBalance(y) / 100) * Yn + (spec.sfa / 100) * Yn;
      S = sRatio * Yn;
      E *= 1 + spec.elasticity(y) * g;
      LF *= 1 + (b.populationGrowth.value + spec.participationGain(y)) / 100;
      if (E > LF * (1 - UNEMPLOYMENT_FLOOR / 100)) LF = E / (1 - UNEMPLOYMENT_FLOOR / 100);
    }
    const revenue = (spec.revenuePct(y) / 100) * Yn, grants = (spec.grantsPct(y) / 100) * Yn;
    const pb = (spec.primaryBalance(y) / 100) * Yn, fb = pb - interest;
    rows.push({
      year: y, realGdp: Yr, nominalGdp: Yn, nominalGdpUsd: Yn / b.jodPerUsd / 1000, gdpPcUsd: Yn / b.jodPerUsd / pop, realGrowth: spec.realGrowth(y), population: pop,
      revenue, grants, interest, primaryBalance: pb, fiscalBalance: fb, expenditure: revenue + grants - fb,
      publicInvestment: (spec.publicInvestmentPct(y) / 100) * Yn,
      debt: D, debtPct: (D / Yn) * 100, debtExSscPct: ((D - S) / Yn) * 100, interestPctRevenue: (interest / revenue) * 100,
      employed: E, labourForce: LF, unemployment: (1 - E / LF) * 100,
    });
  }
  return rows;
}

/** Primary balance that holds the debt ratio constant: pb* = d · (r − n) / (1 + n). */
export function stabilisingPrimaryBalance(debtPct: number, effectiveRate: number, realGrowth: number, deflator: number): number {
  const n = (1 + realGrowth / 100) * (1 + deflator / 100) - 1;
  return (debtPct * (effectiveRate / 100 - n)) / (1 + n);
}

/** Static first-round effect of N extra jobs at a given productivity (share of the average worker's output). */
export function jobsShock(extraJobs: number, relProductivity = 1, revenueShare = (BASELINE.domesticRevenue.value / BASELINE.nominalGdp.value)) {
  const b = BASELINE;
  const employed = b.labourForce.value * 1e6 * (1 - b.unemployment.value / 100);
  const outputPerWorker = (b.nominalGdp.value * 1e6) / employed;
  const dY = extraJobs * outputPerWorker * relProductivity; // JOD
  const Y = b.nominalGdp.value * 1e6;
  const debt = (b.debtTotalPct.value / 100) * Y;
  return {
    outputPerWorker, dGdpJodM: dY / 1e6, dGdpPct: (dY / Y) * 100,
    dRevenueJodM: (dY * revenueShare) / 1e6,
    dUnemploymentPp: -(extraJobs / (b.labourForce.value * 1e6)) * 100,
    dDebtPctDenominator: (debt / (Y + dY) - debt / Y) * 100, // ratio effect of the larger GDP alone
  };
}
