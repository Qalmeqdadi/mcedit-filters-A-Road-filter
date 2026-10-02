/**
 * Inter-censal population nowcast (SIMULATED demonstration).
 *
 * A synthetic "true" monthly population path is generated for each governorate from the census
 * base (births − deaths + migration), including one unannounced migration event. Four
 * administrative signals are then derived from that hidden truth with realistic imperfections:
 *   birth registrations (97 % complete), death registrations (88 % complete),
 *   new residential electricity connections (∝ new households, noisy), school enrolment (each September).
 *
 * Three estimators are compared:
 *   A. demographic accounting — census + registered births − registered deaths (completeness-adjusted)
 *      + the projection's assumed migration (misses the unannounced event);
 *   B. indicator method — population implied by cumulative connections × persons per connection;
 *   C. nowcast — a scalar Kalman filter: the accounting step is the state equation (with migration
 *      as process noise) and the indicator estimate is the measurement.
 * In production the truth is unknown and the nowcast is benchmarked at the next census; here the
 * synthetic truth is shown so the error of each method can be seen.
 */
import type { GovId, L } from "@/types/census";
import type { World } from "../generate";
import { labRng, type SmallArea } from "./common";

export const NOWCAST_MONTHS = 60;

export interface NowcastPoint {
  month: number;
  label: string;
  truth: number;
  accounting: number;
  indicator: number;
  nowcast: number;
  lo: number;
  hi: number;
  births: number;
  deaths: number;
  connections: number;
  enrolment: number | null;
}

export interface NowcastSeries {
  govId: GovId;
  points: NowcastPoint[];
  event: { month: number; persons: number } | null;
  mape: { accounting: number; indicator: number; nowcast: number };
  /** month from which the nowcast's unexplained growth signal is flagged */
  detectedMonth: number | null;
  finding: L | null;
}

