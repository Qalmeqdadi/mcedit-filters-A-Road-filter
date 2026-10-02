/**
 * Scenario futures — the 2 × 2 scenario-matrix method of strategic foresight (SIMULATED).
 *
 * Two critical uncertainties (axes) are chosen; each has a "low" and a "high" pole that sets concrete
 * model assumptions. Their four combinations are four coherent futures. Every Planning Lab model is
 * re-run under each future, so the same outcomes and the same corrective actions can be compared.
 *
 * Robustness test: an action that is needed in all four futures is "no-regret"; in three, "robust";
 * in one or two, "contingent" (prepare it and trigger it on a signpost).
 */
import type { L } from "@/types/census";
import type { World } from "../generate";
import type { CensusEngine } from "../engine";
import { DEFAULT_PARAMS, runScenario, type FullScenario, type ScenarioRun } from "../scenarios";
import { smallArea } from "./common";
import { DEFAULT_WATER, type WaterParams } from "./water";
import { DEFAULT_JOBS, type JobsParams } from "./jobs";
import { DEFAULT_CLIMATE, type ClimateParams } from "./climate";
import type { GrowthPolicy } from "./urbanGrowth";
import { buildPlans, liveCensus, planSnapshot, type ActionItem, type NationalPlan, type PlanSnapshot } from "./actions";

export interface FutureSpec {
  scenario: FullScenario;
  water: WaterParams;
  jobs: JobsParams;
  climate: ClimateParams;
  urban: GrowthPolicy;
}

export interface Pole {
  label: L;
  narrative: L;
  signpost: L;
  apply: (f: FutureSpec) => FutureSpec;
}

export interface Axis {
  id: "MIGRATION" | "WATER" | "ECONOMY" | "CLIMATE" | "FERTILITY" | "URBAN";
  name: L;
  low: Pole;
  high: Pole;
}

