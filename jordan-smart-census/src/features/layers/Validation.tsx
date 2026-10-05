"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader, Panel, Callout } from "@/components/ui/panel";
import { Kpi } from "@/components/ui/kpi";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/form";
import { EChart } from "@/components/charts/echart";
import { line, VIZ } from "@/components/charts/builders";
import { openData } from "@/data/openData";
import { downloadCsv } from "@/lib/csv";
import { navIndex } from "@/lib/nav";
import { fmtCompact, fmtInt, fmtPct, fmtSignedPct } from "@/lib/format";
import { Formula, Method, SimpleTable, useLab } from "@/features/lab/shared";

/**
 * Backtest: start from the observed population in an origin year, apply the platform's projection
 * assumptions (crude birth and death rates of the baseline projection, scenario net migration),
 * and compare year by year with the observed World Bank series. Benchmarked against a naive
 * "previous five-year growth continues" forecast.
 */
export function Validation() {
  const { run } = useLab();
  const { t, L, ar, locale } = useI18n();
  const obs = openData().population;
  const lastObs = obs[obs.length - 1].year;
  const [origin, setOrigin] = useState(2015);
  const res = useMemo(() => {
    const p1 = run.series[1];
    const cbr = p1.births / p1.population;
    const cdr = p1.deaths / p1.population;
    const mig = run.params.netMigration;
    const at = (y: number) => obs.find((x) => x.year === y)?.value ?? null;
    const P0 = at(origin)!;
    const p5 = at(origin - 5);
    const trend = p5 ? (P0 / p5) ** (1 / 5) - 1 : 0.02;
    const rows: { year: number; actual: number; model: number; naive: number; errModel: number; errNaive: number }[] = [];
    let m = P0;
    for (let y = origin + 1; y <= lastObs; y++) {
      m = m * (1 + cbr - cdr) + mig;
      const a = at(y);
      if (a === null) continue;
      const n = P0 * (1 + trend) ** (y - origin);
      rows.push({ year: y, actual: a, model: m, naive: n, errModel: m / a - 1, errNaive: n / a - 1 });
    }
    const mape = (k: "errModel" | "errNaive") => rows.reduce((s, r) => s + Math.abs(r[k]), 0) / Math.max(1, rows.length);
    const bias = rows.reduce((s, r) => s + r.errModel, 0) / Math.max(1, rows.length);
    return { cbr, cdr, mig, P0, trend, rows, mapeModel: mape("errModel"), mapeNaive: mape("errNaive"), bias, last: rows[rows.length - 1] };
  }, [run, obs, origin, lastObs]);
  const chart = useMemo(() => line([origin, ...res.rows.map((r) => r.year)], [
    { name: L("Observed (World Bank)", "المرصود (البنك الدولي)"), data: [res.P0, ...res.rows.map((r) => Math.round(r.actual))], color: VIZ[0] },
    { name: L("UFUQ projection method", "طريقة إسقاط أفق"), data: [res.P0, ...res.rows.map((r) => Math.round(r.model))], color: VIZ[1] },
    { name: L("Naive trend", "الاتجاه البسيط"), data: [res.P0, ...res.rows.map((r) => Math.round(r.naive))], color: "#8c8a83", dashed: true },
  ], { rtl: ar, legend: true, fmt: (v) => fmtCompact(v, locale) }), [origin, res, ar, locale, L]);
  const errChart = useMemo(() => line(res.rows.map((r) => r.year), [
    { name: L("UFUQ error", "خطأ أفق"), data: res.rows.map((r) => +(r.errModel * 100).toFixed(2)), color: VIZ[1] },
    { name: L("Naive error", "خطأ الاتجاه البسيط"), data: res.rows.map((r) => +(r.errNaive * 100).toFixed(2)), color: "#8c8a83", dashed: true },
  ], { rtl: ar, legend: true, fmt: (v) => `${v}%` }), [res, ar, L]);
  const better = res.mapeModel <= res.mapeNaive;
  const exportCsv = () => downloadCsv(`backtest-${origin}.csv`, res.rows.map((r) => ({ year: r.year, observed: Math.round(r.actual), ufuq_method: Math.round(r.model), naive_trend: Math.round(r.naive), error_ufuq: r.errModel.toFixed(4), error_naive: r.errNaive.toFixed(4), origin_year: origin, observed_source: "World Bank WDI SP.POP.TOTL (open-data mirror)" })));

  return (
    <div>
      <PageHeader index={navIndex("/validation")} title={t("navValidation")} subtitle={L("How far can UFUQ's projections be trusted? The projection method is run from an earlier year using only what was known then, and compared year by year with Jordan's observed population (World Bank), against a naive trend forecast.", "إلى أي حد يمكن الوثوق بإسقاطات أفق؟ تُشغَّل طريقة الإسقاط من سنة سابقة بما كان معروفاً آنذاك فقط، وتُقارن سنة بسنة بسكان الأردن المرصودين (البنك الدولي) وبتوقع الاتجاه البسيط.")}>
        <Button onClick={exportCsv}>{t("exportCsv")}</Button>
      </PageHeader>
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-card px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">{L("Start the backtest in", "بدء الاختبار الرجعي في")}</span>
        <Segmented value={origin} onChange={setOrigin} options={[2010, 2012, 2015, 2018].map((y) => ({ value: y, label: String(y) }))} />
      </div>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label={L("Mean absolute error — UFUQ", "متوسط الخطأ المطلق — أفق")} value={fmtPct(res.mapeModel, 1)} tone={res.mapeModel < 0.03 ? "ok" : res.mapeModel < 0.06 ? "warn" : "crit"} nature="REFERENCE" sources={["REF_WB_POP", "SIM_PROJECTION"]} />
        <Kpi label={L("Mean absolute error — naive", "متوسط الخطأ المطلق — بسيط")} value={fmtPct(res.mapeNaive, 1)} nature="REFERENCE" />
        <Kpi label={L(`Error in ${res.last.year}`, `الخطأ في ${res.last.year}`)} value={fmtSignedPct(res.last.errModel, 1)} sub={`${fmtCompact(res.last.model, locale)} vs ${fmtCompact(res.last.actual, locale)}`} nature="REFERENCE" />
        <Kpi label={L("Bias", "الانحياز")} value={fmtSignedPct(res.bias, 1)} sub={res.bias < 0 ? L("projects too low", "إسقاط أقل من الواقع") : L("projects too high", "إسقاط أعلى من الواقع")} nature="REFERENCE" />
        <Kpi label={L("Years tested", "السنوات المختبرة")} value={fmtInt(res.rows.length)} sub={`${origin + 1}–${res.last.year}`} />
        <Kpi label={L("Verdict", "الحكم")} value={<span className="text-[15px]">{better ? L("Beats naive trend", "أفضل من الاتجاه البسيط") : L("Naive trend better", "الاتجاه البسيط أفضل")}</span>} tone={better ? "ok" : "warn"} />
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Panel title={L("Projected vs observed population", "السكان المسقطون مقابل المرصودين")} nature="REFERENCE" sources={["REF_WB_POP"]}><EChart option={chart} height={300} /></Panel>
        <Panel title={L("Error by year (%)", "الخطأ حسب السنة (%)")} subtitle={L("Positive = projection too high", "موجب = الإسقاط أعلى")} nature="REFERENCE"><EChart option={errChart} height={300} /></Panel>
      </div>
      <Panel className="mt-3" title={L("Year by year", "سنة بسنة")} nature="REFERENCE" sources={["REF_WB_POP"]}>
        <SimpleTable minWidth={560} head={[L("Year", "السنة"), L("Observed", "المرصود"), L("UFUQ method", "طريقة أفق"), L("Error", "الخطأ"), L("Naive trend", "الاتجاه البسيط"), L("Error", "الخطأ")]}
          rows={res.rows.map((r) => [<b key="y">{r.year}</b>, fmtInt(r.actual), fmtInt(r.model), fmtSignedPct(r.errModel, 1), fmtInt(r.naive), fmtSignedPct(r.errNaive, 1)])} />
      </Panel>
      <Callout tone="sim" className="mt-3">{L("A component-method backtest of the national total: it tests the projection assumptions (natural increase and migration), not the synthetic census itself. Large refugee inflows (2012–2016) are the main source of error — which is why the Scenario Futures test migration as a key uncertainty. Governorate-level validation needs official governorate series (Data Connectors).", "اختبار رجعي بطريقة المكونات للمجموع الوطني: يختبر افتراضات الإسقاط (الزيادة الطبيعية والهجرة) لا التعداد الاصطناعي نفسه. تدفقات اللاجئين الكبيرة (2012–2016) هي المصدر الرئيسي للخطأ — ولذلك تختبر مستقبلات السيناريو الهجرة كمصدر رئيسي لعدم اليقين. يتطلب التحقق على مستوى المحافظات سلاسل رسمية للمحافظات (موصلات البيانات).")}</Callout>
      <Method>
        <Formula>{`P(t+1) = P(t) × (1 + CBR − CDR) + net migration; CBR = ${(res.cbr * 1000).toFixed(1)}‰, CDR = ${(res.cdr * 1000).toFixed(1)}‰, migration = ${fmtInt(res.mig)}/yr (baseline projection)`}</Formula>
        <Formula>{`naive: P(t) = P(origin) × (1 + g)^(t − origin), g = growth of the previous five years = ${fmtPct(res.trend, 2)}   ·   MAPE = mean |projected ÷ observed − 1|`}</Formula>
      </Method>
    </div>
  );
}
