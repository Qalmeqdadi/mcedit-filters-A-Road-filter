/**
 * National fieldwork simulation engine (SYNTHETIC OPERATIONAL DATA).
 *
 * Time model: 4 work shifts per field day (09:00, 12:00, 15:00, 18:00).
 * One "step" = one shift. Each step draws from an independent random stream
 * derived from (seed, step), so a given seed + the same human actions always
 * reproduce the same demonstration regardless of playback speed.
 *
 *   simulateStep → per enumerator: simulateVisit → simulateInterview | simulateRefusal | scheduleRevisit
 *   endOfDay     → detectQualityIssues, detectAnomalies, alerts, supervisor tasks, snapshots
 */
import type {
  Alert, AlertType, Anomaly, AnomalyDecision, EAState, EAStatus, EnumeratorState, GovId, Household, IssueStatus, L,
  PESResult, PESSample, QualityIssue, Severity, SupervisorTask,
} from "@/types/census";
import { detectAnomalies, medianFromHist } from "./anomalies";
import { generateWorld, type SimConfig, type World } from "./generate";
import { runPostEnumerationSurvey, drawPESSample } from "./pes";
import { RULE_INDEX, rosterSignature, validateHousehold } from "./quality";
import { clamp, derive, type Rng } from "./rng";

export const SHIFTS_PER_DAY = 4;
export const SHIFT_HOURS = [9, 12, 15, 18];
export const MOPUP_DAYS = 4;

export type SimPhase = "READY" | "RUNNING" | "PAUSED" | "FINISHED";

/** dwelling visits per planned interview (vacant units, call-backs, travel) */
const VISIT_OVERHEAD = 1.32;

interface StepContext {
  day: number;
  shift: number;
  base: number;
  disrupted: Map<string, number>;
}

export interface Snapshot {
  day: number;
  completed: number;
  persons: number;
  visited: number;
  refusals: number;
  vacant: number;
  noContactPending: number;
  noContactFinal: number;
  validated: number;
  interviewsToday: number;
  eaCompleted: number;
  eaRisk: number;
  activeEnumerators: number;
  offline: number;
  issuesOpen: number;
  anomaliesOpen: number;
}

export interface FeedEvent {
  step: number;
  kind: "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";
  govId?: GovId;
  text: L;
}

export interface Aggregate {
  dwellings: number;
  dwellingsTrue: number;
  hhEstimate: number;
  popEstimate: number;
  visited: number;
  completed: number;
  persons: number;
  refusals: number;
  vacant: number;
  noContactPending: number;
  noContactFinal: number;
  revisitsScheduled: number;
  revisitsDone: number;
  validated: number;
  failed: number;
  eas: number;
  eaByStatus: Record<EAStatus, number>;
  enumerators: number;
  activeEnumerators: number;
  offline: number;
  completionPct: number;
  responseRate: number;
  validationRate: number;
  coverageRisk: number;
  expectedPct: number;
}

const OWNER = {
  field: (g: { en: string; ar: string }): L => ({ en: `Field Coordinator — ${g.en}`, ar: `منسق العمل الميداني — ${g.ar}` }),
  dq: { en: "Data Quality Unit", ar: "وحدة جودة البيانات" },
  it: { en: "IT & Device Operations", ar: "عمليات تقنية المعلومات والأجهزة" },
  pes: { en: "PES & Coverage Unit", ar: "وحدة مسح ما بعد العدّ والتغطية" },
  ops: { en: "National Operations Centre", ar: "مركز العمليات الوطني" },
};

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

function emptyEA(): EAState {
  return { visited: 0, completed: 0, persons: 0, refusals: 0, vacantFound: 0, noContactPending: 0, noContactFinal: 0, revisitsScheduled: 0, revisitsDone: 0, supervisorRevisit: 0, status: "NOT_STARTED", coverageScore: 100, riskScore: 0, completedDay: null };
}

function emptyEnum(assigned: number): EnumeratorState {
  return {
    assigned, completed: 0, refusals: 0, pending: assigned, visited: 0, vacant: 0, validated: 0, failedValidation: 0,
    durSum: 0, durCount: 0, durHist: new Array(13).fill(0), sizeHist: new Array(12).fill(0), gpsOutside: 0, daily: [], stepLog: [],
    status: "NOT_STARTED", offlineUntilStep: -1, unsynced: 0, validationScore: 100, coverageScore: 100, riskScore: 0, interventions: [],
  };
}

export class CensusEngine {
  readonly world: World;
  step = 0;
  phase: SimPhase = "READY";
  ea: EAState[];
  en: EnumeratorState[];
  pointer: Int32Array;
  activeDays: Int16Array;
  private todayCount: Int32Array;
  issues: QualityIssue[] = [];
  private issueKeys = new Set<string>();
  anomalies: Anomaly[] = [];
  private anomalyKeys = new Map<string, number>();
  alerts: Alert[] = [];
  private alertKeys = new Set<string>();
  tasks: SupervisorTask[] = [];
  history: Snapshot[] = [];
  govHistory: Record<string, Snapshot[]> = {};
  feed: FeedEvent[] = [];
  pesSample: PESSample | null = null;
  pesResult: PESResult | null = null;
  enumerated = new Uint8Array(0);
  questionnaire: Household[] = [];
  private sizeCdf: Record<string, number[]> = {};
  private seenHouseholdIds = new Map<string, string>();
  private signatures = new Map<string, Household[]>();
  private counter = 0;
  version = 0;
  /** EA indices per enumerator (precomputed) */
  readonly enumEas: number[][];
  /** EA / enumerator indices per district (precomputed) */
  readonly districtEas = new Map<string, number[]>();
  readonly districtEnums = new Map<string, number[]>();
  /** deterministic access disruptions (e.g. weather, road closure) that slow fieldwork in a district */
  readonly disruptions: { districtId: string; from: number; to: number; factor: number; cause: L }[] = [];
  private enumeratedList: Household[] = [];
  /** productivity multiplier from reserve enumerators deployed to support lagging workloads */
  readonly boost: Float32Array;
  readonly reservePool: number;
  reservesDeployed = 0;

  constructor(config: SimConfig) {
    this.world = generateWorld(config);
    this.ea = this.world.eas.map(() => emptyEA());
    this.en = this.world.enumerators.map((e) => emptyEnum(e.householdsAssigned));
    this.pointer = new Int32Array(this.world.enumerators.length);
    this.activeDays = new Int16Array(this.world.enumerators.length);
    this.todayCount = new Int32Array(this.world.enumerators.length);
    this.enumerated = new Uint8Array(this.world.households.length);
    this.boost = new Float32Array(this.world.enumerators.length).fill(1);
    this.reservePool = Math.ceil(this.world.enumerators.length * 0.1);
    for (const g of this.world.governorates) this.govHistory[g.id] = [];
    this.enumEas = this.world.enumerators.map((e) => e.eaIds.map((id) => this.world.eaIdx.get(id)!));
    this.world.eas.forEach((a, k) => {
      const l = this.districtEas.get(a.districtId) ?? [];
      l.push(k);
      this.districtEas.set(a.districtId, l);
    });
    this.world.enumerators.forEach((e, i) => {
      const l = this.districtEnums.get(e.districtId) ?? [];
      l.push(i);
      this.districtEnums.set(e.districtId, l);
    });
    this.planDisruptions();
    this.buildSizeDistributions();
  }

