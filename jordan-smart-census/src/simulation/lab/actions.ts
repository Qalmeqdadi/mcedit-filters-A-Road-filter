/**
 * Area action plans — corrective actions and strategies for every governorate (SIMULATED).
 *
 * 1. A planning snapshot runs every Planning Lab model for the selected scenario and horizon.
 * 2. Diagnosis: for each governorate, ~20 indicators are compared with the national value and graded
 *    LOW / MEDIUM / HIGH / CRITICAL with transparent thresholds.
 * 3. Actions: deterministic rules turn each finding into a concrete, sized action — what, how much,
 *    by when (immediate < 1 yr, short 1–3 yrs, long 3–10 yrs), indicative cost, lead agency, KPI target,
 *    the evidence (numbers) and the hotspot districts. Nothing is decided automatically: every action is
 *    a proposal for the responsible ministry.
 * 4. Priority score = severity weight × log10(people affected + 10) × urgency weight.
 *
 * Unit costs are illustrative and shared with the other Planning Lab modules.
 */
import type { GovId, L, Severity } from "@/types/census";
import type { World } from "../generate";
import type { CensusEngine } from "../engine";
import type { ScenarioRun } from "../scenarios";
import { computeProfile } from "../analytics";
import type { SmallArea } from "./common";
import { analyseSiting, DEFAULT_NORMS, facilityInventory, type FacilityKind, type SitingAnalysis } from "./facilities";
import { DEFAULT_HOUSING, forecastHousing, type HousingResult } from "./housingNeed";
import { DEFAULT_WATER, simulateWater, type WaterResult } from "./water";
import { DEFAULT_JOBS, forecastJobs, type JobsResult } from "./jobs";
import { DEFAULT_AGEING, forecastAgeing, type AgeingResult } from "./ageing";
import { assessClimate, DEFAULT_CLIMATE, type ClimateResult } from "./climate";
import { calibrateMobility, CORRIDORS, DEFAULT_MOBILITY, simulateMobility, type MobilityResult } from "./mobility";
import { buildGrid, GROWTH_REGIONS, simulateGrowth, type GrowthResult } from "./urbanGrowth";
import { runNowcast, type NowcastResult } from "./nowcast";
import { buildNetwork, pathLinks, shortestFrom } from "./network";

export type ActionSector = "EDUCATION" | "HEALTH" | "HOUSING" | "WATER" | "JOBS" | "AGEING" | "CLIMATE" | "MOBILITY" | "URBAN" | "DATA";
export const ACTION_SECTORS: ActionSector[] = ["EDUCATION", "HEALTH", "HOUSING", "WATER", "JOBS", "AGEING", "CLIMATE", "MOBILITY", "URBAN", "DATA"];
export type Horizon = "IMMEDIATE" | "SHORT" | "LONG";

export const SECTOR_LABEL: Record<ActionSector, L> = {
  EDUCATION: { en: "Education", ar: "التعليم" },
  HEALTH: { en: "Health", ar: "الصحة" },
  HOUSING: { en: "Housing", ar: "الإسكان" },
  WATER: { en: "Water", ar: "المياه" },
  JOBS: { en: "Jobs & skills", ar: "الوظائف والمهارات" },
  AGEING: { en: "Ageing & care", ar: "الشيخوخة والرعاية" },
  CLIMATE: { en: "Climate resilience", ar: "المرونة المناخية" },
  MOBILITY: { en: "Mobility", ar: "التنقل" },
  URBAN: { en: "Urban growth", ar: "النمو العمراني" },
  DATA: { en: "Census & data", ar: "التعداد والبيانات" },
};

export const LEAD: Record<ActionSector, L> = {
  EDUCATION: { en: "Ministry of Education", ar: "وزارة التربية والتعليم" },
  HEALTH: { en: "Ministry of Health", ar: "وزارة الصحة" },
  HOUSING: { en: "Housing & Urban Development Corporation", ar: "المؤسسة العامة للإسكان والتطوير الحضري" },
  WATER: { en: "Ministry of Water & Irrigation", ar: "وزارة المياه والري" },
  JOBS: { en: "Ministry of Labour", ar: "وزارة العمل" },
  AGEING: { en: "Ministry of Social Development", ar: "وزارة التنمية الاجتماعية" },
  CLIMATE: { en: "Ministry of Environment & Civil Defence", ar: "وزارة البيئة والدفاع المدني" },
  MOBILITY: { en: "Ministry of Transport", ar: "وزارة النقل" },
  URBAN: { en: "Ministry of Local Administration", ar: "وزارة الإدارة المحلية" },
  DATA: { en: "Department of Statistics", ar: "دائرة الإحصاءات العامة" },
};

export const SECTOR_HREF: Record<ActionSector, string> = { EDUCATION: "/siting", HEALTH: "/siting", HOUSING: "/housing-need", WATER: "/water", JOBS: "/jobs", AGEING: "/ageing", CLIMATE: "/climate", MOBILITY: "/mobility", URBAN: "/urban-growth", DATA: "/nowcast" };

// ------------------------------------------------------------------ snapshot

export interface PlanSnapshot {
  year: number;
  baseYear: number;
  sa0: SmallArea;
  saH: SmallArea;
  siting: Record<FacilityKind, { now: SitingAnalysis; h: SitingAnalysis }>;
  housing: HousingResult;
  water: WaterResult;
  jobs: JobsResult;
  ageing: AgeingResult;
  climate: ClimateResult;
  mobility: MobilityResult;
  growth: Record<string, { trend: GrowthResult; compact: GrowthResult }>;
  nowcast: NowcastResult;
}

const snapCache = new WeakMap<ScenarioRun, Map<number, PlanSnapshot>>();

export function planSnapshot(world: World, run: ScenarioRun, areaFor: (y: number) => SmallArea, year: number): PlanSnapshot {
  let m = snapCache.get(run);
  if (!m) {
    m = new Map();
    snapCache.set(run, m);
  }
  const hit = m.get(year);
  if (hit) return hit;
  const baseYear = run.baseYear;
  const sa0 = areaFor(baseYear);
  const saH = areaFor(year);
  const inv = facilityInventory(world, sa0);
  const siting = Object.fromEntries((["SCHOOL", "PHC", "HOSPITAL"] as FacilityKind[]).map((k) => [k, { now: analyseSiting(world, sa0, k, inv[k], DEFAULT_NORMS[k]), h: analyseSiting(world, saH, k, inv[k], DEFAULT_NORMS[k]) }])) as PlanSnapshot["siting"];
  const cal = calibrateMobility(world, sa0, DEFAULT_MOBILITY);
  const growth: PlanSnapshot["growth"] = {};
  for (const r of GROWTH_REGIONS) {
    const grid = buildGrid(world, r.id);
    growth[r.id] = {
      trend: simulateGrowth(world, grid, areaFor, baseYear, year, { policy: "TREND", greenBelt: false, boundaryKm: null }),
      compact: simulateGrowth(world, grid, areaFor, baseYear, year, { policy: "COMPACT", greenBelt: false, boundaryKm: 3 }),
    };
  }
  const pt = run.series[1];
  const snap: PlanSnapshot = {
    year,
    baseYear,
    sa0,
    saH,
    siting,
    housing: forecastHousing(world, areaFor, baseYear, 2050, DEFAULT_HOUSING),
    water: simulateWater(world, areaFor, baseYear, 2050, DEFAULT_WATER, year),
    jobs: forecastJobs(world, run.series, areaFor, DEFAULT_JOBS),
    ageing: forecastAgeing(world, run.series, areaFor, DEFAULT_AGEING),
    climate: assessClimate(world, saH, DEFAULT_CLIMATE),
    mobility: simulateMobility(world, saH, DEFAULT_MOBILITY, cal.asc, cal.capacity),
    growth,
    nowcast: runNowcast(world, sa0, pt.births / pt.population, pt.deaths / pt.population, run.params.netMigration, world.config.referenceDate),
  };
  m.set(year, snap);
  return snap;
}

// ------------------------------------------------------------------ diagnosis

