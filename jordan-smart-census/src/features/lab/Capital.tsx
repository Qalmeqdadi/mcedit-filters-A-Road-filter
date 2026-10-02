"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useApp } from "@/store/app";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader, Panel, Callout } from "@/components/ui/panel";
import { Kpi } from "@/components/ui/kpi";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/form";
import { Pill } from "@/components/ui/badges";
import { EChart } from "@/components/charts/echart";
import { barH, line, VIZ } from "@/components/charts/builders";
import { JordanMap } from "@/features/gis/JordanMap";
import { analyseSiting, DEFAULT_NORMS, facilityInventory, type FacilityKind } from "@/simulation/lab/facilities";
import { DEFAULT_HOUSING, forecastHousing } from "@/simulation/lab/housingNeed";
import { DEFAULT_WATER, simulateWater } from "@/simulation/lab/water";
import { assessClimate, DEFAULT_CLIMATE } from "@/simulation/lab/climate";
import { CORRIDORS } from "@/simulation/lab/mobility";
import { buildNetwork, pathLinks, shortestFrom } from "@/simulation/lab/network";
import { buildProjects, DEFAULT_WEIGHTS, frontier, scoreProjects, selectPortfolio, type CapitalWeights, type Project, type Sector } from "@/simulation/lab/capital";
import { computeProfile } from "@/simulation/analytics";
import { downloadCsv } from "@/lib/csv";
import { navIndex } from "@/lib/nav";
import { fmtCompact, fmtInt } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { GovId } from "@/types/census";
import { Formula, LabBar, Method, useLab } from "./shared";

const SECTORS: Sector[] = ["EDUCATION", "HEALTH", "HOUSING", "WATER", "TRANSPORT", "CLIMATE"];
const SECTOR_COLOR: Record<Sector, string> = { EDUCATION: VIZ[0], HEALTH: VIZ[2], HOUSING: VIZ[1], WATER: "#4a7cc0", TRANSPORT: VIZ[3], CLIMATE: VIZ[5] };
const KINDS: FacilityKind[] = ["SCHOOL", "PHC", "HOSPITAL"];