  private planDisruptions() {
    const rng = derive(this.world.config.seed, "disruptions");
    const pick = (govId: GovId) => {
      const cands = this.world.districts.filter((d) => d.govId === govId && !d.isCapitalDistrict && (this.districtEas.get(d.id)?.length ?? 0) >= 25);
      return cands.length ? rng.pick(cands) : null;
    };
    const a = pick("MAF");
    const b = pick("KAR") ?? pick("BAL");
    if (a) this.disruptions.push({ districtId: a.id, from: 3, to: 8, factor: 0.12, cause: { en: "dust storm and road closures", ar: "عاصفة غبارية وإغلاق طرق" } });
    if (b) this.disruptions.push({ districtId: b.id, from: 5, to: 10, factor: 0.2, cause: { en: "flash-flood warning restricting access", ar: "تحذير من سيول مفاجئة يقيّد الوصول" } });
  }

  get config() {
    return this.world.config;
  }
  get day() {
    return Math.floor(this.step / SHIFTS_PER_DAY);
  }
  get lastDay() {
    return this.world.config.fieldDays + MOPUP_DAYS;
  }

  /** Simulated wall-clock for a step, ISO string. */
  timeOf(step: number): Date {
    const d = new Date(`${this.world.config.startDate}T00:00:00`);
    d.setDate(d.getDate() + Math.floor(step / SHIFTS_PER_DAY));
    d.setHours(SHIFT_HOURS[step % SHIFTS_PER_DAY]);
    return d;
  }

  private nextId(prefix: string) {
    this.counter += 1;
    return `${prefix}-${String(this.counter).padStart(5, "0")}`;
  }

  private buildSizeDistributions() {
    const counts: Record<string, number[]> = {};
    for (const h of this.world.households) {
      if (h.planted) continue;
      const k = `${h.govId}|${h.urban ? "U" : "R"}`;
      const arr = (counts[k] ??= new Array(16).fill(0));
      arr[Math.min(15, h.members.length - 1)]++;
    }
    for (const [k, arr] of Object.entries(counts)) {
      const total = arr.reduce((a, b) => a + b, 0);
      let acc = 0;
      this.sizeCdf[k] = arr.map((c) => (acc += c / total));
    }
  }

  private drawSize(rng: Rng, govId: GovId, urban: boolean): number {
    const cdf = this.sizeCdf[`${govId}|${urban ? "U" : "R"}`] ?? this.sizeCdf[`${govId}|U`];
    const r = rng.next();
    for (let i = 0; i < cdf.length; i++) if (r <= cdf[i]) return i + 1;
    return cdf.length;
  }

  private log(kind: FeedEvent["kind"], text: L, govId?: GovId) {
    this.feed.push({ step: this.step, kind, govId, text });
    if (this.feed.length > 400) this.feed.splice(0, this.feed.length - 400);
  }

  // ------------------------------------------------------------------ public controls

  advance(steps: number): boolean {
    for (let i = 0; i < steps; i++) {
      if (this.phase === "FINISHED") break;
      this.simulateStep();
    }
    this.version++;
    return this.phase === "FINISHED";
  }

  start() {
    if (this.phase !== "FINISHED") this.phase = "RUNNING";
    this.version++;
  }

  pause() {
    if (this.phase === "RUNNING") this.phase = "PAUSED";
    this.version++;
  }

  /** Runs one full simulated census day (4 shifts). */
  simulateCensusDay() {
    const target = (this.day + 1) * SHIFTS_PER_DAY;
    this.advance(target - this.step);
  }

  simulateStep() {
    if (this.phase === "FINISHED") return;
    const day = this.day;
    const shift = this.step % SHIFTS_PER_DAY;
    const rng = derive(this.world.config.seed, "step", this.step);
    if (shift === 0) this.startOfDay(day, rng);
    const cfg = this.world.config;
    const disrupted = new Map<string, number>();
    for (const d of this.disruptions) if (day >= d.from && day <= d.to) disrupted.set(d.districtId, d.factor);
    const ctx: StepContext = {
      day,
      shift,
      base: (cfg.interviewsPerDay / SHIFTS_PER_DAY) * (day === 0 ? 0.72 : day === 1 ? 0.88 : 1) * (this.timeOf(this.step).getDay() === 5 ? 0.55 : 1) * (day >= cfg.fieldDays ? 2.2 : 1) * VISIT_OVERHEAD,
      disrupted,
    };
    const { enumerators } = this.world;
    for (let i = 0; i < enumerators.length; i++) this.workEnumerator(i, ctx, rng);
    if (shift === SHIFTS_PER_DAY - 1) this.endOfDay(day);
    this.step++;
    if (this.step % SHIFTS_PER_DAY === 0 && this.isComplete()) this.finish();
    else if (this.day > this.lastDay) this.finish();
  }

  private isComplete() {
    for (let i = 0; i < this.ea.length; i++) if (this.ea[i].status !== "COMPLETED") return false;
    return true;
  }

  private finish() {
    for (let i = 0; i < this.ea.length; i++) {
      const s = this.ea[i];
      s.noContactFinal += s.noContactPending;
      s.noContactPending = 0;
      s.supervisorRevisit = 0;
      this.updateEAStatus(i, this.day);
    }
    this.phase = "FINISHED";
    this.log("SUCCESS", { en: `Fieldwork closed on day ${this.day}. Remaining non-contacts finalised as non-response.`, ar: `أُغلق العمل الميداني في اليوم ${this.day}. اعتُبرت حالات عدم الاتصال المتبقية عدم استجابة نهائية.` });
  }

  // ------------------------------------------------------------------ daily cycle

