/**
 * FISCAL & MACRO BASELINE — Jordan, 2026 (the starting point of the debt-dynamics engine).
 *
 * Each figure carries the same statuses as the National Indicator Registry:
 *   REPORTED  official figure transcribed from an official release (budget law, MoF bulletin, CBJ report)
 *   INTERNATIONAL  IMF staff figure (programme review or World Economic Outlook)
 *   DERIVED   computed here from the figures above — the formula is given
 *   ASSUMPTION  a modelling assumption, not a published figure (always shown with a range)
 *
 * Figures were transcribed via news and search extraction on 2026-11-10 (not machine-read from the source
 * files): verify each against the linked document before using it in an official setting.
 *
 * Two debt definitions are kept apart on purpose:
 *   total     government and guaranteed debt, INCLUDING debt held by the Social Security Investment Fund (SSIF)
 *   exSSC     the same debt NET of SSIF holdings — the definition used by the IMF programme and the 80 % target
 */
export type FiscalStatus = "REPORTED" | "INTERNATIONAL" | "DERIVED" | "ASSUMPTION";

export interface FiscalFigure {
  value: number;
  unit: string;
  status: FiscalStatus;
  source: string;
  note?: string;
  range?: [number, number];
}

const JOD_PER_USD = 0.709; // the peg

export const FISCAL_SOURCES = {
  BUDGET_2026: "General Budget Law 2026, as presented by the Minister of Finance (Jordan News, Nov–Dec 2025)",
  MOF_JUL_2026: "Ministry of Finance, Government Finance Bulletin, public debt at end-July 2026 (Jordan News / Petra)",
  CBJ_MAY_2026: "Central Bank of Jordan, Recent Monetary & Economic Developments, May 2026",
  IMF_EFF5: "IMF Country Report 26/146, Fifth Review under the EFF (June 2026), debt table",
  IMF_SLA6: "IMF staff-level agreement on the Sixth EFF Review (3 Nov 2026), growth projections",
  IMF_WEO_OCT26: "IMF World Economic Outlook, October 2026 (general government gross debt)",
  DOS_LFS_Q2: "Department of Statistics, Employment & Unemployment Survey, Q2 2026 (released 30 Aug 2026)",
  DOS_POP: "Department of Statistics, estimated population end-2025 (11.937 million)",
} as const;

const budgetDeficit = 2125; // JOD M, after grants
const budgetDeficitPct = 4.6;