export function Capital() {
  const { world, areaFor, baseYear, scenarioName } = useLab();
  const { t, tx, L, ar, locale } = useI18n();
  const govId = useApp((s) => s.govId);
  const selectGov = useApp((s) => s.selectGov);
  const [budget, setBudget] = useState(1500);
  const [w, setW] = useState<CapitalWeights>(DEFAULT_WEIGHTS);
  const [showAll, setShowAll] = useState(false);
  const dw = useDeferredValue(w);
  const db = useDeferredValue(budget);
  const sectorName = (s: Sector) => ({ EDUCATION: L("Education", "التعليم"), HEALTH: L("Health", "الصحة"), HOUSING: L("Housing", "الإسكان"), WATER: L("Water", "المياه"), TRANSPORT: L("Transport", "النقل"), CLIMATE: L("Climate", "المناخ") })[s];

  const raw = useMemo(() => {
    const sa0 = areaFor(baseYear);
    const sa35 = areaFor(2035);
    const inv = facilityInventory(world, sa0);
    const siting = Object.fromEntries(KINDS.map((k) => [k, analyseSiting(world, sa35, k, inv[k], DEFAULT_NORMS[k])])) as Record<FacilityKind, ReturnType<typeof analyseSiting>>;
    const sitingBase = Object.fromEntries(KINDS.map((k) => [k, analyseSiting(world, sa0, k, inv[k], DEFAULT_NORMS[k])])) as Record<FacilityKind, ReturnType<typeof analyseSiting>>;
    const housing = forecastHousing(world, areaFor, baseYear, 2050, DEFAULT_HOUSING);
    const water = simulateWater(world, areaFor, baseYear, 2050, DEFAULT_WATER, 2035);
    const climate = assessClimate(world, sa35, DEFAULT_CLIMATE);
    const net = buildNetwork(world);
    const extra: Parameters<typeof buildProjects>[1]["extra"] = [];
    for (const c of CORRIDORS) {
      const { prev } = shortestFrom(net, c.from, (l) => l.km);
      const km = pathLinks(prev, c.from, c.to).reduce((s, l) => s + l.km, 0);
      const workers = [c.from, c.to].reduce((s, d) => {
        const gp = computeProfile(world, { govId: world.district[d].govId });
        return s + sa35.district[d].a15_64 * (gp.labour.employed / Math.max(1, gp.groups.a15_64));
      }, 0);
      extra.push({ id: `TRANSIT-${c.id}`, sector: "TRANSPORT", govId: world.district[c.from].govId, name: { en: `Rapid-transit corridor ${c.name.en} (${Math.round(km)} km)`, ar: `محور نقل سريع ${c.name.ar} (${Math.round(km)} كم)` }, costM: km * 12, beneficiaries: workers * 0.12, urgency: 0.7, unit: { en: "estimated daily riders", ar: "راكب يومي تقديري" }, quantity: km });
    }
    const centres: Record<string, { n: number; atRisk: number }> = {};
    for (const d of climate.districts) {
      const g = world.district[d.id].govId;
      centres[g] = centres[g] ?? { n: 0, atRisk: 0 };
      centres[g].n += d.coolingCentres;
      if (d.coolingCentres) centres[g].atRisk += d.atRisk;
    }
    for (const [g, v] of Object.entries(centres)) {
      if (!v.n) continue;
      extra.push({ id: `CLIMATE-${g}`, sector: "CLIMATE", govId: g as GovId, name: { en: `${v.n} cooling centres & heat early warning — ${world.gov[g as GovId].name.en}`, ar: `${v.n} مراكز تبريد وإنذار مبكر للحر — ${world.gov[g as GovId].name.ar}` }, costM: v.n * 0.6, beneficiaries: v.atRisk, urgency: 0.7, unit: { en: "people at heat risk", ar: "شخص معرض لخطر الحر" }, quantity: v.n });
    }
    return buildProjects(world, { siting, sitingBase, housing, water, extra });
  }, [world, areaFor, baseYear]);
  const projects = useMemo(() => scoreProjects(raw, dw), [raw, dw]);
  const total = projects.reduce((s, p) => s + p.costM, 0);
  const pf = useMemo(() => selectPortfolio(projects, db), [projects, db]);
  const next = useMemo(() => {
    const more = selectPortfolio(projects, db + 250);
    const ids = new Set(pf.selected.map((p) => p.id));
    return more.selected.filter((p) => !ids.has(p.id));
  }, [projects, db, pf]);
  const curve = useMemo(() => frontier(projects, Math.max(500, total)), [projects, total]);
  const chosen = new Set(pf.selected.map((p) => p.id));
  const frontierChart = useMemo(() => line(curve.map((c) => fmtInt(c.budgetM)), [{ name: L("People reached", "الأشخاص المستفيدون"), data: curve.map((c) => Math.round(c.beneficiaries)), color: VIZ[0], area: true }], { rtl: ar, fmt: (v) => fmtCompact(v, locale) }), [curve, ar, locale, L]);
  const sectorChart = useMemo(() => barH(SECTORS.map(sectorName), [{ name: L("Funded (JOD M)", "الممول (مليون دينار)"), data: SECTORS.map((s) => Math.round(pf.bySector[s].costM)), color: VIZ[1] }], { rtl: ar, fmt: (v) => `${fmtInt(v)}M`, showLabels: true }), [pf, ar]); // eslint-disable-line react-hooks/exhaustive-deps
  const perCap = Object.fromEntries(world.governorates.map((g) => [g.id, ((pf.byGov[g.id] ?? 0) * 1e6) / Math.max(1, areaFor(2035).gov[g.id].pop)])) as Record<GovId, number>;
  const list = (showAll ? [...projects].sort((a, b) => b.score - a.score) : pf.selected).filter((p) => !govId || p.govId === govId);
  const exportCsv = () => downloadCsv("capital-portfolio.csv", [...projects].sort((a, b) => b.score - a.score).map((p, i) => ({ rank: i + 1, funded: chosen.has(p.id), project: p.name.en, sector: p.sector, governorate: world.gov[p.govId].name.en, cost_jod_m: p.costM.toFixed(1), beneficiaries: Math.round(p.beneficiaries), unit: p.unit.en, efficiency: p.efficiency.toFixed(3), equity: p.equity.toFixed(3), urgency: p.urgency.toFixed(2), score: p.score.toFixed(3), budget_jod_m: budget, scenario: scenarioName, data_nature: "SIMULATED" })));
  const setWeight = (k: "efficiency" | "equity" | "urgency", v: number) => setW((s) => ({ ...s, [k]: v }));

  return (
    <div>
      <PageHeader index={navIndex("/capital")} title={t("navCapital")} subtitle={L("With a fixed capital budget, which projects should be funded first? Candidate projects are generated from the other Planning Lab models (to 2035) and ranked by people reached per dinar, need (deprivation) and urgency — with the weights in your hands.", "بموازنة رأسمالية محددة، أي المشاريع يجب تمويلها أولاً؟ تُولَّد المشاريع المرشحة من نماذج مختبر التخطيط الأخرى (حتى 2035) وتُرتب حسب عدد المستفيدين لكل دينار والحاجة (الحرمان) والإلحاح — والأوزان بيدك.")}>
        <Button onClick={exportCsv}>{t("exportCsv")}</Button>
      </PageHeader>
      <LabBar hideYear />
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label={L("Budget", "الموازنة")} value={`${fmtInt(budget)}M`} sub={`JOD · ${L("candidates total", "مجموع المرشحة")} ${fmtInt(total)}M`} nature="SIMULATED" sources={["SIM_CAPITAL"]} />
        <Kpi label={L("Allocated", "المخصص")} value={`${fmtInt(pf.spentM)}M`} sub={`${fmtInt((pf.spentM / Math.max(1, budget)) * 100)}% ${L("of budget", "من الموازنة")}`} nature="SIMULATED" />
        <Kpi label={L("Projects funded", "مشاريع ممولة")} value={`${pf.selected.length}`} sub={`${L("of", "من")} ${projects.length} ${L("candidates", "مرشحة")}`} nature="SIMULATED" />
        <Kpi label={L("People reached", "المستفيدون")} value={fmtCompact(pf.beneficiaries, locale)} sub={L("sum of project beneficiaries", "مجموع المستفيدين")} nature="SIMULATED" />
        <Kpi label={L("Governorates funded", "محافظات ممولة")} value={`${Object.keys(pf.byGov).length} / 12`} nature="SIMULATED" />
        <Kpi label={L("Next JOD 250M buys", "الـ250 مليون التالية تموّل")} value={`${next.length}`} sub={L("more projects", "مشاريع إضافية")} nature="SIMULATED" />
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-[300px_minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title={L("Budget & priorities", "الموازنة والأولويات")} nature="SIMULATED" sources={["SIM_CAPITAL"]} actions={<Button size="xs" onClick={() => { setW(DEFAULT_WEIGHTS); setBudget(1500); }}>{t("reset")}</Button>}>
          <div className="space-y-3">
            <Slider label={L("Capital budget to 2035", "الموازنة الرأسمالية حتى 2035")} value={budget} min={100} max={Math.max(500, Math.ceil(total / 100) * 100)} step={50} onChange={setBudget} format={(v) => `${fmtInt(v)}M JOD`} />
            <Slider label={L("Weight — people per dinar", "الوزن — المستفيدون لكل دينار")} value={w.efficiency} min={0} max={1} step={0.05} onChange={(v) => setWeight("efficiency", v)} format={(v) => v.toFixed(2)} />
            <Slider label={L("Weight — equity (deprivation)", "الوزن — العدالة (الحرمان)")} value={w.equity} min={0} max={1} step={0.05} onChange={(v) => setWeight("equity", v)} format={(v) => v.toFixed(2)} />
            <Slider label={L("Weight — urgency", "الوزن — الإلحاح")} value={w.urgency} min={0} max={1} step={0.05} onChange={(v) => setWeight("urgency", v)} format={(v) => v.toFixed(2)} />
            <div className="border-t border-line pt-3 text-[11px] font-semibold uppercase tracking-wide text-ink-500">{L("Sector priority", "أولوية القطاع")}</div>
            {SECTORS.map((s) => (
              <Slider key={s} label={sectorName(s)} value={w.sector[s]} min={0} max={2} step={0.1} onChange={(v) => setW((x) => ({ ...x, sector: { ...x.sector, [s]: v } }))} format={(v) => `× ${v.toFixed(1)}`} />
            ))}
          </div>
        </Panel>
        <div className="min-w-0 space-y-3">
          <Panel title={L("What each budget level buys", "ما تموّله كل موازنة")} subtitle={L("People reached as the budget grows (JOD M)", "المستفيدون مع زيادة الموازنة (مليون دينار)")} nature="SIMULATED"><EChart option={frontierChart} height={230} /></Panel>
          <Panel title={L("Allocation by sector", "التوزيع حسب القطاع")} nature="SIMULATED"><EChart option={sectorChart} height={210} /></Panel>
        </div>
        <div className="min-w-0 space-y-3">
          <JordanMap height={300} title={L("Investment per resident (JOD)", "الاستثمار لكل ساكن (دينار)")} govValues={perCap} scale="seq" format={(v) => fmtInt(v)} legendTitle={L("JOD / resident", "دينار/ساكن")} selectedGov={govId} onSelectGov={selectGov} districtMode="drill" sources={["SIM_CAPITAL"]} showLabelsDefault={false} />
          <Panel title={L("The next JOD 250M would add", "الـ250 مليون التالية ستضيف")} nature="SIMULATED">
            {next.length === 0 ? <p className="text-[12.5px] text-ink-500">{L("All candidate projects are already funded.", "جميع المشاريع المرشحة ممولة.")}</p> : (
              <ul className="space-y-1.5 text-[12.5px]">{next.slice(0, 6).map((p) => <li key={p.id} className="flex items-center gap-2"><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: SECTOR_COLOR[p.sector] }} /><span className="min-w-0 flex-1 truncate">{tx(p.name)}</span><span className="tabular text-ink-500">{fmtInt(p.costM)}M</span></li>)}</ul>
            )}
          </Panel>
        </div>
      </div>
      <Panel className="mt-3" title={showAll ? L("All candidate projects (ranked)", "جميع المشاريع المرشحة (مرتبة)") : L("Funded portfolio (ranked)", "المحفظة الممولة (مرتبة)")} subtitle={govId ? tx(world.gov[govId].name) : undefined} nature="SIMULATED" sources={["SIM_CAPITAL", "SIM_FACILITIES", "SIM_HOUSING_NEED", "SIM_WATER", "SIM_MOBILITY", "SIM_CLIMATE"]} actions={<Button size="xs" onClick={() => setShowAll((x) => !x)}>{showAll ? L("Show funded only", "الممولة فقط") : L("Show all candidates", "عرض كل المرشحة")}</Button>}>
        <div className="thin-scroll max-h-[520px] overflow-auto">
          <table className="w-full min-w-[820px] text-[12.5px]">
            <thead className="sticky top-0 bg-card"><tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-500"><th className="py-1.5 text-start">#</th><th className="text-start">{L("Project", "المشروع")}</th><th className="text-start">{L("Sector", "القطاع")}</th><th className="px-2 text-end">{L("Cost (JOD M)", "الكلفة (مليون دينار)")}</th><th className="px-2 text-end">{L("Reached", "المستفيدون")}</th><th className="px-2 text-end">{L("Efficiency", "الكفاءة")}</th><th className="px-2 text-end">{L("Equity", "العدالة")}</th><th className="px-2 text-end">{L("Urgency", "الإلحاح")}</th><th className="px-2 text-end">{L("Score", "النتيجة")}</th></tr></thead>
            <tbody>
              {list.map((p: Project, i) => (
                <tr key={p.id} className={cn("border-b border-line/60", showAll && !chosen.has(p.id) && "text-ink-400")}>
                  <td className="py-1.5 tabular text-ink-400">{i + 1}</td>
                  <td className="pe-2">{tx(p.name)}</td>
                  <td><Pill><span className="me-1 inline-block h-2 w-2 rounded-full" style={{ background: SECTOR_COLOR[p.sector] }} />{sectorName(p.sector)}</Pill></td>
                  <td className="px-2 text-end tabular">{p.costM.toFixed(1)}</td>
                  <td className="px-2 text-end tabular" title={tx(p.unit)}>{fmtInt(p.beneficiaries)}</td>
                  <td className="px-2 text-end tabular">{p.efficiency.toFixed(2)}</td>
                  <td className="px-2 text-end tabular">{p.equity.toFixed(2)}</td>
                  <td className="px-2 text-end tabular">{p.urgency.toFixed(1)}</td>
                  <td className="px-2 text-end font-semibold tabular">{p.score.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Callout tone="sim" className="mt-3">{L("Unit costs (school JOD 3.2M, health centre 1.4M, hospital 45M, affordable home 34k, water-loss reduction 1.2M per MCM, rapid transit 12M per km, cooling centre 0.6M) are illustrative assumptions, not ministry costings. Beneficiary counts use each sector's own unit, so efficiency is ranked within each sector.", "تكاليف الوحدة (مدرسة 3.2 مليون دينار، مركز صحي 1.4 مليون، مستشفى 45 مليون، مسكن ميسور 34 ألفاً، خفض فاقد المياه 1.2 مليون لكل م.م³، نقل سريع 12 مليوناً لكل كم، مركز تبريد 0.6 مليون) افتراضات توضيحية وليست تقديرات وزارية. يُحسب المستفيدون بوحدة كل قطاع، لذا تُرتب الكفاءة داخل كل قطاع.")}</Callout>
      <Method>
        <Formula>{"score = (w_eff · efficiency + w_eq · equity + w_urg · urgency) × sector priority"}</Formula>
        <Formula>{"efficiency = rank of (beneficiaries ÷ cost) within the sector, 0..1   ·   equity = governorate deprivation index, 0..1   ·   urgency = 1 (gap today) / 0.7 (by 2035)"}</Formula>
        <p>{L("Projects are funded in score order while they fit in the remaining budget (greedy knapsack). The curve repeats the selection at 25 budget levels. Deprivation combines households outside the public water and sewer networks, unemployment and access (synthetic census).", "تُموَّل المشاريع حسب ترتيب النتيجة ما دامت ضمن الموازنة المتبقية (حقيبة جشعة). يكرر المنحنى الاختيار عند 25 مستوى للموازنة. يجمع مؤشر الحرمان الأسر خارج شبكتي المياه والصرف العامتين والبطالة وسهولة الوصول (تعداد اصطناعي).")}</p>
      </Method>
    </div>
  );
}