export const AXES: Axis[] = [
  {
    id: "MIGRATION",
    name: { en: "Regional stability & migration", ar: "الاستقرار الإقليمي والهجرة" },
    low: { label: { en: "Calm region", ar: "إقليم هادئ" }, narrative: { en: "the region stabilises and net migration settles near zero", ar: "يستقر الإقليم ويقترب صافي الهجرة من الصفر" }, signpost: { en: "Net migration below 5,000 a year for two years", ar: "صافي الهجرة دون 5,000 سنوياً لعامين" }, apply: (f) => ({ ...f, scenario: { ...f.scenario, netMigration: 0, migrationShock: 0 } }) },
    high: { label: { en: "Large inflows", ar: "تدفقات كبيرة" }, narrative: { en: "renewed regional crises bring large inflows, mostly to the north", ar: "تجلب أزمات إقليمية متجددة تدفقات كبيرة معظمها إلى الشمال" }, signpost: { en: "Border registrations above 50,000 in a quarter", ar: "تسجيلات حدودية تتجاوز 50,000 في ربع سنة" }, apply: (f) => ({ ...f, scenario: { ...f.scenario, netMigration: 40000, migrationShock: 400000, shockNorthShare: 0.65, householdSize: 4.6 } }) },
  },
  {
    id: "WATER",
    name: { en: "Water availability", ar: "توافر المياه" },
    low: { label: { en: "Managed water", ar: "مياه مُدارة" }, narrative: { en: "desalination arrives on time and losses are cut", ar: "تصل التحلية في موعدها ويُخفض الفاقد" }, signpost: { en: "Desalination contract signed and on schedule; NRW falling 2 points a year", ar: "توقيع عقد التحلية والالتزام بالجدول؛ وانخفاض الفاقد نقطتين سنوياً" }, apply: (f) => ({ ...f, water: { ...f.water, newSupplyYear: 2029, newSupplyMcm: 350, decline: 0.008, nrwTarget: 0.36, droughtProb: 0.15 } }) },
    high: { label: { en: "Severe scarcity", ar: "شح حاد" }, narrative: { en: "new supply slips past 2035, aquifers fall faster and droughts are more frequent", ar: "يتأخر الإمداد الجديد إلى ما بعد 2035 وتنخفض الأحواض أسرع وتتكرر موجات الجفاف" }, signpost: { en: "Desalination start slips beyond 2032; two dry winters in a row", ar: "تأخر بدء التحلية بعد 2032؛ وشتاءان جافان متتاليان" }, apply: (f) => ({ ...f, water: { ...f.water, newSupplyYear: 2036, newSupplyMcm: 200, decline: 0.02, droughtProb: 0.3, droughtSeverity: 0.22 } }) },
  },
  {
    id: "ECONOMY",
    name: { en: "Economic growth", ar: "النمو الاقتصادي" },
    low: { label: { en: "Slow growth", ar: "نمو بطيء" }, narrative: { en: "growth stays near 1.5% and few jobs are created", ar: "يبقى النمو قرب 1.5% وتُستحدث وظائف قليلة" }, signpost: { en: "Real GDP growth below 2% for three years", ar: "نمو حقيقي دون 2% لثلاث سنوات" }, apply: (f) => ({ ...f, jobs: { ...f.jobs, gdpGrowth: 0.015 } }) },
    high: { label: { en: "Strong growth", ar: "نمو قوي" }, narrative: { en: "investment lifts growth to 4.5% and more women join the workforce", ar: "يرفع الاستثمار النمو إلى 4.5% وتنضم نساء أكثر إلى سوق العمل" }, signpost: { en: "Investment above 25% of GDP; women's participation rising", ar: "استثمار يتجاوز 25% من الناتج؛ وارتفاع مشاركة المرأة" }, apply: (f) => ({ ...f, jobs: { ...f.jobs, gdpGrowth: 0.045, femaleParticipation: 1.5 } }) },
  },
  {
    id: "CLIMATE",
    name: { en: "Pace of climate change", ar: "وتيرة التغير المناخي" },
    low: { label: { en: "Moderate warming", ar: "احترار معتدل" }, narrative: { en: "warming stays near +1 °C", ar: "يبقى الاحترار قرب +1 درجة" }, signpost: { en: "Fewer than 30 days above 40 °C in the Jordan Valley", ar: "أقل من 30 يوماً فوق 40 درجة في وادي الأردن" }, apply: (f) => ({ ...f, climate: { ...f.climate, warming: 1.0 } }) },
    high: { label: { en: "Severe warming", ar: "احترار شديد" }, narrative: { en: "warming approaches +2.8 °C with more droughts and heat waves", ar: "يقترب الاحترار من +2.8 درجة مع جفاف وموجات حر أكثر" }, signpost: { en: "Record heat waves in consecutive summers", ar: "موجات حر قياسية في صيفين متتاليين" }, apply: (f) => ({ ...f, climate: { ...f.climate, warming: 2.8 }, water: { ...f.water, droughtProb: Math.min(0.5, f.water.droughtProb + 0.1) } }) },
  },
  {
    id: "FERTILITY",
    name: { en: "Fertility transition", ar: "التحول في الخصوبة" },
    low: { label: { en: "Fast decline", ar: "انخفاض سريع" }, narrative: { en: "fertility falls quickly and the population ages sooner", ar: "تنخفض الخصوبة بسرعة ويتقدم السكان في العمر أبكر" }, signpost: { en: "Total fertility below 2.3 by 2030", ar: "معدل خصوبة كلي دون 2.3 بحلول 2030" }, apply: (f) => ({ ...f, scenario: { ...f.scenario, fertilityMultiplier: 0.8 } }) },
    high: { label: { en: "Slow decline", ar: "انخفاض بطيء" }, narrative: { en: "fertility stays high and school-age numbers keep growing", ar: "تبقى الخصوبة مرتفعة وتستمر أعداد سن المدرسة في النمو" }, signpost: { en: "Births above 250,000 a year", ar: "مواليد تتجاوز 250,000 سنوياً" }, apply: (f) => ({ ...f, scenario: { ...f.scenario, fertilityMultiplier: 1.15 } }) },
  },
  {
    id: "URBAN",
    name: { en: "Urban development model", ar: "نموذج التنمية العمرانية" },
    low: { label: { en: "Compact & planned", ar: "متراص ومخطط" }, narrative: { en: "cities grow compactly along transit corridors", ar: "تنمو المدن بشكل متراص على محاور النقل" }, signpost: { en: "Growth boundary adopted in the regional plans", ar: "اعتماد حدود النمو في المخططات الإقليمية" }, apply: (f) => ({ ...f, urban: "COMPACT" }) },
    high: { label: { en: "Dispersed & unplanned", ar: "متشتت وغير مخطط" }, narrative: { en: "development spreads outward at low density", ar: "يمتد التطوير إلى الخارج بكثافة منخفضة" }, signpost: { en: "Rising share of permits outside the urban edge", ar: "ارتفاع نسبة التراخيص خارج الحافة العمرانية" }, apply: (f) => ({ ...f, urban: "SPRAWL" }) },
  },
];

