"use client";

import { Download, FileText, Printer } from "lucide-react";
import { useMemo } from "react";
import { useApp } from "@/store/app";
import { useEngine } from "@/store/engine";
import { useI18n } from "@/hooks/useI18n";
import { useSources } from "@/hooks/useSources";
import { PageHeader, Callout } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { NatureBadge } from "@/components/ui/badges";
import { BrandMark } from "@/components/shell/Sidebar";
import { PyramidChart } from "@/components/charts/common";
import { EChart } from "@/components/charts/echart";
import { barH, VIZ } from "@/components/charts/builders";
import { downloadCsv } from "@/lib/csv";
import { isHosted } from "@/lib/hosted";
import { anomalies, enumeratorPerformance, governorateSummary, pesResults, qualityIssues, scenarioResults } from "@/lib/exports";
import { computeProfile } from "@/simulation/analytics";
import { DEFAULT_PARAMS, PROJECTION_YEARS, runScenario } from "@/simulation/scenarios";
import { isOpen } from "@/simulation/engine";
import { fmtCompact, fmtDate, fmtInt, fmtPct, fmtSigned, fmtSignedPct } from "@/lib/format";
import type { DataNature } from "@/types/census";

export function Reports() {
  const engine = useEngine();
  const { t, tx, L, ar, locale } = useI18n();
  const active = useApp((s) => s.activeScenario);
  const year = useApp((s) => s.projectionYear);
  const sources = Object.values(useSources());
  const world = engine.world;
  const agg = engine.aggregate();
  const prof = computeProfile(world);
  const params = active?.params ?? DEFAULT_PARAMS;
  const name = active?.name ?? "Baseline";
  const run = useMemo(() => runScenario(world, world.totals.population, params), [world, params]);
  const y = run.impacts[PROJECTION_YEARS.includes(year) ? year : 2040];
  const byGov = engine.aggregateBy("govId");
  const govChart = useMemo(() => barH(world.governorates.map((g) => tx(g.name)), [{ name: t("kCompletion"), data: world.governorates.map((g) => byGov[g.id].completionPct), color: VIZ[0] }], { rtl: ar, showLabels: true, fmt: (v) => fmtPct(v, 0) }), [world, byGov, tx, ar, t]);

  const exportsList: { key: string; label: string; nature: DataNature; rows: () => Record<string, unknown>[]; file: string; disabled?: boolean }[] = [
    { key: "gov", label: L("Governorate summary", "ملخص المحافظات"), nature: "SIMULATED", rows: () => governorateSummary(engine), file: "governorate-summary.csv" },
    { key: "enum", label: L("Enumerator performance", "أداء العدّادين"), nature: "SYNTHETIC_OPERATIONAL", rows: () => enumeratorPerformance(engine), file: "enumerator-performance.csv" },
    { key: "qi", label: L("Quality issues", "مسائل الجودة"), nature: "SYNTHETIC_OPERATIONAL", rows: () => qualityIssues(engine), file: "quality-issues.csv", disabled: !engine.issues.length },
    { key: "an", label: L("Anomalies", "حالات الشذوذ"), nature: "SYNTHETIC_OPERATIONAL", rows: () => anomalies(engine), file: "anomalies.csv", disabled: !engine.anomalies.length },
    { key: "sc", label: `${L("Scenario results", "نتائج السيناريو")} — ${name}`, nature: "SIMULATED", rows: () => scenarioResults(engine, params, name), file: "scenario-results.csv" },
    { key: "pes", label: L("PES results", "نتائج مسح ما بعد العدّ"), nature: "SIMULATED", rows: () => pesResults(engine), file: "pes-results.csv", disabled: !engine.pesResult },
  ];

  const pes = engine.pesResult?.national;
  const sectionTitle = "mb-2 text-[13.5px] font-semibold uppercase tracking-wider text-navy-800";
  return (
    <div>
      <div className="no-print">
        <PageHeader index="21" title={t("nav21")} subtitle={L("Download datasets as CSV (UTF-8 with BOM: Excel-compatible and Arabic-safe) or print the executive report below. Every file carries a data-nature column.", "نزّل مجموعات البيانات بصيغة CSV (UTF-8 متوافقة مع Excel وتدعم العربية) أو اطبع التقرير التنفيذي أدناه. يحمل كل ملف عموداً لطبيعة البيانات.")}>
          {isHosted() ? null : <Button variant="primary" onClick={() => window.print()}><Printer size={14} />{L("Print / save as PDF", "طباعة / حفظ PDF")}</Button>}
        </PageHeader>
        <div className="mb-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {exportsList.map((x) => (
            <div key={x.key} className="flex items-center gap-3 rounded-lg border border-line bg-card px-3.5 py-3">
              <FileText size={18} className="shrink-0 text-navy-600" />
              <div className="min-w-0 flex-1"><div className="truncate text-[13px] font-semibold text-ink-900">{x.label}</div><div className="mt-0.5 flex items-center gap-2"><NatureBadge nature={x.nature} compact /><span className="font-mono text-[10.5px] text-ink-400">{x.file}</span></div></div>
              <Button size="sm" disabled={x.disabled} onClick={() => downloadCsv(x.file, x.rows())}><Download size={13} />CSV</Button>
            </div>
          ))}
        </div>
        {exportsList.some((x) => x.disabled) ? <Callout className="mb-4">{L("Some exports become available once the census simulation has produced issues/anomalies or the PES has been run.", "تتاح بعض الملفات بعد أن تنتج محاكاة التعداد مسائل وحالات شذوذ أو بعد تشغيل مسح ما بعد العدّ.")}</Callout> : null}
      </div>

      <article className="print-page mx-auto max-w-[980px] rounded-lg border border-line bg-white px-4 py-5 shadow-sm sm:px-8 sm:py-7">
        <header className="flex items-start justify-between gap-4 border-b-2 border-navy-800 pb-4">
          <div className="flex items-center gap-3">
            <BrandMark size={40} />
            <div>
              <div className="text-[19px] font-semibold text-ink-900">{t("appName")}</div>
              <div className="text-[12.5px] text-ink-500">{L("Executive census briefing", "الإحاطة التنفيذية للتعداد")} · {fmtDate(new Date(), locale)}</div>
            </div>
          </div>
          <div className="text-end text-[11px] leading-relaxed text-ink-500">
            <div className="font-semibold uppercase tracking-wider text-nat-simulated">{L("Prototype — simulated data", "نموذج أولي — بيانات محاكاة")}</div>
            <div>{L("Seed", "البذرة")} <span className="font-mono">{world.config.seed}</span></div>
            <div>{L("Simulation day", "يوم المحاكاة")} {engine.day} · {engine.phase}</div>
          </div>
        </header>

        <section className="mt-5">
          <h2 className={sectionTitle}>1 · {L("Census operations status", "حالة عمليات التعداد")}</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {([
              [L("Persons enumerated", "الأفراد المعدودون"), fmtCompact(agg.persons, locale), "SYNTHETIC_OPERATIONAL"],
              [t("kCompletion"), fmtPct(agg.completionPct), "SYNTHETIC_OPERATIONAL"],
              [t("kResponse"), fmtPct(agg.responseRate), "SYNTHETIC_OPERATIONAL"],
              [t("kValidation"), fmtPct(agg.validationRate), "SYNTHETIC_OPERATIONAL"],
              [L("Frame population", "سكان الإطار"), fmtCompact(agg.popEstimate, locale), "REFERENCE"],
              [t("kEAs"), fmtInt(agg.eas), "SIMULATED"],
              [L("Open quality issues", "مسائل الجودة المفتوحة"), fmtInt(engine.issues.filter((q) => isOpen(q.status)).length), "SYNTHETIC_OPERATIONAL"],
              [t("kAnomalies"), fmtInt(engine.anomalies.filter((a) => a.status === "OPEN").length), "SYNTHETIC_OPERATIONAL"],
            ] as [string, string, DataNature][]).map(([k, v, n]) => (
              <div key={k} className="rounded border border-line px-3 py-2"><div className="text-[11px] text-ink-500">{k}</div><div className="text-[18px] font-semibold tabular">{v}</div><NatureBadge nature={n} compact /></div>
            ))}
          </div>
        </section>

        <section className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <h2 className={sectionTitle}>2 · {L("Completion by governorate", "الإنجاز حسب المحافظة")}</h2>
            <EChart option={govChart} height={300} />
          </div>
          <div>
            <h2 className={sectionTitle}>3 · {L("Age-sex structure", "البنية العمرية والنوعية")}</h2>
            <PyramidChart m={prof.single.m} f={prof.single.f} height={300} share />
            <div className="text-[11px] text-ink-500">{L("Simulated microdata, weighted.", "بيانات جزئية محاكاة مرجحة.")}</div>
          </div>
        </section>

        <section className="mt-5">
          <h2 className={sectionTitle}>4 · {L("Governorate summary", "ملخص المحافظات")}</h2>
          <div className="thin-scroll overflow-x-auto"><table className="w-full min-w-[560px] text-[12px]">
            <thead><tr className="border-b border-line-strong text-[10.5px] uppercase text-ink-500"><th className="py-1 text-start">{t("governorate")}</th><th className="text-end">{L("Reference pop. 2024", "السكان المرجعيون 2024")}</th><th className="text-end">EAs</th><th className="text-end">{t("kCompletion")}</th><th className="text-end">{t("kResponse")}</th><th className="text-end">{L("Enumerated (sim.)", "المعدودون (محاكاة)")}</th></tr></thead>
            <tbody>{world.governorates.map((g) => <tr key={g.id} className="border-b border-line/60"><td className="py-1">{tx(g.name)}</td><td className="text-end tabular">{fmtInt(g.refPopulation)}</td><td className="text-end tabular">{fmtInt(byGov[g.id].eas)}</td><td className="text-end tabular">{fmtPct(byGov[g.id].completionPct, 0)}</td><td className="text-end tabular">{fmtPct(byGov[g.id].responseRate)}</td><td className="text-end tabular">{fmtInt(byGov[g.id].persons)}</td></tr>)}</tbody>
          </table></div>
        </section>

        <section className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <h2 className={sectionTitle}>5 · {L("Coverage (simulated PES)", "التغطية (مسح ما بعد العدّ المحاكى)")}</h2>
            {pes ? (
              <ul className="space-y-1 text-[12.5px]"><li>{L("Match rate", "معدل التطابق")}: <b>{fmtPct(pes.matchRate)}</b></li><li>{L("Net coverage error", "خطأ التغطية الصافي")}: <b>{fmtSignedPct(pes.netCoverageError, 2)}</b></li><li>{L("Gross coverage error", "خطأ التغطية الإجمالي")}: <b>{fmtPct(pes.grossCoverageError, 2)}</b></li><li>{L("Sample EAs", "مناطق العينة")}: <b>{pes.areas}</b></li></ul>
            ) : <p className="text-[12.5px] text-ink-500">{L("PES not yet run.", "لم يُشغّل المسح بعد.")}</p>}
          </div>
          <div>
            <h2 className={sectionTitle}>6 · {L("Planning outlook", "التوقعات التخطيطية")} — {name} ({y.year})</h2>
            <ul className="space-y-1 text-[12.5px]">
              <li>{t("population")}: <b>{fmtInt(y.population)}</b> ({fmtSigned(y.delta.population)})</li>
              <li>{L("Additional classrooms", "غرف صفية إضافية")}: <b>{fmtSigned(y.delta.classroomsRequired)}</b></li>
              <li>{L("Housing units needed", "الوحدات السكنية المطلوبة")}: <b>{fmtInt(y.housingUnitsNeeded)}</b></li>
              <li>{L("Additional jobs required", "وظائف إضافية مطلوبة")}: <b>{fmtSigned(y.delta.jobsRequired)}</b></li>
              <li>{L("Water demand change", "التغير في الطلب على المياه")}: <b>{y.delta.waterMcm >= 0 ? "+" : "−"}{Math.abs(y.delta.waterMcm).toFixed(1)} MCM/yr</b></li>
            </ul>
          </div>
        </section>

        <section className="mt-5">
          <h2 className={sectionTitle}>7 · {L("Data provenance", "مصادر البيانات")}</h2>
          <table className="w-full text-[11.5px]">
            <tbody>{sources.map((s) => <tr key={s.id} className="border-b border-line/60 align-top"><td className="py-1 pe-2"><NatureBadge nature={s.nature} compact /></td><td className="py-1 pe-2 font-medium">{tx(s.name)}</td><td className="py-1 text-ink-500 [overflow-wrap:anywhere]">{s.source}{s.license ? ` · ${s.license}` : ""}</td></tr>)}</tbody>
          </table>
          <p className="mt-3 text-[11px] leading-relaxed text-ink-500">{L("All operational, microdata, PES and projection figures in this report are simulated for demonstration. Reference data are labelled and must be verified against official Department of Statistics releases before use. No real personal data are included.", "جميع الأرقام التشغيلية والبيانات الجزئية ومسح ما بعد العدّ والإسقاطات في هذا التقرير محاكاة لأغراض العرض. البيانات المرجعية موسومة ويجب التحقق منها مقابل الإصدارات الرسمية لدائرة الإحصاءات العامة قبل الاستخدام. لا يتضمن التقرير بيانات شخصية حقيقية.")}</p>
        </section>
      </article>
    </div>
  );
}
