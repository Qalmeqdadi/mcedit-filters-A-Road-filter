"use client";

import { Copy, GitCompare, RotateCcw, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { useApp, type SavedScenario } from "@/store/app";
import { useEngine } from "@/store/engine";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader, Panel, Callout } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Field, Input, Segmented, Slider } from "@/components/ui/form";
import { Modal } from "@/components/ui/dialog";
import { NatureBadge } from "@/components/ui/badges";
import { ProvenanceButton } from "@/components/ui/provenance";
import { EChart } from "@/components/charts/echart";
import { barV, line, VIZ } from "@/components/charts/builders";
import { compareScenarios, DEFAULT_PARAMS, IMPACT_KEYS, paramsForPreset, PROJECTION_YEARS, runScenario, type FullScenario, type ImpactKey } from "@/simulation/scenarios";
import { downloadCsv } from "@/lib/csv";
import { fmt1, fmtCompact, fmtInt, fmtPct, fmtSigned } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { L as LText, ScenarioPreset } from "@/types/census";

const PRESETS: ScenarioPreset[] = ["BASELINE", "HIGH_GROWTH", "LOW_GROWTH", "MIGRATION_SHOCK", "YOUTH_PRESSURE", "AGEING", "CUSTOM"];

export const IMPACT_META: Record<ImpactKey, { label: LText; unit: LText; fmt: (v: number) => string }> = {
  population: { label: { en: "Population", ar: "السكان" }, unit: { en: "persons", ar: "فرد" }, fmt: (v) => fmtInt(v) },
  households: { label: { en: "Households", ar: "الأسر" }, unit: { en: "households", ar: "أسرة" }, fmt: (v) => fmtInt(v) },
  housingUnitsNeeded: { label: { en: "Housing units needed", ar: "الوحدات السكنية المطلوبة" }, unit: { en: "units (cumulative)", ar: "وحدة (تراكمي)" }, fmt: (v) => fmtInt(v) },
  schoolSeats: { label: { en: "School seats", ar: "المقاعد المدرسية" }, unit: { en: "seats", ar: "مقعد" }, fmt: (v) => fmtInt(v) },
  classroomsRequired: { label: { en: "Classrooms required", ar: "الصفوف المطلوبة" }, unit: { en: "classrooms", ar: "غرفة صفية" }, fmt: (v) => fmtInt(v) },
  schoolsRequired: { label: { en: "Schools required", ar: "المدارس المطلوبة" }, unit: { en: "schools", ar: "مدرسة" }, fmt: (v) => fmtInt(v) },
  healthcareVisits: { label: { en: "Healthcare demand", ar: "الطلب على الرعاية الصحية" }, unit: { en: "visits / year", ar: "زيارة / سنة" }, fmt: (v) => fmtInt(v) },
  waterMcm: { label: { en: "Domestic water demand", ar: "الطلب المنزلي على المياه" }, unit: { en: "MCM / year", ar: "مليون م³ / سنة" }, fmt: (v) => fmt1(v) },
  electricityGwh: { label: { en: "Electricity demand", ar: "الطلب على الكهرباء" }, unit: { en: "GWh / year", ar: "غيغاواط ساعة / سنة" }, fmt: (v) => fmtInt(v) },
  jobsRequired: { label: { en: "Jobs required", ar: "الوظائف المطلوبة" }, unit: { en: "jobs", ar: "وظيفة" }, fmt: (v) => fmtInt(v) },
  elderlyCareDemand: { label: { en: "Elderly-care demand", ar: "الطلب على رعاية كبار السن" }, unit: { en: "persons needing care", ar: "فرد بحاجة لرعاية" }, fmt: (v) => fmtInt(v) },
};