export const BASELINE = {
  year: 2026,
  jodPerUsd: JOD_PER_USD,

  nominalGdp: { value: Math.round((budgetDeficit / budgetDeficitPct) * 100), unit: "JOD M", status: "DERIVED", source: FISCAL_SOURCES.BUDGET_2026, note: "Budget deficit JOD 2,125 M ÷ 4.6 % of GDP ≈ JOD 46.2 bn (≈ US$ 65.1 bn; the IMF WEO puts 2026 at about US$ 64.9 bn)." } as FiscalFigure,
  realGrowth: { value: 2.7, unit: "%", status: "INTERNATIONAL", source: FISCAL_SOURCES.IMF_SLA6, note: "IMF projects 2.7 % in 2026 and 3.1 % in 2027; H1-2026 outturn about 3 %." } as FiscalFigure,
  realGrowth2027: { value: 3.1, unit: "%", status: "INTERNATIONAL", source: FISCAL_SOURCES.IMF_SLA6 } as FiscalFigure,
  deflator: { value: 2.0, unit: "%", status: "ASSUMPTION", source: "UFUQ assumption: CPI was 1.8 % in 2025 (World Bank WDI); deflator held near 2 %", range: [1.0, 3.0] } as FiscalFigure,

  domesticRevenue: { value: 10196, unit: "JOD M", status: "REPORTED", source: FISCAL_SOURCES.BUDGET_2026, note: "Re-estimate later reported JOD 9,846 M." } as FiscalFigure,
  grants: { value: 735, unit: "JOD M", status: "REPORTED", source: FISCAL_SOURCES.BUDGET_2026 } as FiscalFigure,
  currentSpending: { value: 11456, unit: "JOD M", status: "REPORTED", source: FISCAL_SOURCES.BUDGET_2026 } as FiscalFigure,
  interest: { value: 2260, unit: "JOD M", status: "REPORTED", source: FISCAL_SOURCES.BUDGET_2026, note: "About 22 % of domestic revenue." } as FiscalFigure,
  deficit: { value: budgetDeficit, unit: "JOD M", status: "REPORTED", source: FISCAL_SOURCES.BUDGET_2026, note: "After grants; 4.6 % of GDP. Before grants about JOD 2.86 bn." } as FiscalFigure,

  debtTotal: { value: 50121, unit: "JOD M", status: "REPORTED", source: FISCAL_SOURCES.MOF_JUL_2026, note: "End-July 2026, 110.8 % of (trailing) GDP. IMF puts 2026 at 108.7 %." } as FiscalFigure,
  debtHeldBySsif: { value: 11982, unit: "JOD M", status: "REPORTED", source: FISCAL_SOURCES.MOF_JUL_2026 } as FiscalFigure,
  debtTotalPct: { value: 108.7, unit: "% of GDP", status: "INTERNATIONAL", source: FISCAL_SOURCES.IMF_EFF5, note: "IMF path: 109.0 → 108.7 → 108.0 → 106.7 (read as 2025–2028)." } as FiscalFigure,
  debtExSscPct: { value: 82.5, unit: "% of GDP", status: "INTERNATIONAL", source: FISCAL_SOURCES.IMF_WEO_OCT26, note: "IMF path net of SSC: 83.6 → 82.5 → 81.4 → 79.9; government target about 80 % by 2028." } as FiscalFigure,

  population: { value: 11.937, unit: "million", status: "REPORTED", source: FISCAL_SOURCES.DOS_POP } as FiscalFigure,
  populationGrowth: { value: 1.3, unit: "%", status: "ASSUMPTION", source: "UFUQ assumption (natural increase net of refugee returns)", range: [0.5, 1.8] } as FiscalFigure,
  unemployment: { value: 16.1, unit: "%", status: "REPORTED", source: FISCAL_SOURCES.DOS_LFS_Q2, note: "All residents; Jordanians 21.0 %." } as FiscalFigure,
  labourForce: { value: 3.22, unit: "million", status: "INTERNATIONAL", source: "World Bank WDI (ILO modelled), 2025" } as FiscalFigure,
};

/** IMF projected path used to check the engine (total incl. SSC, and net of SSC), read as 2025–2028. */
export const IMF_DEBT_PATH = {
  years: [2025, 2026, 2027, 2028],
  total: [109.0, 108.7, 108.0, 106.7],
  exSsc: [83.6, 82.5, 81.4, 79.9],
  source: FISCAL_SOURCES.IMF_EFF5,
};

/** Derived headline ratios (shown on the page, recomputed here so the formula is visible). */
export function derivedRatios() {
  const Y = BASELINE.nominalGdp.value;
  const pbAfterGrants = BASELINE.interest.value - BASELINE.deficit.value; // primary balance = − deficit + interest
  return {
    interestPctGdp: (BASELINE.interest.value / Y) * 100,
    interestPctDomesticRevenue: (BASELINE.interest.value / BASELINE.domesticRevenue.value) * 100,
    revenuePctGdp: (BASELINE.domesticRevenue.value / Y) * 100,
    grantsPctGdp: (BASELINE.grants.value / Y) * 100,
    primaryBalancePctGdp: (pbAfterGrants / Y) * 100,
    primaryBalanceExGrantsPctGdp: ((pbAfterGrants - BASELINE.grants.value) / Y) * 100,
    ssifShareOfDebt: (BASELINE.debtHeldBySsif.value / BASELINE.debtTotal.value) * 100,
    effectiveRate: (BASELINE.interest.value / ((BASELINE.debtTotalPct.value / 100) * Y)) * 100,
  };
}
