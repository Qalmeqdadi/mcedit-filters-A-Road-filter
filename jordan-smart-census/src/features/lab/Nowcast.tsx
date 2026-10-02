"use client";

import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useApp } from "@/store/app";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader, Panel, Callout } from "@/components/ui/panel";
import { Kpi } from "@/components/ui/kpi";
import { Button } from "@/components/ui/button";
import { Select, Slider } from "@/components/ui/form";
import { EChart } from "@/components/charts/echart";
import { line, VIZ } from "@/components/charts/builders";
import { JordanMap } from "@/features/gis/JordanMap";
import { NOWCAST_MONTHS, runNowcast } from "@/simulation/lab/nowcast";
import { downloadCsv } from "@/lib/csv";
import { navIndex } from "@/lib/nav";
import { fmtCompact, fmtInt, fmtPct, fmtSignedPct } from "@/lib/format";
import type { GovId } from "@/types/census";
import { AreaActions } from "./ActionCard";
import { Formula, LabBar, Method, SimpleTable, useLab } from "./shared";

export function Nowcast() {
  const { world, run, areaFor, baseYear, scenarioName } = useLab();
  const { t, tx, L, ar, locale } = useI18n();
  const govId = useApp((s) => s.govId);
  const selectGov = useApp((s) => s.selectGov);
  const [month, setMonth] = useState(NOWCAST_MONTHS - 1);
  const res = useMemo(() => {
    const pt = run.series[1];
    return runNowcast(world, areaFor(baseYear), pt.births / pt.population, pt.deaths / pt.population, run.params.netMigration, world.config.referenceDate);
  }, [world, run, areaFor, baseYear]);
  const series = govId ? res.byGov[govId] : res.national;
  const pts = series.points.slice(0, month + 1);
  const cur = pts[pts.length - 1];
  const labels = series.points.map((p) => p.label);
  const scopeName = govId ? tx(world.gov[govId].name) : L("Jordan", "الأردن");

  const main = useMemo(() => {
    const cut = <T,>(arr: T[]) => arr.map((v, i) => (i <= month ? v : null));
    const o = line(labels, [
      { name: L("Nowcast (blended)", "التقدير الآني (مدمج)"), data: cut(series.points.map((p) => Math.round(p.nowcast))) as (number | null)[], color: VIZ[0] },
      { name: L("Demographic accounting", "المحاسبة الديموغرافية"), data: cut(series.points.map((p) => Math.round(p.accounting))) as (number | null)[], color: VIZ[1], dashed: true },
      { name: L("Connections indicator", "مؤشر التوصيلات"), data: cut(series.points.map((p) => Math.round(p.indicator))) as (number | null)[], color: VIZ[3] },
      { name: L("Synthetic truth (unknown in practice)", "الحقيقة الاصطناعية (غير معروفة عملياً)"), data: cut(series.points.map((p) => Math.round(p.truth))) as (number | null)[], color: "#8a8270", dashed: true },
    ], { rtl: ar, fmt: (v) => fmtCompact(v, locale) });
    const s = o.series as Record<string, unknown>[];
    s.push({ type: "line", name: "lo", stack: "ci", data: cut(series.points.map((p) => Math.round(p.lo))), lineStyle: { opacity: 0 }, symbol: "none", areaStyle: { opacity: 0 }, tooltip: { show: false } });
    s.push({ type: "line", name: L("95% interval", "فترة 95%"), stack: "ci", data: cut(series.points.map((p) => Math.round(p.hi - p.lo))), lineStyle: { opacity: 0 }, symbol: "none", itemStyle: { color: VIZ[0] }, areaStyle: { color: VIZ[0], opacity: 0.12 }, tooltip: { show: false } });
    (o as { yAxis: Record<string, unknown> }).yAxis.scale = true;
    (o as { legend?: Record<string, unknown> }).legend = { ...(o as { legend?: Record<string, unknown> }).legend, data: [L("Nowcast (blended)", "التقدير الآني (مدمج)"), L("Demographic accounting", "المحاسبة الديموغرافية"), L("Connections indicator", "مؤشر التوصيلات"), L("Synthetic truth (unknown in practice)", "الحقيقة الاصطناعية (غير معروفة عملياً)")] };
    return o;
  }, [series, labels, month, ar, locale, L]);
  const signals = useMemo(() => line(labels, [{ name: L("New electricity connections", "توصيلات كهرباء جديدة"), data: series.points.map((p, i) => (i <= month ? Math.round(p.connections) : null)), color: VIZ[3], area: true }], { rtl: ar, fmt: (v) => fmtCompact(v, locale) }), [series, labels, month, ar, locale, L]);
  const vital = useMemo(() => line(labels, [
    { name: L("Registered births", "الولادات المسجلة"), data: series.points.map((p, i) => (i <= month ? Math.round(p.births) : null)), color: VIZ[2] },
    { name: L("Registered deaths", "الوفيات المسجلة"), data: series.points.map((p, i) => (i <= month ? Math.round(p.deaths) : null)), color: VIZ[5] },
  ], { rtl: ar, fmt: (v) => fmtCompact(v, locale) }), [series, labels, month, ar, locale, L]);

  const findings = world.governorates.map((g) => ({ g, s: res.byGov[g.id] })).filter(({ s }) => s.detectedMonth !== null && s.detectedMonth <= month);
  const govDiff = Object.fromEntries(world.governorates.map((g) => {
    const p = res.byGov[g.id].points[month];
    return [g.id, p.nowcast / p.accounting - 1];
  })) as Record<GovId, number>;
  const err = (k: "accounting" | "indicator" | "nowcast") => Math.abs(cur[k] - cur.truth) / cur.truth;
  const exportCsv = () => downloadCsv("population-nowcast.csv", world.governorates.flatMap((g) => res.byGov[g.id].points.map((p) => ({ governorate: g.name.en, month: p.label, nowcast: Math.round(p.nowcast), ci95_low: Math.round(p.lo), ci95_high: Math.round(p.hi), demographic_accounting: Math.round(p.accounting), connections_indicator: Math.round(p.indicator), registered_births: Math.round(p.births), registered_deaths: Math.round(p.deaths), new_connections: Math.round(p.connections), synthetic_truth: Math.round(p.truth), scenario: scenarioName, data_nature: "SIMULATED" }))));

  return (
    <div>
      <PageHeader index={navIndex("/nowcast")} title={t("navNowcast")} subtitle={L("Keep population estimates current between censuses. Registered births and deaths, new electricity connections and school enrolment are blended with a Kalman filter; unexplained growth — such as an unrecorded inflow — is flagged for verification.", "إبقاء تقديرات السكان محدثة بين التعدادين. تُدمج الولادات والوفيات المسجلة وتوصيلات الكهرباء الجديدة والالتحاق المدرسي بمرشح كالمان، ويُشار إلى أي نمو غير مفسَّر — كتدفق وافد غير مسجل — للتحقق منه.")}>
        <Button onClick={exportCsv}>{t("exportCsv")}</Button>
      </PageHeader>
      <LabBar hideYear>
        <Select value={govId ?? ""} onChange={(e) => selectGov((e.target.value || null) as GovId | null)} aria-label={t("governorate")}>
          <option value="">{t("allJordan")}</option>
          {world.governorates.map((g) => <option key={g.id} value={g.id}>{tx(g.name)}</option>)}
        </Select>
      </LabBar>
      <Callout tone="sim" className="mb-3">{L("Demonstration with synthetic administrative signals. Because the world is synthetic, its hidden “truth” is shown so you can see each method's error — in production the truth is only known at the next census.", "عرض توضيحي بمؤشرات إدارية اصطناعية. ولأن العالم اصطناعي تُعرض «الحقيقة» المخفية لتظهر أخطاء كل طريقة — أما في التشغيل الفعلي فلا تُعرف الحقيقة إلا عند التعداد التالي.")}</Callout>
      <div className="mb-3 rounded-lg border border-line bg-card px-4 py-3">
        <Slider label={`${L("Estimate as of", "التقدير حتى")} ${cur.label}`} value={month} min={0} max={NOWCAST_MONTHS - 1} step={1} onChange={setMonth} format={(v) => `${L("month", "الشهر")} ${v + 1} / ${NOWCAST_MONTHS}`} />
      </div>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label={`${L("Nowcast", "التقدير الآني")} — ${scopeName}`} value={fmtCompact(cur.nowcast, locale)} sub={`± ${fmtCompact((cur.hi - cur.lo) / 2, locale)} (95%)`} nature="SIMULATED" sources={["SIM_NOWCAST"]} />
        <Kpi label={L("Change since census", "التغير منذ التعداد")} value={fmtSignedPct(cur.nowcast / series.points[0].nowcast - 1)} sub={`${fmtInt(cur.nowcast - series.points[0].nowcast)} ${L("persons", "نسمة")}`} nature="SIMULATED" />
        <Kpi label={L("Error — accounting only", "الخطأ — المحاسبة فقط")} value={fmtPct(err("accounting"), 2)} sub={`MAPE ${fmtPct(series.mape.accounting, 2)}`} nature="SIMULATED" />
        <Kpi label={L("Error — indicator only", "الخطأ — المؤشر فقط")} value={fmtPct(err("indicator"), 2)} sub={`MAPE ${fmtPct(series.mape.indicator, 2)}`} nature="SIMULATED" />
        <Kpi label={L("Error — blended nowcast", "الخطأ — التقدير المدمج")} value={fmtPct(err("nowcast"), 2)} sub={`MAPE ${fmtPct(series.mape.nowcast, 2)}`} tone={err("nowcast") <= Math.min(err("accounting"), err("indicator")) ? "ok" : undefined} nature="SIMULATED" />
        <Kpi label={L("Unexplained-growth flags", "إشارات نمو غير مفسَّر")} value={fmtInt(findings.length)} sub={L("governorates to verify", "محافظات للتحقق")} tone={findings.length ? "warn" : "ok"} nature="SIMULATED" />
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Panel title={`${L("Population estimate", "تقدير السكان")} — ${scopeName}`} subtitle={L("Shaded: 95% interval of the blended nowcast", "المظلل: فترة 95% للتقدير المدمج")} nature="SIMULATED" sources={["SIM_NOWCAST"]}><EChart option={main} height={330} /></Panel>
        <Panel title={L("Flags for verification", "إشارات للتحقق")} nature="SIMULATED" sources={["SIM_NOWCAST"]}>
          {findings.length === 0 ? <p className="py-6 text-center text-[12.5px] text-ink-500">{L("No unexplained growth detected up to this month.", "لم يُرصد نمو غير مفسَّر حتى هذا الشهر.")}</p> : (
            <ul className="space-y-2.5">
              {findings.map(({ g, s }) => (
                <li key={g.id} className="rounded-md border border-warn/30 bg-warn-bg/60 px-3 py-2 text-[12.5px] text-ink-900">
                  <div className="flex items-center gap-1.5 font-semibold"><AlertTriangle size={13} className="text-warn" />{tx(g.name)} · {s.points[s.detectedMonth!].label}</div>
                  <p className="mt-1 leading-relaxed text-ink-700">{tx(s.finding)}</p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[11.5px] text-ink-500">{L("Rule: the indicator runs more than 1.5 measurement standard deviations away from demographic accounting for 3 consecutive months. A flag is a prompt to verify, not a finding.", "القاعدة: يبتعد المؤشر أكثر من 1.5 انحراف معياري للقياس عن المحاسبة الديموغرافية لثلاثة أشهر متتالية. الإشارة دعوة للتحقق وليست استنتاجاً.")}</p>
        </Panel>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <Panel title={L("Vital registration", "التسجيل الحيوي")} nature="SIMULATED"><EChart option={vital} height={210} /></Panel>
        <Panel title={L("New residential connections", "التوصيلات السكنية الجديدة")} nature="SIMULATED"><EChart option={signals} height={210} /></Panel>
        <JordanMap height={260} title={L("Nowcast vs accounting", "التقدير الآني مقابل المحاسبة")} govValues={govDiff} scale="risk" domain={[-0.01, 0.04]} format={(v) => fmtSignedPct(v, 1)} legendTitle={L("Difference", "الفرق")} selectedGov={govId} onSelectGov={selectGov} districtMode="drill" sources={["SIM_NOWCAST"]} showLabelsDefault={false} />
      </div>
      <Panel className="mt-3" title={L("Method accuracy by governorate (60 months)", "دقة الطرق حسب المحافظة (60 شهراً)")} subtitle={L("Mean absolute percentage error against the synthetic truth", "متوسط الخطأ النسبي المطلق مقابل الحقيقة الاصطناعية")} nature="SIMULATED" sources={["SIM_NOWCAST"]}>
        <SimpleTable minWidth={560} head={[t("governorate"), L("Accounting", "المحاسبة"), L("Indicator", "المؤشر"), L("Blended", "المدمج"), L("Flagged", "إشارة")]} rows={world.governorates.map((g) => { const s = res.byGov[g.id]; return [<b key="g">{tx(g.name)}</b>, fmtPct(s.mape.accounting, 2), fmtPct(s.mape.indicator, 2), <b key="b">{fmtPct(s.mape.nowcast, 2)}</b>, s.detectedMonth !== null ? s.points[s.detectedMonth].label : "—"]; })} />
      </Panel>
      <AreaActions sectors={["DATA"]} />
      <Method>
        <Formula>{"state:   x(t) = x(t−1) + births/0.97 − deaths/0.88 + assumed migration        (registration completeness-adjusted)"}</Formula>
        <Formula>{"measure: z(t) = census + Σ connections ÷ 0.7 × persons per household         K = P⁻ ÷ (P⁻ + R),  x = x⁻ + K (z − x⁻)"}</Formula>
        <p>{L("Accounting alone misses migration that is not registered; the connections indicator alone is noisy. The Kalman filter weights each by its uncertainty, so the blended estimate follows real shifts while staying stable. Unannounced inflows (Mafraq, Irbid) and an outflow (Aqaba) are built into the synthetic truth to test detection. Departures do not remove electricity connections, so the indicator cannot see the Aqaba outflow — a real limitation that calls for exit and school-transfer data.", "تفوّت المحاسبة وحدها الهجرة غير المسجلة، ومؤشر التوصيلات وحده كثير الضوضاء. يرجّح مرشح كالمان كلاً منهما بحسب عدم يقينه، فيتبع التقدير المدمج التحولات الحقيقية ويبقى مستقراً. أُدرجت في الحقيقة الاصطناعية تدفقات وافدة غير معلنة (المفرق، إربد) وتدفق مغادر (العقبة) لاختبار الكشف. ولا يؤدي الرحيل إلى إلغاء توصيلات الكهرباء، لذا لا يرى المؤشر مغادرة العقبة — وهو قيد حقيقي يستدعي بيانات المغادرة وانتقال الطلبة.")}</p>
      </Method>
    </div>
  );
}