export interface Indicator {
  key: string;
  sector: ActionSector;
  label: L;
  value: number;
  national: number;
  unit: "pct" | "int" | "year" | "per1000" | "ratio" | "lpcd";
  severity: Severity;
}

export interface ActionItem {
  id: string;
  govId: GovId;
  sector: ActionSector;
  severity: Severity;
  horizon: Horizon;
  title: L;
  rationale: L;
  steps: L[];
  kpi: L;
  costM: number;
  lead: L;
  beneficiaries: number;
  districts: string[];
  sources: string[];
  href: string;
  score: number;
}

export interface AreaPlan {
  govId: GovId;
  indicators: Indicator[];
  actions: ActionItem[];
  strategy: Partial<Record<ActionSector, L>>;
  sectorSeverity: Record<ActionSector, Severity | null>;
  totalCostM: number;
  beneficiaries: number;
}

export interface NationalPlan {
  year: number;
  plans: Record<GovId, AreaPlan>;
  top: ActionItem[];
  bySector: Record<ActionSector, { actions: number; costM: number; critical: number }>;
  themes: L[];
  totalCostM: number;
}

const SEV_W: Record<Severity, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
const HOR_W: Record<Horizon, number> = { IMMEDIATE: 1.25, SHORT: 1.1, LONG: 1 };
export const sevRank = (s: Severity | null) => (s ? SEV_W[s] : 0);
const maxSev = (a: Severity | null, b: Severity | null): Severity | null => (sevRank(a) >= sevRank(b) ? a : b);
const f0 = (n: number) => Math.round(n).toLocaleString("en-US");
const pct = (x: number, d = 0) => `${(x * 100).toFixed(d)}%`;
/** grade a "higher is worse" ratio vs thresholds */
const grade = (x: number, t: [number, number, number]): Severity => (x >= t[2] ? "CRITICAL" : x >= t[1] ? "HIGH" : x >= t[0] ? "MEDIUM" : "LOW");

export interface LiveCensus {
  completion: Record<string, number>;
  nationalCompletion: number;
  coverageRisk: Record<string, number>;
  nationalCoverageRisk: number;
  started: boolean;
  pesUndercount: Record<string, number> | null;
}

export function liveCensus(engine: CensusEngine): LiveCensus {
  const by = engine.aggregateBy("govId");
  const nat = engine.aggregate();
  const pes = engine.pesResult;
  return {
    completion: Object.fromEntries(Object.entries(by).map(([k, v]) => [k, v.completionPct])),
    nationalCompletion: nat.completionPct,
    coverageRisk: Object.fromEntries(Object.entries(by).map(([k, v]) => [k, v.coverageRisk])),
    nationalCoverageRisk: nat.coverageRisk,
    started: engine.phase !== "READY",
    pesUndercount: pes ? Object.fromEntries(Object.entries(pes.byGov).map(([k, v]) => [k, -v.netCoverageError])) : null,
  };
}

