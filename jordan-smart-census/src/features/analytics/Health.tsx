"use client";

import { useMemo } from "react";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader, Panel, Callout } from "@/components/ui/panel";
import { Kpi } from "@/components/ui/kpi";
import { EChart } from "@/components/charts/echart";
import { barH, barV, VIZ } from "@/components/charts/builders";
import { GovTable, MetricMap, ScopeBar, SmallSample, useProfiles } from "./shared";
import { WG_DOMAINS } from "@/simulation/analytics";
import { fmtCompact, fmtPct } from "@/lib/format";
import { navIndex } from "@/lib/nav";

export function Health() {
  const { t, L, lb, ar, locale } = useI18n();
  const { profile: p } = useProfiles();
  const Hh = p.health;
  const wgChart = useMemo(() => barH(WG_DOMAINS.map((d) => lb("wgDomain", d)), [2, 3, 4].map((lvl, i) => ({ name: lb("wgLevel", lvl), data: WG_DOMAINS.map((d) => Hh.wg[d][lvl - 1] / Math.max(1, Hh.pop5plus)), color: [VIZ[4], VIZ[1], VIZ[5]][i] })), { rtl: ar, stack: true, fmt: (v) => fmtPct(v, 1) }), [Hh, ar, lb]);
  const ageChart = useMemo(() => barV(Hh.byBand.map((b) => b.band), [{ name: L("Disability prevalence", "انتشار الإعاقة"), data: Hh.byBand.map((b) => b.disabled / Math.max(1, b.pop)), color: VIZ[3] }], { rtl: ar, fmt: (v) => fmtPct(v, 0) }), [Hh, ar, L]);
  return (
    <div>
      <PageHeader index={navIndex("/health")} title={t("nav15")} subtitle={L("Health insurance coverage and functional difficulty in six domains, following the Washington Group short-set approach (population aged 5+).", "التغطية بالتأمين الصحي وصعوبات الأداء الوظيفي في ستة مجالات وفق نهج مجموعة واشنطن المختصر (السكان 5 سنوات فأكثر).")} />
      <ScopeBar />
      <SmallSample p={p} />
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <Kpi label={L("Health insurance coverage", "التغطية بالتأمين الصحي")} value={fmtPct(Hh.insured / Math.max(1, p.population))} nature="SIMULATED" sources={["SIM_MICRODATA"]} />
        <Kpi label={L("Disability prevalence (WG-SS cut-off)", "انتشار الإعاقة (حد مجموعة واشنطن)")} value={fmtPct(Hh.disability / Math.max(1, Hh.pop5plus))} sub={L("≥ 1 domain with ‘a lot of difficulty’ or ‘cannot do at all’", "مجال واحد على الأقل بـ«صعوبة كبيرة» أو «لا يستطيع إطلاقاً»")} nature="SIMULATED" />
        <Kpi label={L("Persons with disability (5+)", "الأفراد ذوو الإعاقة (5+)")} value={fmtCompact(Hh.disability, locale)} nature="SIMULATED" />
        <Kpi label={L("Prevalence 75+", "الانتشار 75+")} value={fmtPct(Hh.byBand[4].disabled / Math.max(1, Hh.byBand[4].pop))} nature="SIMULATED" />
      </div>
      <Callout className="mt-3">{L("Domains: seeing, hearing, walking/climbing steps, remembering/concentrating, self-care, communicating. Answer categories: no difficulty, some difficulty, a lot of difficulty, cannot do at all. Synthetic prevalence rises with age.", "المجالات: الرؤية، السمع، المشي/صعود الدرج، التذكر/التركيز، العناية الذاتية، التواصل. فئات الإجابة: لا صعوبة، بعض الصعوبة، صعوبة كبيرة، لا يستطيع إطلاقاً. يرتفع الانتشار الاصطناعي مع العمر.")}</Callout>
      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title={L("Difficulty by domain (share of population 5+)", "الصعوبة حسب المجال (نسبة السكان 5+)")} nature="SIMULATED" sources={["SIM_MICRODATA"]}><EChart option={wgChart} height={300} /></Panel>
        <Panel title={L("Disability prevalence by age", "انتشار الإعاقة حسب العمر")} nature="SIMULATED"><EChart option={ageChart} height={300} /></Panel>
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <MetricMap metric={(x) => x.health.insured / Math.max(1, x.population)} format={(v) => fmtPct(v, 0)} legend={L("Health insurance", "التأمين الصحي")} scale="pct" height={400} />
        <Panel title={L("Governorate comparison", "مقارنة المحافظات")} nature="SIMULATED">
          <GovTable cols={[
            { key: "ins", label: L("Insured", "مؤمّنون"), get: (x) => x.health.insured / Math.max(1, x.population), fmt: (v) => fmtPct(v, 0) },
            { key: "dis", label: L("Disability", "إعاقة"), get: (x) => x.health.disability / Math.max(1, x.health.pop5plus), fmt: (v) => fmtPct(v) },
            { key: "see", label: lb("wgDomain", "seeing"), get: (x) => (x.health.wg.seeing[2] + x.health.wg.seeing[3]) / Math.max(1, x.health.pop5plus), fmt: (v) => fmtPct(v) },
            { key: "walk", label: lb("wgDomain", "walking"), get: (x) => (x.health.wg.walking[2] + x.health.wg.walking[3]) / Math.max(1, x.health.pop5plus), fmt: (v) => fmtPct(v) },
            { key: "e", label: "65+", get: (x) => x.groups.a65 / x.population, fmt: (v) => fmtPct(v) },
          ]} />
        </Panel>
      </div>
    </div>
  );
}