  private startOfDay(day: number, rng: Rng) {
    this.todayCount.fill(0);
    if (day === 0) this.log("INFO", { en: `Census fieldwork launched: ${fmt(this.world.enumerators.length)} enumerators deployed to ${fmt(this.world.eas.length)} EAs.`, ar: `انطلاق العمل الميداني للتعداد: نشر ${fmt(this.world.enumerators.length)} عدّاداً في ${fmt(this.world.eas.length)} منطقة عدّ.` });
    // device failures
    const offlineByDistrict = new Map<string, string[]>();
    this.world.enumerators.forEach((e, i) => {
      const s = this.en[i];
      if (s.status === "COMPLETED" || day < e.startDay) return;
      const p = e.profile.kind === "DEVICE_ISSUES" ? 0.12 : 1 - e.profile.deviceReliability;
      if (rng.chance(p)) {
        s.offlineUntilStep = this.step + rng.int(1, 3);
        s.status = "OFFLINE";
        const list = offlineByDistrict.get(e.districtId) ?? [];
        list.push(e.id);
        offlineByDistrict.set(e.districtId, list);
      }
    });
    for (const [districtId, ids] of offlineByDistrict) {
      if (ids.length < 2) continue;
      const d = this.world.district[districtId];
      this.raiseAlert("DEVICE_OFFLINE", ids.length >= 4 ? "HIGH" : "MEDIUM", OWNER.it, d.govId, `${districtId}#${Math.floor(day / 3)}`,
        { en: `${ids.length} device(s) offline in ${d.name.en} (${ids.slice(0, 3).join(", ")}${ids.length > 3 ? "…" : ""}). Replacement units dispatched from the reserve pool.`, ar: `${ids.length} جهاز/أجهزة غير متصلة في ${d.name.ar} (${ids.slice(0, 3).join("، ")}${ids.length > 3 ? "…" : ""}). تم إرسال أجهزة بديلة من المخزون الاحتياطي.` });
    }
    for (const d of this.disruptions) {
      const dist = this.world.district[d.districtId];
      if (day === d.from) this.log("WARNING", { en: `Access disruption in ${dist.name.en}: ${d.cause.en}. Field productivity reduced.`, ar: `تعطل الوصول في ${dist.name.ar}: ${d.cause.ar}. انخفاض الإنتاجية الميدانية.` }, dist.govId);
      if (day === d.to + 1) this.log("INFO", { en: `Access restored in ${dist.name.en}.`, ar: `عودة الوصول في ${dist.name.ar}.` }, dist.govId);
    }
    // supervisors complete some of their open tasks each morning (simulated human follow-up)
    const done: Record<string, number> = {};
    for (const t of this.tasks) {
      if (t.status !== "OPEN" || t.createdStep >= this.step - 2) continue;
      done[t.supervisorId] = (done[t.supervisorId] ?? 0) + 1;
      if (done[t.supervisorId] <= 2) t.status = "DONE";
    }
  }

  private workEnumerator(i: number, ctx: StepContext, rng: Rng) {
    const e = this.world.enumerators[i];
    const s = this.en[i];
    const { day, shift } = ctx;
    if (day < e.startDay || s.status === "COMPLETED") return;
    if (s.offlineUntilStep >= this.step) {
      s.status = "OFFLINE";
      return;
    }
    if (s.status === "OFFLINE") {
      s.status = "ACTIVE";
      this.log("INFO", { en: `${e.id} back online — device replaced and synchronised.`, ar: `${e.id} عاد للاتصال — تم استبدال الجهاز ومزامنته.` }, e.govId);
    }
    const mine = this.enumEas[i];
    const eaIdx = mine[Math.min(this.pointer[i], mine.length - 1)];
    const access = Math.sqrt(this.world.eas[eaIdx].accessibility);
    const lambda = ctx.base * e.profile.speed * access * this.boost[i] * (ctx.disrupted.get(e.districtId) ?? 1);
    let attempts = rng.poisson(lambda);
    let did = 0;
    while (attempts-- > 0) {
      const r = this.nextVisit(i, rng, shift);
      if (!r) break;
      did++;
    }
    if (did > 0) {
      s.status = s.status === "UNDER_REVIEW" ? "UNDER_REVIEW" : "ACTIVE";
    } else if (this.allDone(i)) {
      s.status = "COMPLETED";
      this.log("SUCCESS", { en: `${e.id} completed all assigned EAs (${e.eaIds.length}).`, ar: `أنهى ${e.id} جميع مناطق العدّ المسندة (${e.eaIds.length}).` }, e.govId);
    } else if (s.status !== "UNDER_REVIEW") s.status = "IDLE";
    s.stepLog.push(did);
    if (s.stepLog.length > 8) s.stepLog.shift();
  }

  private allDone(i: number) {
    return this.enumEas[i].every((k) => this.ea[k].status === "COMPLETED");
  }

  /** Performs one dwelling visit for enumerator i. Returns false if no work is left. */
  private nextVisit(i: number, rng: Rng, shift: number): boolean {
    const mine = this.enumEas[i];
    // supervisor-requested revisits take priority, then no-contact revisits late in the day, then first visits
    for (const k of mine) {
      if (this.ea[k].supervisorRevisit > 0) {
        this.ea[k].supervisorRevisit--;
        this.ea[k].revisitsDone++;
        this.updateEAStatus(k, this.day);
        return true;
      }
    }
    while (this.pointer[i] < mine.length) {
      const k = mine[this.pointer[i]];
      const a = this.world.eas[k];
      const s = this.ea[k];
      if (s.visited < a.dwellingsTrue) {
        if (shift === SHIFTS_PER_DAY - 1 && s.noContactPending > 0 && rng.chance(0.3)) {
          this.simulateRevisit(i, k, rng);
          return true;
        }
        this.simulateVisit(i, k, rng);
        return true;
      }
      this.pointer[i]++;
    }
    // first visits done: work through revisits
    for (const k of mine) {
      if (this.ea[k].noContactPending > 0) {
        this.simulateRevisit(i, k, rng);
        return true;
      }
    }
    return false;
  }

  private simulateVisit(i: number, k: number, rng: Rng) {
    const a = this.world.eas[k];
    const s = this.ea[k];
    const e = this.world.enumerators[i];
    const remaining = a.dwellingsTrue - s.visited;
    const remainingVacant = a.vacantTrue - s.vacantFound;
    s.visited++;
    this.en[i].visited++;
    if (s.visited === 1 && k % 40 === 0) this.log("INFO", { en: `${e.id} started EA ${a.id}.`, ar: `بدأ ${e.id} العمل في منطقة العدّ ${a.id}.` }, a.govId);
    if (rng.next() < remainingVacant / Math.max(1, remaining)) {
      s.vacantFound++;
      this.en[i].vacant++;
    } else {
      const pRef = (a.urban ? 0.016 : 0.009) * e.profile.refusalFactor * (1 + 0.5 * (1 - a.accessibility));
      const pNC = a.urban ? 0.1 : 0.06;
      const r = rng.next();
      if (r < pRef) this.simulateRefusal(i, k);
      else if (r < pRef + pNC) this.scheduleRevisit(k, 1);
      else this.simulateInterview(i, k, rng);
    }
    this.updateEAStatus(k, this.day);
  }

  private simulateRevisit(i: number, k: number, rng: Rng) {
    const s = this.ea[k];
    s.revisitsDone++;
    const r = rng.next();
    if (r < 0.64) {
      s.noContactPending--;
      this.simulateInterview(i, k, rng);
    } else if (r < 0.67) {
      s.noContactPending--;
      this.simulateRefusal(i, k);
    } else if (rng.chance(0.22) || this.day >= this.world.config.fieldDays + MOPUP_DAYS - 1) {
      s.noContactPending--;
      s.noContactFinal++;
    }
    this.updateEAStatus(k, this.day);
  }

  simulateRefusal(i: number, k: number) {
    this.ea[k].refusals++;
    this.en[i].refusals++;
    this.en[i].pending = Math.max(0, this.en[i].pending - 1);
  }

