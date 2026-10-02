"use client";

import { useDelivery } from "@/delivery/store";
import Link from "next/link";
import { ArrowRight, ChevronRight, Loader2, MessageSquareText, PresentationIcon } from "lucide-react";
import { useApp } from "@/store/app";
import { useI18n } from "@/hooks/useI18n";
import { Panel, Callout } from "@/components/ui/panel";
import { Kpi } from "@/components/ui/kpi";
import { Button } from "@/components/ui/button";
import { NatureBadge } from "@/components/ui/badges";
import { NAV, type NavGroup } from "@/lib/nav";
import { BrandMark } from "@/components/shell/Sidebar";
import { sevRank } from "@/simulation/lab/actions";
import { fmtCompact, fmtInt, fmtPct, fmtSignedPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ActionCard } from "@/features/lab/ActionCard";
import { LabBar, useLab, usePlans } from "@/features/lab/shared";

const PILLARS: { group: Exclude<NavGroup, "navHome">; accent: string; what: { en: string; ar: string } }[] = [
  { group: "navFoundation", accent: "#4a7cc0", what: { en: "Census operations, quality, coverage and between-census estimates — where every number starts.", ar: "عمليات التعداد والجودة والتغطية والتقديرات بين التعدادين — حيث يبدأ كل رقم." } },
  { group: "navToday", accent: "#159a83", what: { en: "Population, housing, work, education, health, migration and services as they are today.", ar: "السكان والمساكن والعمل والتعليم والصحة والهجرة والخدمات كما هي اليوم." } },
  { group: "navFutures", accent: "#d07a1c", what: { en: "Projections with uncertainty, scenarios, urban growth, water, climate, jobs and ageing to 2050.", ar: "إسقاطات مع عدم اليقين وسيناريوهات ونمو عمراني ومياه ومناخ ووظائف وشيخوخة حتى 2050." } },
  { group: "navDecide", accent: "#b5453a", what: { en: "Corrective action plans per governorate, facility siting, capital budgeting and shock response.", ar: "خطط عمل تصحيحية لكل محافظة وتحديد مواقع المرافق والموازنة الرأسمالية والاستجابة للصدمات." } },
  { group: "navDeliver", accent: "#8a5cc0", what: { en: "Approved actions tracked to delivery, with owners, milestones, targets and reports.", ar: "متابعة الإجراءات المعتمدة حتى التنفيذ مع المسؤولين والمراحل والمستهدفات والتقارير." } },
];

