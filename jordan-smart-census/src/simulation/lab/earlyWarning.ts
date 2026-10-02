/**
 * Predictive field control — which workloads will miss the deadline (SYNTHETIC OPERATIONAL).
 *
 * For every enumerator with work left, using only information a field manager has:
 *   remaining  = listed dwellings in the frame − dwellings visited
 *   pace       = 0.4 × (visited ÷ active days) + 0.6 × pace over the last three productive days
 *   required   = remaining ÷ planned field days left
 *   σ          = coefficient of variation of daily output ÷ √(days left) + 0.08
 *   P(late)    = Φ( (ln required − ln pace) ÷ σ )           (log-normal pace uncertainty)
 * Drivers explain each score: pace vs plan, refusal rate vs the district, EA access, active access
 * disruption, device problems, late start. Support is only proposed; a person approves it.
 *
 * Backtest: predictions are rebuilt "as of" an earlier day from the daily logs and compared with what
 * actually happened (finished within the planned field days or not). Support deployed after that day
 * changes outcomes, so the backtest slightly understates accuracy for supported workloads.
 */
import type { L } from "@/types/census";
import type { CensusEngine } from "../engine";
import { km, normCdf } from "./common";

export type RiskBand = "HIGH" | "MEDIUM" | "LOW";

export interface Driver {
  key: "PACE" | "REFUSAL" | "ACCESS" | "DISRUPTION" | "DEVICE" | "LATE_START";
  text: L;
  weight: number;
}

export interface Prediction {
  index: number;
  id: string;
  govId: string;
  districtId: string;
  remaining: number;
  pace: number;
  required: number;
  daysLeft: number;
  predictedFinishDay: number;
  pLate: number;
  band: RiskBand;
  drivers: Driver[];
  supported: boolean;
  helper: { id: string; km: number } | null;
}

export interface EarlyWarning {
  day: number;
  predictions: Prediction[];
  counts: Record<RiskBand, number>;
  dwellingsAtRisk: number;
  reservesLeft: number;
}

const bandOf = (p: number): RiskBand => (p >= 0.6 ? "HIGH" : p >= 0.3 ? "MEDIUM" : "LOW");

function predictOne(engine: CensusEngine, i: number, asOfDay: number, visitedAt: number, activeAt: number, dailyAt: number[], extra = true): Omit<Prediction, "drivers" | "supported" | "helper"> & { drivers: Driver[] } {
  const w = engine.world;
  const e = w.enumerators[i];
  const cfg = w.config;
  const listed = engine.enumEas[i].reduce((s, k) => s + w.eas[k].dwellings, 0);
  const remaining = Math.max(0, listed - visitedAt);
  // blend of overall pace and the last three productive days (captures ramp-up after the first days)
  const overall = activeAt > 0 ? visitedAt / activeAt : 0;
  const doneTotal = dailyAt.reduce((a, b) => a + b, 0);
  const recentDays = dailyAt.filter((x) => x > 0).slice(-3);
  const recent = recentDays.length && doneTotal > 0 ? (recentDays.reduce((a, b) => a + b, 0) / recentDays.length) * (visitedAt / doneTotal) : overall;
  const pace = 0.4 * overall + 0.6 * recent;
  const daysLeft = Math.max(0.5, cfg.fieldDays - asOfDay);
  const required = remaining / daysLeft;
  const active = dailyAt.filter((x) => x > 0);
  const mean = active.reduce((a, b) => a + b, 0) / Math.max(1, active.length);
  const sd = Math.sqrt(active.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, active.length - 1));
  const cv = mean > 0 ? sd / mean : 0.5;
  const sigma = cv / Math.sqrt(daysLeft) + 0.08;
  let pLate: number;
  if (remaining <= 0) pLate = 0;
  else if (pace <= 0) pLate = asOfDay >= e.startDay + 1 ? 0.95 : 0.5;
  else pLate = normCdf((Math.log(required) - Math.log(pace)) / sigma);
  const drivers: Driver[] = [];
  const planned = cfg.interviewsPerDay * cfg.efficiency * 1.15;
  if (pace > 0 && pace < planned * 0.85) drivers.push({ key: "PACE", weight: 1 - pace / planned, text: { en: `Pace ${pace.toFixed(1)} dwellings/day vs ${planned.toFixed(1)} planned; ${required.toFixed(1)}/day now needed.`, ar: `الوتيرة ${pace.toFixed(1)} مسكن/يوم مقابل ${planned.toFixed(1)} مخطط؛ المطلوب الآن ${required.toFixed(1)}/يوم.` } });
  if (extra) {
    const s = engine.en[i];
    const contacted = s.completed + s.refusals;
    const ref = contacted ? s.refusals / contacted : 0;
    if (contacted > 20 && ref > 0.06) drivers.push({ key: "REFUSAL", weight: ref * 4, text: { en: `Refusal rate ${(ref * 100).toFixed(1)}% — revisits are slowing progress.`, ar: `معدل الرفض ${(ref * 100).toFixed(1)}% — زيارات المتابعة تبطئ التقدم.` } });
    const acc = engine.enumEas[i].reduce((a, k) => a + w.eas[k].accessibility, 0) / Math.max(1, engine.enumEas[i].length);
    if (acc < 0.6) drivers.push({ key: "ACCESS", weight: 0.6 - acc, text: { en: `Hard-to-access EA (access index ${acc.toFixed(2)}).`, ar: `منطقة عدّ صعبة الوصول (مؤشر الوصول ${acc.toFixed(2)}).` } });
    const dis = engine.disruptions.find((d) => d.districtId === e.districtId && asOfDay >= d.from && asOfDay <= d.to + 1);
    if (dis) drivers.push({ key: "DISRUPTION", weight: 0.5, text: { en: `Access disruption in the district: ${dis.cause.en}.`, ar: `تعطّل في الوصول داخل اللواء: ${dis.cause.ar}.` } });
    if (e.profile.deviceReliability < 0.95 || s.offlineUntilStep >= engine.step) drivers.push({ key: "DEVICE", weight: 0.3, text: { en: "Repeated device / sync problems.", ar: "مشكلات متكررة في الجهاز / المزامنة." } });
    if (e.startDay > 1) drivers.push({ key: "LATE_START", weight: 0.2, text: { en: `Workload started on day ${e.startDay + 1}.`, ar: `بدأ عبء العمل في اليوم ${e.startDay + 1}.` } });
  }
  drivers.sort((a, b) => b.weight - a.weight);
  return { index: i, id: e.id, govId: e.govId, districtId: e.districtId, remaining, pace, required, daysLeft, predictedFinishDay: pace > 0 ? asOfDay + remaining / pace : Infinity, pLate, band: bandOf(pLate), drivers };
}