  scheduleRevisit(k: number, n: number, bySupervisor = false) {
    const s = this.ea[k];
    if (bySupervisor) s.supervisorRevisit += n;
    else s.noContactPending += n;
    s.revisitsScheduled += n;
  }

  simulateInterview(i: number, k: number, rng: Rng) {
    const a = this.world.eas[k];
    const e = this.world.enumerators[i];
    const s = this.ea[k];
    const st = this.en[i];
    const fab = e.profile.kind === "FABRICATION_RISK" && !st.interventions.some((x) => x.action === "RETRAIN" || x.action === "SUSPEND_REASSIGN");
    const size = fab && rng.chance(0.94) ? 4 : this.drawSize(rng, a.govId, a.urban);
    const durFactor = fab ? e.profile.durationFactor : Math.max(e.profile.durationFactor, e.profile.kind === "FABRICATION_RISK" ? 0.9 : 0);
    const minutes = rng.lognormal(11 + 3.4 * size, 0.26) * durFactor;
    s.completed++;
    s.persons += size;
    st.completed++;
    st.pending = Math.max(0, st.pending - 1);
    st.durSum += minutes;
    st.durCount++;
    st.durHist[Math.min(12, Math.floor(minutes / 5))]++;
    st.sizeHist[Math.min(11, size - 1)]++;
    if (rng.chance(fab ? e.profile.errorRate : e.profile.errorRate)) st.failedValidation++;
    else st.validated++;
    if (rng.chance(e.profile.kind === "GPS_DRIFT" ? 0.35 : 0.006)) st.gpsOutside++;
    this.todayCount[i]++;
  }

  updateEAStatus(k: number, day: number) {
    const a = this.world.eas[k];
    const s = this.ea[k];
    const prev = s.status;
    const firstDone = s.visited >= a.dwellingsTrue;
    const progress = s.visited / Math.max(1, a.dwellingsTrue);
    const expected = clamp((day + (this.step % SHIFTS_PER_DAY) / SHIFTS_PER_DAY - a.startDay) / a.expectedDays, 0, 1);
    const contacted = s.completed + s.refusals;
    const refRate = contacted ? s.refusals / contacted : 0;
    const occFound = s.completed + s.refusals + s.noContactPending + s.noContactFinal;
    const occRatio = s.visited ? occFound / Math.max(1, a.hhEstimate * Math.min(1, s.visited / a.dwellings)) : 1;
    const responders = s.completed + s.refusals + s.noContactPending + s.noContactFinal;
    const response = responders ? s.completed / responders : 1;
    s.coverageScore = Math.round(100 * Math.min(1, occRatio) * (0.6 + 0.4 * response));
    const lag = Math.max(0, expected - progress);
    s.riskScore = Math.round(clamp(lag * 120 + refRate * 250 + Math.max(0, 1 - occRatio) * 120, 0, 100));
    let status: EAStatus;
    if (s.visited === 0) status = day > a.startDay + 2 ? "COVERAGE_RISK" : "NOT_STARTED";
    else if (firstDone && s.noContactPending === 0 && s.supervisorRevisit === 0) status = "COMPLETED";
    else if (s.supervisorRevisit > 0 || (firstDone && s.noContactPending > 0)) status = "REVISIT_REQUIRED";
    else if ((day >= 2 && progress < expected - 0.3) || (contacted >= 25 && refRate > 0.09)) status = "COVERAGE_RISK";
    else status = "IN_PROGRESS";
    s.status = status;
    if (status === "COMPLETED" && prev !== "COMPLETED") {
      s.completedDay = day;
    }
  }

  private endOfDay(day: number) {
    const cfg = this.world.config;
    // per-enumerator daily logs
    this.world.enumerators.forEach((e, i) => {
      const s = this.en[i];
      s.daily.push(this.todayCount[i]);
      if (this.todayCount[i] > 0) this.activeDays[i]++;
      s.validationScore = s.completed ? Math.round((100 * s.validated) / s.completed) : 100;
      const myEas = e.eaIds.map((id) => this.ea[this.world.eaIdx.get(id)!]).filter((x) => x.visited > 0);
      s.coverageScore = myEas.length ? Math.round(myEas.reduce((a, b) => a + b.coverageScore, 0) / myEas.length) : 100;
    });
    for (let k = 0; k < this.ea.length; k++) this.updateEAStatus(k, day);

    // sampled microdata becomes "enumerated" as EAs progress; run household rules
    const newlyEnumerated: Household[] = [];
    this.world.households.forEach((h, idx) => {
      if (this.enumerated[idx]) return;
      const k = this.world.eaIdx.get(h.eaId)!;
      const s = this.ea[k];
      const a = this.world.eas[k];
      if (s.visited / Math.max(1, a.dwellingsTrue) >= h.order) {
        this.enumerated[idx] = 1;
        h.enumeratedDay = day;
        newlyEnumerated.push(h);
        this.enumeratedList.push(h);
      }
    });
    for (const h of newlyEnumerated) this.checkHousehold(h);
    this.operationalRules(day);

    // anomaly detection (explainable, statistical)
    const found = detectAnomalies({ world: this.world, ea: this.ea, en: this.en, day, step: this.step, activeDays: this.activeDays, signatures: this.signatures, districtEas: this.districtEas, districtEnums: this.districtEnums });
    this.deployReserves(day);
    for (const a of found) this.upsertAnomaly(a);

    // supervisor workload alerts
    const open: Record<string, number> = {};
    for (const t of this.tasks) if (t.status === "OPEN") open[t.supervisorId] = (open[t.supervisorId] ?? 0) + 1;
    for (const [sid, n] of Object.entries(open)) {
      if (n < 7) continue;
      const sup = this.world.supervisors[this.world.supIdx.get(sid)!];
      this.raiseAlert("SUPERVISOR_REVIEW", n >= 8 ? "HIGH" : "MEDIUM", OWNER.field(this.world.gov[sup.govId].name), sup.govId, `${sid}#${Math.floor(day / 3)}`,
        { en: `Supervisor ${sid} (${sup.name.en}) has ${n} open review tasks — reinforcement recommended.`, ar: `لدى المشرف ${sid} (${sup.name.ar}) ${n} مهام مراجعة مفتوحة — يُوصى بالدعم.` });
    }

    // snapshots
    this.pushSnapshots(day);
    if (day === cfg.fieldDays - 1) this.log("WARNING", { en: "Planned fieldwork period ends today. Mop-up operations with reserve staff begin tomorrow.", ar: "تنتهي فترة العمل الميداني المخططة اليوم. تبدأ عمليات الاستكمال بالكادر الاحتياطي غداً." });
  }