/** Curated names for the default Migration × Water matrix; other pairs are named from their poles. */
const NAMES: Record<string, L> = {
  "MIGRATION:low|WATER:low": { en: "Steady Horizon", ar: "أفق مستقر" },
  "MIGRATION:low|WATER:high": { en: "Quiet Drought", ar: "جفاف هادئ" },
  "MIGRATION:high|WATER:low": { en: "Crowded Resilience", ar: "مرونة مزدحمة" },
  "MIGRATION:high|WATER:high": { en: "Perfect Storm", ar: "العاصفة الكاملة" },
};

export interface Future {
  key: string;
  name: L;
  narrative: L;
  poles: { axis: Axis; pole: "low" | "high" }[];
  spec: FutureSpec;
  signposts: L[];
}

const BASE: FutureSpec = { scenario: DEFAULT_PARAMS, water: DEFAULT_WATER, jobs: DEFAULT_JOBS, climate: DEFAULT_CLIMATE, urban: "TREND" };

export function buildFutures(aId: Axis["id"], bId: Axis["id"]): Future[] {
  const a = AXES.find((x) => x.id === aId)!;
  const b = AXES.find((x) => x.id === bId)!;
  const out: Future[] = [];
  for (const pa of ["low", "high"] as const)
    for (const pb of ["low", "high"] as const) {
      const A = a[pa];
      const B = b[pb];
      const key = `${a.id}:${pa}|${b.id}:${pb}`;
      const name = NAMES[key] ?? { en: `${A.label.en} · ${B.label.en}`, ar: `${A.label.ar} · ${B.label.ar}` };
      out.push({
        key,
        name,
        narrative: { en: `By 2040, ${A.narrative.en}, while ${B.narrative.en}.`, ar: `بحلول 2040، ${A.narrative.ar}، بينما ${B.narrative.ar}.` },
        poles: [{ axis: a, pole: pa }, { axis: b, pole: pb }],
        spec: B.apply(A.apply(BASE)),
        signposts: [A.signpost, B.signpost],
      });
    }
  return out;
}

export interface FutureOutcome {
  population: number;
  a65share: number;
  schoolGap: number;
  phcGap: number;
  homes2035: number;
  jobsPerYear: number;
  unemployment: number;
  waterRatio: number;
  stressYear: number | null;
  heatAtRisk: number;
  ammanNewKm2: number;
  urgentActions: number;
  actions: number;
  costM: number;
}

export interface FutureRun {
  future: Future;
  run: ScenarioRun;
  snap: PlanSnapshot;
  plans: NationalPlan;
  outcome: FutureOutcome;
}

const runCache = new WeakMap<World, Map<string, ScenarioRun>>();
function cachedRun(world: World, params: FullScenario) {
  let m = runCache.get(world);
  if (!m) {
    m = new Map();
    runCache.set(world, m);
  }
  const k = JSON.stringify(params);
  let r = m.get(k);
  if (!r) {
    r = runScenario(world, world.totals.population, params);
    m.set(k, r);
  }
  return r;
}