export function buildPlans(world: World, s: PlanSnapshot, live: LiveCensus): NationalPlan {
  const plans = {} as Record<GovId, AreaPlan>;
  const Y = s.year;
  const B = s.baseYear;
  const natProf = computeProfile(world);
  const natU = natProf.labour.unemployed / Math.max(1, natProf.labour.employed + natProf.labour.unemployed);
  const natYouthU = natProf.labour.youth.unemployed / Math.max(1, natProf.labour.youth.employed + natProf.labour.youth.unemployed);
  const natHousingPer1000 = world.governorates.reduce((a, g) => a + s.housing.byGov[g.id].need2035, 0) / Math.max(1, s.sa0.national.households) * 1000;
  const natJobsPer1000 = world.governorates.reduce((a, g) => a + s.jobs.byGov[g.id].jobsNeeded2035, 0) / Math.max(1, s.sa0.national.a15_64) * 1000;
  const nat65 = s.saH.national.a65 / Math.max(1, s.sa0.national.a65) - 1;
  const natAtRisk = s.climate.totals.atRisk / Math.max(1, s.saH.national.pop);
  const net = buildNetwork(world);

  for (const g of world.governorates) {
    const id = g.id;
    const gp = computeProfile(world, { govId: id });
    const ind: Indicator[] = [];
    const acts: ActionItem[] = [];
    const ds = world.districts.filter((d) => d.govId === id);
    const dn = (dids: string[]) => ({ en: dids.map((x) => world.district[x].name.en).join(", "), ar: dids.map((x) => world.district[x].name.ar).join("، ") });
    const add = (a: Omit<ActionItem, "id" | "govId" | "score" | "lead" | "href"> & { href?: string }) => acts.push({ ...a, id: `${id}-${a.sector}-${acts.length + 1}`, govId: id, lead: LEAD[a.sector], href: a.href ?? SECTOR_HREF[a.sector], score: SEV_W[a.severity] * Math.log10(a.beneficiaries + 10) * HOR_W[a.horizon] });
    const gn = g.name;

    // ---------------- EDUCATION
    const sch = s.siting.SCHOOL;
    const gapNow = sch.now.byGov[id].gap;
    const gapH = sch.h.byGov[id].gap;
    const demH = sch.h.byGov[id].demand;
    const schAccess = sch.h.byGov[id].accessCovered / Math.max(1, sch.h.byGov[id].accessDemand);
    const natSchGap = sch.h.capacityGap / Math.max(1, sch.h.demandTotal);
    const schoolChange = s.saH.gov[id].a6_17 / Math.max(1, s.sa0.gov[id].a6_17) - 1;
    const schSev: Severity = gapH < 300 ? "LOW" : grade(gapH / Math.max(1, demH) / Math.max(0.005, natSchGap), [0.7, 1.2, 1.8]);
    ind.push({ key: "schoolGap", sector: "EDUCATION", label: { en: `School seat gap ${Y} (share of demand)`, ar: `فجوة المقاعد المدرسية ${Y} (من الطلب)` }, value: gapH / Math.max(1, demH), national: natSchGap, unit: "pct", severity: schSev });
    ind.push({ key: "schoolAge", sector: "EDUCATION", label: { en: `School-age population change to ${Y}`, ar: `التغير في سن المدرسة حتى ${Y}` }, value: schoolChange, national: s.saH.national.a6_17 / s.sa0.national.a6_17 - 1, unit: "pct", severity: grade(Math.abs(schoolChange), [0.08, 0.15, 0.3]) });
    const hotSchool = ds.map((d) => ({ d: d.id, gap: sch.h.byDistrict[d.id].gap })).filter((x) => x.gap > 0).sort((a, b) => b.gap - a.gap).slice(0, 3).map((x) => x.d);
    if (gapNow > 200) {
      const n = Math.ceil(gapNow / 400);
      add({ sector: "EDUCATION", severity: grade(gapNow / Math.max(1, sch.now.byGov[id].demand) / Math.max(0.005, sch.now.capacityGap / Math.max(1, sch.now.demandTotal)), [0.7, 1.2, 1.8]), horizon: "IMMEDIATE", title: { en: `Relieve school overcrowding now: ${f0(gapNow)} seats short`, ar: `تخفيف الاكتظاظ المدرسي فوراً: نقص ${f0(gapNow)} مقعد` }, rationale: { en: `Today's enrolment exceeds seat capacity by ${f0(gapNow)} students in ${gn.en}.`, ar: `يتجاوز الالتحاق الحالي الطاقة الاستيعابية بـ ${f0(gapNow)} طالب في ${gn.ar}.` }, steps: [{ en: `Introduce double shifts or prefabricated classrooms in about ${n} schools`, ar: `اعتماد نظام الفترتين أو غرف صفية جاهزة في نحو ${n} مدرسة` }, { en: "Rent suitable buildings as temporary annexes", ar: "استئجار مبانٍ مناسبة كملاحق مؤقتة" }, { en: hotSchool.length ? `Start with ${dn(hotSchool).en}` : "Prioritise the most crowded schools", ar: hotSchool.length ? `البدء في ${dn(hotSchool).ar}` : "البدء بأكثر المدارس اكتظاظاً" }], kpi: { en: "Students in overcrowded classrooms → 0 within 12 months", ar: "الطلاب في صفوف مكتظة ← صفر خلال 12 شهراً" }, costM: n * 0.25, beneficiaries: gapNow, districts: hotSchool, sources: ["SIM_FACILITIES", "SIM_SMALL_AREA"] });
    }
    if (gapH > 300) {
      const n = Math.ceil(gapH / DEFAULT_NORMS.SCHOOL.capacity);
      add({ sector: "EDUCATION", severity: schSev, horizon: gapNow > 200 ? "SHORT" : "LONG", title: { en: `Build ${n} new schools by ${Y}`, ar: `بناء ${n} مدرسة جديدة بحلول ${Y}` }, rationale: { en: `Projected demand of ${f0(demH)} students leaves a gap of ${f0(gapH)} seats in ${Y}.`, ar: `يترك الطلب المسقط البالغ ${f0(demH)} طالب فجوة قدرها ${f0(gapH)} مقعد في ${Y}.` }, steps: [{ en: "Reserve school land in growth areas now", ar: "حجز أراضٍ للمدارس في مناطق النمو الآن" }, { en: "Use the Facility Siting Planner to place sites (capacity-priority)", ar: "استخدام مخطط مواقع المرافق لتحديد المواقع (أولوية الطاقة)" }, { en: hotSchool.length ? `Hotspots: ${dn(hotSchool).en}` : "Phase construction with enrolment growth", ar: hotSchool.length ? `المناطق الساخنة: ${dn(hotSchool).ar}` : "تنفيذ البناء على مراحل مع نمو الالتحاق" }], kpi: { en: `Seat gap 0 by ${Y}; ≤ 32 pupils per classroom`, ar: `فجوة المقاعد صفر بحلول ${Y}؛ ≤ 32 طالباً لكل صف` }, costM: n * DEFAULT_NORMS.SCHOOL.costM, beneficiaries: gapH, districts: hotSchool, sources: ["SIM_FACILITIES", "SIM_SMALL_AREA"] });
    } else if (schoolChange < -0.1) {
      const surplus = (-schoolChange * s.sa0.gov[id].a6_17 * 0.95) / 32;
      add({ sector: "EDUCATION", severity: "LOW", horizon: "LONG", title: { en: `Plan for ${f0(surplus)} surplus classrooms as school-age numbers fall`, ar: `التخطيط لـ ${f0(surplus)} صفاً فائضاً مع تراجع أعداد سن المدرسة` }, rationale: { en: `The 6–17 population falls ${pct(-schoolChange)} by ${Y} in this scenario.`, ar: `تنخفض فئة 6–17 بنسبة ${pct(-schoolChange)} بحلول ${Y} في هذا السيناريو.` }, steps: [{ en: "End double shifts first, then lower class sizes", ar: "إنهاء نظام الفترتين أولاً ثم خفض أحجام الصفوف" }, { en: "Repurpose rooms for kindergarten (KG2) and vocational streams", ar: "إعادة استخدام الغرف لرياض الأطفال والمسارات المهنية" }, { en: "Avoid new construction except in growth hotspots", ar: "تجنب البناء الجديد إلا في مناطق النمو" }], kpi: { en: "No new schools where enrolment is falling; 100% single-shift", ar: "لا مدارس جديدة حيث يتراجع الالتحاق؛ 100% فترة واحدة" }, costM: 0, beneficiaries: s.sa0.gov[id].a6_17 * 0.1, districts: [], sources: ["SIM_SMALL_AREA"] });
    }
    if (schAccess < 0.97) {
      const far = sch.h.byGov[id].accessDemand - sch.h.byGov[id].accessCovered;
      add({ sector: "EDUCATION", severity: grade(1 - schAccess, [0.02, 0.06, 0.12]), horizon: "IMMEDIATE", title: { en: `School transport for ${f0(far)} students beyond walking distance`, ar: `نقل مدرسي لـ ${f0(far)} طالب خارج مسافة المشي` }, rationale: { en: `${pct(1 - schAccess, 1)} of students live beyond the access standard (2 km urban / 5 km rural).`, ar: `${pct(1 - schAccess, 1)} من الطلاب يقيمون خارج معيار الوصول (2 كم حضر / 5 كم ريف).` }, steps: [{ en: "Contract school buses on fixed routes", ar: "التعاقد على حافلات مدرسية بمسارات ثابتة" }, { en: "Consider small satellite schools where clusters exceed 300 students", ar: "دراسة مدارس فرعية صغيرة حيث تتجاوز التجمعات 300 طالب" }], kpi: { en: "All students within the access standard or served by transport", ar: "جميع الطلاب ضمن معيار الوصول أو مخدومون بالنقل" }, costM: (far * 0.0004 * Math.max(1, Y - B)), beneficiaries: far, districts: [], sources: ["SIM_FACILITIES"] });
    }

    // ---------------- HEALTH
    const phc = s.siting.PHC;
    const pNow = phc.now.byGov[id].gap;
    const pH = phc.h.byGov[id].gap;
    const pAccess = phc.h.byGov[id].accessCovered / Math.max(1, phc.h.byGov[id].accessDemand);
    // graded relative to the national gap so that the synthetic inventory's general shortfall does not flag every area
    const natPhc = phc.h.capacityGap / Math.max(1, phc.h.demandTotal);
    const phcSev = pH < 5000 ? "LOW" : grade(pH / Math.max(1, phc.h.byGov[id].demand) / Math.max(0.01, natPhc), [0.7, 1.1, 1.5]);
    ind.push({ key: "phcGap", sector: "HEALTH", label: { en: `Residents beyond primary-care capacity ${Y}`, ar: `السكان خارج طاقة الرعاية الأولية ${Y}` }, value: pH / Math.max(1, phc.h.byGov[id].demand), national: phc.h.capacityGap / Math.max(1, phc.h.demandTotal), unit: "pct", severity: phcSev });
    ind.push({ key: "phcAccess", sector: "HEALTH", label: { en: "Within reach of a health centre", ar: "ضمن نطاق مركز صحي" }, value: pAccess, national: phc.h.accessPct, unit: "pct", severity: grade(1 - pAccess, [0.03, 0.08, 0.15]) });
    const hotPhc = ds.map((d) => ({ d: d.id, gap: phc.h.byDistrict[d.id].gap })).filter((x) => x.gap > 0).sort((a, b) => b.gap - a.gap).slice(0, 3).map((x) => x.d);
    if (pNow > 5000) {
      const n = Math.min(40, Math.ceil(pNow / 6000));
      add({ sector: "HEALTH", severity: phcSev === "CRITICAL" ? "HIGH" : phcSev, horizon: "IMMEDIATE", title: { en: `Deploy ${n} mobile clinics and extend health-centre hours`, ar: `نشر ${n} عيادة متنقلة وتمديد ساعات عمل المراكز الصحية` }, rationale: { en: `${f0(pNow)} residents are beyond current primary-care capacity.`, ar: `${f0(pNow)} ساكن خارج الطاقة الحالية للرعاية الأولية.` }, steps: [{ en: "Evening shifts in the busiest centres", ar: "فترات مسائية في أكثر المراكز ازدحاماً" }, { en: hotPhc.length ? `Mobile clinic rotations in ${dn(hotPhc).en}` : "Mobile clinic rotations in under-served areas", ar: hotPhc.length ? `جولات عيادات متنقلة في ${dn(hotPhc).ar}` : "جولات عيادات متنقلة في المناطق الأقل خدمة" }], kpi: { en: "Waiting time for a primary-care appointment < 48 h", ar: "زمن انتظار موعد الرعاية الأولية < 48 ساعة" }, costM: n * 0.15, beneficiaries: pNow, districts: hotPhc, sources: ["SIM_FACILITIES"] });
    }
    if (pH > 10000) {
      const n = Math.ceil(pH / DEFAULT_NORMS.PHC.capacity);
      add({ sector: "HEALTH", severity: phcSev, horizon: "SHORT", title: { en: `Build ${n} comprehensive primary health centres`, ar: `بناء ${n} مركزاً صحياً شاملاً` }, rationale: { en: `By ${Y}, ${f0(pH)} residents exceed primary-care capacity.`, ar: `بحلول ${Y} يتجاوز ${f0(pH)} ساكن طاقة الرعاية الأولية.` }, steps: [{ en: "Site with the Facility Siting Planner (access + capacity)", ar: "تحديد المواقع بمخطط مواقع المرافق (الوصول + الطاقة)" }, { en: "Staff plan: 1 family doctor per 4,000 residents", ar: "خطة كوادر: طبيب أسرة لكل 4,000 ساكن" }], kpi: { en: `Primary-care capacity gap 0 by ${Y}`, ar: `فجوة طاقة الرعاية الأولية صفر بحلول ${Y}` }, costM: n * DEFAULT_NORMS.PHC.costM, beneficiaries: pH, districts: hotPhc, sources: ["SIM_FACILITIES", "SIM_SMALL_AREA"] });
    }
    const hos = s.siting.HOSPITAL.h.byGov[id];
    if (hos.gap > 40000) {
      const beds = (hos.gap / 1000) * 1.8;
      const n = Math.max(1, Math.round(beds / 150));
      add({ sector: "HEALTH", severity: grade(hos.gap / Math.max(1, hos.demand) / Math.max(0.01, s.siting.HOSPITAL.h.capacityGap / Math.max(1, s.siting.HOSPITAL.h.demandTotal)), [0.7, 1.2, 1.8]), horizon: "LONG", title: { en: `Add about ${f0(beds)} hospital beds (${n} × 150-bed hospital)`, ar: `إضافة نحو ${f0(beds)} سرير (${n} × مستشفى 150 سريراً)` }, rationale: { en: `Hospital catchment capacity falls short by ${f0(hos.gap)} residents in ${Y} (norm 1.8 beds / 1,000).`, ar: `تقل طاقة المستشفيات عن الحاجة بـ ${f0(hos.gap)} ساكن في ${Y} (المعيار 1.8 سرير / 1,000).` }, steps: [{ en: "Expand existing hospitals first (cheaper per bed)", ar: "توسعة المستشفيات القائمة أولاً (أقل كلفة للسرير)" }, { en: "Public–private partnership for a new general hospital", ar: "شراكة بين القطاعين العام والخاص لمستشفى عام جديد" }], kpi: { en: "≥ 1.8 beds per 1,000 residents", ar: "≥ 1.8 سرير لكل 1,000 ساكن" }, costM: n * DEFAULT_NORMS.HOSPITAL.costM, beneficiaries: hos.gap, districts: [], sources: ["SIM_FACILITIES"] });
    }

    // ---------------- HOUSING
    const h = s.housing.byGov[id];
    const crowdNat = s.housing.base.crowded / Math.max(1, s.sa0.national.households);
    const vac = h.vacant / Math.max(1, h.stock);
    ind.push({ key: "housingNeed", sector: "HOUSING", label: { en: `Homes needed to 2035 per 1,000 households`, ar: "المساكن اللازمة حتى 2035 لكل 1,000 أسرة" }, value: h.per1000, national: natHousingPer1000, unit: "per1000", severity: grade(h.per1000 / natHousingPer1000, [1.0, 1.08, 1.2]) });
    ind.push({ key: "crowding", sector: "HOUSING", label: { en: "Overcrowded households (> 2 per room)", ar: "أسر مكتظة (> 2 فرد/غرفة)" }, value: h.crowdedShare, national: crowdNat, unit: "pct", severity: grade(h.crowdedShare, [0.1, 0.14, 0.2]) });
    ind.push({ key: "vacancy", sector: "HOUSING", label: { en: "Vacant dwellings", ar: "المساكن الشاغرة" }, value: vac, national: s.housing.base.vacant / s.housing.base.stock, unit: "pct", severity: grade(vac, [0.14, 0.17, 0.22]) });
    const hotHouse = ds.map((d) => ({ d: d.id, v: s.housing.byDistrict[d.id] ?? 0 })).sort((a, b) => b.v - a.v).slice(0, 3).map((x) => x.d);
    if (h.per1000 > natHousingPer1000 * 0.95) {
      const units = Math.round((h.need2035 * 0.25) / 100) * 100;
      add({ sector: "HOUSING", severity: grade(h.per1000 / natHousingPer1000, [1.0, 1.08, 1.2]), horizon: "SHORT", title: { en: `Affordable-housing programme: ${f0(units)} homes by 2035`, ar: `برنامج إسكان ميسور: ${f0(units)} مسكن بحلول 2035` }, rationale: { en: `${gn.en} needs ${f0(h.need2035)} homes to 2035 (${f0(h.per1000)} per 1,000 households vs ${f0(natHousingPer1000)} nationally).`, ar: `تحتاج ${gn.ar} ${f0(h.need2035)} مسكن حتى 2035 (${f0(h.per1000)} لكل 1,000 أسرة مقابل ${f0(natHousingPer1000)} وطنياً).` }, steps: [{ en: `Release about ${f0(h.landHa2035 * 0.25)} ha of serviced land`, ar: `تخصيص نحو ${f0(h.landHa2035 * 0.25)} هكتار من الأراضي المخدومة` }, { en: `Target ${pct(h.aptShare)} apartments to match the urban share`, ar: `استهداف ${pct(h.aptShare)} شققاً بما يتناسب مع نسبة الحضر` }, { en: hotHouse.length ? `Priority districts: ${dn(hotHouse).en}` : "Phase with household growth", ar: hotHouse.length ? `الألوية ذات الأولوية: ${dn(hotHouse).ar}` : "التنفيذ على مراحل مع نمو الأسر" }], kpi: { en: "Completions ≥ need; cumulative shortfall falling every year", ar: "الإنجاز ≥ الحاجة؛ والعجز التراكمي يتراجع سنوياً" }, costM: units * 0.034, beneficiaries: units * 4.8, districts: hotHouse, sources: ["SIM_HOUSING_NEED", "SIM_FRAME"] });
    }
    if (h.crowdedShare > 0.11) {
      const hh = (h.crowdedShare * s.sa0.gov[id].households) * 0.3;
      add({ sector: "HOUSING", severity: grade(h.crowdedShare, [0.1, 0.14, 0.2]), horizon: "SHORT", title: { en: `Home-extension loans for ${f0(hh)} overcrowded households`, ar: `قروض توسعة منزلية لـ ${f0(hh)} أسرة مكتظة` }, rationale: { en: `${pct(h.crowdedShare, 1)} of households live with more than 2 persons per room (census).`, ar: `${pct(h.crowdedShare, 1)} من الأسر تعيش بأكثر من فردين لكل غرفة (التعداد).` }, steps: [{ en: "Soft loans for an added room", ar: "قروض ميسرة لإضافة غرفة" }, { en: "Fast-track building permits for extensions", ar: "تسريع رخص البناء للتوسعات" }], kpi: { en: "Overcrowding below 10% of households", ar: "الاكتظاظ دون 10% من الأسر" }, costM: hh * 0.008, beneficiaries: hh * 5.5, districts: [], sources: ["SIM_MICRODATA"] });
    }
    if (vac > 0.15) {
      const units = (h.vacant - 0.08 * h.stock) * 0.15;
      add({ sector: "HOUSING", severity: "MEDIUM", horizon: "IMMEDIATE", title: { en: `Bring ${f0(units)} vacant homes back to the market`, ar: `إعادة ${f0(units)} مسكناً شاغراً إلى السوق` }, rationale: { en: `${pct(vac, 1)} of dwellings are vacant in the census frame — housing that already exists.`, ar: `${pct(vac, 1)} من المساكن شاغرة في إطار التعداد — مساكن قائمة فعلاً.` }, steps: [{ en: "Rental guarantee scheme for owners", ar: "نظام ضمان الإيجار للمالكين" }, { en: "Vacancy fee on long-term empty units", ar: "رسوم على المساكن الشاغرة لفترات طويلة" }], kpi: { en: "Vacancy rate falls by 2 points in 3 years", ar: "انخفاض نسبة الشواغر نقطتين خلال 3 سنوات" }, costM: units * 0.002, beneficiaries: units * 4.8, districts: [], sources: ["SIM_FRAME"] });
    }
    if (h.inadequate > 300) {
      add({ sector: "HOUSING", severity: h.inadequate / Math.max(1, s.sa0.gov[id].households) > 0.02 ? "HIGH" : "MEDIUM", horizon: "IMMEDIATE", title: { en: `Replace ${f0(h.inadequate)} tents and caravans with permanent homes`, ar: `استبدال ${f0(h.inadequate)} خيمة وكرفان بمساكن دائمة` }, rationale: { en: "Households in tents and caravans are the most exposed to heat, cold and floods.", ar: "الأسر في الخيام والكرفانات الأكثر تعرضاً للحر والبرد والسيول." }, steps: [{ en: "Core-house grants on the household's own plot", ar: "منح للمسكن الأساسي على أرض الأسرة" }, { en: "Prioritise flood-susceptible and lowland locations", ar: "إعطاء الأولوية للمواقع المعرضة للسيول والمنخفضة" }], kpi: { en: "Zero households in tents or caravans within 5 years", ar: "صفر أسر في الخيام أو الكرفانات خلال 5 سنوات" }, costM: h.inadequate * 0.02, beneficiaries: h.inadequate * 5, districts: [], sources: ["SIM_MICRODATA"] });
    }

    // ---------------- WATER
    const wy = s.water.stressYear[id];
    const wH = s.water.byGov[id].find((x) => x.year === Y)!;
    const w0 = s.water.byGov[id][0];
    const waterSev: Severity = wy === null ? "LOW" : wy <= B + 2 && wH.ratio < 0.9 ? "CRITICAL" : wy <= B + 4 && wH.ratio < 0.97 ? "HIGH" : wy <= 2035 ? "MEDIUM" : "LOW";
    ind.push({ key: "waterRatio", sector: "WATER", label: { en: `Water supply ÷ requirement ${Y}`, ar: `الإمداد المائي ÷ الاحتياج ${Y}` }, value: wH.ratio, national: s.water.national.find((x) => x.year === Y)!.ratio, unit: "pct", severity: grade(1 - wH.ratio, [0.05, 0.12, 0.2]) });
    ind.push({ key: "waterStress", sector: "WATER", label: { en: "First water-stress year", ar: "أول سنة إجهاد مائي" }, value: wy ?? 0, national: s.water.nationalStressYear ?? 0, unit: "year", severity: waterSev });
    ind.push({ key: "lpcd", sector: "WATER", label: { en: `Delivered water ${Y}`, ar: `المياه الموزعة ${Y}` }, value: wH.deliveredLpcd, national: s.water.national.find((x) => x.year === Y)!.deliveredLpcd, unit: "lpcd", severity: grade(90 - wH.deliveredLpcd, [0, 8, 15]) });
    if (wy !== null && wy <= 2035) {
      const mcm = w0.requirement * 0.1;
      add({ sector: "WATER", severity: waterSev, horizon: wy <= B + 4 ? "IMMEDIATE" : "SHORT", title: { en: `Cut water losses by 10 points (≈ ${f0(mcm)} MCM/yr)`, ar: `خفض فاقد المياه 10 نقاط (≈ ${f0(mcm)} م.م³/سنة)` }, rationale: { en: `Supply falls below 90% of the requirement in ${wy}; losses are the cheapest water.`, ar: `ينخفض الإمداد دون 90% من الاحتياج في ${wy}؛ والفاقد أرخص مصدر للمياه.` }, steps: [{ en: "District metered areas and pressure management", ar: "مناطق قياس معزولة وإدارة الضغط" }, { en: "Replace the oldest 10% of mains; crack down on illegal connections", ar: "استبدال أقدم 10% من الخطوط ومكافحة الاعتداءات" }, { en: "Smart meters for large consumers", ar: "عدادات ذكية لكبار المستهلكين" }], kpi: { en: "Non-revenue water −10 points in 5 years", ar: "المياه غير المحاسب عليها −10 نقاط خلال 5 سنوات" }, costM: mcm * 1.2, beneficiaries: s.sa0.gov[id].pop, districts: [], sources: ["SIM_WATER"] });
      add({ sector: "WATER", severity: "MEDIUM", horizon: "SHORT", title: { en: "Demand management: −10% consumption per person", ar: "إدارة الطلب: −10% من الاستهلاك للفرد" }, rationale: { en: "Cheapest lever per cubic metre in the Water Security model.", ar: "الأداة الأقل كلفة لكل متر مكعب في نموذج الأمن المائي." }, steps: [{ en: "Rising-block tariffs and retrofit kits", ar: "تعرفة تصاعدية وأدوات ترشيد" }, { en: "Greywater reuse in new buildings", ar: "إعادة استخدام المياه الرمادية في المباني الجديدة" }], kpi: { en: "Litres per person per day −10% by 2040", ar: "لتر/فرد/يوم −10% بحلول 2040" }, costM: w0.requirement * 0.1 * 0.5, beneficiaries: s.sa0.gov[id].pop, districts: [], sources: ["SIM_WATER"] });
    }
    if (s.water.govRisk[id] > 0.1) {
      add({ sector: "WATER", severity: s.water.govRisk[id] > 0.25 ? "HIGH" : "MEDIUM", horizon: "IMMEDIATE", title: { en: "Drought contingency plan with emergency storage and trucking", ar: "خطة طوارئ للجفاف بتخزين احتياطي ونقل بالصهاريج" }, rationale: { en: `${pct(s.water.govRisk[id])} probability that supply falls below 85% of need in ${Y} (drought simulation).`, ar: `احتمال ${pct(s.water.govRisk[id])} أن ينخفض الإمداد دون 85% من الحاجة في ${Y} (محاكاة الجفاف).` }, steps: [{ en: "Pre-contract tanker capacity and priority lists (hospitals, schools)", ar: "التعاقد المسبق على صهاريج وقوائم أولوية (المستشفيات والمدارس)" }, { en: "Household storage subsidies in rationed zones", ar: "دعم خزانات منزلية في مناطق التقنين" }], kpi: { en: "No zone below 50 l/p/d in a drought year", ar: "لا منطقة دون 50 لتر/فرد/يوم في سنة جفاف" }, costM: 2 + s.sa0.gov[id].pop * 0.000002, beneficiaries: s.sa0.gov[id].pop, districts: [], sources: ["SIM_WATER"] });
    }

    // ---------------- JOBS
    const j = s.jobs.byGov[id];
    const gu = gp.labour.unemployed / Math.max(1, gp.labour.employed + gp.labour.unemployed);
    ind.push({ key: "youthU", sector: "JOBS", label: { en: "Youth unemployment (15–24)", ar: "بطالة الشباب (15–24)" }, value: j.youthUnemployment, national: natYouthU, unit: "pct", severity: grade(j.youthUnemployment - natYouthU, [-0.02, 0.02, 0.06]) });
    ind.push({ key: "unemp", sector: "JOBS", label: { en: "Unemployment rate", ar: "معدل البطالة" }, value: gu, national: natU, unit: "pct", severity: grade(gu - natU, [-0.01, 0.015, 0.04]) });
    ind.push({ key: "jobsNeed", sector: "JOBS", label: { en: "Jobs needed to 2035 per 1,000 working-age", ar: "الوظائف اللازمة حتى 2035 لكل 1,000 في سن العمل" }, value: j.per1000, national: natJobsPer1000, unit: "per1000", severity: grade(j.per1000 / natJobsPer1000, [1.0, 1.06, 1.15]) });
    if (j.youthUnemployment > natYouthU - 0.02) {
      const youthU = gp.labour.youth.unemployed;
      const seats = Math.round((youthU * 0.2) / 50) * 50;
      add({ sector: "JOBS", severity: grade(j.youthUnemployment - natYouthU, [-0.02, 0.02, 0.06]), horizon: "IMMEDIATE", title: { en: `Youth employment programme: ${f0(seats)} training-to-job places a year`, ar: `برنامج تشغيل الشباب: ${f0(seats)} فرصة تدريب وتشغيل سنوياً` }, rationale: { en: `Youth unemployment is ${pct(j.youthUnemployment)} (national ${pct(natYouthU)}).`, ar: `بطالة الشباب ${pct(j.youthUnemployment)} (الوطني ${pct(natYouthU)}).` }, steps: [{ en: "Employer-led vocational training with job guarantees", ar: "تدريب مهني بقيادة أصحاب العمل مع ضمان التشغيل" }, { en: "Wage subsidy for first-time hires (6 months)", ar: "دعم أجور للتعيين الأول (6 أشهر)" }, { en: "Women-friendly measures: transport and childcare support", ar: "إجراءات داعمة للمرأة: النقل ورعاية الأطفال" }], kpi: { en: "Youth unemployment −5 points in 3 years", ar: "بطالة الشباب −5 نقاط خلال 3 سنوات" }, costM: seats * 0.0015 * 3, beneficiaries: seats * 3, districts: [], sources: ["SIM_JOBS", "SIM_MICRODATA"] });
    }
    if (j.per1000 > natJobsPer1000 * 0.98) {
      add({ sector: "JOBS", severity: grade(j.per1000 / natJobsPer1000, [1.0, 1.06, 1.15]), horizon: "SHORT", title: { en: `Create ${f0(j.jobsNeeded2035)} jobs by 2035 — investment & SME plan`, ar: `استحداث ${f0(j.jobsNeeded2035)} وظيفة حتى 2035 — خطة استثمار ومشاريع صغيرة` }, rationale: { en: `The working-age population grows fast: ${f0(j.per1000)} new jobs needed per 1,000 working-age residents (national ${f0(natJobsPer1000)}).`, ar: `تنمو فئة سن العمل بسرعة: ${f0(j.per1000)} وظيفة لازمة لكل 1,000 في سن العمل (الوطني ${f0(natJobsPer1000)}).` }, steps: [{ en: "Serviced industrial / logistics land near main corridors", ar: "أراضٍ صناعية ولوجستية مخدومة قرب المحاور الرئيسية" }, { en: "SME credit guarantees and one-stop licensing", ar: "ضمانات ائتمان للمشاريع الصغيرة ونافذة ترخيص واحدة" }], kpi: { en: "Net job creation ≥ need every year", ar: "صافي الوظائف المستحدثة ≥ الحاجة سنوياً" }, costM: j.jobsNeeded2035 * 0.3 * 0.01, beneficiaries: j.jobsNeeded2035, districts: [], sources: ["SIM_JOBS"] });
    }

    // ---------------- AGEING
    const ag = s.ageing.byGov[id];
    ind.push({ key: "aging", sector: "AGEING", label: { en: "Growth of 65+ population to 2040", ar: "نمو فئة 65+ حتى 2040" }, value: ag.growth, national: nat65, unit: "pct", severity: grade(ag.growth / Math.max(0.01, nat65), [1.0, 1.1, 1.3]) });
    if (ag.growth > nat65 * 0.9) {
      const beds = ag.beds2040 * (1 - 1 / (1 + ag.growth));
      add({ sector: "AGEING", severity: grade(ag.growth / Math.max(0.01, nat65), [1.0, 1.1, 1.3]), horizon: "LONG", title: { en: `Older-age care: +${f0(beds)} care beds and a home-care service`, ar: `رعاية كبار السن: +${f0(beds)} سرير رعاية وخدمة رعاية منزلية` }, rationale: { en: `The 65+ population grows ${pct(ag.growth)} to 2040 (${f0(ag.a65_0)} → ${f0(ag.a65_40)}).`, ar: `تنمو فئة 65+ بنسبة ${pct(ag.growth)} حتى 2040 (${f0(ag.a65_0)} ← ${f0(ag.a65_40)}).` }, steps: [{ en: "Train community care workers (1 per 8 home-care clients)", ar: "تدريب عاملي رعاية مجتمعية (1 لكل 8 عملاء)" }, { en: "Geriatric clinics in each comprehensive health centre", ar: "عيادات طب المسنين في كل مركز صحي شامل" }, { en: "Accessibility standards for public buildings and transport", ar: "معايير الوصول في المباني العامة والنقل" }], kpi: { en: "Care capacity grows with the 80+ population", ar: "تنمو طاقة الرعاية مع فئة 80+" }, costM: beds * 0.08, beneficiaries: ag.a65_40 - ag.a65_0, districts: [], sources: ["SIM_AGEING"] });
    }

    // ---------------- CLIMATE
    const cl = s.climate.districts.filter((d) => world.district[d.id].govId === id);
    const atRisk = cl.reduce((a, d) => a + d.atRisk, 0);
    const flood = cl.reduce((a, d) => a + d.floodExposed, 0);
    const centres = cl.reduce((a, d) => a + d.coolingCentres, 0);
    const hotHeat = [...cl].sort((a, b) => b.heatRisk - a.heatRisk).slice(0, 3).map((d) => d.id);
    const share = atRisk / Math.max(1, s.saH.gov[id].pop);
    ind.push({ key: "heat", sector: "CLIMATE", label: { en: `Population at heat risk ${Y}`, ar: `السكان المعرضون لخطر الحر ${Y}` }, value: share, national: natAtRisk, unit: "pct", severity: grade(share, [0.1, 0.2, 0.35]) });
    ind.push({ key: "flood", sector: "CLIMATE", label: { en: "Residents in flood-susceptible EAs", ar: "السكان في مناطق معرضة للسيول" }, value: flood / Math.max(1, s.saH.gov[id].pop), national: s.climate.totals.floodExposed / s.saH.national.pop, unit: "pct", severity: grade(flood / Math.max(1, s.saH.gov[id].pop), [0.02, 0.05, 0.1]) });
    if (centres > 0 || share > 0.15) {
      add({ sector: "CLIMATE", severity: grade(share, [0.1, 0.2, 0.35]), horizon: "IMMEDIATE", title: { en: `Heat-health action plan with ${Math.max(1, centres)} cooling centres`, ar: `خطة عمل للحر والصحة مع ${Math.max(1, centres)} مراكز تبريد` }, rationale: { en: `${f0(atRisk)} people are at heat risk (older people, young children, homes without cooling, outdoor workers).`, ar: `${f0(atRisk)} شخصاً معرضون لخطر الحر (كبار السن، الأطفال، المساكن بلا تبريد، العاملون في الخارج).` }, steps: [{ en: `Cooling centres in ${dn(hotHeat).en}`, ar: `مراكز تبريد في ${dn(hotHeat).ar}` }, { en: "SMS heat alerts to registered older people; welfare calls", ar: "رسائل تنبيه للحر لكبار السن المسجلين ومكالمات اطمئنان" }, { en: "Midday outdoor-work restrictions on extreme-heat days", ar: "تقييد العمل في الخارج وقت الظهيرة في أيام الحر الشديد" }], kpi: { en: "Heat-related hospital admissions down year on year", ar: "انخفاض حالات الإدخال المرتبطة بالحر سنوياً" }, costM: Math.max(1, centres) * 0.6 + 0.3, beneficiaries: atRisk, districts: hotHeat, sources: ["SIM_CLIMATE", "SIM_MICRODATA"] });
    }
    if (flood > 15000) {
      const hotFlood = [...cl].sort((a, b) => b.floodExposed - a.floodExposed).slice(0, 3).filter((d) => d.floodExposed > 0).map((d) => d.id);
      const eas = cl.reduce((a, d) => a + d.floodEAs, 0);
      add({ sector: "CLIMATE", severity: grade(flood / Math.max(1, s.saH.gov[id].pop), [0.02, 0.05, 0.1]), horizon: "SHORT", title: { en: `Flash-flood early warning and drainage for ${eas} exposed EAs`, ar: `إنذار مبكر من السيول وتصريف لـ ${eas} منطقة عدّ معرضة` }, rationale: { en: `${f0(flood)} residents live in flood-susceptible areas (synthetic flags — verify with the national flood map).`, ar: `${f0(flood)} ساكن في مناطق معرضة للسيول (مؤشرات اصطناعية — يجب التحقق بخريطة السيول الوطنية).` }, steps: [{ en: `Sirens and SMS warning in ${dn(hotFlood).en}`, ar: `صفارات ورسائل إنذار في ${dn(hotFlood).ar}` }, { en: "Clear culverts and wadi channels before the rainy season", ar: "تنظيف العبارات ومجاري الأودية قبل موسم الأمطار" }, { en: "No new building permits in mapped flood channels", ar: "منع رخص البناء الجديدة في مجاري السيول" }], kpi: { en: "100% of exposed residents reached by warnings", ar: "وصول الإنذار إلى 100% من السكان المعرضين" }, costM: eas * 0.05, beneficiaries: flood, districts: hotFlood, sources: ["SIM_CLIMATE"] });
    }

    // ---------------- MOBILITY
    const myLinks = s.mobility.links.filter((l) => world.district[l.link.a].govId === id || world.district[l.link.b].govId === id);
    const maxVC = Math.max(0, ...myLinks.map((l) => l.vc));
    ind.push({ key: "congestion", sector: "MOBILITY", label: { en: `Peak congestion on main links ${Y} (V/C)`, ar: `الازدحام في ذروة الروابط الرئيسية ${Y} (حجم/طاقة)` }, value: maxVC, national: Math.max(...s.mobility.links.map((l) => l.vc)), unit: "ratio", severity: grade(maxVC, [0.9, 1.0, 1.2]) });
    if (maxVC >= 0.95) {
      const corr = CORRIDORS.filter((c) => world.district[c.from].govId === id || world.district[c.to].govId === id);
      const congested = myLinks.filter((l) => l.vc >= 0.95).map((l) => `${world.district[l.link.a].name.en}–${world.district[l.link.b].name.en}`);
      const congestedAr = myLinks.filter((l) => l.vc >= 0.95).map((l) => `${world.district[l.link.a].name.ar}–${world.district[l.link.b].name.ar}`);
      const km = corr.reduce((a, c) => {
        const { prev } = shortestFrom(net, c.from, (l) => l.km);
        return a + pathLinks(prev, c.from, c.to).reduce((x, l) => x + l.km, 0);
      }, 0);
      add({ sector: "MOBILITY", severity: grade(maxVC, [0.9, 1.0, 1.2]), horizon: corr.length ? "SHORT" : "IMMEDIATE", title: corr.length ? { en: `Rapid transit on ${corr.map((c) => c.name.en).join(" and ")}`, ar: `نقل سريع على ${corr.map((c) => c.name.ar).join(" و")}` } : { en: "Bus-priority lanes and junction upgrades on congested links", ar: "مسارات أولوية للحافلات وتحسين التقاطعات على الروابط المزدحمة" }, rationale: { en: `Peak demand reaches ${maxVC.toFixed(2)} × capacity on ${congested.slice(0, 3).join(", ")} by ${Y}.`, ar: `يبلغ طلب الذروة ${maxVC.toFixed(2)} × الطاقة على ${congestedAr.slice(0, 3).join("، ")} بحلول ${Y}.` }, steps: [{ en: "Test the corridor in the Mobility & Commuting model", ar: "اختبار المحور في نموذج التنقل والرحلات اليومية" }, { en: "Park-and-ride at corridor ends; integrated fares", ar: "مواقف انتظار عند طرفي المحور وتعرفة متكاملة" }], kpi: { en: "Public-transport share +5 points on the corridor", ar: "حصة النقل العام +5 نقاط على المحور" }, costM: corr.length ? km * 12 : 15, beneficiaries: s.saH.gov[id].a15_64 * 0.15, districts: [], sources: ["SIM_MOBILITY"] });
    }

    // ---------------- URBAN
    const region = GROWTH_REGIONS.find((r) => r.govId === id);
    if (region) {
      const gr = s.growth[region.id];
      const saved = gr.trend.totals.newKm2 - gr.compact.totals.newKm2;
      const cost = gr.trend.totals.costM - gr.compact.totals.costM;
      ind.push({ key: "sprawl", sector: "URBAN", label: { en: `New urban land to ${Y} (current trend)`, ar: `أرض حضرية جديدة حتى ${Y} (الاتجاه الحالي)` }, value: gr.trend.totals.newKm2, national: 0, unit: "int", severity: grade(gr.trend.totals.newKm2 / Math.max(1, gr.trend.series[0].urbanKm2), [0.15, 0.3, 0.5]) });
      if (saved > 2) {
        add({ sector: "URBAN", severity: grade(gr.trend.totals.newKm2 / Math.max(1, gr.trend.series[0].urbanKm2), [0.15, 0.3, 0.5]), horizon: "LONG", title: { en: `Compact-growth strategy for ${region.name.en}: save ${f0(saved)} km² and JOD ${f0(cost)}M`, ar: `استراتيجية نمو متراص لـ${region.name.ar}: توفير ${f0(saved)} كم² و${f0(cost)} مليون دينار` }, rationale: { en: `Trend growth consumes ${f0(gr.trend.totals.newKm2)} km² of new land by ${Y}; compact growth with a 3 km growth boundary needs ${f0(gr.compact.totals.newKm2)} km².`, ar: `يستهلك النمو وفق الاتجاه الحالي ${f0(gr.trend.totals.newKm2)} كم² من الأراضي الجديدة بحلول ${Y}؛ بينما يحتاج النمو المتراص مع حد نمو 3 كم ${f0(gr.compact.totals.newKm2)} كم².` }, steps: [{ en: "Adopt an urban growth boundary in the regional plan", ar: "اعتماد حد للنمو العمراني في المخطط الإقليمي" }, { en: "Allow higher densities along transit corridors; infill incentives", ar: "السماح بكثافات أعلى على محاور النقل وحوافز للتكثيف" }, { en: "Protect agricultural and wadi land from fragmented development", ar: "حماية الأراضي الزراعية والأودية من التطوير المتشتت" }], kpi: { en: "≥ 40% of new homes built inside the existing urban footprint", ar: "≥ 40% من المساكن الجديدة داخل الرقعة الحضرية القائمة" }, costM: 5, beneficiaries: s.saH.gov[id].pop - s.sa0.gov[id].pop, districts: [], sources: ["SIM_URBAN_CA"] });
      }
    }

    // ---------------- DATA / CENSUS
    const nc = s.nowcast.byGov[id];
    if (nc.detectedMonth !== null) {
      const p = nc.points[nc.points.length - 1];
      const diff = p.indicator - p.accounting;
      add({ sector: "DATA", severity: Math.abs(diff) / p.accounting > 0.02 ? "HIGH" : "MEDIUM", horizon: "IMMEDIATE", title: { en: "Verify the population estimate: unexplained growth signal", ar: "التحقق من تقدير السكان: إشارة نمو غير مفسَّر" }, rationale: { en: `Since ${nc.points[nc.detectedMonth].label}, connection data imply ${f0(Math.abs(diff))} ${diff > 0 ? "more" : "fewer"} residents than registered births and deaths explain.`, ar: `منذ ${nc.points[nc.detectedMonth].label} تشير بيانات التوصيلات إلى ${f0(Math.abs(diff))} ساكن ${diff > 0 ? "أكثر" : "أقل"} مما تفسره الولادات والوفيات المسجلة.` }, steps: [{ en: "Reconcile with border, school-enrolment and utility records", ar: "المطابقة مع سجلات الحدود والالتحاق المدرسي والمرافق" }, { en: "Targeted dwelling listing in the affected districts", ar: "حصر مساكن موجه في الألوية المتأثرة" }], kpi: { en: "Estimate revised and published within 3 months", ar: "مراجعة التقدير ونشره خلال 3 أشهر" }, costM: 0.4, beneficiaries: s.sa0.gov[id].pop, districts: [], sources: ["SIM_NOWCAST"], href: "/nowcast" });
    }
    if (live.started) {
      const cr = live.coverageRisk[id] ?? 0;
      ind.push({ key: "coverage", sector: "DATA", label: { en: "EAs at coverage risk (live fieldwork)", ar: "مناطق عدّ معرضة لخطر التغطية (الميدان الحي)" }, value: cr, national: live.nationalCoverageRisk, unit: "pct", severity: grade(cr, [0.03, 0.08, 0.15]) });
      if (cr > Math.max(0.03, live.nationalCoverageRisk * 1.2)) {
        add({ sector: "DATA", severity: grade(cr, [0.03, 0.08, 0.15]), horizon: "IMMEDIATE", title: { en: "Targeted revisit teams for EAs at coverage risk", ar: "فرق متابعة موجهة لمناطق العدّ المعرضة لخطر التغطية" }, rationale: { en: `${pct(cr, 1)} of EAs are at coverage risk vs ${pct(live.nationalCoverageRisk, 1)} nationally.`, ar: `${pct(cr, 1)} من مناطق العدّ معرضة لخطر التغطية مقابل ${pct(live.nationalCoverageRisk, 1)} وطنياً.` }, steps: [{ en: "Open Predictive Field Control and approve support for high-risk workloads", ar: "فتح التحكم الميداني التنبؤي واعتماد الدعم للأعباء عالية الخطر" }, { en: "Evening and weekend callbacks", ar: "زيارات متابعة مسائية وفي العطل" }], kpi: { en: "Coverage-risk EAs below 3% before mop-up", ar: "مناطق خطر التغطية دون 3% قبل الاستكمال" }, costM: 0.2, beneficiaries: s.sa0.gov[id].households * cr, districts: [], sources: ["OPS_FIELDWORK", "OPS_EARLY_WARNING"], href: "/early-warning" });
      }
    }
    if (live.pesUndercount && (live.pesUndercount[id] ?? 0) > 0.02) {
      add({ sector: "DATA", severity: "HIGH", horizon: "IMMEDIATE", title: { en: "Coverage adjustment and follow-up for net undercount", ar: "تعديل التغطية ومتابعة النقص الصافي" }, rationale: { en: `The Post-Enumeration Survey estimates a ${pct(live.pesUndercount[id], 1)} net undercount.`, ar: `يقدّر مسح ما بعد العدّ نقصاً صافياً بنسبة ${pct(live.pesUndercount[id], 1)}.` }, steps: [{ en: "Review omitted dwelling types and hard-to-count groups", ar: "مراجعة أنواع المساكن المحذوفة والفئات صعبة العدّ" }], kpi: { en: "Adjusted counts published with methodology note", ar: "نشر الأعداد المعدلة مع مذكرة منهجية" }, costM: 0.3, beneficiaries: s.sa0.gov[id].pop * live.pesUndercount[id], districts: [], sources: ["SIM_PES"], href: "/pes" });
    }

    // strategy & sector severity
    const sectorSeverity = Object.fromEntries(ACTION_SECTORS.map((sec) => [sec, null])) as Record<ActionSector, Severity | null>;
    for (const i of ind) sectorSeverity[i.sector] = maxSev(sectorSeverity[i.sector], i.severity);
    for (const a of acts) sectorSeverity[a.sector] = maxSev(sectorSeverity[a.sector], a.severity);
    const strategy: Partial<Record<ActionSector, L>> = {};
    const top = (sec: ActionSector) => acts.filter((a) => a.sector === sec).sort((a, b) => b.score - a.score)[0];
    for (const sec of ACTION_SECTORS) {
      const a = top(sec);
      if (!a) continue;
      const lvl = sectorSeverity[sec];
      const lead = lvl === "CRITICAL" || lvl === "HIGH" ? { en: "Priority —", ar: "أولوية —" } : { en: "Maintain —", ar: "متابعة —" };
      strategy[sec] = { en: `${lead.en} ${a.title.en}${acts.filter((x) => x.sector === sec).length > 1 ? `, plus ${acts.filter((x) => x.sector === sec).length - 1} supporting action(s)` : ""}.`, ar: `${lead.ar} ${a.title.ar}${acts.filter((x) => x.sector === sec).length > 1 ? `، مع ${acts.filter((x) => x.sector === sec).length - 1} إجراء داعم` : ""}.` };
    }
    acts.sort((a, b) => b.score - a.score);
    plans[id] = { govId: id, indicators: ind, actions: acts, strategy, sectorSeverity, totalCostM: acts.reduce((a, x) => a + x.costM, 0), beneficiaries: acts.reduce((a, x) => a + x.beneficiaries, 0) };
  }

  const all = Object.values(plans).flatMap((p) => p.actions);
  const bySector = Object.fromEntries(ACTION_SECTORS.map((sec) => [sec, { actions: 0, costM: 0, critical: 0 }])) as NationalPlan["bySector"];
  for (const a of all) {
    bySector[a.sector].actions++;
    bySector[a.sector].costM += a.costM;
    if (a.severity === "CRITICAL" || a.severity === "HIGH") bySector[a.sector].critical++;
  }
  const themes: L[] = [];
  const crit = (sec: ActionSector) => world.governorates.filter((g) => sevRank(plans[g.id].sectorSeverity[sec]) >= 3).map((g) => g.name);
  for (const sec of ACTION_SECTORS) {
    const gs = crit(sec);
    if (gs.length >= 2) themes.push({ en: `${SECTOR_LABEL[sec].en}: high or critical pressure in ${gs.length} governorates (${gs.slice(0, 4).map((x) => x.en).join(", ")}${gs.length > 4 ? "…" : ""}).`, ar: `${SECTOR_LABEL[sec].ar}: ضغط مرتفع أو حرج في ${gs.length} محافظات (${gs.slice(0, 4).map((x) => x.ar).join("، ")}${gs.length > 4 ? "…" : ""}).` });
  }
  const top: ActionItem[] = [];
  const perSector: Record<string, number> = {};
  for (const a of [...all].sort((x, y) => y.score - x.score)) {
    if ((perSector[a.sector] ?? 0) >= 2) continue;
    perSector[a.sector] = (perSector[a.sector] ?? 0) + 1;
    top.push(a);
    if (top.length >= 15) break;
  }
  return { year: Y, plans, top, bySector, themes, totalCostM: all.reduce((a, x) => a + x.costM, 0) };
}

