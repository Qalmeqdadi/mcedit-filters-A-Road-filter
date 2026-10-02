"use client";

import { useApp } from "@/store/app";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader, Panel, Callout } from "@/components/ui/panel";
import { Kpi } from "@/components/ui/kpi";
import { Button } from "@/components/ui/button";
import { JordanMap } from "@/features/gis/JordanMap";
import { DIMENSIONS, DIMENSION_LABEL, statusOf, type SdgIndicator, type SdgStatus } from "@/simulation/lab/equity";
import { downloadCsv } from "@/lib/csv";
import { navIndex } from "@/lib/nav";
import { fmtInt, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { GovId } from "@/types/census";
import { AreaActions } from "@/features/lab/ActionCard";
import { Formula, LabBar, Method, useLab, usePlans } from "@/features/lab/shared";

const STATUS: Record<SdgStatus, { en: string; ar: string; cls: string; dot: string }> = {
  ON_TRACK: { en: "On track", ar: "على المسار", cls: "border-ok/40 bg-ok-bg text-ok", dot: "#2e8540" },
  MODERATE: { en: "Moderate", ar: "متوسط", cls: "border-warn/40 bg-warn-bg text-warn", dot: "#c07a12" },
  OFF_TRACK: { en: "Off track", ar: "خارج المسار", cls: "border-crit/40 bg-crit-bg text-crit", dot: "#b5453a" },
};

const fmtSdg = (s: SdgIndicator, v: number) => (s.unit === "pct" ? fmtPct(v, v < 0.1 ? 1 : 0) : s.key === "theil" ? v.toFixed(3) : fmtPct(v, 0));
const cellColor = (v: number) => `rgba(47, 98, 166, ${0.08 + v * 0.62})`;

export function Equity() {
  const { world, year, scenarioName } = useLab();
  const { t, tx, L } = useI18n();
  const govId = useApp((s) => s.govId);
  const selectGov = useApp((s) => s.selectGov);
  const { snap } = usePlans();
  const eq = snap?.equity ?? null;
  const govs = eq ? [...world.governorates].sort((a, b) => eq.index[b.id] - eq.index[a.id]) : [];
  const counts = eq ? (["ON_TRACK", "MODERATE", "OFF_TRACK"] as SdgStatus[]).map((s) => eq.sdgs.filter((x) => x.status === s).length) : [0, 0, 0];
  const govVals = eq ? (Object.fromEntries(world.governorates.map((g) => [g.id, 100 - eq.index[g.id]])) as Record<GovId, number>) : undefined;
  const distVals = eq ? Object.fromEntries(eq.districts.map((d) => [d.id, 100 - d.index])) : undefined;
  const exportCsv = () => {
    if (!eq) return;
    downloadCsv(`sdg-localisation-${year}.csv`, eq.sdgs.flatMap((s) => [{ sdg: s.sdg, target: s.target, indicator: s.label.en, area: "Jordan", value: s.national.toFixed(4), goal: s.goal, status: s.status, source: s.source, horizon: year, scenario: scenarioName }, ...world.governorates.map((g) => ({ sdg: s.sdg, target: s.target, indicator: s.label.en, area: g.name.en, value: s.byGov[g.id].toFixed(4), goal: s.goal, status: statusOf(s.byGov[g.id], s.goal, s.tolerance, s.up), source: s.source, horizon: year, scenario: scenarioName }))]));
  };

  return (
    <div>
      <PageHeader index={navIndex("/equity")} title={t("navEquity")} subtitle={L("Who is being left behind, and where? An Opportunity Index combines income, work, education, health, housing, basic services and environment for every governorate and district, and the SDG dashboard localises 16 indicators against national targets.", "من يتخلف عن الركب وأين؟ يجمع مؤشر الفرص الدخل والعمل والتعليم والصحة والسكن والخدمات الأساسية والبيئة لكل محافظة ولواء، وتوطّن لوحة أهداف التنمية المستدامة 16 مؤشراً مقابل المستهدفات الوطنية.")}>
        <Button onClick={exportCsv} disabled={!eq}>{t("exportCsv")}</Button>
      </PageHeader>
      <LabBar />
      {!eq ? <p className="py-10 text-center text-[13px] text-ink-500">{L("Computing the Opportunity Index…", "جارٍ حساب مؤشر الفرص…")}</p> : (
        <>
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
            <Kpi label={L("Opportunity Index — Jordan", "مؤشر الفرص — الأردن")} value={fmtInt(eq.nationalIndex)} sub={L("population-weighted, 0–100", "مرجح بالسكان، 0–100")} nature="SIMULATED" sources={["SIM_EQUITY"]} />
            <Kpi label={L("Highest", "الأعلى")} value={fmtInt(eq.index[govs[0].id])} sub={tx(govs[0].name)} tone="ok" nature="SIMULATED" />
            <Kpi label={L("Lowest", "الأدنى")} value={fmtInt(eq.index[govs[govs.length - 1].id])} sub={tx(govs[govs.length - 1].name)} tone="crit" nature="SIMULATED" />
            <Kpi label={L("SDG indicators on track", "مؤشرات على المسار")} value={`${counts[0]} / ${eq.sdgs.length}`} tone="ok" nature="SIMULATED" />
            <Kpi label={L("Moderate", "متوسط")} value={fmtInt(counts[1])} tone="warn" nature="SIMULATED" />
            <Kpi label={L("Off track", "خارج المسار")} value={fmtInt(counts[2])} tone="crit" nature="SIMULATED" />
          </div>

          <Panel className="mt-3" title={L("SDG localisation dashboard", "لوحة توطين أهداف التنمية المستدامة")} subtitle={L("National value against an illustrative target; the weakest governorate shows where to act.", "القيمة الوطنية مقابل مستهدف توضيحي؛ وتُظهر أضعف محافظة أين يجب التدخل.")} nature="SIMULATED" sources={["SIM_EQUITY", "OPEN_OWID_ENERGY"]}>
            <div className="thin-scroll overflow-x-auto">
              <table className="w-full min-w-[760px] text-[12.5px]">
                <thead><tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-500"><th className="py-1.5 text-start">SDG</th><th className="text-start">{L("Indicator", "المؤشر")}</th><th className="px-2 text-end">{L("Jordan", "الأردن")}</th><th className="px-2 text-end">{L("Target", "المستهدف")}</th><th className="text-start">{L("Status", "الحالة")}</th><th className="text-start">{L("Weakest governorate", "أضعف محافظة")}</th></tr></thead>
                <tbody>
                  {eq.sdgs.map((s) => {
                    const worst = [...world.governorates].sort((a, b) => (s.up ? s.byGov[a.id] - s.byGov[b.id] : s.byGov[b.id] - s.byGov[a.id]))[0];
                    const uniform = world.governorates.every((g) => s.byGov[g.id] === s.national);
                    return (
                      <tr key={s.key + s.target} className="border-b border-line/60" data-testid="sdg-row">
                        <td className="py-1.5"><span className="inline-flex h-6 min-w-[44px] items-center justify-center rounded bg-navy-800 px-1.5 text-[11px] font-semibold text-white tabular">{s.target}</span></td>
                        <td className="pe-2 text-ink-900">{tx(s.label)}</td>
                        <td className="px-2 text-end font-semibold tabular">{fmtSdg(s, s.national)}</td>
                        <td className="px-2 text-end tabular text-ink-500">{s.up ? "≥" : "≤"} {fmtSdg(s, s.goal)}</td>
                        <td><span className={cn("inline-flex whitespace-nowrap rounded border px-1.5 py-0.5 text-[11px] font-semibold", STATUS[s.status].cls)}>{L(STATUS[s.status].en, STATUS[s.status].ar)}</span></td>
                        <td className="text-ink-700">{uniform ? <span className="text-ink-400">{L("national only", "وطني فقط")}</span> : <>{tx(worst.name)} <span className="tabular text-ink-500">{fmtSdg(s, s.byGov[worst.id])}</span></>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <JordanMap height={440} title={L("Opportunity gap (100 − index)", "فجوة الفرص (100 − المؤشر)")} govValues={govVals} districtValues={distVals} scale="risk" domain={[0, 100]} format={(v) => fmtInt(v)} legendTitle={L("Gap", "الفجوة")} selectedGov={govId} onSelectGov={selectGov} districtMode="drill" sources={["SIM_EQUITY", "GEO_ADM2"]} />
            <Panel title={L("Opportunity Index by dimension", "مؤشر الفرص حسب البعد")} subtitle={L("0 = worst governorate, 100 = best", "0 = أسوأ محافظة، 100 = أفضل")} nature="SIMULATED" sources={["SIM_EQUITY"]}>
              <div className="thin-scroll overflow-x-auto">
                <table className="w-full min-w-[620px] text-[12px]">
                  <thead><tr className="text-[10.5px] uppercase tracking-wide text-ink-500"><th className="py-1 text-start">{t("governorate")}</th>{DIMENSIONS.map((d) => <th key={d} className="px-0.5 text-center">{tx(DIMENSION_LABEL[d])}</th>)}<th className="px-1 text-end">{L("Index", "المؤشر")}</th></tr></thead>
                  <tbody>
                    {govs.map((g) => (
                      <tr key={g.id} onClick={() => selectGov(g.id)} className={cn("cursor-pointer", govId === g.id && "outline outline-2 outline-navy-500")}>
                        <td className="py-0.5 pe-2 font-medium text-ink-900">{tx(g.name)}</td>
                        {DIMENSIONS.map((d) => { const v = eq.dims[g.id][d]; return <td key={d} className="px-0.5 py-0.5"><span className="block rounded py-1 text-center tabular" style={{ background: cellColor(v), color: v > 0.55 ? "#fff" : "#141a24" }}>{Math.round(v * 100)}</span></td>; })}
                        <td className="px-1 text-end font-semibold tabular">{fmtInt(eq.index[g.id])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>

          <Panel className="mt-3" title={L("Districts furthest behind", "الألوية الأكثر تخلفاً")} subtitle={L("District index from census dimensions (work, education, health, housing, services)", "مؤشر اللواء من أبعاد التعداد (العمل، التعليم، الصحة، السكن، الخدمات)")} nature="SIMULATED" sources={["SIM_EQUITY", "SIM_MICRODATA"]}>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              {eq.districts.slice(0, 10).map((d, i) => (
                <div key={d.id} className="rounded-md border border-line px-2.5 py-2 text-[12.5px]" data-testid="lagging-district">
                  <div className="flex items-baseline justify-between gap-2"><b className="text-ink-900">{i + 1}. {tx(world.district[d.id].name)}</b><span className="font-semibold tabular text-crit">{fmtInt(d.index)}</span></div>
                  <div className="text-[11.5px] text-ink-500">{tx(world.gov[d.govId].name)} · {L("weakest", "الأضعف")}: {tx(DIMENSION_LABEL[d.weakest])}</div>
                </div>
              ))}
            </div>
          </Panel>
        </>
      )}
      <Callout tone="sim" className="mt-3">{L("A relative index from simulated census microdata and model outputs; targets are illustrative, not Jordan's official SDG targets. The renewable-electricity indicator uses observed open data.", "مؤشر نسبي من بيانات تعداد محاكاة ومخرجات النماذج؛ والمستهدفات توضيحية وليست المستهدفات الرسمية للأردن. يستخدم مؤشر الكهرباء المتجددة بيانات مفتوحة مرصودة.")}</Callout>
      <AreaActions sectors={["EQUITY"]} />
      <Method>
        <Formula>{"dimension_g = (value_g − worst) ÷ (best − worst), averaged within the dimension   ·   index_g = 100 × mean of 7 dimensions"}</Formula>
        <Formula>{"status = on track if value meets target; moderate if within tolerance; else off track"}</Formula>
      </Method>
    </div>
  );
}
