/**
 * "Ask the data" — a rule-based question engine (no language model).
 *
 * A question (English or Arabic) is parsed into { topic, operation, year, governorate, district } by
 * keyword matching; the matching Planning Lab / census model is then run and the answer is assembled
 * from its outputs, with the formula used and the provenance ids of every number. Unrecognised
 * questions get suggestions instead of a guess.
 */
import type { GovId, L } from "@/types/census";
import type { World } from "../generate";
import type { CensusEngine } from "../engine";
import type { ScenarioRun } from "../scenarios";
import type { SmallArea } from "./common";
import { analyseSiting, DEFAULT_NORMS, facilityInventory } from "./facilities";
import { DEFAULT_HOUSING, forecastHousing } from "./housingNeed";
import { DEFAULT_JOBS, forecastJobs } from "./jobs";
import { DEFAULT_WATER, simulateWater } from "./water";
import { assessClimate, DEFAULT_CLIMATE } from "./climate";
import { predictLateness } from "./earlyWarning";

export type Topic = "POPULATION" | "SCHOOL" | "ELDERLY" | "HOUSING" | "JOBS" | "WATER" | "HEAT" | "HEALTH" | "PROGRESS" | "LATE" | "ANOMALY";
export type Op = "RANK" | "TREND" | "VALUE";

export interface Parsed {
  topic: Topic | null;
  op: Op;
  year: number | null;
  govId: GovId | null;
  districtId: string | null;
  topN: number;
}

export interface Answer {
  question: string;
  parsed: Parsed;
  ok: boolean;
  headline: L;
  detail?: L;
  table?: { head: L[]; rows: (string | number)[][] };
  chart?: { kind: "bar" | "line"; categories: (string | number)[]; series: { name: L; data: number[] }[]; unit?: string };
  formula?: string;
  sources: string[];
  link?: { href: string; label: L };
}

const TOPIC_WORDS: [Topic, RegExp][] = [
  ["PROGRESS", /\b(progress|completion|complete|coverage|enumerated|fieldwork)\b|إنجاز|تقدم|تغطية|العمل الميداني/],
  ["LATE", /\b(late|delay|delayed|overrun|deadline)\b|متأخر|تأخر|تأخير|ستتأخر/],
  ["ANOMALY", /anomal|fabricat|شذوذ|تلفيق/],
  ["SCHOOL", /\b(school|schools|classroom|classrooms|pupil|pupils|student|students|education)\b|مدرس|مدارس|صف|صفوف|طلاب|طالب|تعليم/],
  ["HEALTH", /\b(clinic|clinics|health cent|health center|primary care|hospital|hospitals|health)\b|صحي|صحة|مستشف|عياد/],
  ["ELDERLY", /\b(elderly|older|old age|65|aged|ageing|aging|pension|care home)\b|مسن|كبار السن|شيخوخة|الرعاية/],
  ["HOUSING", /\b(home|homes|house|houses|housing|dwelling|dwellings|apartment)\b|مسكن|مساكن|إسكان|سكن|شقق/],
  ["JOBS", /\b(job|jobs|employment|unemployment|labour|labor|work)\b|وظيف|وظائف|بطالة|عمل|تشغيل/],
  ["WATER", /\b(water|drought|desalination)\b|مياه|ماء|مائي|جفاف|تحلية/],
  ["HEAT", /\b(heat|hot|climate|flood|cooling|temperature)\b|حر|حرارة|مناخ|سيول|تبريد/],
  ["POPULATION", /\b(population|people|residents|inhabitants|grow|growth|households)\b|سكان|السكان|نسمة|نمو|أسر/],
];

const GOV_ALIASES: Record<GovId, string[]> = {
  AMM: ["amman", "عمان", "عمّان"], IRB: ["irbid", "اربد", "إربد"], ZAR: ["zarqa", "الزرقاء", "زرقاء"], MAF: ["mafraq", "المفرق", "مفرق"],
  BAL: ["balqa", "salt", "البلقاء", "السلط"], JER: ["jerash", "جرش"], AJL: ["ajloun", "ajlun", "عجلون"], MAD: ["madaba", "مادبا"],
  KAR: ["karak", "kerak", "الكرك", "كرك"], TAF: ["tafilah", "tafila", "الطفيلة", "طفيلة"], MAN: ["maan", "ma'an", "معان"], AQB: ["aqaba", "العقبة", "عقبة"],
};

