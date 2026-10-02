"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Pause, Play } from "lucide-react";
import { useApp } from "@/store/app";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader, Panel, Callout } from "@/components/ui/panel";
import { Kpi } from "@/components/ui/kpi";
import { Button } from "@/components/ui/button";
import { Segmented, Slider } from "@/components/ui/form";
import { EChart } from "@/components/charts/echart";
import { line, VIZ } from "@/components/charts/builders";
import { JordanMap } from "@/features/gis/JordanMap";
import { analyseSiting, DEFAULT_NORMS, facilityInventory } from "@/simulation/lab/facilities";
import { simulateWater, DEFAULT_WATER } from "@/simulation/lab/water";
import { DEFAULT_SHOCK, SHOCK_SECTORS, simulateShock, WEEKS, type Destination, type ShockAction, type ShockParams, type ShockSector } from "@/simulation/lab/shock";
import { downloadCsv } from "@/lib/csv";
import { navIndex } from "@/lib/nav";
import { fmtCompact, fmtInt } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { GovId } from "@/types/census";
import { Formula, LabBar, Method, useLab } from "./shared";

export function Shock() {
  const { world, areaFor, baseYear, year, scenarioName } = useLab();
  const { t, tx, L, ar, locale } = useI18n();
  const govId = useApp((s) => s.govId);
  const selectGov = useApp((s) => s.selectGov);
  const [p, setP] = useState<ShockParams>(DEFAULT_SHOCK);
  const [week, setWeek] = useState(12);
  const [playing, setPlaying] = useState(false);
  const dp = useDeferredValue(p);
  const set = <K extends keyof ShockParams>(k: K, v: ShockParams[K]) => setP((s) => ({ ...s, [k]: v }));
  const sa = areaFor(year);
  const inv = useMemo(() => facilityInventory(world, areaFor(baseYear)), [world, areaFor, baseYear]);
  const schools = useMemo(() => analyseSiting(world, sa, "SCHOOL", inv.SCHOOL, DEFAULT_NORMS.SCHOOL), [world, sa, inv]);
  const phc = useMemo(() => analyseSiting(world, sa, "PHC", inv.PHC, DEFAULT_NORMS.PHC), [world, sa, inv]);
  const lpcd = useMemo(() => {
    const w = simulateWater(world, areaFor, baseYear, year, DEFAULT_WATER, year);
    return Object.fromEntries(world.governorates.map((g) => [g.id, w.byGov[g.id].find((x) => x.year === year)!.deliveredLpcd]));
  }, [world, areaFor, baseYear, year]);
  const res = useMemo(() => simulateShock(world, sa, schools, phc, lpcd, dp), [world, sa, schools, phc, lpcd, dp]);

  useEffect(() => {
    if (!playing) return;
    const h = setInterval(() => setWeek((w) => {
      if (w >= WEEKS) {
        setPlaying(false);
        return w;
      }
      return w + 1;
    }), 260);
    return () => clearInterval(h);
  }, [playing]);

  const wk = res.weeks[week - 1];
  const sectorName = (s: ShockSector) => ({ HOUSING: L("Housing", "الإسكان"), EDUCATION: L("Schools", "المدارس"), HEALTH: L("Primary care", "الرعاية الأولية"), WATER: L("Water", "المياه") })[s];
  const overall = (g: string) => Math.max(0, ...SHOCK_SECTORS.map((s) => wk.stress[g][s] - res.baseStress[g][s]));
  const breachedNow = world.governorates.filter((g) => SHOCK_SECTORS.some((s) => res.firstBreach[g.id][s] !== undefined && res.firstBreach[g.id][s]! <= week));
  const focus: GovId = govId ?? (world.governorates.map((g) => g.id).sort((a, b) => res.peakStress[b] - res.peakStress[a])[0] as GovId);
  const arrivalsChart = useMemo(() => line(res.weeks.map((w) => w.week), [{ name: L("Arrivals per week", "الوافدون أسبوعياً"), data: res.weeks.map((w) => Math.round(w.arrivals)), color: VIZ[1], area: true }], { rtl: ar, fmt: (v) => fmtCompact(v, locale), markX: week }), [res, ar, locale, week, L]);
  const stressChart = useMemo(() => line(res.weeks.map((w) => w.week), SHOCK_SECTORS.map((s, i) => ({ name: sectorName(s), data: res.weeks.map((w) => +w.stress[focus][s].toFixed(3)), color: [VIZ[3], VIZ[0], VIZ[2], VIZ[5]][i] })), { rtl: ar, fmt: (v) => `${Math.round(v * 100)}%`, markX: week }), [res, focus, ar, week]); // eslint-disable-line react-hooks/exhaustive-deps
  const apply = (a: ShockAction) => {
    if (a.sector === "EDUCATION") set("doubleShiftWeek", Math.max(1, a.week));
    if (a.sector === "HEALTH") set("mobileClinics", p.mobileClinics + 10);
    if (a.sector === "WATER") set("truckingLpcd", Math.max(p.truckingLpcd, 20));
    if (a.sector === "HOUSING") set("rentableShare", Math.min(0.8, p.rentableShare + 0.15));
  };
  const exportCsv = () => downloadCsv("shock-response.csv", res.weeks.flatMap((w) => world.governorates.map((g) => ({ week: w.week, governorate: g.name.en, arrivals_cumulative_host: Math.round(w.host[g.id]), camp_total: Math.round(w.camp), stress_housing: w.stress[g.id].HOUSING.toFixed(3), stress_schools: w.stress[g.id].EDUCATION.toFixed(3), stress_primary_care: w.stress[g.id].HEALTH.toFixed(3), stress_water: w.stress[g.id].WATER.toFixed(3), arrivals: p.arrivals, destination: p.destination, year, scenario: scenarioName, data_nature: "SIMULATED" }))));
  const cellTone = (v: number | undefined) => (v === undefined ? "text-ink-400" : v <= 4 ? "bg-crit-bg font-semibold text-crit" : v <= 10 ? "bg-serious-bg text-serious" : "bg-warn-bg text-warn");

  return (
    <div>
      <PageHeader index={navIndex("/shock")} title={t("navShock")} subtitle={L("A sudden population inflow, week by week. Which governorates run out of housing, school places, primary care and water first — and which responses buy time? Capacities come from the census frame and the Planning Lab inventory; every recommendation is a proposal for a human decision.", "تدفق سكاني مفاجئ أسبوعاً بأسبوع. أي المحافظات تنفد فيها المساكن والمقاعد المدرسية والرعاية الأولية والمياه أولاً — وأي الاستجابات تكسب الوقت؟ تأتي الطاقات من إطار التعداد ومخزون مختبر التخطيط؛ وكل توصية مقترح لقرار بشري.")}>
        <Button onClick={exportCsv}>{t("exportCsv")}</Button>
      </PageHeader>
      <LabBar />
      <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-card px-4 py-3">
        <Button variant="primary" size="sm" onClick={() => { if (week >= WEEKS) setWeek(1); setPlaying((x) => !x); }}>{playing ? <Pause size={14} /> : <Play size={14} />}{playing ? L("Pause", "إيقاف") : L("Play weeks", "تشغيل الأسابيع")}</Button>
        <div className="min-w-[220px] flex-1"><Slider label={`${L("Week", "الأسبوع")} ${week}`} value={week} min={1} max={WEEKS} step={1} onChange={(v) => { setPlaying(false); setWeek(v); }} format={(v) => `${v} / ${WEEKS}`} /></div>
      </div>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label={`${L("Arrived by week", "الوافدون حتى الأسبوع")} ${week}`} value={fmtCompact(wk.camp + Object.values(wk.host).reduce((a, b) => a + b, 0), locale)} sub={`${L("of", "من")} ${fmtCompact(p.arrivals, locale)}`} nature="SIMULATED" sources={["SIM_SHOCK"]} />
        <Kpi label={L("In camps", "في المخيمات")} value={fmtCompact(wk.camp, locale)} sub={`${L("capacity", "الطاقة")} ${fmtCompact(p.campCapacity, locale)}`} tone={wk.camp >= p.campCapacity ? "warn" : undefined} nature="SIMULATED" />
        <Kpi label={L("In host communities", "في المجتمعات المضيفة")} value={fmtCompact(Object.values(wk.host).reduce((a, b) => a + b, 0), locale)} nature="SIMULATED" />
        <Kpi label={L("Governorates in breach", "محافظات تجاوزت الطاقة")} value={fmtInt(breachedNow.length)} sub={`${L("by week", "حتى الأسبوع")} ${week}`} tone={breachedNow.length ? "crit" : "ok"} nature="SIMULATED" />
        <Kpi label={L("First breach", "أول تجاوز")} value={res.actions.length ? `${L("Week", "الأسبوع")} ${res.actions[0].week}` : "—"} sub={res.actions.length ? `${tx(world.gov[res.actions[0].govId].name)} · ${sectorName(res.actions[0].sector)}` : L("no breach", "لا تجاوز")} nature="SIMULATED" />
        <Kpi label={L("Proposed actions", "إجراءات مقترحة")} value={fmtInt(res.actions.length)} sub={L("human decision required", "يتطلب قراراً بشرياً")} nature="SIMULATED" />
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
        <Panel title={L("Shock & response", "الصدمة والاستجابة")} nature="SIMULATED" sources={["SIM_SHOCK"]} actions={<Button size="xs" onClick={() => setP(DEFAULT_SHOCK)}>{t("reset")}</Button>}>
          <div className="space-y-3">
            <Slider label={L("Total arrivals", "إجمالي الوافدين")} value={p.arrivals} min={25000} max={1000000} step={25000} onChange={(v) => set("arrivals", v)} format={(v) => fmtCompact(v, locale)} />
            <Slider label={L("Peak week", "أسبوع الذروة")} value={p.peakWeek} min={1} max={20} step={1} onChange={(v) => set("peakWeek", v)} />
            <Slider label={L("Spread (weeks)", "الانتشار (أسابيع)")} value={p.spread} min={1} max={10} step={0.5} onChange={(v) => set("spread", v)} />
            <div>
              <div className="mb-1.5 text-[12px] font-medium text-ink-700">{L("Destination pattern", "نمط الوجهة")}</div>
              <Segmented size="xs" value={p.destination} onChange={(v) => set("destination", v as Destination)} options={[{ value: "NORTH", label: L("Northern border", "الحدود الشمالية") }, { value: "URBAN", label: L("Urban dispersal", "انتشار حضري") }, { value: "SOUTH", label: L("Southern", "جنوبي") }]} />
            </div>
            <Slider label={L("Camp capacity", "طاقة المخيمات")} value={p.campCapacity} min={0} max={250000} step={10000} onChange={(v) => set("campCapacity", v)} format={(v) => fmtCompact(v, locale)} />
            <div className="border-t border-line pt-3 text-[11px] font-semibold uppercase tracking-wide text-ink-500">{L("Response levers", "أدوات الاستجابة")}</div>
            <Slider label={L("Rentable share of vacant homes", "نسبة الشواغر القابلة للإيجار")} value={p.rentableShare} min={0.1} max={0.8} step={0.05} onChange={(v) => set("rentableShare", v)} format={(v) => `${Math.round(v * 100)}%`} />
            <Slider label={L("Double-shift schools from week", "نظام الفترتين من الأسبوع")} value={p.doubleShiftWeek ?? 0} min={0} max={WEEKS} step={1} onChange={(v) => set("doubleShiftWeek", v === 0 ? null : v)} format={(v) => (v ? String(v) : L("off", "متوقف"))} />
            <Slider label={L("Mobile clinics", "عيادات متنقلة")} value={p.mobileClinics} min={0} max={120} step={5} onChange={(v) => set("mobileClinics", v)} />
            <Slider label={L("Water trucking", "نقل المياه بالصهاريج")} value={p.truckingLpcd} min={0} max={60} step={5} onChange={(v) => set("truckingLpcd", v)} format={(v) => `+${v} l/p/d`} />
          </div>
        </Panel>
        <div className="min-w-0 space-y-3">
          <JordanMap height={420} title={`${L("Added stress from the shock, week", "الضغط الإضافي من الصدمة، الأسبوع")} ${week}`} govValues={Object.fromEntries(world.governorates.map((g) => [g.id, overall(g.id)])) as Record<GovId, number>} scale="risk" domain={[0, 0.6]} format={(v) => `+${Math.round(v * 100)} pts`} legendTitle={L("Max sector increase (demand ÷ capacity)", "أكبر زيادة قطاعية (الطلب ÷ الطاقة)")} selectedGov={govId} onSelectGov={selectGov} districtMode="drill" tooltipExtra={(kind, id) => (kind === "gov" ? <span className="tabular">{SHOCK_SECTORS.map((s) => `${sectorName(s)} ${Math.round(wk.stress[id][s] * 100)}%`).join(" · ")}</span> : null)} sources={["SIM_SHOCK", "SIM_FRAME"]} />
          <div className="grid gap-3 lg:grid-cols-2">
            <Panel title={L("Arrivals per week", "الوافدون أسبوعياً")} nature="SIMULATED"><EChart option={arrivalsChart} height={200} /></Panel>
            <Panel title={`${L("Sector stress", "الضغط القطاعي")} — ${tx(world.gov[focus].name)}`} subtitle={L("100% = capacity", "100% = الطاقة")} nature="SIMULATED"><EChart option={stressChart} height={200} /></Panel>
          </div>
        </div>
        <Panel title={L("Proposed actions", "الإجراءات المقترحة")} subtitle={L("Triggered when the shock pushes a sector over capacity", "تُطلق عندما تدفع الصدمة قطاعاً فوق طاقته")} nature="SIMULATED" bodyClass="p-0">
          {res.actions.length === 0 ? <p className="px-4 py-6 text-center text-[12.5px] text-ink-500">{L("No capacity breaches under these settings.", "لا تجاوزات للطاقة وفق هذه الإعدادات.")}</p> : (
            <ol className="thin-scroll max-h-[640px] divide-y divide-line/70 overflow-y-auto">
              {res.actions.map((a, i) => (
                <li key={i} className={cn("px-4 py-2.5 text-[12.5px]", a.week > week && "opacity-45")}>
                  <div className="flex items-center justify-between gap-2"><span className="font-semibold text-ink-900">{L("Week", "الأسبوع")} {a.week} · {sectorName(a.sector)}</span><Button size="xs" onClick={() => apply(a)}>{L("Add to plan", "أضف إلى الخطة")}</Button></div>
                  <p className="mt-1 leading-relaxed text-ink-700">{tx(a.text)}</p>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
      <Panel className="mt-3" title={L("First week of breach by governorate and sector", "أول أسبوع تجاوز حسب المحافظة والقطاع")} nature="SIMULATED" sources={["SIM_SHOCK"]}>
        <div className="thin-scroll overflow-x-auto">
          <table className="w-full min-w-[560px] text-[12.5px]">
            <thead><tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-500"><th className="py-1.5 text-start">{t("governorate")}</th>{SHOCK_SECTORS.map((s) => <th key={s} className="px-2 text-center">{sectorName(s)}</th>)}<th className="px-2 text-end">{L("Peak added stress", "أعلى ضغط إضافي")}</th></tr></thead>
            <tbody>
              {[...world.governorates].sort((a, b) => res.peakStress[b.id] - res.peakStress[a.id]).map((g) => (
                <tr key={g.id} className="border-b border-line/60">
                  <td className="py-1.5 font-medium">{tx(g.name)}</td>
                  {SHOCK_SECTORS.map((s) => <td key={s} className="px-1 py-1 text-center"><span className={cn("inline-block min-w-[54px] rounded px-1.5 py-0.5 tabular", cellTone(res.firstBreach[g.id][s]))}>{res.firstBreach[g.id][s] !== undefined ? `${L("wk", "أسبوع")} ${res.firstBreach[g.id][s]}` : "—"}</span></td>)}
                  <td className="px-2 text-end tabular">+{Math.round(res.peakStress[g.id] * 100)} pts</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Callout tone="sim" className="mt-3">{L("A planning exercise, not a forecast of any real event. Arrival curves, camp capacity and response effects are user assumptions.", "تمرين تخطيطي وليس تنبؤاً بأي حدث حقيقي. منحنيات الوصول وطاقة المخيمات وأثر الاستجابة افتراضات المستخدم.")}</Callout>
      <Method>
        <Formula>{"arrivals(w) ∝ w^(k−1) e^(−w/θ)  (gamma, peak = (k−1)θ)   ·   camps absorb ≤ 45% of weekly arrivals up to capacity (60% Mafraq, 40% Zarqa)"}</Formula>
        <Formula>{"housing = host ÷ (vacant × rentable × 5.5)   ·   schools = (students + 0.3 × 0.95 × host) ÷ seats × (1.6 if double shift)"}</Formula>
        <Formula>{"primary care = (residents + host + camp) ÷ catchment capacity (+6,000 per mobile clinic)   ·   water = 80 ÷ delivered l/p/d"}</Formula>
      </Method>
    </div>
  );
}