export function predictLateness(engine: CensusEngine): EarlyWarning {
  const w = engine.world;
  const day = engine.day;
  const preds: Prediction[] = [];
  // finished enumerators near each district are candidate helpers
  const finished = w.enumerators.map((e, i) => ({ e, i })).filter(({ i }) => engine.en[i].status === "COMPLETED" && !engine.helping.has(i));
  for (let i = 0; i < w.enumerators.length; i++) {
    const s = engine.en[i];
    if (s.status === "COMPLETED") continue;
    if (day < w.enumerators[i].startDay) continue;
    const p = predictOne(engine, i, day, s.visited, engine.activeDays[i], s.daily);
    if (p.remaining <= 0) continue;
    const supported = engine.boost[i] > 1;
    let helper: Prediction["helper"] = null;
    if (p.band !== "LOW") {
      const ea = w.eas[engine.enumEas[i][0]];
      let best: { id: string; km: number } | null = null;
      for (const { e, i: h } of finished) {
        const hea = w.eas[engine.enumEas[h][0]];
        const d = km(ea.lng, ea.lat, hea.lng, hea.lat);
        if (d <= 25 && (!best || d < best.km)) best = { id: e.id, km: d };
      }
      helper = best;
    }
    preds.push({ ...p, supported, helper });
  }
  preds.sort((a, b) => b.pLate - a.pLate);
  const counts: Record<RiskBand, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  let atRisk = 0;
  for (const p of preds) {
    counts[p.band]++;
    if (p.band === "HIGH") atRisk += Math.max(0, p.remaining - p.pace * p.daysLeft);
  }
  return { day, predictions: preds, counts, dwellingsAtRisk: atRisk, reservesLeft: engine.reservePool - engine.reservesDeployed };
}

export interface Backtest {
  asOfDay: number;
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  precision: number;
  recall: number;
  accuracy: number;
  brier: number;
  n: number;
}

/** Compare predictions rebuilt as of `asOfDay` with actual completion within the planned field days. */
export function backtest(engine: CensusEngine, asOfDay: number): Backtest | null {
  const w = engine.world;
  const cfg = w.config;
  if (engine.day <= cfg.fieldDays) return null;
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;
  let brier = 0;
  let n = 0;
  for (let i = 0; i < w.enumerators.length; i++) {
    const s = engine.en[i];
    const e = w.enumerators[i];
    if (e.startDay >= asOfDay) continue;
    const daily = s.daily.slice(0, asOfDay);
    const doneAt = daily.reduce((a, b) => a + b, 0);
    if (s.completed <= 0) continue;
    const visitedAt = s.visited * (doneAt / s.completed);
    const activeAt = daily.filter((x) => x > 0).length;
    const listed = engine.enumEas[i].reduce((a, k) => a + w.eas[k].dwellings, 0);
    if (visitedAt >= listed) continue;
    const p = predictOne(engine, i, asOfDay, visitedAt, activeAt, daily, false);
    // actual: last productive day + 1 (1-based) within the planned field days?
    let last = -1;
    s.daily.forEach((x, d) => {
      if (x > 0) last = d;
    });
    const late = s.status !== "COMPLETED" || last + 1 > cfg.fieldDays;
    const predLate = p.pLate >= 0.5;
    if (predLate && late) tp++;
    else if (predLate && !late) fp++;
    else if (!predLate && late) fn++;
    else tn++;
    brier += (p.pLate - (late ? 1 : 0)) ** 2;
    n++;
  }
  return { asOfDay, tp, fp, fn, tn, precision: tp / Math.max(1, tp + fp), recall: tp / Math.max(1, tp + fn), accuracy: (tp + tn) / Math.max(1, n), brier: brier / Math.max(1, n), n };
}