export function parseQuestion(world: World, q: string): Parsed {
  const s = q.toLowerCase().replace(/[؟?!.,]/g, " ");
  let topic: Topic | null = null;
  for (const [t, re] of TOPIC_WORDS) if (re.test(s)) {
    topic = t;
    break;
  }
  const op: Op = /\b(which|top|most|highest|largest|biggest|rank|where|worst|lowest|least)\b|أي|أكثر|أعلى|أكبر|أين|ترتيب|أقل/.test(s) ? "RANK" : /\b(trend|over time|by year|each year|per year|path|until|to 20\d\d)\b|اتجاه|سنوياً|كل سنة|عبر الزمن/.test(s) ? "TREND" : "VALUE";
  const ym = s.match(/20([2-5]\d)/);
  const year = ym ? Math.min(2050, Math.max(2026, Number(`20${ym[1]}`))) : null;
  let govId: GovId | null = null;
  for (const [g, al] of Object.entries(GOV_ALIASES) as [GovId, string[]][]) if (al.some((a) => s.includes(a))) {
    govId = g;
    break;
  }
  let districtId: string | null = null;
  for (const d of world.districts) {
    const key = d.name.en.toLowerCase().replace(/^(qasabat\s+)?(al-|ar-|as-|az-|at-|an-)?/, "").split(/[ (&]/)[0];
    if (key.length >= 4 && !d.name.en.startsWith("Qasabat") && s.includes(key)) {
      districtId = d.id;
      govId = govId ?? d.govId;
      break;
    }
  }
  const nm = s.match(/\btop\s+(\d{1,2})\b/);
  return { topic, op, year, govId, districtId, topN: nm ? Math.min(20, Number(nm[1])) : 5 };
}

export interface AskContext {
  world: World;
  engine: CensusEngine;
  run: ScenarioRun;
  areaFor: (y: number) => SmallArea;
  scenarioName: string;
}

const f0 = (n: number) => Math.round(n).toLocaleString("en-US");
const pct = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`;

export function answer(ctx: AskContext, question: string): Answer {
  const { world, engine, run, areaFor } = ctx;
  const p = parseQuestion(world, question);
  const base = run.baseYear;
  const y = p.year && p.year > base ? p.year : 2040;
  const g = p.govId;
  const gName = { ...(g ? world.gov[g].name : { en: "Jordan", ar: "الأردن" }) };
  const govs = world.governorates;
  const fail = (): Answer => ({ question, parsed: p, ok: false, headline: { en: "I could not match that question to a dataset in the platform.", ar: "لم أتمكن من مطابقة هذا السؤال مع مجموعة بيانات في المنصة." }, detail: { en: "Try asking about population, school places, older people, housing need, jobs, water, heat risk, health centres, census progress, late workloads or anomalies — optionally with a governorate and a year.", ar: "جرّب السؤال عن السكان أو المقاعد المدرسية أو كبار السن أو الحاجة إلى المساكن أو الوظائف أو المياه أو خطر الحر أو المراكز الصحية أو تقدم التعداد أو الأعباء المتأخرة أو حالات الشذوذ — مع محافظة وسنة إن شئت." }, sources: [] });
  if (!p.topic) return fail();

  const sa0 = areaFor(base);
  const sa = areaFor(y);
  switch (p.topic) {
    case "POPULATION": {
      if (p.op === "RANK") {
        const rows = govs.map((x) => ({ x, now: sa0.gov[x.id].pop, then: sa.gov[x.id].pop })).sort((a, b) => b.then / b.now - a.then / a.now);
        const t = rows[0];
        return { question, parsed: p, ok: true, headline: { en: `${t.x.name.en} grows fastest to ${y}: +${pct(t.then / t.now - 1)} (${f0(t.now)} → ${f0(t.then)}).`, ar: `${t.x.name.ar} الأسرع نمواً حتى ${y}: +${pct(t.then / t.now - 1)} (${f0(t.now)} ← ${f0(t.then)}).` }, table: { head: [{ en: "Governorate", ar: "المحافظة" }, { en: `${base}`, ar: `${base}` }, { en: `${y}`, ar: `${y}` }, { en: "Growth", ar: "النمو" }], rows: rows.slice(0, p.topN).map((r) => [r.x.name.en + " / " + r.x.name.ar, f0(r.now), f0(r.then), pct(r.then / r.now - 1)]) }, chart: { kind: "bar", categories: rows.map((r) => r.x.name.en), series: [{ name: { en: "Growth", ar: "النمو" }, data: rows.map((r) => +((r.then / r.now - 1) * 100).toFixed(1)) }], unit: "%" }, formula: "growth = projected population(year) ÷ census-base population − 1", sources: ["SIM_SMALL_AREA", "SIM_PROJECTION"], link: { href: "/projections", label: { en: "Open Population Projections", ar: "افتح الإسقاطات السكانية" } } };
      }
      const series = run.series.filter((s) => s.year >= base);
      const dId = p.districtId;
      const val = (yy: number) => (dId ? areaFor(yy).district[dId].pop : g ? areaFor(yy).gov[g].pop : run.series.find((s) => s.year === yy)!.population);
      if (dId) Object.assign(gName, world.district[dId].name);
      return { question, parsed: p, ok: true, headline: { en: `${gName.en}: ${f0(val(y))} people projected in ${y} (${f0(val(base))} at the census base, ${pct(val(y) / val(base) - 1)}).`, ar: `${gName.ar}: ${f0(val(y))} نسمة متوقعة في ${y} (${f0(val(base))} في قاعدة التعداد، ${pct(val(y) / val(base) - 1)}).` }, detail: { en: `Scenario: ${ctx.scenarioName}. Simulated projection — not an official DoS figure.`, ar: `السيناريو: ${ctx.scenarioName}. إسقاط محاكى — ليس رقماً رسمياً.` }, chart: { kind: "line", categories: series.filter((_, i) => i % 2 === 0).map((s) => s.year), series: [{ name: { en: "Population", ar: "السكان" }, data: series.filter((_, i) => i % 2 === 0).map((s) => Math.round(val(s.year))) }] }, formula: "cohort-component projection (single ages, by sex) apportioned to governorates", sources: ["SIM_PROJECTION", "SIM_SMALL_AREA"], link: { href: "/projections", label: { en: "Open Population Projections", ar: "افتح الإسقاطات السكانية" } } };
    }
    case "SCHOOL": {
      const cls = (st: { a6_17: number }) => (st.a6_17 * 0.95) / 32;
      const rows = (p.govId ? world.districts.filter((d) => d.govId === p.govId).map((d) => ({ name: d.name, now: cls(sa0.district[d.id]), then: cls(sa.district[d.id]) })) : govs.map((x) => ({ name: x.name, now: cls(sa0.gov[x.id]), then: cls(sa.gov[x.id]) }))).sort((a, b) => (b.then - b.now) - (a.then - a.now));
      const tot = rows.reduce((s, r) => s + (r.then - r.now), 0);
      const top = rows[0];
      const inv = facilityInventory(world, sa0);
      const an = analyseSiting(world, sa, "SCHOOL", inv.SCHOOL, DEFAULT_NORMS.SCHOOL);
      return { question, parsed: p, ok: true, headline: tot >= 0 ? { en: `${gName.en} needs ${f0(tot)} more classrooms by ${y} than today; the largest increase is in ${top.name.en} (+${f0(top.then - top.now)}).`, ar: `${gName.ar} تحتاج ${f0(tot)} صفاً إضافياً بحلول ${y} مقارنة باليوم؛ وأكبر زيادة في ${top.name.ar} (+${f0(top.then - top.now)}).` } : { en: `School-age demand in ${gName.en} falls by about ${f0(-tot)} classrooms by ${y} in this scenario (fewer children); ${top.name.en} changes least (${f0(top.then - top.now)}). Existing overcrowding still has to be cleared — see the seat gap below.`, ar: `ينخفض الطلب في ${gName.ar} بنحو ${f0(-tot)} صفاً بحلول ${y} في هذا السيناريو (أطفال أقل)؛ وأقل تغير في ${top.name.ar} (${f0(top.then - top.now)}). ولا يزال الاكتظاظ القائم بحاجة إلى معالجة — انظر فجوة المقاعد أدناه.` }, detail: { en: `The synthetic school inventory leaves a seat gap of ${f0(an.capacityGap)} students nationally in ${y} — about ${f0(an.facilitiesNeeded)} new 640-seat schools.`, ar: `يترك مخزون المدارس الاصطناعي فجوة مقاعد قدرها ${f0(an.capacityGap)} طالباً وطنياً في ${y} — نحو ${f0(an.facilitiesNeeded)} مدرسة جديدة بسعة 640 مقعداً.` }, table: { head: [{ en: p.govId ? "District" : "Governorate", ar: p.govId ? "اللواء" : "المحافظة" }, { en: "Classrooms today", ar: "الصفوف اليوم" }, { en: `Classrooms ${y}`, ar: `الصفوف ${y}` }, { en: "Change", ar: "التغير" }], rows: rows.slice(0, p.topN).map((r) => [`${r.name.en} / ${r.name.ar}`, f0(r.now), f0(r.then), f0(r.then - r.now)]) }, formula: "classrooms = population 6–17 × 0.95 enrolment ÷ 32 pupils per classroom", sources: ["SIM_SMALL_AREA", "SIM_INFRA", "SIM_FACILITIES"], link: { href: "/siting", label: { en: "Open the Facility Siting Planner", ar: "افتح مخطط مواقع المرافق" } } };
    }
    case "HEALTH": {
      const inv = facilityInventory(world, sa0);
      const kind = /hospital|مستشفى|مستشفيات/.test(question.toLowerCase()) ? "HOSPITAL" : "PHC";
      const an = analyseSiting(world, sa, kind, inv[kind], DEFAULT_NORMS[kind]);
      const rows = govs.map((x) => ({ x, gap: an.byGov[x.id].gap, access: an.byGov[x.id].accessCovered / Math.max(1, an.byGov[x.id].accessDemand) })).sort((a, b) => b.gap - a.gap);
      const label = kind === "HOSPITAL" ? { en: "hospital", ar: "المستشفيات" } : { en: "primary health centre", ar: "المراكز الصحية الأولية" };
      return { question, parsed: p, ok: true, headline: { en: `Largest ${label.en} capacity gap in ${y}: ${rows[0].x.name.en} (${f0(rows[0].gap)} residents beyond capacity). ${pct(an.accessPct)} of people live within the access standard.`, ar: `أكبر فجوة في طاقة ${label.ar} في ${y}: ${rows[0].x.name.ar} (${f0(rows[0].gap)} ساكن فوق الطاقة). يعيش ${pct(an.accessPct)} من السكان ضمن معيار الوصول.` }, table: { head: [{ en: "Governorate", ar: "المحافظة" }, { en: "Capacity gap (residents)", ar: "فجوة الطاقة (ساكن)" }, { en: "Within access standard", ar: "ضمن معيار الوصول" }], rows: rows.slice(0, p.topN).map((r) => [`${r.x.name.en} / ${r.x.name.ar}`, f0(r.gap), pct(r.access, 0)]) }, formula: "gap = max(0, demand − capacity of facilities in the district); access = nearest facility ≤ standard", sources: ["SIM_FACILITIES", "SIM_SMALL_AREA"], link: { href: "/siting", label: { en: "Open the Facility Siting Planner", ar: "افتح مخطط مواقع المرافق" } } };
    }
    case "ELDERLY": {
      const rows = govs.map((x) => ({ x, now: sa0.gov[x.id].a65, then: sa.gov[x.id].a65 })).sort((a, b) => b.then / b.now - a.then / a.now);
      const nat0 = sa0.national.a65;
      const nat = sa.national.a65;
      return { question, parsed: p, ok: true, headline: g ? { en: `${gName.en}: ${f0(sa.gov[g].a65)} people aged 65+ in ${y}, up ${pct(sa.gov[g].a65 / sa0.gov[g].a65 - 1, 0)} from ${f0(sa0.gov[g].a65)}.`, ar: `${gName.ar}: ${f0(sa.gov[g].a65)} شخصاً بعمر 65+ في ${y}، بزيادة ${pct(sa.gov[g].a65 / sa0.gov[g].a65 - 1, 0)} عن ${f0(sa0.gov[g].a65)}.` } : { en: `People aged 65+ rise from ${f0(nat0)} to ${f0(nat)} by ${y} (+${pct(nat / nat0 - 1, 0)}); fastest growth in ${rows[0].x.name.en}.`, ar: `يرتفع عدد من هم بعمر 65+ من ${f0(nat0)} إلى ${f0(nat)} بحلول ${y} (+${pct(nat / nat0 - 1, 0)})؛ والأسرع نمواً ${rows[0].x.name.ar}.` }, table: { head: [{ en: "Governorate", ar: "المحافظة" }, { en: "65+ today", ar: "65+ اليوم" }, { en: `65+ ${y}`, ar: `65+ ${y}` }, { en: "Growth", ar: "النمو" }], rows: rows.slice(0, p.topN).map((r) => [`${r.x.name.en} / ${r.x.name.ar}`, f0(r.now), f0(r.then), pct(r.then / r.now - 1, 0)]) }, formula: "65+ = projected single ages 65–100 (governorate composition from the synthetic census)", sources: ["SIM_PROJECTION", "SIM_SMALL_AREA", "SIM_AGEING"], link: { href: "/ageing", label: { en: "Open Ageing & Care", ar: "افتح الشيخوخة والرعاية" } } };
    }
    case "HOUSING": {
      const h = forecastHousing(world, areaFor, base, 2050, DEFAULT_HOUSING);
      const need = h.national.filter((x) => x.year <= y).reduce((s, x) => s + x.need, 0);
      const rows = govs.map((x) => ({ x, v: h.byGov[x.id] })).sort((a, b) => b.v.need2035 - a.v.need2035);
      return { question, parsed: p, ok: true, headline: g ? { en: `${gName.en} needs about ${f0(h.byGov[g].need2035)} new homes from ${base + 1} to 2035 (${f0(h.byGov[g].per1000)} per 1,000 households).`, ar: `${gName.ar} تحتاج نحو ${f0(h.byGov[g].need2035)} مسكناً جديداً من ${base + 1} حتى 2035 (${f0(h.byGov[g].per1000)} لكل 1,000 أسرة).` } : { en: `Jordan needs about ${f0(need)} homes from ${base + 1} to ${y} (${f0(need / (y - base))} a year); ${rows[0].x.name.en} has the largest need.`, ar: `يحتاج الأردن نحو ${f0(need)} مسكناً من ${base + 1} حتى ${y} (${f0(need / (y - base))} سنوياً)؛ وأكبر حاجة في ${rows[0].x.name.ar}.` }, table: { head: [{ en: "Governorate", ar: "المحافظة" }, { en: "Need to 2035", ar: "الحاجة حتى 2035" }, { en: "per 1,000 hh", ar: "لكل 1,000 أسرة" }], rows: rows.slice(0, p.topN).map((r) => [`${r.x.name.en} / ${r.x.name.ar}`, f0(r.v.need2035), f0(r.v.per1000)]) }, formula: "need = new households + replacement + backlog ÷ years − vacancy release", sources: ["SIM_HOUSING_NEED", "SIM_FRAME", "SIM_MICRODATA"], link: { href: "/housing-need", label: { en: "Open Housing Need Forecast", ar: "افتح التنبؤ بالحاجة إلى المساكن" } } };
    }
    case "JOBS": {
      const j = forecastJobs(world, run.series, areaFor, DEFAULT_JOBS);
      const span = j.series.filter((x) => x.year > base && x.year <= y);
      const avg = span.reduce((s, x) => s + x.netNeedHold, 0) / Math.max(1, span.length);
      const rows = govs.map((x) => ({ x, v: j.byGov[x.id] })).sort((a, b) => b.v.jobsNeeded2035 - a.v.jobsNeeded2035);
      return { question, parsed: p, ok: true, headline: g ? { en: `${gName.en} needs about ${f0(j.byGov[g].jobsNeeded2035)} additional jobs by 2035 to keep its unemployment rate; youth unemployment today ${pct(j.byGov[g].youthUnemployment)}.`, ar: `${gName.ar} تحتاج نحو ${f0(j.byGov[g].jobsNeeded2035)} وظيفة إضافية حتى 2035 لتثبيت معدل البطالة؛ وبطالة الشباب اليوم ${pct(j.byGov[g].youthUnemployment)}.` } : { en: `About ${f0(avg)} net new jobs a year are needed to ${y} just to hold today's unemployment rate (${pct(j.u0)}).`, ar: `يلزم نحو ${f0(avg)} وظيفة جديدة صافية سنوياً حتى ${y} لتثبيت معدل البطالة الحالي (${pct(j.u0)}) فقط.` }, table: { head: [{ en: "Governorate", ar: "المحافظة" }, { en: "Jobs needed to 2035", ar: "وظائف لازمة حتى 2035" }, { en: "Youth unemployment", ar: "بطالة الشباب" }], rows: rows.slice(0, p.topN).map((r) => [`${r.x.name.en} / ${r.x.name.ar}`, f0(r.v.jobsNeeded2035), pct(r.v.youthUnemployment)]) }, formula: "jobs to hold rate = labour force(t) × (1 − u₀); labour force = population × participation (synthetic census)", sources: ["SIM_JOBS", "SIM_MICRODATA"], link: { href: "/jobs", label: { en: "Open Jobs & Labour Entry", ar: "افتح الوظائف ودخول سوق العمل" } } };
    }
    case "WATER": {
      const w = simulateWater(world, areaFor, base, 2050, DEFAULT_WATER, y);
      const rows = govs.map((x) => ({ x, yr: w.stressYear[x.id], r: w.byGov[x.id].find((z) => z.year === y)!.ratio })).sort((a, b) => (a.yr ?? 2100) - (b.yr ?? 2100));
      const nat = w.national.find((z) => z.year === y)!;
      return { question, parsed: p, ok: true, headline: g ? { en: `${gName.en}: supply covers ${pct(w.byGov[g].find((z) => z.year === y)!.ratio, 0)} of municipal water requirement in ${y}; first stress year ${w.stressYear[g] ?? "none before 2050"}.`, ar: `${gName.ar}: يغطي الإمداد ${pct(w.byGov[g].find((z) => z.year === y)!.ratio, 0)} من الاحتياج البلدي في ${y}؛ أول سنة إجهاد ${w.stressYear[g] ?? "لا شيء قبل 2050"}.` } : { en: `In ${y}, supply covers ${pct(nat.ratio, 0)} of the national municipal requirement (gap ${f0(nat.gap)} MCM). ${rows[0].x.name.en} reaches water stress first (${rows[0].yr ?? "—"}).`, ar: `في ${y} يغطي الإمداد ${pct(nat.ratio, 0)} من الاحتياج البلدي الوطني (فجوة ${f0(nat.gap)} م.م³). ${rows[0].x.name.ar} تبلغ الإجهاد المائي أولاً (${rows[0].yr ?? "—"}).` }, detail: { en: "Supply figures are illustrative assumptions, not Ministry of Water & Irrigation data.", ar: "أرقام الإمداد افتراضات توضيحية وليست بيانات وزارة المياه والري." }, table: { head: [{ en: "Governorate", ar: "المحافظة" }, { en: "First stress year", ar: "أول سنة إجهاد" }, { en: `Supply ratio ${y}`, ar: `نسبة الإمداد ${y}` }], rows: rows.slice(0, p.topN).map((r) => [`${r.x.name.en} / ${r.x.name.ar}`, r.yr ?? "—", pct(r.r, 0)]) }, formula: "requirement = population × l/p/d × 365 ÷ (1 − NRW); stress = supply < 90% of requirement", sources: ["SIM_WATER", "SIM_SMALL_AREA"], link: { href: "/water", label: { en: "Open Water Security", ar: "افتح الأمن المائي" } } };
    }
    case "HEAT": {
      const c = assessClimate(world, sa, DEFAULT_CLIMATE);
      const rows = [...c.districts].filter((d) => !g || world.district[d.id].govId === g).sort((a, b) => b.heatRisk - a.heatRisk);
      return { question, parsed: p, ok: true, headline: { en: `Highest heat risk${g ? ` in ${gName.en}` : ""}: ${world.district[rows[0].id].name.en} (${f0(rows[0].atRisk)} people at risk, ${Math.round(rows[0].hotDays)} days above 40 °C in this scenario).`, ar: `أعلى خطر حراري${g ? ` في ${gName.ar}` : ""}: ${world.district[rows[0].id].name.ar} (${f0(rows[0].atRisk)} شخصاً معرضاً، ${Math.round(rows[0].hotDays)} يوماً فوق 40 درجة في هذا السيناريو).` }, detail: { en: "Hazard classes are illustrative; vulnerability comes from the synthetic census.", ar: "فئات الخطر توضيحية؛ والهشاشة من التعداد الاصطناعي." }, table: { head: [{ en: "District", ar: "اللواء" }, { en: "Heat risk", ar: "خطر الحر" }, { en: "People at risk", ar: "المعرضون" }, { en: "Cooling centres", ar: "مراكز تبريد" }], rows: rows.slice(0, p.topN).map((d) => [`${world.district[d.id].name.en} / ${world.district[d.id].name.ar}`, d.heatRisk.toFixed(2), f0(d.atRisk), d.coolingCentres]) }, formula: "risk = ∛(hazard × exposure × vulnerability)", sources: ["SIM_CLIMATE", "SIM_MICRODATA"], link: { href: "/climate", label: { en: "Open Climate Risk", ar: "افتح المخاطر المناخية" } } };
    }
    case "PROGRESS": {
      const by = engine.aggregateBy("govId");
      const nat = engine.aggregate();
      const rows = govs.map((x) => ({ x, a: by[x.id] })).sort((a, b) => (p.op === "RANK" && /lowest|least|worst|behind|أقل/.test(question.toLowerCase()) ? a.a.completionPct - b.a.completionPct : b.a.completionPct - a.a.completionPct));
      return { question, parsed: p, ok: true, headline: g ? { en: `${gName.en}: ${pct(by[g].completionPct)} of dwellings enumerated on census day ${engine.day}.`, ar: `${gName.ar}: أُنجز عدّ ${pct(by[g].completionPct)} من المساكن في يوم التعداد ${engine.day}.` } : { en: `Census day ${engine.day}: ${pct(nat.completionPct)} complete nationally; ${rows[0].x.name.en} ${pct(rows[0].a.completionPct)}.`, ar: `يوم التعداد ${engine.day}: الإنجاز الوطني ${pct(nat.completionPct)}؛ ${rows[0].x.name.ar} ${pct(rows[0].a.completionPct)}.` }, detail: engine.phase === "READY" ? { en: "Fieldwork has not started — press “Start census”.", ar: "لم يبدأ العمل الميداني — اضغط «بدء التعداد»." } : undefined, table: { head: [{ en: "Governorate", ar: "المحافظة" }, { en: "Completion", ar: "الإنجاز" }], rows: rows.slice(0, p.topN).map((r) => [`${r.x.name.en} / ${r.x.name.ar}`, pct(r.a.completionPct)]) }, formula: "completion = dwellings visited ÷ dwellings in the frame (synthetic fieldwork)", sources: ["OPS_FIELDWORK"], link: { href: "/coverage", label: { en: "Open Coverage & Completion", ar: "افتح التغطية والإنجاز" } } };
    }
    case "LATE": {
      const ew = predictLateness(engine);
      const c: Record<string, number> = {};
      for (const x of ew.predictions) if (x.band === "HIGH") c[x.govId] = (c[x.govId] ?? 0) + 1;
      const rows = govs.map((x) => ({ x, n: c[x.id] ?? 0 })).sort((a, b) => b.n - a.n);
      return { question, parsed: p, ok: true, headline: { en: engine.day < 2 ? "Predictions start after two census days — start the census first." : `${ew.counts.HIGH} workloads have a high probability of finishing late (day ${engine.day}); most in ${rows[0].x.name.en}.`, ar: engine.day < 2 ? "تبدأ التنبؤات بعد يومين من التعداد — ابدأ التعداد أولاً." : `${ew.counts.HIGH} عبء عمل باحتمال تأخر مرتفع (اليوم ${engine.day})؛ أغلبها في ${rows[0].x.name.ar}.` }, table: { head: [{ en: "Governorate", ar: "المحافظة" }, { en: "High-risk workloads", ar: "أعباء عالية الخطر" }], rows: rows.slice(0, p.topN).map((r) => [`${r.x.name.en} / ${r.x.name.ar}`, r.n]) }, formula: "P(late) = Φ((ln required pace − ln observed pace) ÷ σ)", sources: ["OPS_EARLY_WARNING"], link: { href: "/early-warning", label: { en: "Open Predictive Field Control", ar: "افتح التحكم الميداني التنبؤي" } } };
    }
    case "ANOMALY": {
      const open = engine.anomalies.filter((a) => !a.decision);
      return { question, parsed: p, ok: true, headline: { en: `${engine.anomalies.length} anomalies detected so far, ${open.length} awaiting a human decision.`, ar: `رُصدت ${engine.anomalies.length} حالة شذوذ حتى الآن، منها ${open.length} بانتظار قرار بشري.` }, table: { head: [{ en: "Subject", ar: "الموضوع" }, { en: "Severity", ar: "الخطورة" }, { en: "What", ar: "الوصف" }], rows: engine.anomalies.slice(0, p.topN).map((a) => [a.subjectId, a.severity, a.what.en]) }, formula: "explainable statistical rules — never changes responses", sources: ["OPS_ANOMALY"], link: { href: "/anomalies", label: { en: "Open AI Anomaly Detection", ar: "افتح كشف الشذوذ" } } };
    }
  }
  return fail();
}

export const SUGGESTIONS: L[] = [
  { en: "Which governorates will grow fastest by 2040?", ar: "أي المحافظات ستنمو أسرع حتى 2040؟" },
  { en: "How many classrooms will Irbid need by 2035?", ar: "كم صفاً ستحتاج إربد بحلول 2035؟" },
  { en: "How many homes does Jordan need to 2035?", ar: "كم مسكناً يحتاج الأردن حتى 2035؟" },
  { en: "Where is the largest health centre gap in 2040?", ar: "أين أكبر فجوة في المراكز الصحية في 2040؟" },
  { en: "How many jobs are needed each year?", ar: "كم وظيفة يلزم سنوياً؟" },
  { en: "Which governorate faces water stress first?", ar: "أي محافظة تواجه الإجهاد المائي أولاً؟" },
  { en: "Which districts have the highest heat risk?", ar: "أي الألوية الأعلى في خطر الحر؟" },
  { en: "How many older people will Amman have in 2050?", ar: "كم عدد كبار السن في عمّان عام 2050؟" },
  { en: "Which governorates are behind on census progress?", ar: "أي المحافظات أقل إنجازاً في التعداد؟" },
  { en: "Which workloads will finish late?", ar: "أي أعباء العمل ستتأخر؟" },
];
