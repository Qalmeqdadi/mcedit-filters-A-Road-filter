/**
 * Jobs needed — labour-market entry model (SIMULATED).
 *
 *   labour force(t)   = Σ_age,sex population(t) × participation(age band, sex) [× female participation path]
 *   jobs to hold u    = LF(t) × (1 − u₀)                                  (keep today's unemployment rate)
 *   jobs to reach u*  = LF(t) × (1 − u(t)), u(t) linear from u₀ to the target by the target year
 *   jobs created      = E(t−1) × GDP growth × employment elasticity        (supply side)
 *   implied u(t)      = 1 − jobs created ÷ LF(t)
 *   entrants / exits  = cohort turning 20 × LFPR(20–24); cohort turning 60 × LFPR(55–64)
 *
 * Participation and unemployment come from the synthetic census microdata (labour module).
 */
import type { GovId, ProjectionPoint } from "@/types/census";
import type { World } from "../generate";
import { computeProfile, LABOUR_BANDS, SECTORS } from "../analytics";
import type { SmallArea } from "./common";

export interface JobsParams {
  gdpGrowth: number;
  elasticity: number;
  targetUnemployment: number;
  targetYear: number;
  /** multiplier on female participation reached by 2040 (1 = unchanged) */
  femaleParticipation: number;
  strategy: "CURRENT" | "SERVICES" | "INDUSTRY";
}

export const DEFAULT_JOBS: JobsParams = { gdpGrowth: 0.027, elasticity: 0.6, targetUnemployment: 0.12, targetYear: 2035, femaleParticipation: 1, strategy: "CURRENT" };

const BAND_AGES: [number, number][] = [[15, 19], [20, 24], [25, 34], [35, 44], [45, 54], [55, 64], [65, 100]];

export interface JobsYear {
  year: number;
  workingAge: number;
  labourForce: number;
  holdRate: number;
  reachTarget: number;
  created: number;
  impliedUnemployment: number;
  entrants: number;
  exits: number;
  netNeedHold: number;
  netNeedTarget: number;
  netCreated: number;
}

export interface JobsResult {
  params: JobsParams;
  u0: number;
  lfpr: { m: number[]; f: number[] };
  series: JobsYear[];
  byGov: Record<GovId, { youthUnemployment: number; jobsNeeded2035: number; per1000: number; youthGrowth: number }>;
  sectors: { sector: string; share: number; newJobs2035: number }[];
}

const STRATEGY: Record<JobsParams["strategy"], Partial<Record<(typeof SECTORS)[number], number>>> = {
  CURRENT: {},
  SERVICES: { ICT_FINANCE: 2.2, HOSPITALITY: 1.8, HEALTH: 1.5, EDUCATION: 1.2, MANUFACTURING: 0.8, AGRICULTURE: 0.6, PUBLIC_ADMIN: 0.6 },
  INDUSTRY: { MANUFACTURING: 2.2, TRANSPORT: 1.8, CONSTRUCTION: 1.4, AGRICULTURE: 1.2, ICT_FINANCE: 1.1, PUBLIC_ADMIN: 0.6 },
};

export function forecastJobs(world: World, series: ProjectionPoint[], areaFor: (year: number) => SmallArea, p: JobsParams): JobsResult {
  const prof = computeProfile(world);
  const lfpr = { m: [] as number[], f: [] as number[] };
  for (const b of prof.labour.byBand) {
    lfpr.m.push((b.mE + b.mU) / Math.max(1, b.mE + b.mU + b.mO));
    lfpr.f.push((b.fE + b.fU) / Math.max(1, b.fE + b.fU + b.fO));
  }
  const u0 = prof.labour.unemployed / Math.max(1, prof.labour.employed + prof.labour.unemployed);
  const base = series[0];
  const baseYear = base.year;
  const fMult = (y: number) => 1 + (p.femaleParticipation - 1) * Math.min(1, (y - baseYear) / Math.max(1, 2040 - baseYear));
  const lf = (pt: ProjectionPoint) => {
    let s = 0;
    BAND_AGES.forEach(([a, b], k) => {
      for (let x = a; x <= b; x++) s += pt.ages.m[x] * lfpr.m[k] + pt.ages.f[x] * Math.min(0.95, lfpr.f[k] * fMult(pt.year));
    });
    return s;
  };
  const wa = (pt: ProjectionPoint) => pt.age15_64;
  const out: JobsYear[] = [];
  let created = lf(base) * (1 - u0);
  let prevHold = created;
  let prevTarget = created;
  for (const pt of series) {
    const L = lf(pt);
    const tt = Math.min(1, (pt.year - baseYear) / Math.max(1, p.targetYear - baseYear));
    const hold = L * (1 - u0);
    const reach = L * (1 - (u0 + (p.targetUnemployment - u0) * tt));
    const prevCreated = created;
    if (pt.year > baseYear) created = created * (1 + p.gdpGrowth * p.elasticity);
    const entrants = pt.ages.m[20] * lfpr.m[1] + pt.ages.f[20] * lfpr.f[1] * fMult(pt.year);
    const exits = pt.ages.m[60] * lfpr.m[5] + pt.ages.f[60] * lfpr.f[5] * fMult(pt.year);
    out.push({
      year: pt.year,
      workingAge: wa(pt),
      labourForce: L,
      holdRate: hold,
      reachTarget: reach,
      created,
      impliedUnemployment: 1 - created / L,
      entrants,
      exits,
      netNeedHold: pt.year === baseYear ? 0 : hold - prevHold,
      netNeedTarget: pt.year === baseYear ? 0 : reach - prevTarget,
      netCreated: pt.year === baseYear ? 0 : created - prevCreated,
    });
    prevHold = hold;
    prevTarget = reach;
  }
  // governorates: jobs needed to 2035 to hold their own unemployment rate
  const sa0 = areaFor(baseYear);
  const sa35 = areaFor(2035);
  const byGov = {} as JobsResult["byGov"];
  for (const g of world.governorates) {
    const gp = computeProfile(world, { govId: g.id });
    const ratio = gp.labour.employed / Math.max(1, gp.groups.a15_64);
    const need = Math.max(0, (sa35.gov[g.id].a15_64 - sa0.gov[g.id].a15_64) * ratio);
    byGov[g.id] = {
      youthUnemployment: gp.labour.youth.unemployed / Math.max(1, gp.labour.youth.employed + gp.labour.youth.unemployed),
      jobsNeeded2035: need,
      per1000: (need / Math.max(1, sa0.gov[g.id].a15_64)) * 1000,
      youthGrowth: sa35.gov[g.id].a15_24 / Math.max(1, sa0.gov[g.id].a15_24) - 1,
    };
  }
  // sector allocation of the jobs needed to 2035 (hold-rate path)
  const need35 = (out.find((x) => x.year === 2035)?.holdRate ?? 0) - out[0].holdRate;
  const w = STRATEGY[p.strategy];
  const raw = SECTORS.map((s) => ({ sector: s, share: prof.labour.sector[s] / Math.max(1, prof.labour.employed), weight: (prof.labour.sector[s] / Math.max(1, prof.labour.employed)) * (w[s] ?? 1) }));
  const sw = raw.reduce((a, b) => a + b.weight, 0) || 1;
  const sectors = raw.map((r) => ({ sector: r.sector, share: r.share, newJobs2035: (Math.max(0, need35) * r.weight) / sw }));
  void LABOUR_BANDS;
  return { params: p, u0, lfpr, series: out, byGov, sectors };
}
