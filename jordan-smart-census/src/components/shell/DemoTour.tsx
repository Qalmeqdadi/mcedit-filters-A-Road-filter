"use client";

import { ChevronLeft, ChevronRight, PresentationIcon, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useApp } from "@/store/app";
import { getEngine } from "@/store/engine";
import { useI18n } from "@/hooks/useI18n";
import { Button } from "@/components/ui/button";
import { paramsForPreset } from "@/simulation/scenarios";
import { SHIFTS_PER_DAY } from "@/simulation/engine";
import type { L } from "@/types/census";

interface Step {
  route: string;
  title: L;
  body: L;
  run?: () => void;
}

/** Fast-forward the engine to (at least) a given field day. */
function ensureDay(day: number) {
  const e = getEngine();
  if (!e) return;
  if (e.phase === "READY") e.start();
  while (e.day < day && e.phase !== "FINISHED") e.advance(Math.min(SHIFTS_PER_DAY, day * SHIFTS_PER_DAY - e.step));
}

function finishCensus() {
  const e = getEngine();
  if (!e) return;
  if (e.phase === "READY") e.start();
  while (e.phase !== "FINISHED") e.advance(SHIFTS_PER_DAY);
}

export function DemoTour() {
  const active = useApp((s) => s.demoActive);
  const step = useApp((s) => s.demoStep);
  const setDemo = useApp((s) => s.setDemo);
  const { tx, L, ar } = useI18n();
  const router = useRouter();
  const path = usePathname();
  const ranFor = useRef<number | null>(null);

  const S = useApp.getState;
  const steps: Step[] = [
    { route: "/", title: { en: "UFUQ — Jordan's national foresight platform", ar: "أفق — المنصة الوطنية للاستشراف في الأردن" }, body: { en: "Five pillars: a census-grade data foundation, Jordan today, futures to 2050, plans and decisions per governorate, and delivery tracking. Every number carries its source and data-nature badge.", ar: "خمس ركائز: قاعدة بيانات بمستوى التعداد، والأردن اليوم، والمستقبلات حتى 2050، والخطط والقرارات لكل محافظة، ومتابعة التنفيذ. يحمل كل رقم مصدره وشارة طبيعة بياناته." }, run: () => S().selectGov(null) },
    { route: "/census", title: { en: "Data foundation — census command", ar: "قاعدة البيانات — قيادة التعداد" }, body: { en: "The census is the foundation: 12 governorates on reference boundaries, the enumeration frame and live operational KPIs.", ar: "التعداد هو الأساس: 12 محافظة على حدود مرجعية، وإطار العدّ، ومؤشرات تشغيلية مباشرة." } },
    { route: "/planning", title: { en: "Census planning", ar: "تخطيط التعداد" }, body: { en: "Operational sizing: enumerators, supervisors, reserves, devices, training cohorts and completion date — compared across Lean, Base and Accelerated plans.", ar: "تحديد الحجم التشغيلي: العدّادون والمشرفون والاحتياط والأجهزة ودفعات التدريب وتاريخ الإنجاز — بمقارنة الخطط المقتصدة والأساسية والمتسارعة." } },
    { route: "/gis", title: { en: "Administrative geography", ar: "التقسيمات الإدارية" }, body: { en: "Governorate and district boundaries from geoBoundaries, reconciled and label-verified against district seats. The boundary QA report is shown alongside.", ar: "حدود المحافظات والألوية من geoBoundaries بعد المواءمة والتحقق من الأسماء مقابل مراكز الألوية. يُعرض تقرير جودة الحدود بجانبها." }, run: () => S().selectGov(null) },
    { route: "/gis", title: { en: "Enumeration Areas", ar: "مناطق العدّ" }, body: { en: "Synthetic EAs placed strictly inside official polygons, each sized to one enumerator workload. Drilling into Irbid shows its districts and EAs.", ar: "مناطق عدّ اصطناعية موضوعة داخل المضلعات الرسمية حصراً، ولكل منها حجم عمل عدّاد واحد. يعرض التعمق في إربد ألويتها ومناطق العدّ فيها." }, run: () => S().selectGov("IRB") },
    { route: "/field", title: { en: "Launch census simulation", ar: "إطلاق محاكاة التعداد" }, body: { en: "Fieldwork starts: thousands of synthetic enumerators work in 4 shifts a day. The seeded engine reproduces the same demonstration every time.", ar: "يبدأ العمل الميداني: آلاف العدّادين الاصطناعيين يعملون في 4 فترات يومياً. يعيد المحرك ذو البذرة إنتاج العرض نفسه في كل مرة." }, run: () => { S().selectGov(null); const e = getEngine(); if (e && e.phase !== "FINISHED") { e.start(); S().setSpeed(10); S().setRunning(true); } } },
    { route: "/coverage", title: { en: "Fieldwork progress", ar: "تقدم العمل الميداني" }, body: { en: "Completion against plan by governorate and district, EA status on the map, revisits and the districts falling behind schedule.", ar: "الإنجاز مقابل الخطة حسب المحافظة واللواء، وحالة مناطق العدّ على الخريطة، وزيارات المتابعة، والألوية المتأخرة عن الجدول." }, run: () => { S().setRunning(false); ensureDay(9); S().bump(); } },
    { route: "/early-warning", title: { en: "Predictive field control", ar: "التحكم الميداني التنبؤي" }, body: { en: "From day 2 a transparent pace model predicts which workloads will miss the deadline, explains why, and proposes reserve or helper support — approved by a supervisor, never applied automatically.", ar: "من اليوم الثاني يتنبأ نموذج وتيرة شفاف بالأعباء التي ستتجاوز الموعد ويشرح الأسباب ويقترح دعماً احتياطياً أو مسانداً — يعتمده المشرف ولا يُطبَّق تلقائياً." }, run: () => { ensureDay(9); S().bump(); } },
    { route: "/anomalies", title: { en: "Enumerator anomaly", ar: "شذوذ لدى عدّاد" }, body: { en: "Explainable detection: enumerator AMM-E0037 is a productivity outlier with implausibly short interviews. Evidence, method and recommended action are shown — no data are changed automatically.", ar: "كشف قابل للتفسير: العدّاد AMM-E0037 ذو إنتاجية شاذة ومقابلات قصيرة بشكل غير معقول. تُعرض الأدلة والأسلوب والإجراء الموصى به — دون أي تعديل تلقائي للبيانات." }, run: () => { ensureDay(9); const e = getEngine(); const a = e?.anomalies.find((x) => x.subjectId === "AMM-E0037" && x.kind === "PRODUCTIVITY_OUTLIER") ?? e?.anomalies.find((x) => x.subjectId === "AMM-E0037"); S().setFocusAnomaly(a?.id ?? null); S().bump(); } },
    { route: "/enumerators", title: { en: "Supervisor intervention", ar: "تدخل المشرف" }, body: { en: "The human decision is recorded: verification revisits are scheduled for 10% of AMM-E0037's households and the enumerator is placed under review. The audit trail names the decision-maker.", ar: "يُسجل القرار البشري: جدولة زيارات تحقق لـ10% من أسر العدّاد AMM-E0037 ووضعه قيد المراجعة. يحدد سجل التدقيق صاحب القرار." }, run: () => { const e = getEngine(); const a = e?.anomalies.find((x) => x.subjectId === "AMM-E0037" && x.status === "OPEN"); if (e && a) e.anomalyDecision(a.id, "CONFIRMED_REVISIT", S().actor, "Executive demo: verification of 10% sample"); S().setFocusEnumerator("AMM-E0037"); S().bump(); } },
    { route: "/coverage", title: { en: "Coverage completion", ar: "اكتمال التغطية" }, body: { en: "Fieldwork closes after mop-up with reserve enumerators. Remaining non-contacts are finalised as non-response.", ar: "يُغلق العمل الميداني بعد عمليات الاستكمال بالعدّادين الاحتياطيين. تُعتبر حالات عدم الاتصال المتبقية عدم استجابة نهائية." }, run: () => { S().setFocusEnumerator(null); S().setRunning(false); finishCensus(); S().bump(); } },
    { route: "/pes", title: { en: "Post-Enumeration Survey", ar: "مسح ما بعد العدّ" }, body: { en: "A stratified sample of completed EAs is independently re-enumerated. Matching yields omissions, erroneous inclusions and the dual-system coverage estimate — clearly labelled as simulated.", ar: "تُعاد عدّ عينة طبقية من مناطق العدّ المكتملة بشكل مستقل. ينتج الربط المحذوفين والإدراجات الخاطئة وتقدير التغطية بالنظام المزدوج — مع وسم واضح بأنها محاكاة." }, run: () => { const e = getEngine(); if (e) { if (!e.pesSample) e.drawPES(120); if (!e.pesResult) e.runPES(); } S().bump(); } },
    { route: "/population", title: { en: "Final census results", ar: "النتائج النهائية للتعداد" }, body: { en: "Population, households, age-sex structure, dependency and nationality categories with drill-down from Jordan to governorate, district and EA.", ar: "السكان والأسر والبنية العمرية والنوعية والإعالة وفئات الجنسية مع التعمق من الأردن إلى المحافظة واللواء ومنطقة العدّ." } },
    { route: "/projections", title: { en: "2040 projection", ar: "إسقاط 2040" }, body: { en: "A cohort-component projection from the simulated census base: population, households and age structure in 2040 under adjustable assumptions.", ar: "إسقاط بطريقة المكونات العمرية من قاعدة التعداد المحاكى: السكان والأسر والبنية العمرية في 2040 وفق افتراضات قابلة للتعديل." }, run: () => S().setProjectionYear(2040) },
    { route: "/scenarios", title: { en: "National planning simulation", ar: "محاكاة التخطيط الوطني" }, body: { en: "A migration-shock scenario translates demography into classrooms, housing, water, electricity, jobs and health demand. Decision Intelligence then states the implications and their assumptions.", ar: "يحوّل سيناريو صدمة الهجرة الديموغرافيا إلى صفوف ومساكن ومياه وكهرباء ووظائف وطلب صحي. ثم يعرض ذكاء القرار الآثار وافتراضاتها." }, run: () => S().setActiveScenario({ preset: "MIGRATION_SHOCK", params: paramsForPreset("MIGRATION_SHOCK"), name: "Migration shock" }) },
    { route: "/action-plans", title: { en: "Area action plans", ar: "خطط العمل للمناطق" }, body: { en: "Every Planning Lab finding becomes a corrective action for each governorate: what, how much, by when, indicative cost, lead ministry and KPI. Here: Mafraq's diagnosis against Jordan, its strategy by sector and an immediate / 1–3 year / 3–10 year plan.", ar: "تتحول كل نتيجة من مختبر التخطيط إلى إجراء تصحيحي لكل محافظة: ماذا وكم ومتى والكلفة التقديرية والوزارة القائدة ومؤشر الأداء. هنا: تشخيص المفرق مقارنة بالأردن واستراتيجيتها حسب القطاع وخطة فورية / 1–3 سنوات / 3–10 سنوات." }, run: () => { S().setLabScenario("SIMULATOR"); S().setProjectionYear(2040); S().selectGov("MAF"); } },
    { route: "/futures", title: { en: "Four futures for Jordan", ar: "أربعة مستقبلات للأردن" }, body: { en: "Strategic foresight: two key uncertainties — regional migration and water — give four coherent futures. Every model re-runs in each, from school seats to water stress and heat risk.", ar: "استشراف استراتيجي: يعطي مصدرا عدم اليقين الرئيسيان — الهجرة الإقليمية والمياه — أربعة مستقبلات متسقة. يُعاد تشغيل كل نموذج في كل منها، من المقاعد المدرسية إلى الإجهاد المائي وخطر الحر." }, run: () => { S().selectGov(null); S().setFutureAxes(["MIGRATION", "WATER"]); S().setProjectionYear(2040); } },
    { route: "/robustness", title: { en: "Which actions hold up?", ar: "أي الإجراءات تصمد؟" }, body: { en: "Actions needed in all four futures are no-regret: fund them now. Those needed in only one or two are prepared and triggered when their signpost appears.", ar: "الإجراءات اللازمة في المستقبلات الأربعة إجراءات بلا ندم: موّلها الآن. أما اللازمة في مستقبل أو اثنين فتُجهَّز وتُفعَّل عند ظهور مؤشر الإنذار." } },
    { route: "/equity", title: { en: "Who is left behind — equity and the SDGs", ar: "من يتخلف عن الركب — العدالة وأهداف التنمية" }, body: { en: "An Opportunity Index across income, work, education, health, housing, services and environment, district by district, and 16 SDG indicators localised against national targets — feeding area-based programmes into the action plans.", ar: "مؤشر للفرص عبر الدخل والعمل والتعليم والصحة والسكن والخدمات والبيئة لكل لواء، و16 مؤشراً لأهداف التنمية موطّنة مقابل المستهدفات الوطنية — تغذي برامج تنمية مناطقية في خطط العمل." }, run: () => { S().selectGov(null); } },
    { route: "/delivery", title: { en: "From plan to delivery", ar: "من الخطة إلى التنفيذ" }, body: { en: "Approved actions get an owner, milestones and a target; progress is recorded by people and rated on track, at risk or off track by transparent rules. Comments, an audit trail and saved versions support review by cabinet or council.", ar: "تُحدد للإجراءات المعتمدة جهة مسؤولة ومراحل ومستهدف؛ ويسجل الأشخاص التقدم ويُصنف على المسار أو معرضاً للخطر أو خارج المسار بقواعد شفافة. وتدعم التعليقات وسجل التدقيق والنسخ المحفوظة المراجعة في مجلس الوزراء أو المجلس المحلي." }, run: () => { S().selectGov(null); } },
    { route: "/siting", title: { en: "Planning Lab — where to build next", ar: "مختبر التخطيط — أين نبني تالياً" }, body: { en: "The same scenario now drives the Planning Lab. The siting planner compares projected demand with schools, health centres and hospitals; “Suggest optimal sites” places new facilities and explains each pick.", ar: "يقود السيناريو نفسه الآن مختبر التخطيط. يقارن مخطط المواقع الطلب المسقط بالمدارس والمراكز الصحية والمستشفيات؛ ويضع زر «اقترح المواقع المثلى» مرافق جديدة ويشرح كل اختيار." }, run: () => { S().selectGov(null); } },
    { route: "/urban-growth", title: { en: "Urban growth to 2050", ar: "النمو العمراني حتى 2050" }, body: { en: "Where Greater Amman grows under compact, trend and dispersed policies — and what each pattern costs in roads and networks. Green belts and growth boundaries can be switched on.", ar: "إلى أين تتوسع عمّان الكبرى في سياسات المدينة المتراصة والاتجاه الحالي والنمو المتشتت — وكلفة كل نمط في الطرق والشبكات. يمكن تفعيل الحزام الأخضر وحد النمو." } },
    { route: "/capital", title: { en: "Capital investment portfolio", ar: "محفظة الاستثمار الرأسمالي" }, body: { en: "Projects from every Planning Lab model compete for one budget, ranked by people reached per dinar, deprivation and urgency. Change the budget or the weights and the portfolio is rebuilt instantly.", ar: "تتنافس مشاريع جميع نماذج مختبر التخطيط على موازنة واحدة، مرتبة حسب المستفيدين لكل دينار والحرمان والإلحاح. غيّر الموازنة أو الأوزان فتُعاد المحفظة فوراً." } },
  ];

  useEffect(() => {
    if (!active) {
      ranFor.current = null;
      return;
    }
    const s = steps[step];
    if (!s) return;
    if (ranFor.current !== step) {
      ranFor.current = step;
      s.run?.();
    }
    if (path !== s.route) router.push(s.route);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, step]);

  if (!active) return null;
  const s = steps[step];
  const Prev = ar ? ChevronRight : ChevronLeft;
  const Next = ar ? ChevronLeft : ChevronRight;
  return (
    <div style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }} className="no-print fixed bottom-4 left-1/2 z-[65] w-[min(720px,calc(100vw-24px))] -translate-x-1/2 rounded-xl border border-navy-700 bg-navy-900 text-white shadow-2xl">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2">
        <PresentationIcon size={14} className="text-sand-300" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-sand-300">{L("Executive demo", "العرض التنفيذي")}</span>
        <span className="text-[11px] text-navy-300 tabular">{L("Step", "الخطوة")} {step + 1} / {steps.length}</span>
        <div className="ms-2 flex flex-1 gap-0.5">
          {steps.map((_, i) => <button key={i} type="button" onClick={() => setDemo(true, i)} aria-label={`${i + 1}`} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-sand-300" : "bg-white/15"}`} />)}
        </div>
        <button type="button" onClick={() => setDemo(false)} className="rounded p-1 text-navy-300 hover:bg-white/10 hover:text-white" aria-label={L("Exit demo", "إنهاء العرض")}><X size={15} /></button>
      </div>
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-end sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold">{tx(s.title)}</div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-navy-100">{tx(s.body)}</p>
        </div>
        <div className="flex shrink-0 justify-end gap-1.5">
          <Button variant="dark" size="sm" disabled={step === 0} onClick={() => setDemo(true, step - 1)}><Prev size={14} />{L("Previous", "السابق")}</Button>
          {step < steps.length - 1 ? (
            <Button variant="accent" size="sm" onClick={() => setDemo(true, step + 1)}>{L("Next", "التالي")}<Next size={14} /></Button>
          ) : (
            <Button variant="accent" size="sm" onClick={() => { setDemo(false); router.push("/decision"); }}>{L("Finish → Decision Intelligence", "إنهاء ← ذكاء القرار")}</Button>
          )}
        </div>
      </div>
    </div>
  );
}
