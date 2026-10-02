"use client";

import { Dices, PlayCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { useApp } from "@/store/app";
import { useEngine } from "@/store/engine";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader, Panel, Callout } from "@/components/ui/panel";
import { Kpi } from "@/components/ui/kpi";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/form";
import { NatureBadge } from "@/components/ui/badges";
import { ProvenanceButton } from "@/components/ui/provenance";
import { EChart } from "@/components/charts/echart";
import { barH, VIZ } from "@/components/charts/builders";
import { JordanMap } from "@/features/gis/JordanMap";
import { downloadCsv } from "@/lib/csv";
import { fmtInt, fmtPct, fmtSignedPct } from "@/lib/format";
import type { GovId, PESSummary } from "@/types/census";
import { navIndex } from "@/lib/nav";

export function PES() {
  const engine = useEngine();
  const { t, tx, L, ar } = useI18n();
  const bump = useApp((s) => s.bump);
  const [n, setN] = useState(120);
  const world = engine.world;
  const v = engine.version;
  const completed = useMemo(() => engine.ea.filter((s, k) => s.status === "COMPLETED" || s.visited / world.eas[k].dwellingsTrue >= 0.95).length, [engine, v, world]); // eslint-disable-line react-hooks/exhaustive-deps
  const sample = engine.pesSample;
  const res = engine.pesResult;
  const nat = res?.national;

  const alloc = useMemo(() => {
    if (!sample) return [];
    return world.governorates.map((g) => ({ g, n: sample.eaIds.filter((id) => id.startsWith(g.id)).length }));
  }, [sample, world]);

  const samplePoints = useMemo(() => (sample ? sample.eaIds.map((id) => { const a = world.eas[world.eaIdx.get(id)!]; return { id, lng: a.lng, lat: a.lat, color: res ? "#1f8a3b" : "#d07a1c", govId: a.govId, districtId: a.districtId }; }) : []), [sample, res, world]);

  const netChart = useMemo(() => {
    if (!res) return null;
    const govs = world.governorates.filter((g) => res.byGov[g.id]);
    return barH(govs.map((g) => tx(g.name)), [
      { name: L("Net coverage error", "خطأ التغطية الصافي"), data: govs.map((g) => res.byGov[g.id].netCoverageError), color: VIZ[5] },
      { name: L("Gross coverage error", "خطأ التغطية الإجمالي"), data: govs.map((g) => res.byGov[g.id].grossCoverageError), color: VIZ[1] },
    ], { rtl: ar, fmt: (x) => fmtPct(x, 1) });
  }, [res, world, tx, ar, L]);

  const rows = (s: PESSummary) => ({ areas: s.areas, census_count: s.census, pes_count: s.pes, matched: s.matched, omissions_pes_only: s.omissions, erroneous_inclusions: s.erroneous, duplicates: s.duplicates, correct_enumerations: s.correctEnumerations, dual_system_estimate: Math.round(s.dualSystemEstimate), match_rate: s.matchRate, net_coverage_error: s.netCoverageError, gross_coverage_error: s.grossCoverageError, omission_rate: s.omissionRate, erroneous_rate: s.erroneousRate });

  return (
    <div>
      <PageHeader index={navIndex("/pes")} title={t("nav10")} subtitle={L("An independent re-enumeration of a stratified sample of completed EAs, matched to census records to estimate coverage error with the dual-system estimator.", "إعادة عدّ مستقلة لعينة طبقية من مناطق العدّ المكتملة، تُربط بسجلات التعداد لتقدير خطأ التغطية بمقدّر النظام المزدوج.")}>
        {res ? <Button onClick={() => downloadCsv("pes-results.csv", [{ level: "NATIONAL", governorate: "JOR", ...rows(res.national) }, ...Object.entries(res.byGov).map(([g, s]) => ({ level: "GOVERNORATE", governorate: g, ...rows(s) }))])}>{t("exportCsv")}</Button> : null}
      </PageHeader>
      <div className="mb-3 rounded-lg border-2 border-dashed border-nat-simulated/50 bg-[#fbf3e4] px-4 py-2.5 text-center text-[13px] font-bold uppercase tracking-[0.14em] text-nat-simulated">{L("Simulated Post-Enumeration Survey", "مسح ما بعد العدّ — محاكاة")}</div>

      <div className="grid gap-3 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-3">
          <Panel title={L("1 · Sample design", "1 · تصميم العينة")} nature="SIMULATED" sources={["SIM_PES"]}>
            <Slider label={L("Target sample EAs", "عدد مناطق العدّ المستهدفة")} value={n} min={40} max={400} step={10} onChange={setN} hint={L("Stratified by governorate (proportional, minimum 4 per stratum), drawn from completed EAs only.", "طبقية حسب المحافظة (تناسبية، 4 على الأقل لكل طبقة)، تُسحب من المناطق المكتملة فقط.")} />
            <div className="mt-2 text-[12px] text-ink-500">{L("Eligible completed EAs", "المناطق المكتملة المؤهلة")}: <b className="text-ink-900 tabular">{fmtInt(completed)}</b></div>
            <Button className="mt-3 w-full" variant="primary" disabled={completed < 40} onClick={() => { engine.drawPES(n); bump(); }}><Dices size={14} />{L("Draw PES sample", "سحب عينة المسح")}</Button>
            {completed < 40 ? <Callout tone="warn" className="mt-2">{L("At least 40 completed EAs are needed. Run the census simulation further.", "يلزم 40 منطقة عدّ مكتملة على الأقل. واصل تشغيل محاكاة التعداد.")}</Callout> : null}
            {sample ? (
              <div className="mt-3">
                <div className="mb-1 text-[11.5px] font-semibold uppercase tracking-wide text-ink-500">{L("Allocation", "التوزيع")} · {sample.eaIds.length} EAs</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[12px]">{alloc.map(({ g, n: k }) => <div key={g.id} className="flex justify-between"><span>{tx(g.name)}</span><span className="tabular">{k}</span></div>)}</div>
              </div>
            ) : null}
          </Panel>
          <Panel title={L("2 · Independent re-enumeration & matching", "2 · إعادة العدّ المستقلة والربط")} nature="SIMULATED">
            <p className="text-[12px] leading-relaxed text-ink-700">{L("PES teams (independent of census staff) re-list and re-interview every household in the sample EAs. Persons are matched to census records; non-matches are followed up to classify omissions, erroneous inclusions and duplicates.", "تعيد فرق المسح (المستقلة عن كوادر التعداد) حصر ومقابلة جميع الأسر في مناطق العينة. يُربط الأفراد بسجلات التعداد، وتُتابع حالات عدم التطابق لتصنيف المحذوفين والإدراجات الخاطئة والمكررين.")}</p>
            <Button className="mt-3 w-full" variant="accent" disabled={!sample} onClick={() => { engine.runPES(); bump(); }}><PlayCircle size={14} />{L("Run PES & match", "تشغيل المسح والربط")}</Button>
          </Panel>
          <Panel title={t("formula")} sources={["SIM_PES"]}>
            <ul className="space-y-1.5 font-mono text-[11.5px] leading-relaxed text-ink-700" dir="ltr">
              <li>C  = census count (incl. count imputation)</li>
              <li>CE = C − erroneous − duplicates</li>
              <li>P  = PES count, M = matched persons</li>
              <li>N̂  = CE × P ÷ M   (dual-system estimate)</li>
              <li>match rate = M ÷ P</li>
              <li>net error = (C − N̂) ÷ N̂</li>
              <li>gross error = (omissions + EE + dup) ÷ N̂</li>
              <li>omissions = N̂ − CE</li>
            </ul>
            <p className="mt-2 text-[11.5px] text-ink-500">{L("Negative net error = net under-count. Computed per governorate stratum.", "الخطأ الصافي السالب = نقص صافٍ في العدّ. يُحسب لكل طبقة محافظة.")}</p>
          </Panel>
        </div>

        <div className="min-w-0 space-y-3">
          {nat ? (
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
              <FormulaKpi label={L("Matched persons", "الأفراد المتطابقون")} value={fmtInt(nat.matched)} formula="M" />
              <FormulaKpi label={L("Omissions (PES-only)", "المحذوفون (في المسح فقط)")} value={fmtInt(nat.omissions)} formula="P − M" />
              <FormulaKpi label={L("Erroneous inclusions", "الإدراجات الخاطئة")} value={fmtInt(nat.erroneous)} formula="EE" />
              <FormulaKpi label={L("Duplicates", "المكررون")} value={fmtInt(nat.duplicates)} formula="DUP" />
              <FormulaKpi label={L("Match rate", "معدل التطابق")} value={fmtPct(nat.matchRate)} formula="M ÷ P" />
              <FormulaKpi label={L("Net coverage error", "خطأ التغطية الصافي")} value={fmtSignedPct(nat.netCoverageError, 2)} formula="(C − N̂) ÷ N̂" tone={nat.netCoverageError < -0.03 ? "warn" : undefined} />
              <FormulaKpi label={L("Gross coverage error", "خطأ التغطية الإجمالي")} value={fmtPct(nat.grossCoverageError, 2)} formula="(O + EE + DUP) ÷ N̂" />
              <FormulaKpi label={L("Dual-system estimate (sample)", "تقدير النظام المزدوج (العينة)")} value={fmtInt(nat.dualSystemEstimate)} formula={`vs C = ${fmtInt(nat.census)}`} />
            </div>
          ) : (
            <Callout>{sample ? L("Sample drawn. Run the PES to compute coverage measures.", "تم سحب العينة. شغّل المسح لحساب مقاييس التغطية.") : L("Draw a sample to begin. The map will show the selected EAs.", "اسحب عينة للبدء. ستعرض الخريطة المناطق المختارة.")}</Callout>
          )}
          <div className="grid gap-3 lg:grid-cols-2">
            <JordanMap height={380} title={L("PES sample EAs", "مناطق عينة المسح")} eaPoints={samplePoints} eaLegend={sample ? [{ color: res ? "#1f8a3b" : "#d07a1c", label: res ? L("Re-enumerated & matched", "أُعيد عدّها ورُبطت") : L("Selected", "مختارة") }] : undefined} govValues={res ? (Object.fromEntries(Object.entries(res.byGov).map(([g, s]) => [g, -s.netCoverageError])) as Record<GovId, number>) : undefined} scale="risk" format={(x) => fmtPct(x, 1)} legendTitle={L("Net under-count", "النقص الصافي")} sources={["SIM_PES"]} showLabelsDefault={false} />
            <Panel title={L("Coverage error by governorate", "خطأ التغطية حسب المحافظة")} nature="SIMULATED" sources={["SIM_PES"]}>{netChart ? <EChart option={netChart} height={330} /> : <p className="py-16 text-center text-[12.5px] text-ink-500">{t("noData")}</p>}</Panel>
          </div>
          {res ? (
            <Panel title={L("Results by governorate stratum", "النتائج حسب طبقة المحافظة")} nature="SIMULATED" actions={<NatureBadge nature="SIMULATED" />}>
              <div className="thin-scroll overflow-x-auto">
                <table className="w-full min-w-[820px] text-[12.5px]">
                  <thead><tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-500"><th className="py-1.5 text-start">{t("governorate")}</th><th className="text-end">EAs</th><th className="text-end">C</th><th className="text-end">P</th><th className="text-end">M</th><th className="text-end">{L("Omit.", "حذف")}</th><th className="text-end">EE</th><th className="text-end">DUP</th><th className="text-end">N̂</th><th className="text-end">{L("Match", "تطابق")}</th><th className="text-end">{L("Net", "صافٍ")}</th><th className="text-end">{L("Gross", "إجمالي")}</th></tr></thead>
                  <tbody>
                    {[...world.governorates.filter((g) => res.byGov[g.id]).map((g) => ({ name: tx(g.name), s: res.byGov[g.id] })), { name: t("jordan"), s: res.national }].map(({ name, s }, i, arr) => (
                      <tr key={name} className={i === arr.length - 1 ? "border-t-2 border-line-strong font-semibold" : "border-b border-line/60"}>
                        <td className="py-1.5">{name}</td><td className="text-end tabular">{s.areas}</td><td className="text-end tabular">{fmtInt(s.census)}</td><td className="text-end tabular">{fmtInt(s.pes)}</td><td className="text-end tabular">{fmtInt(s.matched)}</td><td className="text-end tabular">{fmtInt(s.omissions)}</td><td className="text-end tabular">{fmtInt(s.erroneous)}</td><td className="text-end tabular">{fmtInt(s.duplicates)}</td><td className="text-end tabular">{fmtInt(s.dualSystemEstimate)}</td><td className="text-end tabular">{fmtPct(s.matchRate)}</td><td className={`text-end tabular ${s.netCoverageError < -0.03 ? "text-crit" : ""}`}>{fmtSignedPct(s.netCoverageError, 2)}</td><td className="text-end tabular">{fmtPct(s.grossCoverageError, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 flex items-center gap-1 text-[11.5px] text-ink-500"><ProvenanceButton ids={["SIM_PES"]} />{L("Simulated — not an estimate of Jordan's real census coverage.", "محاكاة — ليست تقديراً لتغطية التعداد الحقيقية في الأردن.")}</div>
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function FormulaKpi({ label, value, formula, tone }: { label: string; value: string; formula: string; tone?: "ok" | "warn" | "crit" }) {
  return <Kpi label={label} value={value} sub={<span className="font-mono text-[10.5px]" dir="ltr">{formula}</span>} tone={tone} nature="SIMULATED" sources={["SIM_PES"]} />;
}