  /** Field-management rule: from day 7, enumerators projected to overrun the plan receive reserve support. */
  private deployReserves(day: number) {
    const cfg = this.world.config;
    if (day < 6 || this.reservesDeployed >= this.reservePool) return;
    const daysLeft = Math.max(1, cfg.fieldDays - (day + 1));
    const byDistrict = new Map<string, number>();
    this.world.enumerators.forEach((e, i) => {
      if (this.boost[i] > 1 || this.reservesDeployed >= this.reservePool) return;
      const s = this.en[i];
      if (s.status === "COMPLETED" || this.activeDays[i] < 2) return;
      let remaining = 0;
      for (const k of this.enumEas[i]) remaining += Math.max(0, this.world.eas[k].dwellingsTrue - this.ea[k].visited);
      const rate = s.visited / this.activeDays[i];
      if (remaining > rate * daysLeft * 1.05) {
        this.boost[i] = 1.8;
        this.reservesDeployed++;
        s.interventions.push({ step: this.step, by: "Field operations (auto-rule)", action: "RESERVE_DEPLOYED", note: `Projected overrun: ${remaining} dwellings left at ${rate.toFixed(1)}/day with ${daysLeft} planned days remaining.` });
        byDistrict.set(e.districtId, (byDistrict.get(e.districtId) ?? 0) + 1);
      }
    });
    for (const [districtId, n] of byDistrict) {
      if (n < 3) continue;
      const d = this.world.district[districtId];
      this.log("INFO", { en: `${n} reserve enumerators deployed in ${d.name.en} to recover schedule.`, ar: `نشر ${n} عدّادين احتياطيين في ${d.name.ar} لاستعادة الجدول الزمني.` }, d.govId);
    }
  }

  private pushSnapshots(day: number) {
    const blank = (): Snapshot => ({ day, completed: 0, persons: 0, visited: 0, refusals: 0, vacant: 0, noContactPending: 0, noContactFinal: 0, validated: 0, interviewsToday: 0, eaCompleted: 0, eaRisk: 0, activeEnumerators: 0, offline: 0, issuesOpen: 0, anomaliesOpen: 0 });
    const nat = blank();
    const by: Record<string, Snapshot> = {};
    for (const g of this.world.governorates) by[g.id] = blank();
    this.world.eas.forEach((a, k) => {
      const s = this.ea[k];
      for (const t of [nat, by[a.govId]]) {
        t.completed += s.completed;
        t.persons += s.persons;
        t.visited += s.visited;
        t.refusals += s.refusals;
        t.vacant += s.vacantFound;
        t.noContactPending += s.noContactPending;
        t.noContactFinal += s.noContactFinal;
        if (s.status === "COMPLETED") t.eaCompleted++;
        if (s.status === "COVERAGE_RISK") t.eaRisk++;
      }
    });
    this.world.enumerators.forEach((e, i) => {
      const s = this.en[i];
      for (const t of [nat, by[e.govId]]) {
        t.validated += s.validated;
        t.interviewsToday += this.todayCount[i];
        if (s.status === "ACTIVE" || s.status === "UNDER_REVIEW") t.activeEnumerators++;
        if (s.status === "OFFLINE") t.offline++;
      }
    });
    for (const q of this.issues) if (isOpen(q.status)) { nat.issuesOpen++; by[q.govId].issuesOpen++; }
    for (const a of this.anomalies) if (a.status === "OPEN") { nat.anomaliesOpen++; by[a.govId].anomaliesOpen++; }
    this.history.push(nat);
    for (const g of this.world.governorates) this.govHistory[g.id].push(by[g.id]);
  }

  // ------------------------------------------------------------------ quality

  private addIssue(issue: Omit<QualityIssue, "id" | "status" | "history" | "step">, key: string) {
    if (this.issueKeys.has(key)) return;
    this.issueKeys.add(key);
    const q: QualityIssue = { ...issue, id: this.nextId("QI"), status: "OPEN", step: this.step, history: [{ step: this.step, action: "DETECTED", by: "Rule engine" }] };
    this.issues.push(q);
    if (q.eaId) {
      const k = this.world.eaIdx.get(q.eaId);
      if (k !== undefined) {
        const sid = this.world.eas[k].supervisorId;
        this.tasks.push({ id: this.nextId("TSK"), supervisorId: sid, kind: "REVIEW_ISSUE", refId: q.id, createdStep: this.step, status: "OPEN", text: { en: `Review ${RULE_INDEX[q.ruleId]?.title.en ?? q.ruleId} (${q.entityId})`, ar: `مراجعة ${RULE_INDEX[q.ruleId]?.title.ar ?? q.ruleId} (${q.entityId})` } });
      }
    }
    if (q.ruleId === "R06")
      this.raiseAlert("POTENTIAL_DUPLICATE", "HIGH", OWNER.dq, q.govId, q.entityId, { en: `Potential duplicate household record ${q.entityId}.`, ar: `سجل أسرة مكرر محتمل ${q.entityId}.` });
  }

  /** Household-level and cross-record checks. Public so questionnaire submissions use the same path. */
  checkHousehold(h: Household) {
    const hits = validateHousehold(h);
    for (const hit of hits) {
      this.addIssue({
        ruleId: hit.ruleId, severity: hit.severity, entityType: hit.personLine ? "PERSON" : "HOUSEHOLD",
        entityId: hit.personLine ? `${h.id}-P${String(hit.personLine).padStart(2, "0")}` : h.id,
        householdId: h.id, eaId: h.eaId, enumeratorId: h.enumeratorId, govId: h.govId, message: hit.message, evidence: hit.evidence,
      }, `${hit.ruleId}#${h.id}#${hit.personLine ?? ""}#${h.source}`);
    }
    const prevEnum = this.seenHouseholdIds.get(h.id);
    if (prevEnum !== undefined) {
      this.addIssue({
        ruleId: "R06", severity: "CRITICAL", entityType: "HOUSEHOLD", entityId: h.id, householdId: h.id, eaId: h.eaId, enumeratorId: h.enumeratorId, govId: h.govId,
        message: { en: `Household ID ${h.id} submitted twice`, ar: `رقم الأسرة ${h.id} أُرسل مرتين` },
        evidence: { en: `first submission by ${prevEnum}; second by ${h.enumeratorId}`, ar: `الإرسال الأول من ${prevEnum}؛ والثاني من ${h.enumeratorId}` },
      }, `R06#${h.id}`);
    } else this.seenHouseholdIds.set(h.id, h.enumeratorId);
    // identical pattern per enumerator (R10)
    const sigKey = `${h.enumeratorId}#${rosterSignature(h)}`;
    const same = this.signatures.get(sigKey) ?? [];
    same.push(h);
    this.signatures.set(sigKey, same);
    if (same.length >= 3) {
      this.addIssue({
        ruleId: "R10", severity: "HIGH", entityType: "ENUMERATOR", entityId: h.enumeratorId, enumeratorId: h.enumeratorId, eaId: h.eaId, govId: h.govId,
        message: { en: `${same.length} identical household rosters entered by ${h.enumeratorId}`, ar: `${same.length} قوائم أسر متطابقة أدخلها ${h.enumeratorId}` },
        evidence: { en: `households: ${same.slice(0, 4).map((x) => x.id).join(", ")}`, ar: `الأسر: ${same.slice(0, 4).map((x) => x.id).join("، ")}` },
      }, `R10#${h.enumeratorId}`);
    }
  }

