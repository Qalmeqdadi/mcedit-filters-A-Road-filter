"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useApp } from "@/store/app";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader, Panel, Callout } from "@/components/ui/panel";
import { Kpi } from "@/components/ui/kpi";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/form";
import { EChart } from "@/components/charts/echart";
import { line, VIZ } from "@/components/charts/builders";
import { JordanMap } from "@/features/gis/JordanMap";
import { compareLevers, DEFAULT_WATER, simulateWater, type Lever, type WaterParams } from "@/simulation/lab/water";
import { downloadCsv } from "@/lib/csv";
import { navIndex } from "@/lib/nav";
import { fmt1, fmtInt, fmtPct } from "@/lib/format";
import type { GovId } from "@/types/census";
import { Formula, LabBar, Method, SimpleTable, useLab } from "./shared";

export function Water() {
  const { world, areaFor, baseYear, year, scenarioName } = useLab();
  const { t, tx, L, ar } = useI18n();
  const govId = useApp((s) => s.govId);
  const selectGov = useApp((s) => s.selectGov);
  const [p, setP] = useState<WaterParams>(DEFAULT_WATER);
  const dp = useDeferredValue(p);
  const set = <K extends keyof WaterParams>(k: K, v: WaterParams[K]) => setP((s) => ({ ...s, [k]: v }));
  const res = useMemo(() => simulateWater(world, areaFor, baseYear, 2050, dp, year), [world, areaFor, baseYear, dp, year]);
  const levers = useMemo(() => compareLevers(world, areaFor, baseYear, dp, year), [world, areaFor, baseYear, dp, year]);
  const series = govId ? res.byGov[govId] : res.national;
  const at = series.find((x) => x.year === year)!;
  const risk = res.risk.find((x) => x.year === year)!;
  const scopeName = govId ? tx(world.gov[govId].name) : L("Jordan", "الأردن");
  const leverName = (id: Lever["id"]) => ({ NRW: L("Cut non-revenue water by 15 points", "خفض المياه غير المحاسب عليها 15 نقطة"), DEMAND: L("Demand management −10% per person", "إدارة الطلب −10% للفرد"), DESAL: L("+100 MCM/yr desalination", "+100 م.م³/سنة تحلية"), REUSE: L("Reuse treated wastewater to free +5% fresh water", "إعادة استخدام المياه المعالجة لتوفير +5% من المياه العذبة") })[id];

  const chart = useMemo(() => {
    const years = series.map((x) => x.year);
    const o = line(years, [
      { name: L("Water requirement", "الاحتياج المائي"), data: series.map((x) => Math.round(x.requirement)), color: VIZ[5] },
      { name: L("Supply (no drought)", "الإمداد (دون جفاف)"), data: series.map((x) => Math.round(x.supply)), color: VIZ[0], area: true },
    ], { rtl: ar, fmt: (v) => `${fmtInt(v)}`, markX: year });
    if (!govId) {
      const s = o.series as Record<string, unknown>[];
      s.push({ type: "line", name: L("Drought range (10–90%)", "نطاق الجفاف (10–90%)"), stack: "band", data: res.risk.map((r) => Math.round(r.p10 * res.national.find((n) => n.year === r.year)!.requirement)), lineStyle: { opacity: 0 }, symbol: "none", areaStyle: { opacity: 0 }, tooltip: { show: false } });
      s.push({ type: "line", name: L("Drought range (10–90%)", "نطاق الجفاف (10–90%)"), stack: "band", data: res.risk.map((r) => Math.round((r.p90 - r.p10) * res.national.find((n) => n.year === r.year)!.requirement)), lineStyle: { opacity: 0 }, symbol: "none", itemStyle: { color: VIZ[0] }, areaStyle: { color: VIZ[0], opacity: 0.12 }, tooltip: { show: false } });
    }
    return o;
  }, [series, res, ar, year, govId, L]);
  const lpcdChart = useMemo(() => line(series.map((x) => x.year), [{ name: L("Delivered litres / person / day", "لتر/فرد/يوم موزع"), data: series.map((x) => Math.round(x.deliveredLpcd)), color: VIZ[2] }], { rtl: ar, markX: year }), [series, ar, year, L]);

  const shortfall = Object.fromEntries(world.governorates.map((g) => [g.id, Math.max(0, 1 - res.byGov[g.id].find((x) => x.year === year)!.ratio)])) as Record<GovId, number>;
  const exportCsv = () => downloadCsv("water-balance.csv", world.governorates.flatMap((g) => res.byGov[g.id].map((x) => ({ governorate: g.name.en, year: x.year, population: Math.round(x.population), consumption_mcm: x.consumption.toFixed(2), requirement_mcm: x.requirement.toFixed(2), supply_mcm: x.supply.toFixed(2), gap_mcm: x.gap.toFixed(2), supply_ratio: x.ratio.toFixed(3), delivered_lpcd: x.deliveredLpcd.toFixed(1), nrw: x.nrw.toFixed(3), scenario: scenarioName, data_nature: "SIMULATED" }))));

  return (
    <div>
      <PageHeader index={navIndex("/water")} title={t("navWater")} subtitle={L("When does each governorate's municipal water demand outgrow supply, how likely are drought shortfalls, and which levers close the gap most cheaply? Projected population drives demand; supply, losses and new sources are adjustable assumptions.", "متى يتجاوز الطلب البلدي على المياه الإمداد في كل محافظة، وما احتمال العجز في سنوات الجفاف، وما الأدوات الأقل كلفة لسد الفجوة؟ يقود السكان المسقطون الطلب؛ أما الإمداد والفاقد والمصادر الجديدة فافتراضات قابلة للتعديل.")}>
        <Button onClick={exportCsv}>{t("exportCsv")}</Button>
      </PageHeader>
      <LabBar />
      <Callout tone="sim" className="mb-3">{L("Supply volumes, losses and unit costs are illustrative assumptions, not Ministry of Water & Irrigation statistics. The model shows the method; load official data before quoting results.", "أحجام الإمداد والفاقد وتكاليف الوحدة افتراضات توضيحية وليست إحصاءات وزارة المياه والري. يوضح النموذج المنهجية؛ يجب تحميل البيانات الرسمية قبل الاستشهاد بالنتائج.")}</Callout>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label={`${L("Requirement", "الاحتياج")} ${year}`} value={`${fmtInt(at.requirement)}`} sub={`MCM · ${scopeName}`} nature="SIMULATED" sources={["SIM_WATER", "SIM_SMALL_AREA"]} />
        <Kpi label={`${L("Supply", "الإمداد")} ${year}`} value={`${fmtInt(at.supply)}`} sub={`MCM · ${fmtPct(at.ratio, 0)} ${L("of requirement", "من الاحتياج")}`} tone={at.ratio < 0.9 ? "crit" : at.ratio < 1 ? "warn" : "ok"} nature="SIMULATED" />
        <Kpi label={L("Gap", "الفجوة")} value={`${fmtInt(at.gap)}`} sub="MCM / yr" tone={at.gap > 0 ? "crit" : "ok"} nature="SIMULATED" />
        <Kpi label={L("Delivered per person", "الموزع للفرد")} value={`${fmtInt(at.deliveredLpcd)}`} sub={`l/p/d · ${L("demand", "الطلب")} ${fmtInt(p.lpcd * (1 + p.lpcdChange))}`} nature="SIMULATED" />
        <Kpi label={L("First stress year", "أول سنة إجهاد")} value={String((govId ? res.stressYear[govId] : res.nationalStressYear) ?? "—")} sub={L("supply < 90% of need", "الإمداد < 90% من الحاجة")} nature="SIMULATED" />
        <Kpi label={L("Drought shortfall risk", "خطر العجز عند الجفاف")} value={fmtPct(govId ? res.govRisk[govId] : risk.pShortfall, 0)} sub={`${L("P(supply < 85%)", "احتمال الإمداد < 85%")} · ${year}`} tone={(govId ? res.govRisk[govId] : risk.pShortfall) > 0.25 ? "crit" : undefined} nature="SIMULATED" />
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-[300px_minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title={L("Assumptions", "الافتراضات")} nature="SIMULATED" sources={["SIM_WATER"]} actions={<Button size="xs" onClick={() => setP(DEFAULT_WATER)}>{t("reset")}</Button>}>
          <div className="space-y-3">
            <Slider label={L("Consumption per person", "الاستهلاك للفرد")} value={p.lpcd} min={60} max={160} step={5} onChange={(v) => set("lpcd", v)} format={(v) => `${v} l/p/d`} />
            <Slider label={L("Demand management by 2040", "إدارة الطلب حتى 2040")} value={p.lpcdChange} min={-0.3} max={0.15} step={0.01} onChange={(v) => set("lpcdChange", v)} format={(v) => `${v > 0 ? "+" : ""}${Math.round(v * 100)}%`} />
            <Slider label={L("Non-revenue water today", "المياه غير المحاسب عليها حالياً")} value={p.nrwBase} min={0.2} max={0.6} step={0.01} onChange={(v) => setP((s) => ({ ...s, nrwBase: v, nrwTarget: Math.min(s.nrwTarget, v) }))} format={(v) => fmtPct(v, 0)} />
            <Slider label={L("Non-revenue water target 2040", "هدف المياه غير المحاسب عليها 2040")} value={p.nrwTarget} min={0.15} max={p.nrwBase} step={0.01} onChange={(v) => set("nrwTarget", v)} format={(v) => fmtPct(v, 0)} />
            <Slider label={L("Groundwater / surface decline", "تراجع المياه الجوفية / السطحية")} value={p.decline} min={0} max={0.03} step={0.001} onChange={(v) => set("decline", v)} format={(v) => `${(v * 100).toFixed(1)}%/yr`} />
            <Slider label={L("New desalination supply", "إمداد تحلية جديد")} value={p.newSupplyMcm} min={0} max={600} step={25} onChange={(v) => set("newSupplyMcm", v)} format={(v) => `${v} MCM/yr`} />
            <Slider label={L("…online from", "…يبدأ التشغيل")} value={p.newSupplyYear} min={2027} max={2040} step={1} onChange={(v) => set("newSupplyYear", v)} format={(v) => String(v)} />
            <Slider label={L("Drought probability / year", "احتمال الجفاف سنوياً")} value={p.droughtProb} min={0} max={0.5} step={0.05} onChange={(v) => set("droughtProb", v)} format={(v) => fmtPct(v, 0)} />
            <Slider label={L("Drought severity", "شدة الجفاف")} value={p.droughtSeverity} min={0.05} max={0.35} step={0.01} onChange={(v) => set("droughtSeverity", v)} format={(v) => `−${Math.round(v * 100)}%`} />
          </div>
        </Panel>
        <Panel title={`${L("Requirement vs supply", "الاحتياج مقابل الإمداد")} — ${scopeName}`} subtitle={govId ? undefined : L("Shaded: 10th–90th percentile supply across 400 drought simulations", "المظلل: المئين 10–90 للإمداد عبر 400 محاكاة جفاف")} nature="SIMULATED" sources={["SIM_WATER"]}>
          <EChart option={chart} height={300} />
          <EChart option={lpcdChart} height={150} />
        </Panel>
        <JordanMap height={470} title={`${L("Supply shortfall", "عجز الإمداد")} ${year}`} govValues={shortfall} scale="risk" domain={[0, 0.35]} format={(v) => fmtPct(v, 0)} legendTitle={L("1 − supply ÷ requirement", "1 − الإمداد ÷ الاحتياج")} selectedGov={govId} onSelectGov={selectGov} districtMode="drill" tooltipExtra={(kind, id) => (kind === "gov" ? <span>{L("First stress year", "أول سنة إجهاد")}: <b>{res.stressYear[id as GovId] ?? "—"}</b> · {L("drought risk", "خطر الجفاف")} {fmtPct(res.govRisk[id as GovId], 0)}</span> : null)} sources={["SIM_WATER"]} />
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Panel title={`${L("What closes the national gap in", "ما الذي يسد الفجوة الوطنية في")} ${year}?`} subtitle={`${L("Gap without action", "الفجوة دون إجراء")}: ${fmtInt(levers.baseGap)} MCM`} nature="SIMULATED" sources={["SIM_WATER"]}>
          <SimpleTable
            minWidth={520}
            head={[L("Lever", "الأداة"), L("Gap closed (MCM)", "الفجوة المغلقة (م.م³)"), L("Capex (JOD M)", "الكلفة (مليون دينار)"), L("JOD M per MCM", "مليون دينار لكل م.م³"), L("In package", "ضمن الحزمة")]}
            rows={levers.levers.map((l) => [leverName(l.id), fmt1(l.gapClosed), fmtInt(l.costM), fmt1(l.costPerMcm), levers.package.includes(l.id) ? <b key="y" className="text-ok">✓</b> : "—"])}
          />
          <p className="mt-2 text-[12px] text-ink-500">{levers.baseGap <= 0 ? L("No national gap in this year under these assumptions.", "لا توجد فجوة وطنية في هذه السنة وفق هذه الافتراضات.") : L("Package = cheapest levers per MCM first, until the gap is closed. Unit costs are illustrative.", "الحزمة = الأدوات الأقل كلفة لكل م.م³ أولاً حتى تُسد الفجوة. تكاليف الوحدة توضيحية.")}</p>
        </Panel>
        <Panel title={L("Governorates", "المحافظات")} nature="SIMULATED" sources={["SIM_WATER"]}>
          <SimpleTable
            minWidth={520}
            head={[t("governorate"), L("Stress year", "سنة الإجهاد"), `${L("Supply ratio", "نسبة الإمداد")} ${year}`, "l/p/d", L("Drought risk", "خطر الجفاف")]}
            rows={[...world.governorates].sort((a, b) => (res.stressYear[a.id] ?? 2100) - (res.stressYear[b.id] ?? 2100)).map((g) => {
              const x = res.byGov[g.id].find((y) => y.year === year)!;
              return [<b key="g">{tx(g.name)}</b>, String(res.stressYear[g.id] ?? "—"), <span key="r" className={x.ratio < 0.9 ? "font-semibold text-crit" : ""}>{fmtPct(x.ratio, 0)}</span>, fmtInt(x.deliveredLpcd), fmtPct(res.govRisk[g.id], 0)];
            })}
          />
        </Panel>
      </div>
      <Method>
        <Formula>{"requirement = population × l/p/d × 365 ÷ 10⁹ ÷ (1 − NRW)          supply = conventional × (1 − decline)^t + new supply (3-year ramp)"}</Formula>
        <Formula>{"delivered l/p/d = supply × (1 − NRW) ÷ population   ·   drought: P(year) = p, conventional × (1 − severity × U(0.6, 1.4))"}</Formula>
        <p>{L("Base-year conventional supply per governorate is the base requirement × a seeded headroom factor (0.90–1.10). New desalination supply is allocated to governorates in proportion to their deficit in its first year. Each lever is applied alone to the same assumptions to measure the gap it closes.", "الإمداد التقليدي لسنة الأساس في كل محافظة = احتياج الأساس × معامل هامش مبذور (0.90–1.10). يُوزَّع إمداد التحلية الجديد على المحافظات بنسبة عجزها في سنته الأولى. تُطبَّق كل أداة منفردة على الافتراضات نفسها لقياس الفجوة التي تسدها.")}</p>
      </Method>
    </div>
  );
}
