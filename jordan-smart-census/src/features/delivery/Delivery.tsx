"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Cloud, HardDrive, MessageSquare, Presentation, Save } from "lucide-react";
import { useApp } from "@/store/app";
import { useEngine } from "@/store/engine";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader, Panel, Callout } from "@/components/ui/panel";
import { Kpi, ProgressBar } from "@/components/ui/kpi";
import { Button } from "@/components/ui/button";
import { Input, Segmented, Select, Tabs } from "@/components/ui/form";
import { Pill } from "@/components/ui/badges";
import { downloadCsv } from "@/lib/csv";
import { navIndex } from "@/lib/nav";
import { fmtDate, fmtInt, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ACTION_SECTORS, SECTOR_LABEL, type ActionSector } from "@/simulation/lab/actions";
import type { GovId } from "@/types/census";
import {
  HEALTH_COLOR, HEALTH_LABEL, ROLE_LABEL, STAGES, diffVersions, expectedProgress, healthOf, kpiProgress, nextMilestone, overdue, stageOf, versionRows,
  type Health, type PortfolioItem, type Role,
} from "@/delivery/model";
import { loadDemo, resetLocal, saveVersion, useDelivery, useDeliveryStore } from "@/delivery/store";
import { usePlans } from "@/features/lab/shared";
import { DemoBadge, EventLine, HealthBadge, StageBadge, jod } from "./parts";
import { ItemSheet } from "./ItemSheet";

type Tab = "board" | "table" | "activity" | "versions";
const HEALTH_ORDER: Health[] = ["ON_TRACK", "AT_RISK", "OFF_TRACK", "NOT_STARTED", "DONE"];

type Row = { i: PortfolioItem; stage: ReturnType<typeof stageOf>; health: Health; prog: number; exp: number; od: number; next: ReturnType<typeof nextMilestone> };

function DeliveryCard({ r, comments, onOpen }: { r: Row; comments: number; onOpen: (id: string) => void }) {
  const engine = useEngine();
  const { tx, L, locale } = useI18n();
  return (
    <button type="button" onClick={() => onOpen(r.i.id)} className="w-full rounded-lg border border-line bg-card px-3 py-2.5 text-start hover:border-navy-300 hover:shadow-sm" data-testid="delivery-card">
      <div className="flex flex-wrap items-center gap-1.5"><HealthBadge h={r.health} /><Pill>{tx(engine.world.gov[r.i.govId].name)}</Pill>{r.i.demo ? <DemoBadge /> : null}</div>
      <div className="mt-1 text-[13px] font-semibold leading-snug text-ink-900">{tx(r.i.title)}</div>
      {r.stage !== "PROPOSED" ? <ProgressBar value={r.prog} expected={r.exp} color={HEALTH_COLOR[r.health]} className="mt-2" /> : null}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[11.5px] text-ink-500">
        <span className="tabular">{r.i.costM > 0 ? jod(r.i.costM, locale) : "—"}</span>
        {r.next ? <span className={cn(r.od ? "font-medium text-crit" : "")}>· {r.od ? L(`${r.od} overdue`, `${r.od} متأخر`) : `${L("next", "التالي")}: ${fmtDate(r.next.due, locale)}`}</span> : null}
        {comments ? <span className="inline-flex items-center gap-0.5">· <MessageSquare size={11} /> {comments}</span> : null}
      </div>
    </button>
  );
}

