"use client";

import { Building2, Droplets, GraduationCap, HeartPulse, Briefcase, Zap, Network, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "@/store/app";
import { useEngine } from "@/store/engine";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader, Panel, Callout } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/form";
import { NatureBadge } from "@/components/ui/badges";
import { ProvenanceButton } from "@/components/ui/provenance";
import { JordanMap } from "@/features/gis/JordanMap";
import { CARE_NEED_SHARE, DEFAULT_PARAMS, PROJECTION_YEARS, runScenario, SCHOOL_ENROLMENT } from "@/simulation/scenarios";
import { fmt1, fmtInt, fmtPct, fmtSigned, fmtSignedPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { GovId, L as LText, Region } from "@/types/census";
import { navIndex } from "@/lib/nav";

interface Statement {
  id: string;
  icon: typeof Zap;
  sector: LText;
  ministry: LText;
  text: LText;
  metric: string;
  tone: "up" | "down" | "flat";
  assumptions: LText[];
}

export function Decision() {
  const engine = useEngine();
  const { t, tx, L, ar } = useI18n();
  const active = useApp((s) => s.activeScenario);
  const yearSel = useApp((s) => s.projectionYear);
  const setYear = useApp((s) => s.setProjectionYear);
  const [open, setOpen] = useState<string | null>(null);
  const world = engine.world;
  const year = PROJECTION_YEARS.includes(yearSel) ? yearSel : 2040;
  const params = active?.params ?? DEFAULT_PARAMS;
  const scenarioName = active?.name ?? L("Baseline", "خط الأساس");
  const run = useMemo(() => runScenario(world, world.totals.population, params), [world, params]);
  const baseline = useMemo(() => runScenario(world, world.totals.population, DEFAULT_PARAMS), [world]);
  const b = run.impacts[run.baseYear];
  const y = run.impacts[year];
  const bl = baseline.impacts[year];
  const pBase = run.series[0];
  const pY = run.series.find((s) => s.year === year)!;

  const region = (r: Region) => world.governorates.filter((g) => g.region === r).map((g) => g.id);
  const sumGov = (imp: typeof y, ids: GovId[], k: "population" | "age6_17" | "age65plus" | "households") => ids.reduce((s, id) => s + imp.byGov[id][k], 0);
  const north = region("North");
  const north6 = sumGov(y, north, "age6_17") - sumGov(b, north, "age6_17");
  const northClass = (north6 * (1 + params.schoolAgeGrowth) * SCHOOL_ENROLMENT) / params.classroomCapacity;
  const elderlyPct = pY.age65plus / pBase.age65plus - 1;
  const ranked = world.governorates.map((g) => ({ g, p: y.byGov[g.id].pressure })).sort((a, c) => c.p - a.p);
  const years = year - run.baseYear;
  const dir = (x: number) => (x > 0 ? "up" : x < 0 ? "down" : "flat") as Statement["tone"];
  const word = (x: number, up: LText, down: LText) => (x >= 0 ? up : down);
  const incr = { en: "increases", ar: "يرتفع" };
  const decr = { en: "decreases", ar: "ينخفض" };

  const statements: Statement[] = [
    {
      id: "edu", icon: GraduationCap, sector: { en: "Education", ar: "التعليم" }, ministry: { en: "Ministry of Education", ar: "وزارة التربية والتعليم" }, tone: dir(north6),
      metric: `${fmtSigned(northClass)} ${L("classrooms (north)", "غرفة صفية (الشمال)")}`,
      text: {
        en: `Under the selected scenario, school-age population (6–17) in the northern governorates ${word(north6, incr, decr).en} by ${fmtInt(Math.abs(north6))} between ${run.baseYear} and ${year}, creating a simulated ${north6 >= 0 ? "requirement for" : "release of"} ${fmtInt(Math.abs(northClass))} classrooms (≈ ${fmtInt(Math.abs(northClass) / (params.schoolCapacity / params.classroomCapacity))} schools). Nationally, ${y.delta.classroomsRequired >= 0 ? "an additional" : "a reduction of"} ${fmtInt(Math.abs(y.delta.classroomsRequired))} classrooms.`,
        ar: `وفق السيناريو المختار، ${word(north6, incr, decr).ar} عدد السكان في سن المدرسة (6–17) في محافظات الشمال بمقدار ${fmtInt(Math.abs(north6))} بين ${run.baseYear} و${year}، ما يولّد ${north6 >= 0 ? "حاجة محاكاة إلى" : "فائضاً محاكى قدره"} ${fmtInt(Math.abs(northClass))} غرفة صفية (≈ ${fmtInt(Math.abs(northClass) / (params.schoolCapacity / params.classroomCapacity))} مدرسة). وطنياً: ${y.delta.classroomsRequired >= 0 ? "زيادة" : "انخفاض"} بمقدار ${fmtInt(Math.abs(y.delta.classroomsRequired))} غرفة صفية.`,
      },
      assumptions: [
        { en: `North = Irbid, Mafraq, Jerash, Ajloun`, ar: `الشمال = إربد، المفرق، جرش، عجلون` },
        { en: `classrooms = population 6–17 × (1 + ${fmtPct(params.schoolAgeGrowth, 0)}) × ${fmtPct(SCHOOL_ENROLMENT, 0)} enrolment ÷ ${params.classroomCapacity} pupils/classroom`, ar: `الغرف = السكان 6–17 × (1 + ${fmtPct(params.schoolAgeGrowth, 0)}) × التحاق ${fmtPct(SCHOOL_ENROLMENT, 0)} ÷ ${params.classroomCapacity} طالباً/غرفة` },
        { en: `schools = classrooms ÷ (${params.schoolCapacity} ÷ ${params.classroomCapacity})`, ar: `المدارس = الغرف ÷ (${params.schoolCapacity} ÷ ${params.classroomCapacity})` },
        { en: `Fertility multiplier ×${params.fertilityMultiplier.toFixed(2)}; governorate shares from base shares × growth differentials`, ar: `مضاعف الخصوبة ×${params.fertilityMultiplier.toFixed(2)}؛ حصص المحافظات من حصص الأساس × فروق النمو` },
      ],
    },
    {
      id: "water", icon: Droplets, sector: { en: "Water", ar: "المياه" }, ministry: { en: "Ministry of Water & Irrigation", ar: "وزارة المياه والري" }, tone: dir(y.delta.waterMcm),
      metric: `${y.delta.waterMcm >= 0 ? "+" : "−"}${fmt1(Math.abs(y.delta.waterMcm))} MCM/${L("yr", "سنة")}`,
      text: { en: `Population and household growth ${word(y.delta.waterMcm, incr, decr).en} domestic water-demand requirements by approximately ${fmt1(Math.abs(y.delta.waterMcm))} million m³ per year by ${year} (${fmtSignedPct(y.waterMcm / b.waterMcm - 1)}).`, ar: `${word(y.delta.waterMcm, incr, decr).ar} متطلبات الطلب المنزلي على المياه نتيجة نمو السكان والأسر بنحو ${fmt1(Math.abs(y.delta.waterMcm))} مليون م³ سنوياً بحلول ${year} (${fmtSignedPct(y.waterMcm / b.waterMcm - 1)}).` },
      assumptions: [{ en: `water (MCM/yr) = population × ${params.waterLpcd} L/person/day × 365 ÷ 10⁹`, ar: `المياه (مليون م³/سنة) = السكان × ${params.waterLpcd} لتر/فرد/يوم × 365 ÷ 10⁹` }, { en: `Population ${fmtInt(pBase.population)} → ${fmtInt(pY.population)}`, ar: `السكان ${fmtInt(pBase.population)} ← ${fmtInt(pY.population)}` }],
    },
    {
      id: "housing", icon: Building2, sector: { en: "Housing", ar: "الإسكان" }, ministry: { en: "Ministry of Public Works & Housing / HUDC", ar: "وزارة الأشغال العامة والإسكان / المؤسسة العامة للإسكان" }, tone: "up",
      metric: `${fmtInt(y.housingUnitsNeeded)} ${L("units", "وحدة")}`,
      text: { en: `Projected household formation (${fmtSigned(y.delta.households)} households) implies demand for approximately ${fmtInt(y.housingUnitsNeeded)} additional housing units by ${year} — about ${fmtInt(y.housingUnitsNeeded / Math.max(1, years))} per year.`, ar: `يشير تكوين الأسر المسقط (${fmtSigned(y.delta.households)} أسرة) إلى طلب على نحو ${fmtInt(y.housingUnitsNeeded)} وحدة سكنية إضافية بحلول ${year} — أي نحو ${fmtInt(y.housingUnitsNeeded / Math.max(1, years))} وحدة سنوياً.` },
      assumptions: [{ en: `units = max(0, Δhouseholds) × ${params.housingFormationRatio.toFixed(2)} formation ratio (vacancy & replacement)`, ar: `الوحدات = max(0، Δالأسر) × معامل تكوين ${params.housingFormationRatio.toFixed(2)} (الشواغر والإحلال)` }, { en: `households = population ÷ average size (→ ${params.householdSize.toFixed(2)} by 2050)`, ar: `الأسر = السكان ÷ متوسط الحجم (← ${params.householdSize.toFixed(2)} في 2050)` }],
    },
    {
      id: "health", icon: HeartPulse, sector: { en: "Health", ar: "الصحة" }, ministry: { en: "Ministry of Health", ar: "وزارة الصحة" }, tone: dir(elderlyPct),
      metric: `65+ ${fmtSignedPct(elderlyPct, 0)}`,
      text: { en: `Population aged 65+ ${word(elderlyPct, incr, decr).en} by ${fmtPct(Math.abs(elderlyPct), 0)} (from ${fmtInt(pBase.age65plus)} to ${fmtInt(pY.age65plus)}), indicating higher demand for primary-care and elderly-care capacity: ${fmtSigned(y.delta.healthcareVisits)} visits per year and ${fmtSigned(y.delta.elderlyCareDemand)} persons needing care.`, ar: `${word(elderlyPct, incr, decr).ar} عدد السكان بعمر 65+ بنسبة ${fmtPct(Math.abs(elderlyPct), 0)} (من ${fmtInt(pBase.age65plus)} إلى ${fmtInt(pY.age65plus)})، ما يشير إلى طلب أعلى على الرعاية الأولية ورعاية كبار السن: ${fmtSigned(y.delta.healthcareVisits)} زيارة سنوياً و${fmtSigned(y.delta.elderlyCareDemand)} فرداً بحاجة إلى رعاية.` },
      assumptions: [{ en: `visits = population × ${params.healthUtilization.toFixed(1)} + population 65+ × ${params.healthUtilization.toFixed(1)} × 1.5`, ar: `الزيارات = السكان × ${params.healthUtilization.toFixed(1)} + السكان 65+ × ${params.healthUtilization.toFixed(1)} × 1.5` }, { en: `care demand = 65+ × (1 + ${fmtPct(params.elderlyGrowth, 0)}) × ${fmtPct(CARE_NEED_SHARE, 0)} care-need share`, ar: `طلب الرعاية = 65+ × (1 + ${fmtPct(params.elderlyGrowth, 0)}) × نسبة حاجة ${fmtPct(CARE_NEED_SHARE, 0)}` }, { en: `Life expectancy +${params.lifeExpectancyGain.toFixed(1)} years by 2050`, ar: `العمر المتوقع +${params.lifeExpectancyGain.toFixed(1)} سنة حتى 2050` }],
    },
    {
      id: "jobs", icon: Briefcase, sector: { en: "Employment", ar: "التشغيل" }, ministry: { en: "Ministry of Labour / Ministry of Planning", ar: "وزارة العمل / وزارة التخطيط" }, tone: dir(y.delta.jobsRequired),
      metric: `${fmtSigned(y.delta.jobsRequired)} ${L("jobs", "وظيفة")}`,
      text: { en: `Growth in working-age population (${fmtSigned(pY.age15_64 - pBase.age15_64)}) implies approximately ${fmtInt(Math.abs(y.delta.jobsRequired))} additional jobs would be required by ${year} to maintain the selected employment assumption — about ${fmtInt(Math.abs(y.delta.jobsRequired) / Math.max(1, years))} per year.`, ar: `يعني نمو السكان في سن العمل (${fmtSigned(pY.age15_64 - pBase.age15_64)}) الحاجة إلى نحو ${fmtInt(Math.abs(y.delta.jobsRequired))} وظيفة إضافية بحلول ${year} للحفاظ على افتراض التشغيل المختار — أي نحو ${fmtInt(Math.abs(y.delta.jobsRequired) / Math.max(1, years))} وظيفة سنوياً.` },
      assumptions: [{ en: `jobs = population 15–64 × employment ratio (base ${fmtPct(run.baseEmploymentRatio)} ${params.employmentGrowth >= 0 ? "+" : ""}${(params.employmentGrowth * 100).toFixed(0)} pp by 2050)`, ar: `الوظائف = السكان 15–64 × نسبة التشغيل (الأساس ${fmtPct(run.baseEmploymentRatio)} ${params.employmentGrowth >= 0 ? "+" : ""}${(params.employmentGrowth * 100).toFixed(0)} نقطة حتى 2050)` }, { en: "Base employment ratio from simulated census microdata — not an official labour statistic", ar: "نسبة التشغيل الأساسية من بيانات التعداد المحاكاة — ليست إحصاءً رسمياً للعمل" }],
    },
    {
      id: "power", icon: Zap, sector: { en: "Energy", ar: "الطاقة" }, ministry: { en: "Ministry of Energy & Mineral Resources", ar: "وزارة الطاقة والثروة المعدنية" }, tone: dir(y.delta.electricityGwh),
      metric: `${fmtSigned(y.delta.electricityGwh)} GWh`,
      text: { en: `Residential electricity demand ${word(y.delta.electricityGwh, incr, decr).en} by about ${fmtInt(Math.abs(y.delta.electricityGwh))} GWh per year by ${year} (${fmtSignedPct(y.electricityGwh / b.electricityGwh - 1)}).`, ar: `${word(y.delta.electricityGwh, incr, decr).ar} الطلب السكني على الكهرباء بنحو ${fmtInt(Math.abs(y.delta.electricityGwh))} غيغاواط ساعة سنوياً بحلول ${year} (${fmtSignedPct(y.electricityGwh / b.electricityGwh - 1)}).` },
      assumptions: [{ en: `electricity (GWh) = population × ${fmtInt(params.electricityKwh)} kWh/person/year ÷ 10⁶`, ar: `الكهرباء = السكان × ${fmtInt(params.electricityKwh)} كيلوواط ساعة/فرد/سنة ÷ 10⁶` }],
    },
    {
      id: "infra", icon: Network, sector: { en: "Infrastructure", ar: "البنية التحتية" }, ministry: { en: "Ministry of Planning & International Cooperation", ar: "وزارة التخطيط والتعاون الدولي" }, tone: "up",
      metric: `${tx(ranked[0].g.name)} · ${ranked[0].p}`,
      text: { en: `Highest simulated infrastructure pressure by ${year}: ${ranked.slice(0, 3).map((r) => `${r.g.name.en} (${r.p})`).join(", ")}. Lowest: ${ranked.slice(-2).map((r) => `${r.g.name.en} (${r.p})`).join(", ")}.`, ar: `أعلى ضغط محاكى على البنية التحتية بحلول ${year}: ${ranked.slice(0, 3).map((r) => `${r.g.name.ar} (${r.p})`).join("، ")}. الأدنى: ${ranked.slice(-2).map((r) => `${r.g.name.ar} (${r.p})`).join("، ")}.` },
      assumptions: [{ en: "pressure = 45×pop growth + 30×school-age growth + 15×elderly growth + 10×(1 − accessibility), rescaled to max 100", ar: "الضغط = 45×نمو السكان + 30×نمو سن المدرسة + 15×نمو كبار السن + 10×(1 − سهولة الوصول)، معاد تحجيمه بحد أقصى 100" }, { en: `Migration shock ${fmtInt(params.migrationShock)} with ${fmtPct(params.shockNorthShare, 0)} settling in the north`, ar: `صدمة هجرة ${fmtInt(params.migrationShock)} يستقر ${fmtPct(params.shockNorthShare, 0)} منها في الشمال` }],
    },
  ];

  const regions: Region[] = ["North", "Central", "South"];
  return (
    <div>
      <PageHeader index={navIndex("/decision")} title={t("nav20")} subtitle={L("Ministerial view: demographic change translated into planning implications. Every statement shows the assumptions and formula behind its number.", "العرض الوزاري: التغير الديموغرافي مترجماً إلى آثار تخطيطية. يعرض كل بيان الافتراضات والمعادلة وراء رقمه.")}>
        <Link href="/scenarios"><Button>{L("Adjust scenario", "تعديل السيناريو")}</Button></Link>
        <Link href="/reports"><Button variant="primary">{L("Executive report", "التقرير التنفيذي")}</Button></Link>
      </PageHeader>
      <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-navy-700 bg-navy-900 px-4 py-3 text-white">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-sand-300">{L("Active scenario", "السيناريو النشط")}</div>
          <div className="text-[16px] font-semibold">{scenarioName}</div>
        </div>
        <div className="text-[12px] text-navy-100">{L("Base", "الأساس")} {run.baseYear} → {year} · {L("population", "السكان")} {fmtInt(pBase.population)} → <b className="text-white">{fmtInt(pY.population)}</b> ({fmtSignedPct(pY.population / pBase.population - 1)}) · {L("vs baseline", "مقابل خط الأساس")} {fmtSigned(y.population - bl.population)}</div>
        <div className="flex-1" />
        <Segmented dark value={year} onChange={setYear} options={PROJECTION_YEARS.map((v) => ({ value: v, label: String(v) }))} />
        <NatureBadge nature="SIMULATED" className="!bg-white/10 !text-sand-200 !border-white/20" />
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="space-y-2.5">
          {statements.map((s) => {
            const Icon = s.icon;
            const isOpen = open === s.id;
            return (
              <article key={s.id} className="rounded-lg border border-line bg-card">
                <div className="flex gap-3 px-4 py-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-navy-100 text-navy-700"><Icon size={18} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-sand-700">{tx(s.sector)}</span>
                      <span className="text-[11px] text-ink-400">· {tx(s.ministry)}</span>
                      <span className={cn("ms-auto rounded px-2 py-0.5 text-[12px] font-semibold tabular", s.tone === "up" ? "bg-navy-100 text-navy-800" : s.tone === "down" ? "bg-sand-100 text-sand-700" : "bg-sand-100 text-ink-700")}>{s.metric}</span>
                    </div>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-900">{tx(s.text)}</p>
                    <button type="button" onClick={() => setOpen(isOpen ? null : s.id)} className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-medium text-navy-600 hover:underline"><ChevronDown size={13} className={cn("transition-transform", isOpen && "rotate-180")} />{t("assumptions")}</button>
                    {isOpen ? (
                      <ul className="mt-2 space-y-1 rounded-md bg-sand-50 px-3 py-2">
                        {s.assumptions.map((a, i) => <li key={i} className="font-mono text-[11.5px] leading-relaxed text-ink-700">• {tx(a)}</li>)}
                        <li className="flex items-center gap-1 pt-1 text-[11px] text-ink-500"><ProvenanceButton ids={["SIM_PROJECTION", "SIM_INFRA", "SIM_MICRODATA"]} />{L("Simulated planning estimate — validate with sector ministries before use.", "تقدير تخطيطي محاكى — يجب التحقق منه مع الوزارات القطاعية قبل الاستخدام.")}</li>
                      </ul>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        <div className="min-w-0 space-y-3">
          <JordanMap height={430} title={`${L("Infrastructure pressure", "الضغط على البنية التحتية")} ${year}`} govValues={Object.fromEntries(world.governorates.map((g) => [g.id, y.byGov[g.id].pressure])) as Record<GovId, number>} scale="risk" domain={[0, 100]} format={(v) => fmtInt(v)} legendTitle={t("layerPressure")} sources={["SIM_PROJECTION", "SIM_INFRA"]} tooltipExtra={(kind, id) => kind === "gov" ? <span className="tabular">{t("population")} {year}: <b>{fmtInt(y.byGov[id].population)}</b><br />6–17: <b>{fmtInt(y.byGov[id].age6_17)}</b> · 65+: <b>{fmtInt(y.byGov[id].age65plus)}</b></span> : null} />
          <Panel title={L("Regional outlook", "التوقعات الإقليمية")} nature="SIMULATED" sources={["SIM_PROJECTION"]}>
            <table className="w-full text-[12.5px]">
              <thead><tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-500"><th className="py-1.5 text-start">{L("Region", "الإقليم")}</th><th className="text-end">{t("population")}</th><th className="text-end">6–17</th><th className="text-end">65+</th><th className="text-end">{t("households")}</th></tr></thead>
              <tbody>
                {regions.map((r) => {
                  const ids = region(r);
                  const ch = (k: "population" | "age6_17" | "age65plus" | "households") => sumGov(y, ids, k) / sumGov(b, ids, k) - 1;
                  return <tr key={r} className="border-b border-line/60"><td className="py-1.5 font-medium">{L(r, r === "North" ? "الشمال" : r === "Central" ? "الوسط" : "الجنوب")}</td><td className="text-end tabular">{fmtSignedPct(ch("population"))}</td><td className="text-end tabular">{fmtSignedPct(ch("age6_17"))}</td><td className="text-end tabular">{fmtSignedPct(ch("age65plus"))}</td><td className="text-end tabular">{fmtSignedPct(ch("households"))}</td></tr>;
                })}
              </tbody>
            </table>
            <p className="mt-2 text-[11.5px] text-ink-500">{L(`Change ${run.baseYear} → ${year}.`, `التغير ${run.baseYear} ← ${year}.`)}</p>
          </Panel>
          <Panel title={L("Priority governorates", "المحافظات ذات الأولوية")} nature="SIMULATED">
            <ol className="space-y-1.5">
              {ranked.slice(0, 5).map((r, i) => (
                <li key={r.g.id} className="flex items-center gap-2 text-[12.5px]"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-800 text-[11px] font-semibold text-white">{i + 1}</span><span className="font-medium">{tx(r.g.name)}</span><div className="mx-2 h-1.5 flex-1 rounded-full bg-sand-100"><div className="h-1.5 rounded-full bg-serious" style={{ width: `${r.p}%` }} /></div><span className="w-8 text-end tabular">{r.p}</span></li>
              ))}
            </ol>
          </Panel>
          <Callout tone="sim">{L(`Statements are generated deterministically from the projection and norms — no language model is used. Scenario: ${scenarioName}; ${ar ? "" : ""}figures are simulated.`, `تُولَّد البيانات بشكل حتمي من الإسقاط والمعايير — دون استخدام نموذج لغوي. السيناريو: ${scenarioName}؛ الأرقام محاكاة.`)}</Callout>
        </div>
      </div>
    </div>
  );
}