type Ctl = { key: keyof FullScenario; label: LText; min: number; max: number; step: number; fmt: (v: number) => string; hint?: LText };
const CONTROLS: { group: LText; items: Ctl[] }[] = [
  { group: { en: "Demography", ar: "الديموغرافيا" }, items: [
    { key: "fertilityMultiplier", label: { en: "Fertility multiplier", ar: "مضاعف الخصوبة" }, min: 0.6, max: 1.4, step: 0.01, fmt: (v) => `×${v.toFixed(2)}` },
    { key: "netMigration", label: { en: "Net migration / year", ar: "صافي الهجرة / سنة" }, min: -50000, max: 150000, step: 5000, fmt: (v) => fmtSigned(v) },
    { key: "migrationShock", label: { en: "Migration shock (one-off, 3 yrs)", ar: "صدمة هجرة (لمرة واحدة، 3 سنوات)" }, min: 0, max: 1000000, step: 25000, fmt: (v) => fmtInt(v) },
    { key: "shockNorthShare", label: { en: "Shock share settling in the north", ar: "حصة الشمال من الصدمة" }, min: 0, max: 1, step: 0.05, fmt: (v) => fmtPct(v, 0) },
    { key: "lifeExpectancyGain", label: { en: "Life expectancy gain by 2050", ar: "زيادة العمر المتوقع حتى 2050" }, min: 0, max: 10, step: 0.5, fmt: (v) => `+${v.toFixed(1)} yrs` },
    { key: "householdSize", label: { en: "Average household size (2050)", ar: "متوسط حجم الأسرة (2050)" }, min: 3.2, max: 5.2, step: 0.05, fmt: (v) => v.toFixed(2) },
    { key: "urbanization", label: { en: "Urbanization (2050)", ar: "التحضر (2050)" }, min: 0.8, max: 0.99, step: 0.01, fmt: (v) => fmtPct(v, 0) },
  ] },
  { group: { en: "Economy & social adjustments", ar: "الاقتصاد والتعديلات الاجتماعية" }, items: [
    { key: "employmentGrowth", label: { en: "Employment ratio growth (pp by 2050)", ar: "نمو نسبة التشغيل (نقاط مئوية حتى 2050)" }, min: -0.1, max: 0.15, step: 0.01, fmt: (v) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(0)} pp` },
    { key: "schoolAgeGrowth", label: { en: "School-age adjustment", ar: "تعديل سن المدرسة" }, min: -0.2, max: 0.3, step: 0.01, fmt: (v) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(0)}%` },
    { key: "elderlyGrowth", label: { en: "Elderly care-need adjustment", ar: "تعديل حاجة كبار السن للرعاية" }, min: -0.2, max: 0.5, step: 0.01, fmt: (v) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(0)}%` },
  ] },
  { group: { en: "Planning norms", ar: "معايير التخطيط" }, items: [
    { key: "waterLpcd", label: { en: "Water demand per person", ar: "الطلب على المياه للفرد" }, min: 60, max: 200, step: 5, fmt: (v) => `${v} L/day` },
    { key: "electricityKwh", label: { en: "Electricity demand per person", ar: "الطلب على الكهرباء للفرد" }, min: 600, max: 3500, step: 50, fmt: (v) => `${fmtInt(v)} kWh/yr` },
    { key: "classroomCapacity", label: { en: "Average classroom capacity", ar: "متوسط سعة الغرفة الصفية" }, min: 20, max: 45, step: 1, fmt: (v) => `${v} pupils` },
    { key: "schoolCapacity", label: { en: "Average school capacity", ar: "متوسط سعة المدرسة" }, min: 200, max: 1500, step: 20, fmt: (v) => `${v} pupils` },
    { key: "healthUtilization", label: { en: "Healthcare utilisation proxy", ar: "مؤشر استخدام الرعاية الصحية" }, min: 1, max: 8, step: 0.1, fmt: (v) => `${v.toFixed(1)} visits/yr` },
    { key: "housingFormationRatio", label: { en: "Housing formation ratio", ar: "معامل تكوين المساكن" }, min: 0.9, max: 1.4, step: 0.01, fmt: (v) => `${v.toFixed(2)} units/HH` },
  ] },
];

export function Scenarios() {
  const engine = useEngine();
  const { t, tx, L, lb, ar, locale } = useI18n();
  const { scenarios, saveScenario, deleteScenario, setActiveScenario, activeScenario, projectionYear, setProjectionYear } = useApp();
  // the store is the single source of truth, so the guided demo and Decision Intelligence stay in sync
  const current = activeScenario ?? { preset: "BASELINE" as ScenarioPreset, params: paramsForPreset("BASELINE"), name: "Baseline" };
  const { preset, params, name } = current;
  const update = (patch: Partial<typeof current>) => setActiveScenario({ ...current, ...patch });
  const setName = (n: string) => update({ name: n });
  const [saveOpen, setSaveOpen] = useState(false);
  const [compare, setCompare] = useState<string[]>([]);
  const dp = useDeferredValue(params);
  const world = engine.world;
  const baseTotal = world.totals.population;
  const year = PROJECTION_YEARS.includes(projectionYear) ? projectionYear : 2040;
  const run = useMemo(() => runScenario(world, baseTotal, dp), [world, baseTotal, dp]);
  const baseline = useMemo(() => runScenario(world, baseTotal, DEFAULT_PARAMS), [world, baseTotal]);

  const choosePreset = (p: ScenarioPreset) => update({ preset: p, params: p === "CUSTOM" ? params : paramsForPreset(p), name: lb("preset", p) });
  const setParam = (k: keyof FullScenario, v: number) => update({ params: { ...params, [k]: v }, preset: "CUSTOM" });

  const imp = run.impacts[year];
  const bimp = baseline.impacts[year];
  const savedRuns = useMemo(() => scenarios.filter((s) => compare.includes(s.id)).map((s) => ({ name: s.name, run: runScenario(world, baseTotal, s.params) })), [scenarios, compare, world, baseTotal]);
  const comparison = useMemo(() => compareScenarios([{ name: `${name} (${L("current", "الحالي")})`, run }, { name: L("Reference baseline", "خط الأساس المرجعي"), run: baseline }, ...savedRuns], year), [run, baseline, savedRuns, year, name, L]);

  const traj = useMemo(() => line(run.series.map((s) => s.year), [
    { name: name, data: run.series.map((s) => s.population), color: VIZ[0], area: true },
    { name: L("Reference baseline", "خط الأساس المرجعي"), data: baseline.series.map((s) => s.population), color: "#8a8270", dashed: true },
    ...savedRuns.map((r, i) => ({ name: r.name, data: r.run.series.map((s) => s.population), color: VIZ[(i + 2) % 6] })),
  ], { rtl: ar, fmt: (v) => fmtCompact(v, locale), markX: year }), [run, baseline, savedRuns, name, ar, locale, L, year]);

  const compChart = useMemo(() => {
    const keys: ImpactKey[] = ["classroomsRequired", "housingUnitsNeeded", "jobsRequired", "elderlyCareDemand"];
    const series = comparison[0].values.map((v, i) => ({ name: v.name, data: keys.map((k) => comparison.find((c) => c.key === k)!.values[i].delta), color: i === 1 ? "#8a8270" : VIZ[(i === 0 ? 0 : i) % 6] }));
    return barV(keys.map((k) => tx(IMPACT_META[k].label)), series, { rtl: ar, fmt: (v) => fmtCompact(v, locale) });
  }, [comparison, tx, ar, locale]);

  const doSave = (asCopy = false) => {
    const id = `sc-${Date.now().toString(36)}`;
    const s: SavedScenario = { id, name: asCopy ? `${name} (${L("copy", "نسخة")})` : name, preset, params: { ...params }, createdAt: new Date().toISOString() };
    saveScenario(s);
    setSaveOpen(false);
    if (asCopy) update({ name: s.name });
  };

  return (
    <div>
      <PageHeader index="19" title={t("nav19")} subtitle={L("Translate demographic scenarios into national service and infrastructure requirements. Choose a preset, adjust any assumption or planning norm, then save, duplicate and compare.", "حوّل السيناريوهات الديموغرافية إلى متطلبات وطنية من الخدمات والبنية التحتية. اختر نموذجاً جاهزاً وعدّل أي افتراض أو معيار تخطيط، ثم احفظ وانسخ وقارن.")}>
        <Button onClick={() => downloadCsv("scenario-results.csv", comparison.flatMap((c) => c.values.map((v) => ({ scenario: v.name, year, indicator: c.key, value: v.value, change_vs_base_year: v.delta, data_nature: "SIMULATED" }))))}>{t("exportCsv")}</Button>
        <Link href="/decision"><Button variant="primary">{t("nav20")} →</Button></Link>
      </PageHeader>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <button key={p} type="button" onClick={() => choosePreset(p)} className={cn("rounded-md border px-3 py-1.5 text-[12.5px] font-medium", preset === p ? "border-navy-700 bg-navy-800 text-white" : "border-line bg-card text-ink-700 hover:bg-sand-50")}>{lb("preset", p)}</button>
        ))}
        <div className="flex-1" />
        <span className="text-[12px] text-ink-500">{L("Target year", "السنة المستهدفة")}</span>
        <Segmented value={year} onChange={setProjectionYear} options={PROJECTION_YEARS.map((y) => ({ value: y, label: String(y) }))} />
      </div>

      <div className="grid gap-3 xl:grid-cols-[330px_minmax(0,1fr)]">
        <Panel title={L("Scenario controls", "عناصر التحكم بالسيناريو")} nature="SIMULATED" sources={["SIM_PROJECTION", "SIM_INFRA"]} actions={<Button size="xs" onClick={() => choosePreset("BASELINE")}><RotateCcw size={11} />{t("reset")}</Button>}>
          <div className="mb-3"><Field label={L("Scenario name", "اسم السيناريو")}><Input value={name} onChange={(e) => setName(e.target.value)} /></Field></div>
          <div className="space-y-4">
            {CONTROLS.map((g) => (
              <div key={g.group.en}>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-sand-700">{tx(g.group)}</div>
                <div className="space-y-3">{g.items.map((c) => <Slider key={c.key} label={tx(c.label)} value={params[c.key]} min={c.min} max={c.max} step={c.step} onChange={(v) => setParam(c.key, v)} format={c.fmt} />)}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-1.5">
            <Button variant="primary" onClick={() => setSaveOpen(true)}><Save size={13} />{L("Save scenario", "حفظ السيناريو")}</Button>
            <Button onClick={() => doSave(true)}><Copy size={13} />{L("Duplicate", "نسخ")}</Button>
          </div>
        </Panel>

        <div className="min-w-0 space-y-3">
          <Callout tone="sim">{L(`Estimated impacts in ${year} under “${name}”, with change since the ${run.baseYear} base year. All figures are simulated planning estimates driven by the assumptions on the left.`, `الآثار المقدرة في ${year} وفق «${name}» مع التغير منذ سنة الأساس ${run.baseYear}. جميع الأرقام تقديرات تخطيطية محاكاة تحركها الافتراضات المعروضة.`)}</Callout>
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 2xl:grid-cols-4">
            {IMPACT_KEYS.map((k) => {
              const meta = IMPACT_META[k];
              const val = imp[k] as number;
              const delta = k === "housingUnitsNeeded" ? imp.housingUnitsNeeded : imp.delta[k];
              const vsBase = k === "housingUnitsNeeded" ? imp.housingUnitsNeeded - bimp.housingUnitsNeeded : (imp[k] as number) - (bimp[k] as number);
              return (
                <div key={k} className="rounded-lg border border-line bg-card px-3.5 py-3">
                  <div className="flex items-start justify-between gap-1"><div className="text-[11.5px] font-medium text-ink-500">{tx(meta.label)}</div><ProvenanceButton ids={["SIM_PROJECTION", "SIM_INFRA"]} className="-mt-0.5 -me-1" /></div>
                  <div className="mt-1 text-[20px] font-semibold tracking-tight text-ink-900 tabular">{k === "housingUnitsNeeded" ? fmtCompact(val, locale) : fmtCompact(val, locale)}</div>
                  <div className="text-[11px] text-ink-500">{tx(meta.unit)}</div>
                  <div className="mt-1.5 flex flex-wrap gap-x-2 text-[11.5px] tabular">
                    <span className={delta >= 0 ? "text-navy-700" : "text-serious"}>{k === "housingUnitsNeeded" ? `${fmtCompact(delta, locale)} ${L("since base", "منذ الأساس")}` : `${delta >= 0 ? "+" : "−"}${fmtCompact(Math.abs(delta), locale)} ${L("since base", "منذ الأساس")}`}</span>
                    {preset !== "BASELINE" ? <span className="text-ink-500">{vsBase >= 0 ? "+" : "−"}{fmtCompact(Math.abs(vsBase), locale)} {L("vs baseline", "مقابل خط الأساس")}</span> : null}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <Panel title={L("Population trajectory", "مسار السكان")} nature="SIMULATED" sources={["SIM_PROJECTION"]}><EChart option={traj} height={270} /></Panel>
            <Panel title={`${L("Additional requirements by", "المتطلبات الإضافية حتى")} ${year}`} nature="SIMULATED" sources={["SIM_INFRA"]} subtitle={L("Change since base year, by scenario", "التغير منذ سنة الأساس حسب السيناريو")}><EChart option={compChart} height={270} /></Panel>
          </div>

          <Panel title={L("Saved scenarios & comparison", "السيناريوهات المحفوظة والمقارنة")} nature="SIMULATED" actions={<span className="flex items-center gap-1 text-[11.5px] text-ink-500"><GitCompare size={13} />{L("Select up to 3 to compare", "اختر حتى 3 للمقارنة")}</span>}>
            {scenarios.length === 0 ? <p className="text-[12.5px] text-ink-500">{L("No saved scenarios yet. Save the current scenario to compare it later (stored in this browser).", "لا توجد سيناريوهات محفوظة بعد. احفظ السيناريو الحالي لمقارنته لاحقاً (يُخزن في هذا المتصفح).")}</p> : (
              <ul className="mb-3 divide-y divide-line/70">
                {scenarios.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-2 py-1.5 text-[12.5px]">
                    <input type="checkbox" checked={compare.includes(s.id)} disabled={!compare.includes(s.id) && compare.length >= 3} onChange={(e) => setCompare((c) => (e.target.checked ? [...c, s.id] : c.filter((x) => x !== s.id)))} aria-label={`compare ${s.name}`} />
                    <span className="font-medium">{s.name}</span>
                    <span className="text-[11px] text-ink-500">{lb("preset", s.preset)} · {new Date(s.createdAt).toLocaleString(locale === "ar" ? "ar-JO-u-nu-latn" : "en-GB")}</span>
                    <div className="ms-auto flex gap-1">
                      <Button size="xs" onClick={() => update({ params: s.params, preset: s.preset, name: s.name })}>{L("Load", "تحميل")}</Button>
                      <Button size="xs" onClick={() => saveScenario({ ...s, id: `sc-${Date.now().toString(36)}`, name: `${s.name} (${L("copy", "نسخة")})`, createdAt: new Date().toISOString() })}><Copy size={11} /></Button>
                      <Button size="xs" variant="ghost" onClick={() => { deleteScenario(s.id); setCompare((c) => c.filter((x) => x !== s.id)); }} aria-label={L("Delete", "حذف")}><Trash2 size={12} /></Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="thin-scroll overflow-x-auto">
              <table className="w-full min-w-[640px] text-[12.5px]">
                <thead><tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-500"><th className="py-1.5 text-start">{L("Indicator", "المؤشر")} ({year})</th>{comparison[0].values.map((v) => <th key={v.name} className="px-2 text-end">{v.name}</th>)}</tr></thead>
                <tbody>
                  {comparison.map((row) => (
                    <tr key={row.key} className="border-b border-line/60"><td className="py-1.5 text-ink-700">{tx(IMPACT_META[row.key].label)} <span className="text-[10.5px] text-ink-400">({tx(IMPACT_META[row.key].unit)})</span></td>{row.values.map((v) => <td key={v.name} className="px-2 text-end tabular">{IMPACT_META[row.key].fmt(v.value)}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 flex items-center gap-2 text-[11px] text-ink-500"><NatureBadge nature="SIMULATED" />{L("Planning norms are adjustable defaults, not ministry standards.", "معايير التخطيط قيم افتراضية قابلة للتعديل وليست معايير وزارية.")}</div>
          </Panel>
        </div>
      </div>

      <Modal open={saveOpen} onOpenChange={setSaveOpen} title={L("Save scenario", "حفظ السيناريو")} footer={<><Button onClick={() => setSaveOpen(false)}>{t("cancel")}</Button><Button variant="primary" onClick={() => doSave(false)} disabled={!name.trim()}>{t("save")}</Button></>}>
        <Field label={L("Scenario name", "اسم السيناريو")}><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
      </Modal>
    </div>
  );
}