  private operationalRules(day: number) {
    const cfg = this.world.config;
    this.world.enumerators.forEach((e, i) => {
      const s = this.en[i];
      const ad = this.activeDays[i];
      if (ad >= 2 && s.completed / ad > 2 * cfg.interviewsPerDay)
        this.addIssue({ ruleId: "R13", severity: "HIGH", entityType: "ENUMERATOR", entityId: e.id, enumeratorId: e.id, eaId: e.eaIds[0], govId: e.govId,
          message: { en: `${e.id} averages ${(s.completed / ad).toFixed(1)} interviews/day (plan ${cfg.interviewsPerDay})`, ar: `متوسط ${e.id} هو ${(s.completed / ad).toFixed(1)} مقابلة/يوم (الخطة ${cfg.interviewsPerDay})` },
          evidence: { en: `${s.completed} interviews over ${ad} active days`, ar: `${s.completed} مقابلة خلال ${ad} أيام عمل` } }, `R13#${e.id}`);
      if (s.completed >= 20 && s.gpsOutside / s.completed > 0.15)
        this.addIssue({ ruleId: "R16", severity: "HIGH", entityType: "ENUMERATOR", entityId: e.id, enumeratorId: e.id, eaId: e.eaIds[0], govId: e.govId,
          message: { en: `${((100 * s.gpsOutside) / s.completed).toFixed(0)}% of ${e.id}'s GPS points outside assigned EA`, ar: `${((100 * s.gpsOutside) / s.completed).toFixed(0)}% من نقاط GPS للعدّاد ${e.id} خارج منطقة العدّ` },
          evidence: { en: `${s.gpsOutside} of ${s.completed} interviews`, ar: `${s.gpsOutside} من ${s.completed} مقابلة` } }, `R16#${e.id}`);
    });
    this.world.eas.forEach((a, k) => {
      const s = this.ea[k];
      const contacted = s.completed + s.refusals;
      if (contacted >= 30 && s.refusals / contacted > 0.1) {
        this.addIssue({ ruleId: "R14", severity: s.refusals / contacted > 0.16 ? "HIGH" : "MEDIUM", entityType: "EA", entityId: a.id, eaId: a.id, enumeratorId: a.enumeratorId, govId: a.govId,
          message: { en: `Refusal rate ${((100 * s.refusals) / contacted).toFixed(0)}% in ${a.id}`, ar: `نسبة الرفض ${((100 * s.refusals) / contacted).toFixed(0)}% في ${a.id}` },
          evidence: { en: `${s.refusals} refusals of ${contacted} contacted households`, ar: `${s.refusals} حالة رفض من ${contacted} أسرة تم التواصل معها` } }, `R14#${a.id}`);
        if (s.refusals / contacted > 0.14) this.raiseAlert("HIGH_REFUSAL", "MEDIUM", OWNER.field(this.world.gov[a.govId].name), a.govId, a.id, { en: `High refusal rate (${((100 * s.refusals) / contacted).toFixed(0)}%) in EA ${a.id}.`, ar: `نسبة رفض مرتفعة (${((100 * s.refusals) / contacted).toFixed(0)}%) في منطقة العدّ ${a.id}.` });
      }
      if (s.visited >= a.dwellingsTrue && Math.abs(s.visited - a.dwellings) / a.dwellings > 0.2)
        this.addIssue({ ruleId: "R15", severity: "MEDIUM", entityType: "EA", entityId: a.id, eaId: a.id, enumeratorId: a.enumeratorId, govId: a.govId,
          message: { en: `${a.id}: ${s.visited} dwellings visited vs ${a.dwellings} listed`, ar: `${a.id}: زيارة ${s.visited} مسكناً مقابل ${a.dwellings} في الحصر` },
          evidence: { en: `difference ${(((s.visited - a.dwellings) / a.dwellings) * 100).toFixed(0)}% (threshold ±20%)`, ar: `الفرق ${(((s.visited - a.dwellings) / a.dwellings) * 100).toFixed(0)}% (العتبة ±20%)` } }, `R15#${a.id}`);
      const expected = clamp((day + 1 - a.startDay) / a.expectedDays, 0, 1);
      if (day === cfg.fieldDays - 2 && expected - s.visited / a.dwellingsTrue > 0.3) {
        this.addIssue({ ruleId: "R17", severity: "HIGH", entityType: "EA", entityId: a.id, eaId: a.id, enumeratorId: a.enumeratorId, govId: a.govId,
          message: { en: `${a.id} only ${((100 * s.visited) / a.dwellingsTrue).toFixed(0)}% covered near close of fieldwork`, ar: `${a.id} مغطاة بنسبة ${((100 * s.visited) / a.dwellingsTrue).toFixed(0)}% فقط قرب نهاية العمل الميداني` },
          evidence: { en: `day ${day + 1} of ${cfg.fieldDays}`, ar: `اليوم ${day + 1} من ${cfg.fieldDays}` } }, `R17#${a.id}`);
        if (expected - s.visited / a.dwellingsTrue > 0.5) this.raiseAlert("COVERAGE_GAP", "HIGH", OWNER.field(this.world.gov[a.govId].name), a.govId, a.id, { en: `Coverage gap: EA ${a.id} at ${((100 * s.visited) / a.dwellingsTrue).toFixed(0)}% near close of fieldwork.`, ar: `فجوة تغطية: منطقة العدّ ${a.id} عند ${((100 * s.visited) / a.dwellingsTrue).toFixed(0)}% قرب نهاية العمل الميداني.` });
      }
    });
  }

  private upsertAnomaly(a: Omit<Anomaly, "id" | "status" | "step">) {
    const key = `${a.kind}#${a.subjectId}`;
    const existing = this.anomalyKeys.get(key);
    if (existing !== undefined) {
      const cur = this.anomalies[existing];
      if (cur.status === "OPEN") Object.assign(cur, { what: a.what, evidence: a.evidence, score: a.score, severity: a.severity, why: a.why });
      return;
    }
    const an: Anomaly = { ...a, id: this.nextId("AN"), status: "OPEN", step: this.step };
    this.anomalyKeys.set(key, this.anomalies.length);
    this.anomalies.push(an);
    this.log(an.severity === "CRITICAL" ? "CRITICAL" : "WARNING", { en: `Anomaly flagged: ${an.what.en}`, ar: `رُصد شذوذ: ${an.what.ar}` }, an.govId);
    const map: Partial<Record<Anomaly["kind"], AlertType>> = {
      PRODUCTIVITY_OUTLIER: "UNUSUAL_PERFORMANCE", SHORT_INTERVIEWS: "DURATION_ANOMALY", HOUSEHOLD_SIZE_HEAPING: "UNUSUAL_PERFORMANCE",
      REFUSAL_CLUSTER: "HIGH_REFUSAL", OCCUPANCY_SHORTFALL: "COVERAGE_GAP", GPS_MISMATCH: "UNUSUAL_PERFORMANCE", DUPLICATE_PATTERN: "POTENTIAL_DUPLICATE", COVERAGE_LAG: "DISTRICT_BEHIND",
    };
    const type = map[an.kind]!;
    const owner = type === "DISTRICT_BEHIND" || type === "COVERAGE_GAP" ? OWNER.field(this.world.gov[an.govId].name) : OWNER.dq;
    if (an.severity !== "LOW") this.raiseAlert(type, an.severity, owner, an.govId, an.subjectId, an.what);
    // route a follow-up to the responsible supervisor
    const sid = an.subjectType === "ENUMERATOR" ? this.world.enumerators[this.world.enumIdx.get(an.subjectId)!].supervisorId
      : an.subjectType === "EA" ? this.world.eas[this.world.eaIdx.get(an.subjectId)!].supervisorId : null;
    if (sid) this.tasks.push({ id: this.nextId("TSK"), supervisorId: sid, kind: "ANOMALY_FOLLOWUP", refId: an.id, createdStep: this.step, status: "OPEN", text: { en: `Follow up anomaly ${an.id} (${an.subjectId})`, ar: `متابعة الشذوذ ${an.id} (${an.subjectId})` } });
    if (an.subjectType === "ENUMERATOR") {
      const i = this.world.enumIdx.get(an.subjectId)!;
      this.en[i].riskScore = Math.max(this.en[i].riskScore, an.severity === "CRITICAL" ? 95 : an.severity === "HIGH" ? 80 : 55);
    }
  }

