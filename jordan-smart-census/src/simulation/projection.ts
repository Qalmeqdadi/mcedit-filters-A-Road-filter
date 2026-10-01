/**
 * Cohort-component population projection (SIMULATED).
 *
 *  - Annual steps, single years of age 0..100+ by sex.
 *  - Mortality: Siler hazard μ(x) = a1·e^(−b1·x) + a2 + a3·e^(b3·x); a3 is calibrated by
 *    bisection so that life expectancy at birth matches the assumption (sex-specific offsets).
 *  - Fertility: TFR × standard age pattern (15–49), sex ratio at birth 105.
 *  - Net migration: annual total distributed by a young-adult age profile.
 *  - Households = population / average household size (linear path to target year).
 */
import type { ProjectionPoint } from "@/types/census";

export const MAX_AGE = 100;
const AGES = MAX_AGE + 1;
const SRB = 1.05;

// share of TFR by 5-year group 15-19 … 45-49
const ASFR_SHARE = [0.04, 0.17, 0.27, 0.25, 0.17, 0.08, 0.02];

export interface BasePopulation {
  year: number;
  m: number[];
  f: number[];
}

export interface ProjectionInputs {
  baseYear: number;
  endYear: number;
  tfrStart: number;
  tfrEnd: number;
  e0Start: number;
  e0End: number;
  /** annual net migration (persons) */
  netMigration: number;
  /** additional one-off inflow spread over the first 3 projection years */
  migrationShock: number;
  hhSizeStart: number;
  hhSizeEnd: number;
  urbanStart: number;
  urbanEnd: number;
}

const lifeTableCache = new Map<string, number[]>();

function survivalFor(a3: number): number[] {
  const a1 = 0.025;
  const b1 = 1.4;
  const a2 = 0.0003;
  const b3 = 0.092;
  const mu = (x: number) => a1 * Math.exp(-b1 * x) + a2 + a3 * Math.exp(b3 * x);
  const S: number[] = [];
  for (let x = 0; x < AGES; x++) {
    // integrate hazard over [x, x+1] with 4 sub-steps
    let h = 0;
    for (let k = 0; k < 4; k++) h += mu(x + (k + 0.5) / 4) / 4;
    S.push(Math.exp(-h));
  }
  return S;
}

function e0Of(S: number[]): number {
  let l = 1;
  let e = 0;
  for (let x = 0; x < 120; x++) {
    const s = x < AGES ? S[x] : S[AGES - 1];
    const next = l * s;
    e += (l + next) / 2;
    l = next;
  }
  return e;
}

/** survival ratios S[x] = l(x+1)/l(x) for a target life expectancy */
export function survivalForE0(e0: number): number[] {
  const key = e0.toFixed(2);
  const hit = lifeTableCache.get(key);
  if (hit) return hit;
  let lo = 1e-7;
  let hi = 1e-2;
  for (let i = 0; i < 60; i++) {
    const mid = Math.sqrt(lo * hi);
    if (e0Of(survivalFor(mid)) > e0) lo = mid;
    else hi = mid;
  }
  const S = survivalFor(Math.sqrt(lo * hi));
  lifeTableCache.set(key, S);
  return S;
}

function migrationProfile(): number[] {
  const w: number[] = [];
  for (let x = 0; x < AGES; x++) w.push(0.015 + Math.exp(-(((x - 27) / 9) ** 2)) + 0.3 * Math.exp(-x / 5) + 0.05 * Math.exp(-(((x - 60) / 6) ** 2)));
  const s = w.reduce((a, b) => a + b, 0);
  return w.map((v) => v / s);
}
const MIG = migrationProfile();

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function summarise(year: number, m: number[], f: number[], births: number, deaths: number, hhSize: number, urban: number): ProjectionPoint {
  const sumRange = (a: number, b: number) => {
    let s = 0;
    for (let x = a; x <= Math.min(b, MAX_AGE); x++) s += m[x] + f[x];
    return s;
  };
  const male = m.reduce((a, b) => a + b, 0);
  const female = f.reduce((a, b) => a + b, 0);
  const population = male + female;
  return {
    year,
    population,
    male,
    female,
    households: population / hhSize,
    ages: { m: [...m], f: [...f] },
    age0_5: sumRange(0, 5),
    age6_17: sumRange(6, 17),
    age18_23: sumRange(18, 23),
    age15_64: sumRange(15, 64),
    age65plus: sumRange(65, MAX_AGE),
    births,
    deaths,
    urbanShare: urban,
  };
}

/** Returns one point per year from baseYear to endYear inclusive. */
export function projectPopulation(base: BasePopulation, inp: ProjectionInputs): ProjectionPoint[] {
  let m = [...base.m];
  let f = [...base.f];
  const span = inp.endYear - inp.baseYear;
  const out: ProjectionPoint[] = [summarise(inp.baseYear, m, f, 0, 0, inp.hhSizeStart, inp.urbanStart)];
  for (let y = 1; y <= span; y++) {
    const t = y / span;
    const tfr = lerp(inp.tfrStart, inp.tfrEnd, t);
    const e0 = lerp(inp.e0Start, inp.e0End, t);
    const Sm = survivalForE0(e0 - 1.8);
    const Sf = survivalForE0(e0 + 1.8);
    // births from women at start of year
    let births = 0;
    for (let g = 0; g < 7; g++) for (let x = 15 + g * 5; x < 20 + g * 5; x++) births += f[x] * ((tfr * ASFR_SHARE[g]) / 5);
    let deaths = 0;
    const nm = new Array(AGES).fill(0);
    const nf = new Array(AGES).fill(0);
    for (let x = 0; x < AGES; x++) {
      const tx = Math.min(MAX_AGE, x + 1);
      nm[tx] += m[x] * Sm[x];
      nf[tx] += f[x] * Sf[x];
      deaths += m[x] * (1 - Sm[x]) + f[x] * (1 - Sf[x]);
    }
    const bm = (births * SRB) / (1 + SRB);
    const bf = births - bm;
    nm[0] = bm * Math.sqrt(Sm[0]);
    nf[0] = bf * Math.sqrt(Sf[0]);
    deaths += bm + bf - nm[0] - nf[0];
    const mig = inp.netMigration + (y <= 3 ? inp.migrationShock / 3 : 0);
    for (let x = 0; x < AGES; x++) {
      nm[x] = Math.max(0, nm[x] + mig * MIG[x] * 0.53);
      nf[x] = Math.max(0, nf[x] + mig * MIG[x] * 0.47);
    }
    m = nm;
    f = nf;
    out.push(summarise(inp.baseYear + y, m, f, births, deaths, lerp(inp.hhSizeStart, inp.hhSizeEnd, t), lerp(inp.urbanStart, inp.urbanEnd, t)));
  }
  return out;
}

/** Five-year groups for pyramids: returns labels and counts. */
export function toFiveYear(ages: number[]): number[] {
  const out: number[] = [];
  for (let g = 0; g < 17; g++) {
    let s = 0;
    for (let x = g * 5; x < g * 5 + 5; x++) s += ages[x];
    out.push(s);
  }
  let s = 0;
  for (let x = 85; x <= MAX_AGE; x++) s += ages[x];
  out.push(s);
  return out;
}

export const FIVE_YEAR_LABELS = ["0–4", "5–9", "10–14", "15–19", "20–24", "25–29", "30–34", "35–39", "40–44", "45–49", "50–54", "55–59", "60–64", "65–69", "70–74", "75–79", "80–84", "85+"];
