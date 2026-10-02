"use client";

import { useMemo } from "react";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader, Panel } from "@/components/ui/panel";
import { Kpi } from "@/components/ui/kpi";
import { EChart } from "@/components/charts/echart";
import { barH, VIZ } from "@/components/charts/builders";
import { GovTable, MetricMap, ScopeBar, SmallSample, useProfiles } from "./shared";
import { ATTAINMENTS } from "@/simulation/analytics";
import { fmtCompact, fmtPct } from "@/lib/format";
import { navIndex } from "@/lib/nav";

export function Education() {
  const { t, L, lb, ar, locale } = useI18n();
  const { profile: p } = useProfiles();
  const E = p.education;
  const bySex = useMemo(() => {
    const m = ATTAINMENTS.reduce((s, k) => s + E.attainmentBySex.m[k], 0) || 1;
    const f = ATTAINMENTS.reduce((s, k) => s + E.attainmentBySex.f[k], 0) || 1;
    return barH(ATTAINMENTS.map((k) => lb("attainment", k)), [{ name: t("males"), data: ATTAINMENTS.map((k) => E.attainmentBySex.m[k] / m), color: VIZ[0] }, { name: t("females"), data: ATTAINMENTS.map((k) => E.attainmentBySex.f[k] / f), color: VIZ[1] }], { rtl: ar, fmt: (v) => fmtPct(v, 0) });
  }, [E, ar, t, lb]);
  return (
    <div>
      <PageHeader index={navIndex("/education")} title={t("nav14")} subtitle={L("School-age and university-age populations, enrolment and educational attainment (population 25+).", "السكان في سن المدرسة وسن الجامعة، والالتحاق، والتحصيل العلمي (السكان 25 سنة فأكثر).")} />
      <ScopeBar />
      <SmallSample p={p} />
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label={L("School-age population (6–17)", "السكان في سن المدرسة (6–17)")} value={fmtCompact(E.schoolAge, locale)} nature="SIMULATED" sources={["SIM_MICRODATA"]} />
        <Kpi label={L("Currently enrolled (6–17)", "الملتحقون حالياً (6–17)")} value={fmtPct(E.schoolEnrolled / Math.max(1, E.schoolAge))} nature="SIMULATED" />
        <Kpi label={L("University-age population (18–23)", "السكان في سن الجامعة (18–23)")} value={fmtCompact(E.uniAge, locale)} nature="SIMULATED" />
        <Kpi label={L("Enrolled (18–23)", "الملتحقون (18–23)")} value={fmtPct(E.uniEnrolled / Math.max(1, E.uniAge))} nature="SIMULATED" />
        <Kpi label={L("Secondary completion proxy (25+)", "مؤشر إتمام الثانوية (25+)")} value={fmtPct(E.secondaryPlus25 / Math.max(1, E.pop25))} nature="SIMULATED" />
        <Kpi label={L("University qualification (25+)", "مؤهل جامعي (25+)")} value={fmtPct(E.university25 / Math.max(1, E.pop25))} nature="SIMULATED" />
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <MetricMap metric={(x) => x.education.university25 / Math.max(1, x.education.pop25)} format={(v) => fmtPct(v, 0)} legend={L("University qualification 25+", "مؤهل جامعي 25+")} height={420} />
        <Panel title={L("Population 25+ by educational level and sex", "السكان 25+ حسب المستوى التعليمي والجنس")} nature="SIMULATED" sources={["SIM_MICRODATA"]}><EChart option={bySex} height={370} /></Panel>
      </div>
      <Panel className="mt-3" title={L("Governorate comparison", "مقارنة المحافظات")} nature="SIMULATED">
        <GovTable cols={[
          { key: "sa", label: L("School-age", "سن المدرسة"), get: (x) => x.education.schoolAge, fmt: (v) => fmtCompact(v, locale) },
          { key: "enr", label: L("Enrolled 6–17", "ملتحقون 6–17"), get: (x) => x.education.schoolEnrolled / Math.max(1, x.education.schoolAge), fmt: (v) => fmtPct(v) },
          { key: "ua", label: L("Uni-age", "سن الجامعة"), get: (x) => x.education.uniAge, fmt: (v) => fmtCompact(v, locale) },
          { key: "uenr", label: L("Enrolled 18–23", "ملتحقون 18–23"), get: (x) => x.education.uniEnrolled / Math.max(1, x.education.uniAge), fmt: (v) => fmtPct(v) },
          { key: "sec", label: L("Secondary+ (25+)", "ثانوي فأعلى (25+)"), get: (x) => x.education.secondaryPlus25 / Math.max(1, x.education.pop25), fmt: (v) => fmtPct(v) },
          { key: "uni", label: L("University (25+)", "جامعي (25+)"), get: (x) => x.education.university25 / Math.max(1, x.education.pop25), fmt: (v) => fmtPct(v) },
          { key: "none", label: L("No schooling (25+)", "بدون تعليم (25+)"), get: (x) => x.education.attainment25.NONE / Math.max(1, x.education.pop25), fmt: (v) => fmtPct(v) },
        ]} />
      </Panel>
    </div>
  );
}