  raiseAlert(type: AlertType, severity: Severity, owner: L, govId: GovId, refId: string, text: L) {
    const key = `${type}#${refId}`;
    if (this.alertKeys.has(key)) return;
    this.alertKeys.add(key);
    this.alerts.push({ id: this.nextId("AL"), type, severity, owner, step: this.step, govId, refId, text, status: "OPEN", history: [{ step: this.step, action: "RAISED", by: "System" }] });
  }

  // ------------------------------------------------------------------ human actions (never alter responses)

  issueAction(id: string, action: "ASSIGN" | "INVESTIGATE" | "REQUEST_REVISIT" | "RESOLVE" | "DISMISS", by: string, note?: string, assignee?: string) {
    const q = this.issues.find((x) => x.id === id);
    if (!q) return;
    const statusMap: Record<typeof action, IssueStatus> = { ASSIGN: "ASSIGNED", INVESTIGATE: "INVESTIGATING", REQUEST_REVISIT: "REVISIT_REQUESTED", RESOLVE: "RESOLVED", DISMISS: "DISMISSED" };
    q.status = statusMap[action];
    if (assignee) q.assignee = assignee;
    if (action === "DISMISS") q.dismissReason = note;
    q.history.push({ step: this.step, action, by, note });
    if (action === "REQUEST_REVISIT" && q.eaId) {
      const k = this.world.eaIdx.get(q.eaId)!;
      this.scheduleRevisit(k, 1, true);
      this.updateEAStatus(k, this.day);
      this.tasks.push({ id: this.nextId("TSK"), supervisorId: this.world.eas[k].supervisorId, kind: "REVISIT", refId: q.id, createdStep: this.step, status: "OPEN", text: { en: `Revisit requested for ${q.entityId}`, ar: `طلب زيارة متابعة لـ${q.entityId}` } });
      this.log("INFO", { en: `Revisit scheduled in ${q.eaId} for issue ${q.id}.`, ar: `جدولة زيارة متابعة في ${q.eaId} للمسألة ${q.id}.` }, q.govId);
    }
    this.version++;
  }

  anomalyDecision(id: string, action: AnomalyDecision, by: string, note: string) {
    const a = this.anomalies.find((x) => x.id === id);
    if (!a || a.status === "DECIDED") return;
    a.status = "DECIDED";
    a.decision = { action, by, step: this.step, note };
    if (a.subjectType === "ENUMERATOR") {
      const i = this.world.enumIdx.get(a.subjectId)!;
      const e = this.world.enumerators[i];
      if (action === "CONFIRMED_REVISIT") {
        let total = 0;
        for (const eaId of e.eaIds) {
          const k = this.world.eaIdx.get(eaId)!;
          const n = Math.max(1, Math.round(this.ea[k].completed * 0.1));
          this.scheduleRevisit(k, n, true);
          this.updateEAStatus(k, this.day);
          total += n;
        }
        this.en[i].status = "UNDER_REVIEW";
        this.en[i].interventions.push({ step: this.step, by, action: "VERIFY_SAMPLE", note: `${total} verification revisits scheduled. ${note}` });
      } else if (action === "ASSIGNED_SUPERVISOR") {
        this.en[i].interventions.push({ step: this.step, by, action: "SUPERVISOR_ASSIGNED", note });
        this.tasks.push({ id: this.nextId("TSK"), supervisorId: e.supervisorId, kind: "ANOMALY_FOLLOWUP", refId: a.id, createdStep: this.step, status: "OPEN", text: { en: `HQ-assigned review of ${e.id}`, ar: `مراجعة مسندة من المقر للعدّاد ${e.id}` } });
      } else if (action === "DISMISSED") {
        this.en[i].riskScore = Math.min(this.en[i].riskScore, 30);
      }
    } else if (a.subjectType === "EA" && action === "CONFIRMED_REVISIT") {
      const k = this.world.eaIdx.get(a.subjectId)!;
      this.scheduleRevisit(k, 5, true);
      this.updateEAStatus(k, this.day);
    }
    if (action === "ESCALATED") this.raiseAlert("SUPERVISOR_REVIEW", "CRITICAL", OWNER.ops, a.govId, `ESC#${a.id}`, { en: `Escalated by ${by}: ${a.what.en}`, ar: `صُعّد بواسطة ${by}: ${a.what.ar}` });
    this.log("INFO", { en: `Human decision on ${a.id}: ${action.replace("_", " ").toLowerCase()} by ${by}.`, ar: `قرار بشري بشأن ${a.id}: ${action} بواسطة ${by}.` }, a.govId);
    this.version++;
  }

  enumeratorIntervention(enumId: string, action: "RETRAIN" | "VERIFY_SAMPLE" | "SUSPEND_REASSIGN", by: string, note: string) {
    const i = this.world.enumIdx.get(enumId);
    if (i === undefined) return;
    const e = this.world.enumerators[i];
    const s = this.en[i];
    s.interventions.push({ step: this.step, by, action, note });
    if (action === "VERIFY_SAMPLE") {
      for (const eaId of e.eaIds) {
        const k = this.world.eaIdx.get(eaId)!;
        this.scheduleRevisit(k, Math.max(1, Math.round(this.ea[k].completed * 0.1)), true);
        this.updateEAStatus(k, this.day);
      }
      s.status = "UNDER_REVIEW";
    }
    if (action === "SUSPEND_REASSIGN") s.status = "UNDER_REVIEW";
    this.log("INFO", { en: `Supervisor intervention on ${enumId}: ${action.replace(/_/g, " ").toLowerCase()}.`, ar: `تدخل إشرافي على ${enumId}: ${action}.` }, e.govId);
    this.version++;
  }