export function runFuture(world: World, engine: CensusEngine, future: Future, year: number): FutureRun {
  const run = cachedRun(world, future.spec.scenario);
  const areaFor = (y: number) => smallArea(world, run, y);
  const snap = planSnapshot(world, run, areaFor, year, { water: future.spec.water, jobs: future.spec.jobs, climate: future.spec.climate, urbanPolicy: future.spec.urban });
  const plans = buildPlans(world, snap, liveCensus(engine));
  const pt = run.series.find((x) => x.year === year)!;
  const all = Object.values(plans.plans).flatMap((p) => p.actions);
  const span = snap.jobs.series.filter((x) => x.year > run.baseYear && x.year <= year);
  const outcome: FutureOutcome = {
    population: pt.population,
    a65share: pt.age65plus / pt.population,
    schoolGap: snap.siting.SCHOOL.h.capacityGap,
    phcGap: snap.siting.PHC.h.capacityGap,
    homes2035: snap.housing.national.filter((x) => x.year <= 2035).reduce((s, x) => s + x.need, 0),
    jobsPerYear: span.reduce((s, x) => s + x.netNeedHold, 0) / Math.max(1, span.length),
    unemployment: snap.jobs.series.find((x) => x.year === year)!.impliedUnemployment,
    waterRatio: snap.water.national.find((x) => x.year === year)!.ratio,
    stressYear: snap.water.nationalStressYear,
    heatAtRisk: snap.climate.totals.atRisk,
    ammanNewKm2: snap.growth.AMMAN.trend.totals.newKm2,
    urgentActions: all.filter((x) => x.severity === "CRITICAL" || x.severity === "HIGH").length,
    actions: all.length,
    costM: plans.totalCostM,
  };
  return { future, run, snap, plans, outcome };
}

// ------------------------------------------------------------------ robustness

export type Robustness = "NO_REGRET" | "ROBUST" | "CONTINGENT";

export interface RobustItem {
  key: string;
  govId: string;
  sector: ActionItem["sector"];
  title: L;
  presentIn: string[];
  robustness: Robustness;
  costMin: number;
  costMax: number;
  maxSeverity: ActionItem["severity"];
  /** contingent actions: the signposts of the futures that need them */
  triggers: L[];
  example: ActionItem;
}

const SEV = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 } as const;

/** Signposts of the axis poles shared by every future that needs the action (what to watch for). */
function commonSignposts(futures: Future[]): L[] {
  const uniq = futures.filter((f, i, arr) => arr.findIndex((g) => g.key === f.key) === i);
  const shared = uniq[0].poles.filter((p) => uniq.every((f) => f.poles.some((q) => q.axis.id === p.axis.id && q.pole === p.pole)));
  const poles = shared.length ? shared : uniq.flatMap((f) => f.poles);
  return poles.map((p) => p.axis[p.pole].signpost).filter((s, i, arr) => arr.findIndex((y) => y.en === s.en) === i);
}

export function robustness(runs: FutureRun[]): RobustItem[] {
  const map = new Map<string, { items: { f: FutureRun; a: ActionItem }[] }>();
  for (const f of runs)
    for (const p of Object.values(f.plans.plans))
      for (const a of p.actions) {
        const k = `${a.govId}|${a.kind}`;
        (map.get(k) ?? map.set(k, { items: [] }).get(k)!).items.push({ f, a });
      }
  const out: RobustItem[] = [];
  for (const [k, v] of map) {
    const futures = [...new Set(v.items.map((x) => x.f.future.key))];
    const n = futures.length;
    const costs = v.items.map((x) => x.a.costM);
    const top = v.items.reduce((best, x) => (SEV[x.a.severity] > SEV[best.a.severity] ? x : best), v.items[0]);
    out.push({
      key: k,
      govId: top.a.govId,
      sector: top.a.sector,
      title: top.a.title,
      presentIn: futures,
      robustness: n >= runs.length ? "NO_REGRET" : n >= runs.length - 1 ? "ROBUST" : "CONTINGENT",
      costMin: Math.min(...costs),
      costMax: Math.max(...costs),
      maxSeverity: top.a.severity,
      triggers: n < runs.length - 1 ? commonSignposts(v.items.map((x) => x.f.future)) : [],
      example: top.a,
    });
  }
  const order = { NO_REGRET: 0, ROBUST: 1, CONTINGENT: 2 };
  return out.sort((a, b) => order[a.robustness] - order[b.robustness] || SEV[b.maxSeverity] - SEV[a.maxSeverity] || b.costMax - a.costMax);
}
