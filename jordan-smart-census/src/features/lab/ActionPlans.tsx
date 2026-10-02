"use client";

import { useMemo, useState } from "react";
import { ClipboardCopy, Loader2 } from "lucide-react";
import { useApp } from "@/store/app";
import { useEngine } from "@/store/engine";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader, Panel, Callout } from "@/components/ui/panel";
import { Kpi } from "@/components/ui/kpi";
import { Button } from "@/components/ui/button";
import { Segmented, Select } from "@/components/ui/form";
import { SeverityBadge } from "@/components/ui/badges";
import { EChart } from "@/components/charts/echart";
import { barH, VIZ } from "@/components/charts/builders";
import { JordanMap } from "@/features/gis/JordanMap";
import { ACTION_SECTORS, briefing, SECTOR_LABEL, sevRank, type ActionSector, type Horizon, type Indicator } from "@/simulation/lab/actions";
import { downloadCsv } from "@/lib/csv";
import { toast } from "@/lib/hosted";
import { navIndex } from "@/lib/nav";
import { fmt1, fmtCompact, fmtInt, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { GovId, Severity } from "@/types/census";
import { ActionCard, HORIZON_LABEL } from "./ActionCard";
import { Formula, LabBar, Method, usePlans, useLab } from "./shared";

const SEV_CELL: Record<Severity, string> = { CRITICAL: "bg-crit text-white", HIGH: "bg-serious text-white", MEDIUM: "bg-warn-bg text-warn", LOW: "bg-ok-bg text-ok" };

function fmtInd(i: Indicator, v: number) {
  switch (i.unit) {
    case "pct": return fmtPct(v, Math.abs(v) < 0.1 ? 1 : 0);
    case "year": return v ? String(Math.round(v)) : "—";
    case "per1000": return fmtInt(v);
    case "ratio": return v.toFixed(2);
    case "lpcd": return `${fmtInt(v)} l/p/d`;
    default: return fmtInt(v);
  }
}

export function ActionPlans() {
  const engine = useEngine();
  const { scenarioName } = useLab();
  const { t, tx, L, ar, locale } = useI18n();
  const govId = useApp((s) => s.govId);
  const selectGov = useApp((s) => s.selectGov);
  const [sector, setSector] = useState<ActionSector | "ALL">("ALL");
  const { plans, loading, year } = usePlans();
  const world = engine.world;
  const plan = plans && govId ? plans.plans[govId] : null;

  const sectorChart = useMemo(() => (plans ? barH(ACTION_SECTORS.map((s) => tx(SECTOR_LABEL[s])), [{ name: L("Indicative cost (JOD M)", "الكلفة التقديرية (مليون دينار)"), data: ACTION_SECTORS.map((s) => Math.round(plans.bySector[s].costM)), color: VIZ[0] }], { rtl: ar, showLabels: true, fmt: (v) => fmtInt(v) }) : null), [plans, tx, ar, L]);
  const urgentByGov = useMemo(() => (plans ? (Object.fromEntries(world.governorates.map((g) => [g.id, plans.plans[g.id].actions.filter((a) => sevRank(a.severity) >= 3).length])) as Record<GovId, number>) : undefined), [plans, world]);
  const districtHot = useMemo(() => {
    if (!plan) return undefined;
    const c: Record<string, number> = {};
    for (const a of plan.actions) for (const d of a.districts) c[d] = (c[d] ?? 0) + sevRank(a.severity);
    return c;
  }, [plan]);

  const allActions = plans ? Object.values(plans.plans).flatMap((p) => p.actions) : [];
  const scoped = (plan ? plan.actions : allActions).filter((a) => sector === "ALL" || a.sector === sector);
  const exportCsv = () => downloadCsv(`action-plan-${govId ?? "jordan"}-${year}.csv`, scoped.map((a, i) => ({ rank: i + 1, governorate: world.gov[a.govId].name.en, sector: a.sector, severity: a.severity, horizon: a.horizon, action: a.title.en, rationale: a.rationale.en, steps: a.steps.map((s) => s.en).join(" | "), kpi_target: a.kpi.en, lead_agency: a.lead.en, indicative_cost_jod_m: a.costM.toFixed(2), people_reached: Math.round(a.beneficiaries), districts: a.districts.map((d) => world.district[d].name.en).join(" | "), priority_score: a.score.toFixed(2), horizon_year: year, scenario: scenarioName, data_nature: "SIMULATED" })));
  const copyBriefing = async () => {
    if (!plan) return;
    const text = briefing(world, plan, year, ar);
    try {
      await navigator.clipboard.writeText(text);
      toast({ message: L("Briefing copied — paste it into an email or document.", "نُسخ الموجز — الصقه في بريد إلكتروني أو مستند.") });
    } catch {
      toast({ message: L("Copy the briefing below.", "انسخ الموجز أدناه."), fallback: text });
    }
  };
  const critHigh = (list: typeof allActions) => list.filter((a) => sevRank(a.severity) >= 3).length;

  return (
    <div>
      <PageHeader index={navIndex("/action-plans")} title={t("navActions")} subtitle={L("Corrective actions and strategies for every governorate. Each finding from the Planning Lab models is turned into a sized action — what, how much, by when, at what indicative cost, led by whom and measured how — with the evidence and hotspot districts.", "إجراءات تصحيحية واستراتيجيات لكل محافظة. تتحول كل نتيجة من نماذج مختبر التخطيط إلى إجراء محدد الحجم — ماذا وكم ومتى وبأي كلفة تقديرية ومن يقوده وكيف يُقاس — مع الأدلة والألوية الأكثر حاجة.")}>
        {plan ? <Button onClick={copyBriefing} data-testid="copy-briefing"><ClipboardCopy size={14} />{L("Copy briefing", "نسخ الموجز")}</Button> : null}
        <Button onClick={exportCsv} disabled={!plans}>{t("exportCsv")}</Button>
      </PageHeader>
      <LabBar>
        <Select value={govId ?? ""} onChange={(e) => selectGov((e.target.value || null) as GovId | null)} aria-label={t("governorate")} data-testid="plan-area">
          <option value="">{L("Jordan — national overview", "الأردن — نظرة وطنية")}</option>
          {world.governorates.map((g) => <option key={g.id} value={g.id}>{tx(g.name)}</option>)}
        </Select>
      </LabBar>
      <Callout tone="sim" className="mb-3">{L("Generated by transparent rules from simulated models with illustrative unit costs. These are proposals to support deliberation by the responsible ministries — every action needs review, costing and approval.", "مولّدة بقواعد شفافة من نماذج محاكاة وتكاليف وحدة توضيحية. هذه مقترحات لدعم نقاش الجهات المسؤولة — ويحتاج كل إجراء إلى مراجعة وتسعير واعتماد.")}</Callout>
      {loading || !plans ? (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-line bg-card py-16 text-[13px] text-ink-500"><Loader2 size={16} className="animate-spin" />{L("Running all Planning Lab models for this scenario…", "تشغيل جميع نماذج مختبر التخطيط لهذا السيناريو…")}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
            <Kpi label={L("Actions proposed", "الإجراءات المقترحة")} value={fmtInt(plan ? plan.actions.length : allActions.length)} sub={plan ? tx(world.gov[plan.govId].name) : L("12 governorates", "12 محافظة")} nature="SIMULATED" sources={["SIM_ACTIONS", "SIM_SMALL_AREA", "SIM_FACILITIES", "SIM_HOUSING_NEED", "SIM_WATER", "SIM_JOBS", "SIM_AGEING", "SIM_CLIMATE", "SIM_MOBILITY", "SIM_URBAN_CA", "SIM_NOWCAST"]} />
            <Kpi label={L("High or critical", "مرتفع أو حرج")} value={fmtInt(critHigh(plan ? plan.actions : allActions))} tone={critHigh(plan ? plan.actions : allActions) ? "crit" : "ok"} nature="SIMULATED" />
            <Kpi label={L("Immediate actions", "إجراءات فورية")} value={fmtInt((plan ? plan.actions : allActions).filter((a) => a.horizon === "IMMEDIATE").length)} sub={L("within 12 months", "خلال 12 شهراً")} nature="SIMULATED" />
            <Kpi label={L("Indicative cost", "الكلفة التقديرية")} value={`${fmt1((plan ? plan.totalCostM : plans.totalCostM) / 1000)}bn`} sub={`JOD · ${L("to", "حتى")} ${year}`} nature="SIMULATED" />
            <Kpi label={L("People reached", "المستفيدون")} value={fmtCompact(plan ? plan.beneficiaries : allActions.reduce((a, x) => a + x.beneficiaries, 0), locale)} sub={L("sum across actions", "مجموع الإجراءات")} nature="SIMULATED" />
            <Kpi label={L("Most pressing sector", "القطاع الأكثر إلحاحاً")} value={<span className="text-[16px]">{(() => { const list = plan ? plan.actions : allActions; const s = [...ACTION_SECTORS].sort((a, b) => critHigh(list.filter((x) => x.sector === b)) - critHigh(list.filter((x) => x.sector === a)))[0]; return tx(SECTOR_LABEL[s]); })()}</span>} nature="SIMULATED" />
          </div>

          {!plan ? (
            <>
              <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                <Panel title={L("Where action is needed — governorate × sector", "أين يلزم التدخل — المحافظة × القطاع")} subtitle={L("Highest severity among indicators and actions. Click a row for the governorate's plan.", "أعلى خطورة بين المؤشرات والإجراءات. انقر صفاً لعرض خطة المحافظة.")} nature="SIMULATED">
                  <div className="thin-scroll overflow-x-auto">
                    <table className="w-full min-w-[760px] text-[12px]">
                      <thead><tr className="text-[10.5px] uppercase tracking-wide text-ink-500"><th className="py-1.5 text-start">{t("governorate")}</th>{ACTION_SECTORS.map((s) => <th key={s} className="px-0.5 text-center font-semibold">{tx(SECTOR_LABEL[s])}</th>)}</tr></thead>
                      <tbody>
                        {world.governorates.map((g) => (
                          <tr key={g.id} className="cursor-pointer border-t border-line/60 hover:bg-sand-50" onClick={() => selectGov(g.id)} data-testid="matrix-row">
                            <td className="py-1 pe-2 font-medium">{tx(g.name)}</td>
                            {ACTION_SECTORS.map((s) => { const v = plans.plans[g.id].sectorSeverity[s]; return <td key={s} className="px-0.5 py-0.5 text-center"><span className={cn("block rounded px-1 py-0.5 text-[10.5px] font-semibold", v ? SEV_CELL[v] : "text-ink-400")}>{v ? t(`sev${v}`) : "—"}</span></td>; })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Panel>
                <div className="space-y-3">
                  <JordanMap height={330} title={L("High / critical actions per governorate", "الإجراءات المرتفعة / الحرجة لكل محافظة")} govValues={urgentByGov} scale="risk" format={(v) => fmtInt(v)} legendTitle={L("Actions", "إجراءات")} selectedGov={govId} onSelectGov={selectGov} districtMode="drill" sources={["SIM_SMALL_AREA"]} />
                  <Panel title={L("Strategic themes", "المحاور الاستراتيجية")} nature="SIMULATED">
                    <ul className="space-y-1.5 text-[12.5px] text-ink-700">{plans.themes.map((th, i) => <li key={i} className="flex gap-2"><span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-serious" /><span>{tx(th)}</span></li>)}</ul>
                  </Panel>
                </div>
              </div>
              <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_380px]">
                <Panel title={L("Top national priorities", "أهم الأولويات الوطنية")} subtitle={L("Ranked by severity × people affected × urgency (max. two per sector)", "مرتبة حسب الخطورة × المتأثرين × الإلحاح (اثنان كحد أقصى لكل قطاع)")} nature="SIMULATED">
                  <div className="grid gap-2.5 lg:grid-cols-2">{plans.top.slice(0, 10).map((a) => <ActionCard key={a.id} a={a} compact showGov />)}</div>
                </Panel>
                <Panel title={L("Indicative cost by sector", "الكلفة التقديرية حسب القطاع")} subtitle={L("JOD million, all governorates", "مليون دينار، جميع المحافظات")} nature="SIMULATED">{sectorChart ? <EChart option={sectorChart} height={360} /> : null}</Panel>
              </div>
            </>
          ) : (
            <>
              <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <Panel title={`${L("Diagnosis", "التشخيص")} — ${tx(world.gov[plan.govId].name)}`} subtitle={L("Each indicator compared with Jordan", "كل مؤشر مقارنة بالأردن")} nature="SIMULATED">
                  <div className="thin-scroll overflow-x-auto">
                    <table className="w-full min-w-[520px] text-[12.5px]">
                      <thead><tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-500"><th className="py-1.5 text-start">{L("Indicator", "المؤشر")}</th><th className="px-2 text-end">{tx(world.gov[plan.govId].name)}</th><th className="px-2 text-end">{L("Jordan", "الأردن")}</th><th className="px-2 text-end">{L("Level", "المستوى")}</th></tr></thead>
                      <tbody>
                        {[...plan.indicators].sort((a, b) => sevRank(b.severity) - sevRank(a.severity)).map((i) => (
                          <tr key={i.key} className="border-b border-line/60"><td className="py-1.5 pe-2"><span className="text-ink-400">{tx(SECTOR_LABEL[i.sector])} · </span>{tx(i.label)}</td><td className="px-2 text-end font-semibold tabular">{fmtInd(i, i.value)}</td><td className="px-2 text-end tabular text-ink-500">{i.national ? fmtInd(i, i.national) : "—"}</td><td className="px-2 text-end"><SeverityBadge s={i.severity} /></td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Panel>
                <div className="space-y-3">
                  <Panel title={L("Strategy by sector", "الاستراتيجية حسب القطاع")} nature="SIMULATED">
                    <ul className="space-y-2">
                      {ACTION_SECTORS.filter((s) => plan.strategy[s]).sort((a, b) => sevRank(plan.sectorSeverity[b]) - sevRank(plan.sectorSeverity[a])).map((s) => (
                        <li key={s} className="flex gap-2 text-[12.5px]"><span className="w-[120px] shrink-0 font-semibold text-ink-900">{tx(SECTOR_LABEL[s])}</span><span className="min-w-0 flex-1 text-ink-700">{tx(plan.strategy[s]!)}</span>{plan.sectorSeverity[s] ? <SeverityBadge s={plan.sectorSeverity[s]!} /> : null}</li>
                      ))}
                    </ul>
                  </Panel>
                  <JordanMap height={300} title={L("District hotspots in the plan", "الألوية ذات الأولوية في الخطة")} districtValues={districtHot} selectedGov={plan.govId} onSelectGov={selectGov} districtMode="drill" scale="risk" format={(v) => fmtInt(v)} legendTitle={L("Priority weight", "وزن الأولوية")} sources={["SIM_SMALL_AREA"]} />
                </div>
              </div>
            </>
          )}

          <Panel className="mt-3" title={plan ? `${L("Action plan", "خطة العمل")} — ${tx(world.gov[plan.govId].name)} · ${year}` : L("All proposed actions", "جميع الإجراءات المقترحة")} subtitle={L("Grouped by when they should start", "مجمّعة حسب موعد البدء")} nature="SIMULATED" actions={<Select value={sector} onChange={(e) => setSector(e.target.value as ActionSector | "ALL")} aria-label={L("Sector", "القطاع")}><option value="ALL">{L("All sectors", "جميع القطاعات")}</option>{ACTION_SECTORS.map((s) => <option key={s} value={s}>{tx(SECTOR_LABEL[s])}</option>)}</Select>}>
            <div className="mb-3"><Segmented size="xs" value={sector} onChange={setSector} options={[{ value: "ALL" as const, label: L("All", "الكل") }, ...ACTION_SECTORS.filter((s) => (plan ? plan.actions : allActions).some((a) => a.sector === s)).map((s) => ({ value: s, label: tx(SECTOR_LABEL[s]) }))]} /></div>
            <div className="grid gap-4 xl:grid-cols-3">
              {(["IMMEDIATE", "SHORT", "LONG"] as Horizon[]).map((h) => {
                const list = scoped.filter((a) => a.horizon === h).sort((a, b) => b.score - a.score).slice(0, plan ? 50 : 12);
                return (
                  <div key={h} className="min-w-0">
                    <div className="mb-2 flex items-center justify-between border-b border-line pb-1.5"><span className="text-[12px] font-semibold uppercase tracking-wide text-navy-800">{tx(HORIZON_LABEL[h])}</span><span className="text-[11.5px] text-ink-500 tabular">{scoped.filter((a) => a.horizon === h).length}</span></div>
                    <div className="space-y-2.5">{list.length ? list.map((a) => <ActionCard key={a.id} a={a} showGov={!plan} />) : <p className="text-[12px] text-ink-500">{L("None.", "لا يوجد.")}</p>}</div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </>
      )}
      <Method>
        <Formula>{"severity: thresholds on each indicator, mostly relative to the national value (e.g. seat gap share ÷ national share ≥ 1.8 → CRITICAL)"}</Formula>
        <Formula>{"priority score = severity weight (1–4) × log10(people reached + 10) × urgency (immediate 1.25, short 1.1, long 1)"}</Formula>
        <p>{L("Each rule is written in the open in src/simulation/lab/actions.ts: the trigger (e.g. water stress before 2031 and supply below 90%), the sizing (e.g. schools = seat gap ÷ 640), the indicative cost (shared Planning Lab unit costs), the lead agency and the KPI. Hotspot districts come from the district-level outputs of the same models. Census & data actions also react to live fieldwork, the PES and the nowcast.", "كل قاعدة مكتوبة بشفافية في src/simulation/lab/actions.ts: شرط التفعيل (مثل الإجهاد المائي قبل 2031 مع إمداد دون 90%)، والتحجيم (مثل المدارس = فجوة المقاعد ÷ 640)، والكلفة التقديرية (تكاليف الوحدة المشتركة)، والجهة القائدة، ومؤشر الأداء. تأتي الألوية ذات الأولوية من مخرجات النماذج نفسها على مستوى اللواء. وتتفاعل إجراءات التعداد والبيانات مع العمل الميداني الحي ومسح ما بعد العدّ والتقدير الآني.")}</p>
      </Method>
    </div>
  );
}