export function Delivery() {
  const engine = useEngine();
  const { t, tx, L, locale } = useI18n();
  const { data, mode, role, canPlan, canApprove, nameOf } = useDelivery();
  const localRole = useDeliveryStore((s) => s.localRole);
  const setLocalRole = useDeliveryStore((s) => s.setLocalRole);
  const focus = useDeliveryStore((s) => s.focus);
  const setFocus = useDeliveryStore((s) => s.setFocus);
  const readOnlyReason = useDeliveryStore((s) => s.readOnlyReason);
  const govId = useApp((s) => s.govId);
  const selectGov = useApp((s) => s.selectGov);
  const { plans } = usePlans();
  const [tab, setTab] = useState<Tab>("board");
  const [sector, setSector] = useState<ActionSector | "ALL">("ALL");
  const [versionName, setVersionName] = useState("");
  const [compare, setCompare] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const demoActive = useApp((s) => s.demoActive);
  const empty = Object.keys(data.items).length === 0;
  // during the executive demo, an empty local workspace is filled with the demo portfolio
  useEffect(() => {
    if (!demoActive || mode !== "local" || !empty || !plans) return;
    const h = setTimeout(() => void loadDemo(Object.values(plans.plans).flatMap((p) => p.actions)), 50);
    return () => clearTimeout(h);
  }, [demoActive, mode, empty, plans]);

  const all = Object.values(data.items);
  const items = all.filter((i) => (!govId || i.govId === govId) && (sector === "ALL" || i.sector === sector));
  const rows: Row[] = items.map((i) => ({ i, stage: stageOf(i, data.approvals), health: healthOf(i, data.approvals), prog: kpiProgress(i), exp: expectedProgress(i), od: overdue(i).length, next: nextMilestone(i) }));
  const live = rows.filter((r) => r.stage !== "DROPPED");
  const active = live.filter((r) => r.stage === "APPROVED" || r.stage === "IN_DELIVERY");
  const approvedCost = live.filter((r) => r.stage !== "PROPOSED").reduce((s, r) => s + r.i.costM, 0);
  const spent = live.reduce((s, r) => s + r.i.spentM, 0);
  const onTrack = active.filter((r) => r.health === "ON_TRACK").length;
  const risky = active.filter((r) => r.health === "AT_RISK" || r.health === "OFF_TRACK").length;
  const overdueMs = live.reduce((s, r) => s + r.od, 0);
  const awaiting = live.filter((r) => r.stage === "PROPOSED").length;
  const anyDemo = all.some((i) => i.demo);

  const byGov = useMemo(() => engine.world.governorates.map((g) => {
    const rs = Object.values(data.items).filter((i) => i.govId === g.id).map((i) => ({ stage: stageOf(i, data.approvals), health: healthOf(i, data.approvals), cost: i.costM })).filter((r) => r.stage !== "DROPPED");
    return { g, n: rs.length, cost: rs.reduce((s, r) => s + r.cost, 0), counts: Object.fromEntries(HEALTH_ORDER.map((h) => [h, rs.filter((r) => r.health === h).length])) as Record<Health, number> };
  }).filter((x) => x.n > 0).sort((a, b) => b.n - a.n), [data, engine.world]);

  const versions = [...data.versions].reverse();
  const cmp = compare ? data.versions.find((v) => v.id === compare) : null;
  const diff = cmp ? diffVersions(cmp.rows, versionRows(data)) : null;

  const exportCsv = () => downloadCsv("delivery-portfolio.csv", rows.map((r) => ({
    governorate: engine.world.gov[r.i.govId].name.en, sector: r.i.sector, action: r.i.title.en, stage: r.stage, health: r.health,
    progress_pct: Math.round(r.prog * 100), time_elapsed_pct: Math.round(r.exp * 100), overdue_milestones: r.od, next_milestone: r.next ? `${r.next.title.en} (${r.next.due})` : "",
    responsible_unit: r.i.owner, cost_jod_m: r.i.costM, spent_jod_m: r.i.spentM, approved_by: data.approvals[r.i.id]?.decision === "APPROVED" ? nameOf(data.approvals[r.i.id].by) : "",
    approved_on: data.approvals[r.i.id]?.decision === "APPROVED" ? data.approvals[r.i.id].at.slice(0, 10) : "", demo_data: r.i.demo ? "yes" : "no",
  })));

  return (
    <div>
      <PageHeader index={navIndex("/delivery")} title={t("navDelivery")} subtitle={L("From plan to delivery. Corrective actions proposed from the Area Action Plans are approved by an approver, given an owner and milestones, and tracked against their targets — with comments, a full audit trail and saved versions of the portfolio.", "من الخطة إلى التنفيذ. تُعتمد الإجراءات التصحيحية المقترحة من خطط العمل للمناطق من قبل معتمِد، وتُحدد لها جهة مسؤولة ومراحل رئيسية، ويُتابع تقدمها نحو المستهدف — مع التعليقات وسجل تدقيق كامل ونسخ محفوظة من المحفظة.")}>
        <Link href="/briefing"><Button><Presentation size={13} />{t("navBriefing")}</Button></Link>
        <Button onClick={exportCsv} disabled={!rows.length}>{t("exportCsv")}</Button>
      </PageHeader>

      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-line bg-card px-3 py-2 text-[12.5px]" data-testid="workspace-bar">
        {mode === "shared" ? (
          <span className="inline-flex items-center gap-1.5 font-medium text-ok"><Cloud size={14} />{L("Shared workspace · live", "مساحة عمل مشتركة · مباشرة")}</span>
        ) : mode === "connecting" ? (
          <span className="inline-flex items-center gap-1.5 text-ink-500"><Cloud size={14} />{L("Connecting to the shared workspace…", "جارٍ الاتصال بمساحة العمل المشتركة…")}</span>
        ) : (
          <span className="inline-flex items-center gap-1.5 font-medium text-ink-700"><HardDrive size={14} />{L("Local workspace — saved in this browser only", "مساحة عمل محلية — محفوظة في هذا المتصفح فقط")}</span>
        )}
        <span className="text-ink-300">|</span>
        {mode === "shared" ? (
          <span className="text-ink-700">{L("Your role", "دورك")}: <b>{tx(ROLE_LABEL[role])}</b> <span className="text-ink-500">({role === "APPROVER" ? L("editors and the owner approve", "يعتمد المحررون والمالك") : role === "PLANNER" ? L("you can propose, update and comment", "يمكنك الاقتراح والتحديث والتعليق") : L("view only", "اطلاع فقط")})</span></span>
        ) : (
          <span className="inline-flex flex-wrap items-center gap-1.5 text-ink-700">{L("Acting as", "بصفة")}<Segmented<Role> value={localRole} onChange={setLocalRole} size="xs" options={(["VIEWER", "PLANNER", "APPROVER"] as Role[]).map((r) => ({ value: r, label: tx(ROLE_LABEL[r]) }))} /><span className="text-[11.5px] text-ink-500">{L("(demonstration setting — in the hosted UFUQ link roles come from sharing permissions and the portfolio is shared live)", "(إعداد للعرض — في رابط أفق المستضاف تأتي الأدوار من صلاحيات المشاركة وتكون المحفظة مشتركة مباشرة)")}</span></span>
        )}
      </div>
      {readOnlyReason ? <Callout tone="warn" className="mb-3">{L("Changes cannot be saved to the shared workspace with your current access. You can still view everything.", "لا يمكن حفظ التغييرات في مساحة العمل المشتركة بصلاحياتك الحالية. يمكنك الاطلاع على كل شيء.")}</Callout> : null}

      {all.length === 0 ? (
        <Panel title={L("The portfolio is empty", "المحفظة فارغة")} nature="SIMULATED">
          <div className="max-w-2xl space-y-3 text-[13px] text-ink-700">
            <p>{L("Open the Area Action Plans and press “Propose for delivery” on any corrective action. It appears here as a proposal awaiting approval.", "افتح خطط العمل للمناطق واضغط «اقترح للتنفيذ» على أي إجراء تصحيحي. سيظهر هنا مقترحاً بانتظار الاعتماد.")}</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/action-plans"><Button variant="primary">{L("Go to Area Action Plans", "انتقل إلى خطط العمل للمناطق")}</Button></Link>
              {canPlan ? <Button disabled={!plans} onClick={() => plans && loadDemo(Object.values(plans.plans).flatMap((p) => p.actions))} data-testid="load-demo">{plans ? L("Load demo portfolio", "تحميل محفظة تجريبية") : L("Preparing actions…", "جارٍ إعداد الإجراءات…")}</Button> : null}
            </div>
            <p className="text-[12px] text-ink-500">{L("The demo portfolio adds the 14 highest-priority actions with simulated progress, marked “Demo”, so the tracker can be shown with content.", "تضيف المحفظة التجريبية أعلى 14 إجراءً أولوية مع تقدم محاكى، موسومة «تجريبي»، لعرض المتابعة بمحتوى.")}</p>
          </div>
        </Panel>
      ) : (
        <>
          {anyDemo ? <Callout tone="sim" className="mb-3">{L("Items marked “Demo” were created by the demo loader: their approvals, milestones and progress are simulated, not real delivery records.", "العناصر الموسومة «تجريبي» أنشأتها أداة التحميل التجريبية: اعتماداتها ومراحلها وتقدمها محاكاة وليست سجلات تنفيذ حقيقية.")}</Callout> : null}
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
            <Kpi label={L("Actions in portfolio", "إجراءات في المحفظة")} value={fmtInt(live.length)} sub={L(`${awaiting} awaiting approval`, `${awaiting} بانتظار الاعتماد`)} />
            <Kpi label={L("Approved investment", "الاستثمار المعتمد")} value={jod(approvedCost, locale)} sub={`${L("spent", "المنفق")} ${jod(spent, locale)}`} />
            <Kpi label={L("In delivery", "قيد التنفيذ")} value={fmtInt(active.length)} sub={L(`${live.filter((r) => r.stage === "DONE").length} delivered`, `${live.filter((r) => r.stage === "DONE").length} منجز`)} />
            <Kpi label={L("On track", "على المسار")} value={active.length ? fmtPct(onTrack / active.length, 0) : "—"} tone="ok" sub={L(`${onTrack} of ${active.length} active`, `${onTrack} من ${active.length} نشطة`)} />
            <Kpi label={L("At risk / off track", "معرض للخطر / خارج المسار")} value={fmtInt(risky)} tone={risky ? "crit" : undefined} />
            <Kpi label={L("Overdue milestones", "مراحل متأخرة")} value={fmtInt(overdueMs)} tone={overdueMs ? "warn" : undefined} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ value: "board", label: L("Board", "اللوحة") }, { value: "table", label: L("Table", "الجدول"), count: rows.length }, { value: "activity", label: L("Activity", "النشاط"), count: data.events.length }, { value: "versions", label: L("Versions", "النسخ"), count: data.versions.length }]} />
            <div className="ms-auto flex flex-wrap gap-1.5">
              <Select value={govId ?? ""} onChange={(e) => selectGov((e.target.value || null) as GovId | null)} aria-label={t("governorate")}><option value="">{t("allJordan")}</option>{engine.world.governorates.map((g) => <option key={g.id} value={g.id}>{tx(g.name)}</option>)}</Select>
              <Select value={sector} onChange={(e) => setSector(e.target.value as ActionSector | "ALL")} aria-label={L("Sector", "القطاع")}><option value="ALL">{L("All sectors", "جميع القطاعات")}</option>{ACTION_SECTORS.map((s) => <option key={s} value={s}>{tx(SECTOR_LABEL[s])}</option>)}</Select>
            </div>
          </div>

          {tab === "board" ? (
            <>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {STAGES.map((s) => {
                  const col = rows.filter((r) => r.stage === s).sort((a, b) => b.i.costM - a.i.costM);
                  return (
                    <div key={s} className="min-w-0 rounded-lg bg-sand-50 p-2" data-testid={`column-${s}`}>
                      <div className="mb-2 flex items-center justify-between px-1"><StageBadge s={s} /><span className="text-[12px] text-ink-500 tabular">{col.length} · {jod(col.reduce((x, r) => x + r.i.costM, 0), locale)}</span></div>
                      <div className="space-y-2">{col.map((r) => <DeliveryCard key={r.i.id} r={r} comments={data.comments.filter((c) => c.itemId === r.i.id).length} onOpen={setFocus} />)}{col.length === 0 ? <p className="px-1 py-3 text-[12px] text-ink-400">{L("Nothing here.", "لا شيء هنا.")}</p> : null}</div>
                    </div>
                  );
                })}
              </div>
              {byGov.length > 1 ? (
                <Panel className="mt-3" title={L("Delivery health by governorate", "صحة التنفيذ حسب المحافظة")} subtitle={L("Rule-based: off track = 2+ overdue milestones or progress 30+ points behind time elapsed; at risk = 1 overdue or 15+ points behind.", "قائمة على القواعد: خارج المسار = مرحلتان متأخرتان أو أكثر أو تأخر التقدم 30 نقطة أو أكثر عن الوقت المنقضي؛ معرض للخطر = مرحلة متأخرة أو تأخر 15 نقطة أو أكثر.")}>
                  <div className="space-y-1.5">
                    {byGov.map(({ g, n, cost, counts }) => (
                      <button key={g.id} type="button" onClick={() => selectGov(g.id)} className="grid w-full grid-cols-[110px_minmax(0,1fr)_120px] items-center gap-2 text-start text-[12.5px] hover:bg-sand-50">
                        <span className="truncate font-medium text-ink-900">{tx(g.name)}</span>
                        <span className="flex h-3 overflow-hidden rounded-sm">{HEALTH_ORDER.map((h) => counts[h] ? <span key={h} style={{ width: `${(counts[h] / n) * 100}%`, background: HEALTH_COLOR[h] }} className="border-e-2 border-card last:border-e-0" title={`${tx(HEALTH_LABEL[h])}: ${counts[h]}`} /> : null)}</span>
                        <span className="text-end text-ink-500 tabular">{n} · {jod(cost, locale)}</span>
                      </button>
                    ))}
                    <div className="flex flex-wrap gap-3 pt-1 text-[11.5px] text-ink-500">{HEALTH_ORDER.map((h) => <span key={h} className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: HEALTH_COLOR[h] }} />{tx(HEALTH_LABEL[h])}</span>)}</div>
                  </div>
                </Panel>
              ) : null}
            </>
          ) : null}

          {tab === "table" ? (
            <Panel className="mt-3" title={L("Portfolio", "المحفظة")}>
              <div className="thin-scroll overflow-x-auto">
                <table className="w-full min-w-[900px] text-[12.5px]">
                  <thead><tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-500"><th className="py-1.5 text-start">{L("Action", "الإجراء")}</th><th className="text-start">{t("governorate")}</th><th className="text-start">{L("Stage", "المرحلة")}</th><th className="text-start">{L("Health", "الحالة")}</th><th className="px-2 text-start">{L("Progress", "التقدم")}</th><th className="text-start">{L("Next milestone", "المرحلة التالية")}</th><th className="text-start">{L("Responsible unit", "الجهة المسؤولة")}</th><th className="px-2 text-end">{L("Cost", "الكلفة")}</th></tr></thead>
                  <tbody>
                    {rows.sort((a, b) => STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage)).map((r) => (
                      <tr key={r.i.id} onClick={() => setFocus(r.i.id)} className="cursor-pointer border-b border-line/60 hover:bg-sand-50" data-testid="delivery-row">
                        <td className="max-w-[300px] py-1.5 pe-2 font-medium text-ink-900">{tx(r.i.title)} {r.i.demo ? <DemoBadge /> : null}</td>
                        <td className="text-ink-700">{tx(engine.world.gov[r.i.govId].name)}</td>
                        <td><StageBadge s={r.stage} /></td>
                        <td><HealthBadge h={r.health} /></td>
                        <td className="w-32 px-2"><div className="flex items-center gap-1.5"><ProgressBar value={r.prog} expected={r.stage === "PROPOSED" ? undefined : r.exp} color={HEALTH_COLOR[r.health]} /><span className="w-9 text-end tabular text-[11.5px]">{Math.round(r.prog * 100)}%</span></div></td>
                        <td className={cn("text-[12px]", r.od ? "text-crit" : "text-ink-700")}>{r.next ? `${tx(r.next.title)} · ${fmtDate(r.next.due, locale)}` : "—"}</td>
                        <td className="max-w-[180px] truncate text-ink-700">{r.i.owner}</td>
                        <td className="px-2 text-end tabular">{r.i.costM > 0 ? jod(r.i.costM, locale) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          ) : null}

          {tab === "activity" ? (
            <Panel className="mt-3" title={L("Activity", "النشاط")} subtitle={L("Every proposal, decision, update and comment — who and when.", "كل اقتراح وقرار وتحديث وتعليق — من ومتى.")}>
              <ul className="max-w-3xl">{[...data.events].reverse().slice(0, 150).map((e) => <EventLine key={e.id} e={e} items={data.items} nameOf={nameOf} />)}</ul>
            </Panel>
          ) : null}

          {tab === "versions" ? (
            <div className="mt-3 grid gap-3 xl:grid-cols-[360px_minmax(0,1fr)]">
              <Panel title={L("Saved versions", "النسخ المحفوظة")} subtitle={L("A version freezes the portfolio — for a cabinet submission, a quarterly review or a budget round — so later changes can be compared against it.", "تجمّد النسخة المحفظة — لتقديمها لمجلس الوزراء أو لمراجعة ربعية أو لدورة الموازنة — لمقارنة التغييرات اللاحقة بها.")}>
                {canApprove ? (
                  <form className="mb-3 flex gap-1.5" onSubmit={(e) => { e.preventDefault(); if (!versionName.trim()) return; void saveVersion(versionName.trim()); setVersionName(""); }}>
                    <Input className="flex-1" value={versionName} onChange={(e) => setVersionName(e.target.value)} placeholder={L("e.g. Q3 review", "مثال: مراجعة الربع الثالث")} data-testid="version-name" />
                    <Button type="submit" variant="primary" data-testid="version-save"><Save size={13} />{L("Save", "حفظ")}</Button>
                  </form>
                ) : <p className="mb-3 text-[12px] text-ink-500">{L("Approvers save versions.", "يحفظ المعتمِدون النسخ.")}</p>}
                <ul className="space-y-1.5">
                  {versions.map((v) => (
                    <li key={v.id}>
                      <button type="button" onClick={() => setCompare(v.id)} className={cn("w-full rounded-md border px-2.5 py-1.5 text-start text-[12.5px]", compare === v.id ? "border-navy-500 bg-navy-100/50" : "border-line hover:bg-sand-50")} data-testid="version">
                        <div className="font-medium text-ink-900">{v.name}</div>
                        <div className="text-[11.5px] text-ink-500">{nameOf(v.by)} · {fmtDate(new Date(v.at), locale)} · {v.rows.length} {L("actions", "إجراء")}</div>
                      </button>
                    </li>
                  ))}
                  {versions.length === 0 ? <li className="text-[12.5px] text-ink-500">{L("No versions yet.", "لا نسخ بعد.")}</li> : null}
                </ul>
              </Panel>
              <Panel title={cmp ? `${L("Changes since", "التغييرات منذ")} “${cmp.name}”` : L("Compare", "المقارنة")}>
                {!diff ? <p className="text-[12.5px] text-ink-500">{L("Select a version to see what changed since.", "اختر نسخة لرؤية ما تغير منذ حفظها.")}</p> : (
                  <div className="space-y-3 text-[12.5px]" data-testid="version-diff">
                    <div className="flex flex-wrap gap-2"><Pill>{L("Added", "أضيف")}: {diff.added.length}</Pill><Pill>{L("Removed", "أزيل")}: {diff.removed.length}</Pill><Pill>{L("Changed", "تغير")}: {diff.changed.length}</Pill><Pill>{L("Cost change", "تغير الكلفة")}: {diff.costDelta >= 0 ? "+" : "−"}{jod(Math.abs(diff.costDelta), locale)}</Pill></div>
                    {diff.added.length ? <div><b>{L("Added", "أضيف")}</b><ul className="mt-1 list-disc ps-5">{diff.added.map((r) => <li key={r.id}>{tx(r.title)} — {tx(engine.world.gov[r.govId].name)}</li>)}</ul></div> : null}
                    {diff.removed.length ? <div><b>{L("Removed", "أزيل")}</b><ul className="mt-1 list-disc ps-5">{diff.removed.map((r) => <li key={r.id}>{tx(r.title)} — {tx(engine.world.gov[r.govId].name)}</li>)}</ul></div> : null}
                    {diff.changed.length ? (
                      <div className="thin-scroll overflow-x-auto">
                        <table className="w-full min-w-[560px]"><thead><tr className="border-b border-line text-[11px] uppercase text-ink-500"><th className="py-1 text-start">{L("Action", "الإجراء")}</th><th className="text-start">{L("Then", "سابقاً")}</th><th className="text-start">{L("Now", "الآن")}</th><th className="text-end">{L("Progress", "التقدم")}</th></tr></thead>
                          <tbody>{diff.changed.map(({ now, then }) => <tr key={now.id} className="border-b border-line/60"><td className="py-1 pe-2">{tx(now.title)}</td><td><span className="inline-flex gap-1"><StageBadge s={then.stage} /><HealthBadge h={then.health} /></span></td><td><span className="inline-flex gap-1"><StageBadge s={now.stage} /><HealthBadge h={now.health} /></span></td><td className="text-end tabular">{Math.round(then.progress * 100)}% → {Math.round(now.progress * 100)}%</td></tr>)}</tbody>
                        </table>
                      </div>
                    ) : null}
                    {!diff.added.length && !diff.removed.length && !diff.changed.length ? <p className="text-ink-500">{L("No changes since this version.", "لا تغييرات منذ هذه النسخة.")}</p> : null}
                  </div>
                )}
              </Panel>
            </div>
          ) : null}

          {mode === "local" && canApprove ? (
            <div className="mt-4 text-[12px] text-ink-500">
              {confirmReset ? (
                <span className="inline-flex flex-wrap items-center gap-2">{L("Clear the whole local portfolio, comments, activity and versions?", "مسح المحفظة المحلية بالكامل مع التعليقات والنشاط والنسخ؟")}<Button size="xs" variant="danger" onClick={() => { resetLocal(); setConfirmReset(false); }}>{L("Clear", "مسح")}</Button><Button size="xs" variant="ghost" onClick={() => setConfirmReset(false)}>{L("Cancel", "إلغاء")}</Button></span>
              ) : <button type="button" className="hover:underline" onClick={() => setConfirmReset(true)}>{L("Clear local workspace…", "مسح مساحة العمل المحلية…")}</button>}
            </div>
          ) : null}
        </>
      )}
      <ItemSheet id={focus} onClose={() => setFocus(null)} />
    </div>
  );
}