export interface NowcastResult {
  baseLabel: string;
  byGov: Record<GovId, NowcastSeries>;
  national: NowcastSeries;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function runNowcast(world: World, sa0: SmallArea, crudeBirth: number, crudeDeath: number, netMigrationYear: number, startDate: string): NowcastResult {
  const start = new Date(`${startDate}T00:00:00`);
  const label = (m: number) => {
    const d = new Date(start.getFullYear(), start.getMonth() + m + 1, 1);
    return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  };
  const byGov = {} as Record<GovId, NowcastSeries>;
  const nat: NowcastPoint[] = [];
  const natPop = sa0.national.pop;
  for (const g of world.governorates) {
    const rng = labRng(world, "nowcast", g.id);
    const P0 = sa0.gov[g.id].pop;
    const hhSize = P0 / Math.max(1, sa0.gov[g.id].households);
    // unannounced event: inflow into the north-east, outflow from Aqaba (synthetic)
    const event = g.id === "MAF" ? { month: 26, persons: Math.round(P0 * 0.045) } : g.id === "IRB" ? { month: 28, persons: Math.round(P0 * 0.012) } : g.id === "AQB" ? { month: 34, persons: -Math.round(P0 * 0.03) } : null;
    const migMonthly = (netMigrationYear * (P0 / natPop)) / 12;
    let truth = P0;
    let acc = P0;
    // Kalman state
    let x = P0;
    let Pvar = (P0 * 0.002) ** 2;
    const Q = (P0 * 0.0012) ** 2;
    const R = (P0 * 0.006) ** 2;
    let connCum = 0;
    const points: NowcastPoint[] = [];
    const indicatorBase = P0;
    let detected: number | null = null;
    let streak = 0;
    for (let m = 0; m < NOWCAST_MONTHS; m++) {
      const seasonal = 1 + 0.06 * Math.sin(((m + 3) / 12) * Math.PI * 2);
      const births = rng.poisson((truth * crudeBirth * seasonal) / 12);
      const deaths = rng.poisson((truth * crudeDeath) / 12);
      let mig = migMonthly + rng.normal(0, Math.abs(migMonthly) * 0.5 + P0 * 0.0002);
      if (event && m >= event.month && m < event.month + 6) mig += event.persons / 6;
      const prevTruth = truth;
      truth = truth + births - deaths + mig;
      const regB = births * 0.97 * rng.normal(1, 0.01);
      const regD = deaths * 0.88 * rng.normal(1, 0.03);
      // A. accounting (completeness-adjusted), assumed migration only
      acc = acc + regB / 0.97 - regD / 0.88 + migMonthly;
      // B. indicator: connections track new households with noise; arrivals often share housing (elasticity 0.7)
      const newHH = Math.max(0, (truth - prevTruth) / hhSize);
      const conn = Math.max(0, newHH * 0.7 * rng.normal(1, 0.25) + rng.normal(0, P0 * 0.00004));
      connCum += conn;
      const indicator = indicatorBase + (connCum / 0.7) * hhSize;
      const enrolment = (m + start.getMonth() + 1) % 12 === 8 ? truth * (sa0.gov[g.id].a6_17 / P0) * 0.95 * rng.normal(1, 0.01) : null;
      // C. Kalman: predict with accounting step, update with indicator
      const xPred = x + regB / 0.97 - regD / 0.88 + migMonthly;
      const pPred = Pvar + Q;
      const K = pPred / (pPred + R);
      const innovation = indicator - xPred;
      x = xPred + K * innovation;
      Pvar = (1 - K) * pPred;
      const sd = Math.sqrt(Pvar);
      // flag: three consecutive months where the indicator runs > 1.5 sd above accounting-only path
      if (indicator - acc > 1.5 * Math.sqrt(R) || indicator - acc < -1.5 * Math.sqrt(R)) {
        streak++;
        if (streak >= 3 && detected === null) detected = m;
      } else streak = 0;
      points.push({ month: m, label: label(m), truth, accounting: acc, indicator, nowcast: x, lo: x - 1.96 * sd, hi: x + 1.96 * sd, births: regB, deaths: regD, connections: conn, enrolment });
    }
    const mape = (k: "accounting" | "indicator" | "nowcast") => points.reduce((s, p) => s + Math.abs(p[k] - p.truth) / p.truth, 0) / points.length;
    const last = points[points.length - 1];
    const finding: L | null = detected !== null
      ? {
          en: `Registered births and deaths do not explain growth in ${g.name.en} since ${points[detected].label}. Connection data imply about ${Math.round(Math.abs(last.indicator - last.accounting)).toLocaleString("en-US")} ${last.indicator > last.accounting ? "more" : "fewer"} residents than demographic accounting — consistent with unrecorded ${last.indicator > last.accounting ? "in-migration" : "out-migration"}. Verify with border, school and utility data.`,
          ar: `لا تفسّر الولادات والوفيات المسجلة النمو في ${g.name.ar} منذ ${points[detected].label}. تشير بيانات التوصيلات إلى نحو ${Math.round(Math.abs(last.indicator - last.accounting)).toLocaleString("en-US")} ساكن ${last.indicator > last.accounting ? "أكثر" : "أقل"} مما تظهره المحاسبة الديموغرافية — بما يتسق مع ${last.indicator > last.accounting ? "هجرة وافدة" : "هجرة مغادرة"} غير مسجلة. يلزم التحقق ببيانات الحدود والمدارس والمرافق.`,
        }
      : null;
    byGov[g.id] = { govId: g.id, points, event, mape: { accounting: mape("accounting"), indicator: mape("indicator"), nowcast: mape("nowcast") }, detectedMonth: detected, finding };
  }
  for (let m = 0; m < NOWCAST_MONTHS; m++) {
    const p: NowcastPoint = { month: m, label: label(m), truth: 0, accounting: 0, indicator: 0, nowcast: 0, lo: 0, hi: 0, births: 0, deaths: 0, connections: 0, enrolment: null };
    let varSum = 0;
    for (const s of Object.values(byGov)) {
      const q = s.points[m];
      p.truth += q.truth;
      p.accounting += q.accounting;
      p.indicator += q.indicator;
      p.nowcast += q.nowcast;
      p.births += q.births;
      p.deaths += q.deaths;
      p.connections += q.connections;
      varSum += ((q.hi - q.lo) / 3.92) ** 2;
      if (q.enrolment !== null) p.enrolment = (p.enrolment ?? 0) + q.enrolment;
    }
    const sd = Math.sqrt(varSum);
    p.lo = p.nowcast - 1.96 * sd;
    p.hi = p.nowcast + 1.96 * sd;
    nat.push(p);
  }
  const mape = (k: "accounting" | "indicator" | "nowcast") => nat.reduce((s, p) => s + Math.abs(p[k] - p.truth) / p.truth, 0) / nat.length;
  return { baseLabel: label(-1), byGov, national: { govId: "AMM", points: nat, event: null, mape: { accounting: mape("accounting"), indicator: mape("indicator"), nowcast: mape("nowcast") }, detectedMonth: null, finding: null } };
}
