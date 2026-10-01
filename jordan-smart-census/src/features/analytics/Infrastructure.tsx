"use client";

import { useMemo } from "react";
import { useApp } from "@/store/app";
import { useEngine } from "@/store/engine";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader, Panel, Callout } from "@/components/ui/panel";
import { Kpi } from "@/components/ui/kpi";
import { EChart } from "@/components/charts/echart";
import { barH, VIZ } from "@/components/charts/builders";
import { JordanMap } from "@/features/gis/JordanMap";
import { ScopeBar, useProfiles } from "./shared";
import { paramsForPreset, runScenario } from "@/simulation/scenarios";
import { fmt1, fmtPct, fmtSignedPct } from "@/lib/format";
import type { GovId } from "@/types/census";

export function Infrastructure() {
  const engine = useEngine();
  const { t, tx, L, ar } = useI18n();
  const { profile: p, govProfiles } = useProfiles();
  const selectGov = useApp((s) => s.selectGov);
  const govId = useApp((s) => s.govId);
  const world = engine.world;
  const run = useMemo(() => runScenario(world, world.totals.population, paramsForPreset("BASELINE")), [world]);
  const imp = run.impacts[2040];
  const services = (g: GovId) => {
    const x = govProfiles[g];
    const h = Math.max(1, x.households);
    return { water: x.housing.water.PUBLIC_NETWORK / h, sewer: x.housing.sanitation.PUBLIC_SEWER / h, elec: x.housing.electricity / h, net: x.housing.internet / h };
  };
  const gap = useMemo(() => {
    const govs = world.governorates;
    return barH(govs.map((g) => tx(g.name)), [
      { name: L("Not on public water network", "خارج شبكة المياه العامة"), data: govs.map((g) => 1 - services(g.id).water), color: VIZ[0] },
      { name: L("Not on public sewer", "خارج شبكة الصرف العامة"), data: govs.map((g) => 1 - services(g.id).sewer), color: VIZ[1] },
      { name: L("No home internet", "بدون إنترنت منزلي"), data: govs.map((g) => 1 - services(g.id).net), color: VIZ[3] },
    ], { rtl: ar, fmt: (v) => fmtPct(v, 0) });
  }, [world, govProfiles, tx, ar, L]); // eslint-disable-line react-hooks/exhaustive-deps
  const h = Math.max(1, p.households);
  const ranked = world.governorates.map((g) => ({ g, pr: imp.byGov[g.id] })).sort((a, b) => b.pr.pressure - a.pr.pressure);
  return (
    <div>
      <PageHeader index="17" title={t("nav17")} subtitle={L("Household access to networked services today, and a simulated infrastructure-pressure index combining projected growth in population, school-age and elderly populations (baseline scenario, 2040).", "وصول الأسر إلى الخدمات الشبكية حالياً، ومؤشر محاكى للضغط على البنية التحتية يجمع النمو المسقط في السكان وفي فئتي سن المدرسة وكبار السن (سيناريو خط الأساس، 2040).")} />
      <ScopeBar />
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <Kpi label={L("Public water network", "شبكة المياه العامة")} value={fmtPct(p.housing.water.PUBLIC_NETWORK / h)} nature="SIMULATED" sources={["SIM_MICRODATA"]} />
        <Kpi label={L("Public sewer", "شبكة الصرف العامة")} value={fmtPct(p.housing.sanitation.PUBLIC_SEWER / h)} nature="SIMULATED" />
        <Kpi label={L("Electricity", "الكهرباء")} value={fmtPct(p.housing.electricity / h)} nature="SIMULATED" />
        <Kpi label={L("Home internet", "الإنترنت المنزلي")} value={fmtPct(p.housing.internet / h)} nature="SIMULATED" />
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <JordanMap height={440} title={L("Infrastructure pressure index — 2040 baseline", "مؤشر الضغط على البنية التحتية — خط أساس 2040")} govValues={Object.fromEntries(world.governorates.map((g) => [g.id, imp.byGov[g.id].pressure])) as Record<GovId, number>} scale="risk" domain={[0, 100]} format={(v) => fmt1(v)} legendTitle={t("layerPressure")} selectedGov={govId} onSelectGov={selectGov} districtMode="drill" sources={["SIM_PROJECTION", "SIM_INFRA"]} />
        <Panel title={L("Service gaps by governorate", "فجوات الخدمات حسب المحافظة")} nature="SIMULATED" sources={["SIM_MICRODATA"]}><EChart option={gap} height={390} /></Panel>
      </div>
      <Callout className="mt-3">{L("Pressure index (0–100, relative): 45 × population growth + 30 × school-age growth + 15 × elderly growth + 10 × (1 − accessibility), rescaled so the highest governorate = 100. See Scenario Simulator to change assumptions.", "مؤشر الضغط (0–100، نسبي): 45 × نمو السكان + 30 × نمو سن المدرسة + 15 × نمو كبار السن + 10 × (1 − سهولة الوصول)، معاد تحجيمه بحيث تساوي أعلى محافظة 100. استخدم محاكي السيناريوهات لتغيير الافتراضات.")}</Callout>
      <Panel className="mt-3" title={L("Ranking — highest simulated pressure first", "الترتيب — الأعلى ضغطاً أولاً")} nature="SIMULATED" sources={["SIM_PROJECTION", "SIM_INFRA"]}>
        <div className="thin-scroll overflow-x-auto">
          <table className="w-full min-w-[640px] text-[12.5px]">
            <thead><tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-500"><th className="py-1.5 text-start">#</th><th className="text-start">{t("governorate")}</th><th className="text-end">{L("Pressure", "الضغط")}</th><th className="text-end">{L("Pop. growth → 2040", "نمو السكان ← 2040")}</th><th className="text-end">{L("School-age 2040", "سن المدرسة 2040")}</th><th className="text-end">65+ 2040</th><th className="text-end">{L("Water network", "شبكة المياه")}</th><th className="text-end">{L("Sewer", "الصرف")}</th></tr></thead>
            <tbody>
              {ranked.map(({ g, pr }, i) => {
                const basePop = run.series[0].population * (g.refPopulation / world.governorates.reduce((s, x) => s + x.refPopulation, 0));
                return (
                  <tr key={g.id} className="border-b border-line/60"><td className="py-1.5 text-ink-400 tabular">{i + 1}</td><td className="font-medium">{tx(g.name)}</td><td className="text-end"><span className="inline-block min-w-[38px] rounded bg-serious-bg px-1.5 text-center font-semibold text-serious tabular">{pr.pressure}</span></td><td className="text-end tabular">{fmtSignedPct(pr.population / basePop - 1)}</td><td className="text-end tabular">{fmt1(pr.age6_17 / 1000)}k</td><td className="text-end tabular">{fmt1(pr.age65plus / 1000)}k</td><td className="text-end tabular">{fmtPct(services(g.id).water)}</td><td className="text-end tabular">{fmtPct(services(g.id).sewer, 0)}</td></tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