  alertAction(id: string, action: "ACKNOWLEDGE" | "ESCALATE" | "RESOLVE", by: string) {
    const a = this.alerts.find((x) => x.id === id);
    if (!a) return;
    a.status = action === "ACKNOWLEDGE" ? "ACKNOWLEDGED" : action === "ESCALATE" ? "ESCALATED" : "RESOLVED";
    if (action === "ESCALATE") a.severity = a.severity === "LOW" ? "MEDIUM" : a.severity === "MEDIUM" ? "HIGH" : "CRITICAL";
    a.history.push({ step: this.step, action, by });
    this.version++;
  }

  /** Questionnaire submission enters the same validation pipeline. */
  submitQuestionnaire(h: Household) {
    this.questionnaire.push(h);
    if (h.members.length) this.checkHousehold(h);
    this.log("SUCCESS", { en: `Questionnaire ${h.id} submitted (${h.members.length} persons).`, ar: `أُرسلت الاستمارة ${h.id} (${h.members.length} أفراد).` }, h.govId);
    this.version++;
  }

  // ------------------------------------------------------------------ PES

  drawPES(n: number) {
    this.pesSample = drawPESSample(this, n);
    this.pesResult = null;
    this.version++;
  }

  runPES() {
    if (!this.pesSample) return;
    this.pesResult = runPostEnumerationSurvey(this, this.pesSample);
    for (const [govId, s] of Object.entries(this.pesResult.byGov)) {
      if (s.netCoverageError < -0.03)
        this.raiseAlert("PES_COVERAGE", s.netCoverageError < -0.05 ? "HIGH" : "MEDIUM", OWNER.pes, govId as GovId, `PES#${govId}#${this.pesResult.ranAtStep}`,
          { en: `PES indicates net under-count of ${(Math.abs(s.netCoverageError) * 100).toFixed(1)}% in ${this.world.gov[govId as GovId].name.en}.`, ar: `يشير مسح ما بعد العدّ إلى نقص صافٍ في العدّ بنسبة ${(Math.abs(s.netCoverageError) * 100).toFixed(1)}% في ${this.world.gov[govId as GovId].name.ar}.` });
    }
    this.version++;
  }

  // ------------------------------------------------------------------ aggregation

  aggregate(filter?: (a: World["eas"][number]) => boolean): Aggregate {
    const key = filter ? null : "__all__";
    const groups = this.groupAggregate((a) => (filter && !filter(a) ? null : key ?? "__all__"));
    return groups["__all__"] ?? emptyAggregate();
  }

  /** Single pass aggregation by governorate or district. Memoised per engine version. */
  aggregateBy(field: "govId" | "districtId"): Record<string, Aggregate> {
    const k = `${field}#${this.version}#${this.step}`;
    if (this.aggCache?.key === k) return this.aggCache.value;
    const value = this.groupAggregate((a) => a[field]);
    this.aggCache = { key: k, value };
    return value;
  }

  private aggCache: { key: string; value: Record<string, Aggregate> } | null = null;

  private groupAggregate(keyOf: (a: World["eas"][number]) => string | null): Record<string, Aggregate> {
    const out: Record<string, Aggregate> = {};
    const expected: Record<string, number> = {};
    const day = this.day;
    const eas = this.world.eas;
    for (let k = 0; k < eas.length; k++) {
      const a = eas[k];
      const g = keyOf(a);
      if (g === null) continue;
      const r = (out[g] ??= emptyAggregate());
      const s = this.ea[k];
      r.eas++;
      r.dwellings += a.dwellings;
      r.dwellingsTrue += a.dwellingsTrue;
      r.hhEstimate += a.hhEstimate;
      r.popEstimate += a.popEstimate;
      r.visited += s.visited;
      r.completed += s.completed;
      r.persons += s.persons;
      r.refusals += s.refusals;
      r.vacant += s.vacantFound;
      r.noContactPending += s.noContactPending;
      r.noContactFinal += s.noContactFinal;
      r.revisitsScheduled += s.revisitsScheduled;
      r.revisitsDone += s.revisitsDone;
      r.eaByStatus[s.status]++;
      expected[g] = (expected[g] ?? 0) + a.dwellingsTrue * clamp((day - a.startDay) / a.expectedDays, 0, 1);
    }
    const enumerators = this.world.enumerators;
    for (let i = 0; i < enumerators.length; i++) {
      const g = keyOf(eas[this.enumEas[i][0]]);
      if (g === null || !out[g]) continue;
      const r = out[g];
      const s = this.en[i];
      r.enumerators++;
      r.validated += s.validated;
      r.failed += s.failedValidation;
      if (s.status === "ACTIVE" || s.status === "UNDER_REVIEW") r.activeEnumerators++;
      if (s.status === "OFFLINE") r.offline++;
    }
    for (const [g, r] of Object.entries(out)) {
      r.completionPct = r.dwellingsTrue ? r.visited / r.dwellingsTrue : 0;
      r.expectedPct = r.dwellingsTrue ? expected[g] / r.dwellingsTrue : 0;
      const occ = r.completed + r.refusals + r.noContactFinal + r.noContactPending;
      r.responseRate = occ ? r.completed / occ : 0;
      r.validationRate = r.completed ? r.validated / r.completed : 0;
      r.coverageRisk = r.eas ? (r.eaByStatus.COVERAGE_RISK + r.eaByStatus.REVISIT_REQUIRED * 0.3) / r.eas : 0;
    }
    return out;
  }

  /** Planned completion curve (share of dwellings) for days 0..lastDay for EAs matching the filter. */
  planCurve(filter?: (a: World["eas"][number]) => boolean): number[] {
    const days = this.lastDay + 1;
    const out = new Array(days).fill(0);
    let total = 0;
    for (const a of this.world.eas) {
      if (filter && !filter(a)) continue;
      total += a.dwellingsTrue;
      for (let d = 0; d < days; d++) out[d] += a.dwellingsTrue * clamp((d + 1 - a.startDay) / a.expectedDays, 0, 1);
    }
    return out.map((v) => (total ? v / total : 0));
  }

  enumeratorMedianDuration(i: number) {
    return medianFromHist(this.en[i].durHist);
  }
}

export function emptyAggregate(): Aggregate {
  return {
    dwellings: 0, dwellingsTrue: 0, hhEstimate: 0, popEstimate: 0, visited: 0, completed: 0, persons: 0, refusals: 0, vacant: 0,
    noContactPending: 0, noContactFinal: 0, revisitsScheduled: 0, revisitsDone: 0, validated: 0, failed: 0, eas: 0,
    eaByStatus: { NOT_STARTED: 0, IN_PROGRESS: 0, COMPLETED: 0, COVERAGE_RISK: 0, REVISIT_REQUIRED: 0 },
    enumerators: 0, activeEnumerators: 0, offline: 0, completionPct: 0, responseRate: 0, validationRate: 0, coverageRisk: 0, expectedPct: 0,
  };
}

export function isOpen(s: IssueStatus) {
  return s === "OPEN" || s === "ASSIGNED" || s === "INVESTIGATING" || s === "REVISIT_REQUESTED";
}