/** Plain-text briefing for one governorate (copy / export). */
export function briefing(world: World, plan: AreaPlan, year: number, ar: boolean): string {
  const t = (l: L) => (ar ? l.ar : l.en);
  const g = world.gov[plan.govId];
  const hor = { IMMEDIATE: ar ? "فوري (< سنة)" : "Immediate (< 1 yr)", SHORT: ar ? "قصير (1–3 سنوات)" : "Short term (1–3 yrs)", LONG: ar ? "طويل (3–10 سنوات)" : "Long term (3–10 yrs)" };
  const lines = [`${ar ? "خطة عمل" : "Action plan"} — ${t(g.name)} — ${ar ? "أفق" : "horizon"} ${year}`, ar ? "(محاكاة — مقترحات للمراجعة)" : "(Simulated — proposals for review)", ""];
  lines.push(ar ? "الاستراتيجية:" : "Strategy:");
  for (const sec of ACTION_SECTORS) if (plan.strategy[sec]) lines.push(`• ${t(SECTOR_LABEL[sec])}: ${t(plan.strategy[sec]!)}`);
  for (const h of ["IMMEDIATE", "SHORT", "LONG"] as Horizon[]) {
    const acts = plan.actions.filter((a) => a.horizon === h);
    if (!acts.length) continue;
    lines.push("", `${hor[h]}:`);
    acts.forEach((a, i) => lines.push(`${i + 1}. [${a.severity}] ${t(a.title)} — ${t(a.lead)}; ~JOD ${a.costM.toFixed(1)}M; KPI: ${t(a.kpi)}`, `   ${t(a.rationale)}`));
  }
  return lines.join("\n");
}
