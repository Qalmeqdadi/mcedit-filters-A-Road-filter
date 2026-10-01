"use client";

import { useMemo } from "react";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader, Panel, Callout } from "@/components/ui/panel";
import { Kpi } from "@/components/ui/kpi";
import { EChart } from "@/components/charts/echart";
import { barH, VIZ } from "@/components/charts/builders";
import { CategoryBars } from "@/components/charts/common";
import { GovTable, MetricMap, ScopeBar, SmallSample, useProfiles } from "./shared";
import { OCCUPATIONS, SECTORS } from "@/simulation/analytics";
import { fmtCompact, fmtPct } from "@/lib/format";
import type { Profile } from "@/simulation/analytics";

const lfpr = (p: Profile) => (p.labour.employed + p.labour.unemployed) / Math.max(1, p.labour.employed + p.labour.unemployed + p.labour.outside);
const unemp = (p: Profile) => p.labour.unemployed / Math.max(1, p.labour.employed + p.labour.unemployed);

export function Labour() {
  const { t, L, lb, ar, locale } = useI18n();
  const { profile: p } = useProfiles();
  const y = p.labour.youth;
  const bands = useMemo(() => {
    const b = p.labour.byBand;
    return barH(b.map((x) => x.band), [
      { name: L("Men — participation proxy", "الرجال — مؤشر المشاركة"), data: b.map((x) => (x.mE + x.mU) / Math.max(1, x.mE + x.mU + x.mO)), color: VIZ[0] },
      { name: L("Women — participation proxy", "النساء — مؤشر المشاركة"), data: b.map((x) => (x.fE + x.fU) / Math.max(1, x.fE + x.fU + x.fO)), color: VIZ[1] },
    ], { rtl: ar, fmt: (v) => fmtPct(v, 0) });
  }, [p, ar, L]);
  return (
    <div>
      <PageHeader index="13" title={t("nav13")} subtitle={L("Synthetic census-derived labour indicators for the population aged 15+.", "مؤشرات عمل اصطناعية مشتقة من التعداد للسكان بعمر 15 سنة فأكثر.")} />
      <ScopeBar />
      <Callout tone="warn" className="mb-3">{L("The unemployment and participation figures below are SIMULATED proxies from synthetic microdata. They are not, and must never be quoted as, Jordan's official unemployment rate (published by DoS from the Employment & Unemployment Survey).", "أرقام البطالة والمشاركة أدناه مؤشرات محاكاة من بيانات جزئية اصطناعية. ليست معدل البطالة الرسمي في الأردن (الذي تنشره دائرة الإحصاءات العامة من مسح العمالة والبطالة) ولا يجوز اقتباسها على هذا الأساس.")}</Callout>
      <SmallSample p={p} />
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 xl:grid-cols-8">
        <Kpi label={t("workingAge")} value={fmtCompact(p.labour.workingAge, locale)} nature="SIMULATED" sources={["SIM_MICRODATA"]} />
        <Kpi label={L("Employed", "المشتغلون")} value={fmtCompact(p.labour.employed, locale)} nature="SIMULATED" />
        <Kpi label={L("Unemployed", "المتعطلون")} value={fmtCompact(p.labour.unemployed, locale)} nature="SIMULATED" />
        <Kpi label={L("Outside labour force", "خارج قوة العمل")} value={fmtCompact(p.labour.outside, locale)} nature="SIMULATED" />
        <Kpi label={L("Participation proxy", "مؤشر المشاركة")} value={fmtPct(lfpr(p))} sub={L("simulated", "محاكاة")} nature="SIMULATED" />
        <Kpi label={L("Unemployment proxy", "مؤشر البطالة")} value={fmtPct(unemp(p))} sub={L("simulated — not official", "محاكاة — ليس رسمياً")} nature="SIMULATED" />
        <Kpi label={L("Youth 15–24 unemployment proxy", "مؤشر بطالة الشباب 15–24")} value={fmtPct(y.unemployed / Math.max(1, y.employed + y.unemployed))} nature="SIMULATED" />
        <Kpi label={L("Youth not in employment or education", "الشباب خارج العمل والتعليم")} value={fmtPct(y.neet / Math.max(1, y.pop))} nature="SIMULATED" />
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <MetricMap metric={lfpr} format={(v) => fmtPct(v, 0)} legend={L("Participation proxy", "مؤشر المشاركة")} scale="pct" height={420} />
        <Panel title={L("Participation proxy by age and sex", "مؤشر المشاركة حسب العمر والجنس")} nature="SIMULATED" sources={["SIM_MICRODATA"]}><EChart option={bands} height={370} /></Panel>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Panel title={L("Occupation groups (employed)", "المجموعات المهنية (المشتغلون)")} nature="SIMULATED"><CategoryBars items={OCCUPATIONS.map((k) => ({ label: lb("occupation", k), value: p.labour.occupation[k] }))} pct /></Panel>
        <Panel title={L("Economic sectors (employed)", "القطاعات الاقتصادية (المشتغلون)")} nature="SIMULATED"><CategoryBars items={SECTORS.map((k) => ({ label: lb("sector", k), value: p.labour.sector[k] }))} pct color={VIZ[2]} /></Panel>
      </div>
      <Panel className="mt-3" title={L("Governorate comparison", "مقارنة المحافظات")} nature="SIMULATED">
        <GovTable cols={[
          { key: "wa", label: t("workingAge"), get: (x) => x.labour.workingAge, fmt: (v) => fmtCompact(v, locale) },
          { key: "emp", label: L("Employed", "مشتغلون"), get: (x) => x.labour.employed, fmt: (v) => fmtCompact(v, locale) },
          { key: "lf", label: L("Participation", "المشاركة"), get: lfpr, fmt: (v) => fmtPct(v) },
          { key: "un", label: L("Unemployment proxy", "مؤشر البطالة"), get: unemp, fmt: (v) => fmtPct(v) },
          { key: "yun", label: L("Youth unemp.", "بطالة الشباب"), get: (x) => x.labour.youth.unemployed / Math.max(1, x.labour.youth.employed + x.labour.youth.unemployed), fmt: (v) => fmtPct(v) },
          { key: "neet", label: L("Youth NEET", "الشباب خارج العمل والتعليم"), get: (x) => x.labour.youth.neet / Math.max(1, x.labour.youth.pop), fmt: (v) => fmtPct(v) },
        ]} />
      </Panel>
    </div>
  );
}