export function Home() {
  const { engine, run, scenarioName } = useLab();
  const { t, tx, L, locale } = useI18n();
  const setDemo = useApp((s) => s.setDemo);
  const { plans, snap, loading, year } = usePlans();
  const base = run.series[0];
  const pt = run.series.find((x) => x.year === year)!;
  const all = plans ? Object.values(plans.plans).flatMap((p) => p.actions) : [];
  const urgent = all.filter((a) => sevRank(a.severity) >= 3).length;
  const agg = engine.aggregate();
  const portfolio = Object.keys(useDelivery().data.items).length;
  const metric = (g: (typeof PILLARS)[number]["group"]) => {
    switch (g) {
      case "navFoundation": return engine.phase === "READY" ? L("Census not started — run the simulation", "لم يبدأ التعداد — شغّل المحاكاة") : `${L("Fieldwork", "العمل الميداني")} ${fmtPct(agg.completionPct, 0)} ${L("complete", "منجز")}`;
      case "navToday": return `${fmtCompact(base.population, locale)} ${L("people", "نسمة")} · ${fmtCompact(base.households, locale)} ${L("households", "أسرة")}`;
      case "navFutures": return `${fmtCompact(pt.population, locale)} ${L("people in", "نسمة في")} ${year} (${fmtSignedPct(pt.population / base.population - 1, 0)})`;
      case "navDecide": return plans ? `${all.length} ${L("actions", "إجراء")} · ${urgent} ${L("high / critical", "مرتفع / حرج")}` : L("Preparing plans…", "جارٍ إعداد الخطط…");
      case "navDeliver": return portfolio ? `${portfolio} ${L("actions in the delivery portfolio", "إجراء في محفظة التنفيذ")}` : L("Delivery tracker, briefings & reports", "متابعة التنفيذ والإحاطات والتقارير");
    }
  };
  const homes = snap ? snap.housing.national.filter((x) => x.year <= 2035).reduce((a, x) => a + x.need, 0) : null;
  const jobsYr = snap ? snap.jobs.series.filter((x) => x.year > base.year && x.year <= year).reduce((a, x) => a + x.netNeedHold, 0) / Math.max(1, year - base.year) : null;

  return (
    <div>
      {/* hero */}
      <section className="relative overflow-hidden rounded-xl bg-navy-900 px-5 py-7 text-white sm:px-8 sm:py-9">
        <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full opacity-40" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden>
          <path d="M0 45 H400" stroke="#d6c49f" strokeWidth="0.8" />
          <path d="M150 45 a50 50 0 0 1 100 0" fill="#d6c49f" opacity="0.25" />
          {Array.from({ length: 9 }, (_, i) => <path key={i} d={`M${20 + i * 45} 45 L${200 + (i - 4) * 14} 60`} stroke="#4a7cc0" strokeWidth="0.5" />)}
        </svg>
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <BrandMark size={44} />
              <div>
                <div className="text-[30px] font-semibold leading-none tracking-[0.04em]">UFUQ <span className="ms-1 font-normal text-sand-300">أفق</span></div>
                <div className="mt-1 text-[12.5px] text-navy-100">{t("appSubtitle")}</div>
              </div>
            </div>
            <h1 className="mt-5 text-[22px] font-semibold leading-snug tracking-[-0.01em] text-balance sm:text-[26px]">{L("See Jordan's future early — and plan for it together.", "رؤية مستقبل الأردن مبكراً — والتخطيط له معاً.")}</h1>
            <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-navy-100">{L("From census data to 2050 decisions: one platform that measures Jordan today, forecasts where it is heading, turns the findings into corrective actions for every governorate, and follows them through to delivery.", "من بيانات التعداد إلى قرارات 2050: منصة واحدة تقيس الأردن اليوم وتتنبأ باتجاهه وتحوّل النتائج إلى إجراءات تصحيحية لكل محافظة وتتابعها حتى التنفيذ.")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="accent" size="md" onClick={() => setDemo(true, 0)}><PresentationIcon size={15} />{L("Executive demo", "العرض التنفيذي")}</Button>
            <Link href="/action-plans"><Button variant="dark" size="md">{L("Area action plans", "خطط العمل للمناطق")}<ChevronRight size={14} className="rtl:rotate-180" /></Button></Link>
            <Link href="/ask"><Button variant="dark" size="md"><MessageSquareText size={14} />{L("Ask the data", "اسأل البيانات")}</Button></Link>
          </div>
        </div>
      </section>

      <div className="mt-4"><LabBar /></div>

      {/* horizon strip */}
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 xl:grid-cols-8">
        <Kpi label={`${t("population")} ${year}`} value={fmtCompact(pt.population, locale)} sub={fmtSignedPct(pt.population / base.population - 1, 0)} nature="SIMULATED" sources={["SIM_PROJECTION"]} />
        <Kpi label={`${t("households")} ${year}`} value={fmtCompact(pt.households, locale)} sub={fmtSignedPct(pt.households / base.households - 1, 0)} nature="SIMULATED" />
        <Kpi label={L("School-age 6–17", "سن المدرسة 6–17")} value={fmtCompact(pt.age6_17, locale)} sub={fmtSignedPct(pt.age6_17 / base.age6_17 - 1, 0)} nature="SIMULATED" />
        <Kpi label={`65+ ${year}`} value={fmtCompact(pt.age65plus, locale)} sub={`${fmtPct(pt.age65plus / pt.population)} ${L("of people", "من السكان")}`} nature="SIMULATED" />
        <Kpi label={L("Homes needed to 2035", "مساكن لازمة حتى 2035")} value={homes === null ? "…" : fmtCompact(homes, locale)} nature="SIMULATED" sources={["SIM_HOUSING_NEED"]} />
        <Kpi label={L("Jobs needed / year", "وظائف لازمة سنوياً")} value={jobsYr === null ? "…" : fmtCompact(jobsYr, locale)} nature="SIMULATED" sources={["SIM_JOBS"]} />
        <Kpi label={L("Water stress begins", "بداية الإجهاد المائي")} value={snap ? String(snap.water.nationalStressYear ?? "—") : "…"} nature="SIMULATED" sources={["SIM_WATER"]} />
        <Kpi label={L("High / critical actions", "إجراءات مرتفعة / حرجة")} value={plans ? fmtInt(urgent) : "…"} sub={plans ? `${L("of", "من")} ${all.length}` : undefined} tone={urgent ? "crit" : undefined} nature="SIMULATED" sources={["SIM_ACTIONS"]} />
      </div>

      {/* pillars */}
      <h2 className="mb-2 mt-6 text-[13px] font-semibold uppercase tracking-[0.12em] text-navy-800">{L("Five pillars", "خمس ركائز")}</h2>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {PILLARS.map((p, i) => {
          const items = NAV.filter((n) => n.group === p.group);
          return (
            <section key={p.group} className="flex min-w-0 flex-col rounded-lg border border-line bg-card" data-testid="pillar">
              <div className="h-1 rounded-t-lg" style={{ background: p.accent }} />
              <div className="flex flex-1 flex-col px-4 py-3">
                <div className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-semibold text-white" style={{ background: p.accent }}>{i + 1}</span><h3 className="text-[14px] font-semibold text-ink-900">{t(p.group).replace(/^\d · /, "")}</h3></div>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-500">{tx(p.what)}</p>
                <div className="mt-2 rounded-md bg-sand-50 px-2.5 py-1.5 text-[12px] font-medium text-ink-900 tabular">{metric(p.group)}</div>
                <ul className="mt-2.5 space-y-0.5">
                  {items.slice(0, 6).map((n) => {
                    const Icon = n.icon;
                    return <li key={n.href}><Link href={n.href} className="flex items-center gap-2 rounded px-1 py-1 text-[12.5px] text-ink-700 hover:bg-sand-50 hover:text-ink-900"><Icon size={13} className="shrink-0 text-ink-400" /><span className="truncate">{t(n.key)}</span></Link></li>;
                  })}
                  {items.length > 6 ? <li className="px-1 pt-0.5 text-[11.5px] text-ink-400">+ {items.length - 6} {L("more in the menu", "في القائمة")}</li> : null}
                </ul>
              </div>
            </section>
          );
        })}
      </div>

      {/* priorities */}
      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel title={L("Top national priorities now", "أهم الأولويات الوطنية الآن")} subtitle={`${scenarioName} · ${L("horizon", "الأفق")} ${year}`} nature="SIMULATED" sources={["SIM_ACTIONS"]} actions={<Link href="/action-plans" className="inline-flex items-center gap-1 whitespace-nowrap text-[12px] font-medium text-navy-600 hover:underline">{L("All action plans", "جميع خطط العمل")}<ArrowRight size={12} className="rtl:rotate-180" /></Link>}>
          {loading || !plans ? <div className="flex items-center gap-2 py-8 text-[12.5px] text-ink-500"><Loader2 size={15} className="animate-spin" />{L("Running the Planning Lab models…", "تشغيل نماذج مختبر التخطيط…")}</div> : (
            <div className="grid gap-2.5 lg:grid-cols-2">{plans.top.slice(0, 6).map((a) => <ActionCard key={a.id} a={a} compact showGov />)}</div>
          )}
        </Panel>
        <Panel title={L("How UFUQ works", "كيف تعمل أفق")}>
          <ol className="space-y-2.5">
            {[
              [L("Measure", "القياس"), L("A census-grade data foundation: every number carries its source and nature.", "قاعدة بيانات بمستوى التعداد: كل رقم يحمل مصدره وطبيعته.")],
              [L("Understand", "الفهم"), L("Today's Jordan by governorate, district and enumeration area.", "أردن اليوم حسب المحافظة واللواء ومنطقة العدّ.")],
              [L("Anticipate", "الاستشراف"), L("Projections, ranges and scenarios to 2050 across every sector.", "إسقاطات ونطاقات وسيناريوهات حتى 2050 في كل القطاعات.")],
              [L("Decide", "القرار"), L("Sized corrective actions per area, priced and assigned to a lead.", "إجراءات تصحيحية محددة الحجم لكل منطقة، مسعّرة ومسندة إلى جهة قائدة.")],
              [L("Deliver", "التنفيذ"), L("Approved actions followed to completion against their targets.", "متابعة الإجراءات المعتمدة حتى الإنجاز مقابل مستهدفاتها.")],
            ].map(([a, b], i) => (
              <li key={i} className="flex gap-2.5"><span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white")} style={{ background: PILLARS[i].accent }}>{i + 1}</span><div><div className="text-[13px] font-semibold text-ink-900">{a}</div><div className="text-[12px] leading-relaxed text-ink-500">{b}</div></div></li>
            ))}
          </ol>
        </Panel>
      </div>
      <Callout tone="sim" className="mt-3"><span className="inline-flex items-center gap-2"><NatureBadge nature="SIMULATED" compact />{L("Prototype. Boundaries and headline reference totals come from cited sources; all operational, microdata and model outputs are simulated and labelled. UFUQ is not an official government product.", "نموذج أولي. الحدود والمجاميع المرجعية الرئيسية من مصادر موثقة؛ وجميع البيانات التشغيلية والجزئية ومخرجات النماذج محاكاة وموسومة. أفق ليست منتجاً حكومياً رسمياً.")}</span></Callout>
    </div>
  );
}
