"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useApp } from "@/store/app";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader, Panel, Callout } from "@/components/ui/panel";
import { Kpi } from "@/components/ui/kpi";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/form";
import { EChart } from "@/components/charts/echart";
import { barH, VIZ } from "@/components/charts/builders";
import { JordanMap } from "@/features/gis/JordanMap";
import { assessFinance, DEFAULT_FINANCE, type FinanceParams } from "@/simulation/lab/finance";
import type { ActionItem } from "@/simulation/lab/actions";
import { downloadCsv } from "@/lib/csv";
import { navIndex } from "@/lib/nav";
import { fmtInt, fmtPct } from "@/lib/format";
import type { GovId } from "@/types/census";
import { AreaActions } from "@/features/lab/ActionCard";
import { Formula, LabBar, Method, SimpleTable, useLab, usePlans } from "@/features/lab/shared";
import { jod } from "@/features/delivery/parts";

export function Finance() {
  const { world, year, scenarioName } = useLab();
  const { t, tx, L, ar, locale } = useI18n();
  const govId = useApp((s) => s.govId);
  const selectGov = useApp((s) => s.selectGov);
  const { plans, snap } = usePlans();
  const [p, setP] = useState<FinanceParams>(DEFAULT_FINANCE);
  const dp = useDeferredValue(p);
  const set = <K extends keyof FinanceParams>(k: K, v: FinanceParams[K]) => setP((s) => ({ ...s, [k]: v }));
  const res = useMemo(() => (plans && snap ? assessFinance(world, snap.sa0, year, Object.fromEntries(world.governorates.map((g) => [g.id, plans.plans[g.id].actions])) as Record<GovId, ActionItem[]>, snap.economy, snap.land, { ...dp, ownRevenueImported: snap.ownRevenuePc }) : null), [plans, snap, world, year, dp]);
  const govs = useMemo(() => (res ? [...world.governorates].sort((a, b) => res.byGov[a.id].coverage - res.byGov[b.id].coverage) : []), [res, world]);
  const chart = useMemo(() => (res ? barH(govs.map((g) => tx(g.name)), [
    { name: L("Fiscal space", "الحيز المالي"), data: govs.map((g) => Math.round(Math.min(res.byGov[g.id].spaceM, res.byGov[g.id].needM))), color: VIZ[0] },
    { name: L("Land-value capture", "استعادة قيمة الأراضي"), data: govs.map((g) => Math.round(res.byGov[g.id].lvcM)), color: VIZ[2] },
    { name: L("PPP", "الشراكة"), data: govs.map((g) => Math.round(res.byGov[g.id].pppM)), color: VIZ[3] },
    { name: L("Grants", "المنح"), data: govs.map((g) => Math.round(res.byGov[g.id].grantsM)), color: VIZ[4] },
    { name: L("Unfunded", "غير ممول"), data: govs.map((g) => Math.round(res.byGov[g.id].residualGapM)), color: "#b5453a" },
  ], { rtl: ar, stack: true, legend: true, fmt: (v) => `${fmtInt(v)}` }) : null), [res, govs, tx, ar, L]);
  const govVals = res ? (Object.fromEntries(world.governorates.map((g) => [g.id, Math.min(1.5, res.byGov[g.id].coverage)])) as Record<GovId, number>) : undefined;
  const exportCsv = () => res && downloadCsv(`municipal-finance-${year}.csv`, world.governorates.map((g) => { const f = res.byGov[g.id]; return { governorate: g.name.en, investment_need_jod_m: Math.round(f.needM), central_capital_per_year_jod_m: f.centralM.toFixed(1), own_source_capital_per_year_jod_m: f.ownM.toFixed(1), own_revenue_per_resident_jod: f.ownRevenuePc.toFixed(1), fiscal_space_jod_m: Math.round(f.spaceM), coverage: f.coverage.toFixed(2), gap_jod_m: Math.round(f.gapM), land_value_capture_jod_m: Math.round(f.lvcM), ppp_jod_m: Math.round(f.pppM), grants_jod_m: Math.round(f.grantsM), unfunded_jod_m: Math.round(f.residualGapM), revenue_source: f.imported ? "imported" : "modelled", horizon: year, scenario: scenarioName, data_nature: "SIMULATED" }; }));

  return (
    <div>
      <PageHeader index={navIndex("/municipal-finance")} title={t("navFinance")} subtitle={L("Can the plans be paid for? Every governorate's corrective actions are costed and set against central capital transfers and municipal own-source revenue to the horizon; the gap is then matched with land-value capture, public–private partnerships and grants.", "هل يمكن تمويل الخطط؟ تُسعَّر الإجراءات التصحيحية لكل محافظة وتُقارن بالتحويلات الرأسمالية المركزية والإيرادات البلدية الذاتية حتى الأفق؛ ثم تُغطى الفجوة باستعادة قيمة الأراضي والشراكة بين القطاعين والمنح.")}>
        <Button onClick={exportCsv} disabled={!res}>{t("exportCsv")}</Button>
      </PageHeader>
      <LabBar />
      {!res ? <p className="py-10 text-center text-[13px] text-ink-500">{L("Costing the action plans…", "جارٍ تسعير خطط العمل…")}</p> : (
        <>
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
            <Kpi label={L(`Investment need to ${year}`, `الاحتياج الاستثماري حتى ${year}`)} value={jod(res.national.needM, locale)} nature="SIMULATED" sources={["SIM_FINANCE", "SIM_ACTIONS"]} />
            <Kpi label={L("Fiscal space", "الحيز المالي")} value={jod(res.national.spaceM, locale)} sub={`${res.years} ${L("years", "سنة")}`} nature="SIMULATED" />
            <Kpi label={L("Coverage", "التغطية")} value={fmtPct(Math.min(1, res.national.coverage), 0)} tone={res.national.coverage < 0.6 ? "crit" : res.national.coverage < 0.9 ? "warn" : "ok"} nature="SIMULATED" />
            <Kpi label={L("Funding gap", "الفجوة التمويلية")} value={jod(res.national.gapM, locale)} nature="SIMULATED" />
            <Kpi label={L("Closed by LVC, PPP and grants", "تُسد بالأراضي والشراكة والمنح")} value={jod(res.national.lvcM + res.national.pppM + res.national.grantsM, locale)} tone="ok" nature="SIMULATED" />
            <Kpi label={L("Still unfunded", "ما زال غير ممول")} value={jod(res.national.residualGapM, locale)} sub={L("phase or reprioritise", "جدولة أو إعادة ترتيب")} tone="crit" nature="SIMULATED" />
          </div>
          <div className="mt-3 grid gap-3 xl:grid-cols-[300px_minmax(0,1fr)]">
            <Panel title={t("assumptions")} nature="SIMULATED" sources={["SIM_FINANCE"]} actions={<Button size="xs" onClick={() => setP(DEFAULT_FINANCE)}>{t("reset")}</Button>}>
              <div className="space-y-3.5">
                <Slider label={L("Central capital budget (all governorates)", "الموازنة الرأسمالية المركزية (كل المحافظات)")} value={p.nationalCapitalM} min={400} max={3000} step={50} onChange={(v) => set("nationalCapitalM", v)} format={(v) => `JOD ${fmtInt(v)}M/yr`} />
                <Slider label={L("Share available for new projects", "الحصة المتاحة لمشاريع جديدة")} value={p.newInvestmentShare} min={0.1} max={0.8} step={0.05} onChange={(v) => set("newInvestmentShare", v)} format={(v) => fmtPct(v, 0)} />
                <Slider label={L("Equalisation for poorer governorates", "التسوية للمحافظات الأقل دخلاً")} value={p.equalisation} min={0} max={1.5} step={0.1} onChange={(v) => set("equalisation", v)} format={(v) => v.toFixed(1)} />
                <Slider label={L("Municipal own revenue per resident", "الإيراد البلدي الذاتي للفرد")} value={p.ownRevenuePc} min={15} max={120} step={1} onChange={(v) => set("ownRevenuePc", v)} format={(v) => `JOD ${v}`} />
                <Slider label={L("Land-value capture", "استعادة قيمة الأراضي")} value={p.lvcPerM2} min={0} max={25} step={1} onChange={(v) => set("lvcPerM2", v)} format={(v) => `JOD ${v}/m²`} />
              </div>
            </Panel>
            <Panel title={L("How each governorate's plan is funded", "كيف تُمول خطة كل محافظة")} subtitle={L("JOD million to the horizon, lowest coverage first", "مليون دينار حتى الأفق، الأقل تغطية أولاً")} nature="SIMULATED" sources={["SIM_FINANCE"]}>{chart ? <EChart option={chart} height={420} /> : null}</Panel>
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <JordanMap height={420} title={L("Fiscal space ÷ investment need", "الحيز المالي ÷ الاحتياج الاستثماري")} govValues={govVals} scale="pct" domain={[0, 1.2]} format={(v) => fmtPct(v, 0)} legendTitle={L("Coverage", "التغطية")} selectedGov={govId} onSelectGov={selectGov} sources={["SIM_FINANCE"]} />
            <Panel title={L("Governorates", "المحافظات")} nature="SIMULATED" sources={["SIM_FINANCE"]}>
              <SimpleTable minWidth={620} head={[t("governorate"), L("Need", "الاحتياج"), L("Space", "الحيز"), L("Coverage", "التغطية"), L("Own revenue / resident", "الإيراد الذاتي للفرد"), L("Unfunded", "غير ممول")]}
                rows={govs.map((g) => { const f = res.byGov[g.id]; return [<b key="g">{tx(g.name)}{f.imported ? " *" : ""}</b>, jod(f.needM, locale), jod(f.spaceM, locale), <span key="c" className={f.coverage < 0.6 ? "font-semibold text-crit" : ""}>{fmtPct(Math.min(9, f.coverage), 0)}</span>, `JOD ${fmtInt(f.ownRevenuePc)}`, jod(f.residualGapM, locale)]; })} />
            </Panel>
          </div>
        </>
      )}
      <Callout tone="sim" className="mt-3">{L("Budget figures are illustrative parameters, not Ministry of Finance or municipal accounts. Import municipal revenue in Data Connectors to replace the modelled values.", "أرقام الموازنة معاملات توضيحية وليست حسابات وزارة المالية أو البلديات. استورد الإيرادات البلدية من موصلات البيانات لاستبدال القيم المنمذجة.")}</Callout>
      <AreaActions sectors={["FINANCE"]} />
      <Method>
        <Formula>{"need = Σ indicative cost of the governorate's actions   ·   central = budget × pop share × (1 + equalisation × (1 − income index))"}</Formula>
        <Formula>{"own revenue/resident = average × index^0.8 × (0.85 + 0.3 × urban share)   ·   space = (central + own × capital share) × years × new-project share"}</Formula>
        <Formula>{"LVC = new urban land (m²) × JOD per m²   ·   PPP = 40% of water, energy, mobility and hospital costs   ·   grants = 50% of equity and climate costs"}</Formula>
      </Method>
    </div>
  );
}
