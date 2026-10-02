"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useApp } from "@/store/app";
import { useEngine } from "@/store/engine";
import { useI18n } from "@/hooks/useI18n";
import { useScope } from "@/hooks/useScope";
import { PageHeader, Panel, Callout } from "@/components/ui/panel";
import { Kpi } from "@/components/ui/kpi";
import { DataTable } from "@/components/ui/data-table";
import { SeverityBadge, Pill } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Modal, Sheet } from "@/components/ui/dialog";
import { EChart } from "@/components/charts/echart";
import { barH, VIZ } from "@/components/charts/builders";
import { RULES, RULE_INDEX } from "@/simulation/quality";
import { isOpen } from "@/simulation/engine";
import { downloadCsv } from "@/lib/csv";
import { fmtDateTime, fmtInt, fmtPct } from "@/lib/format";
import type { IssueStatus, QualityIssue, Severity } from "@/types/census";
import { navIndex } from "@/lib/nav";

type Action = "ASSIGN" | "INVESTIGATE" | "REQUEST_REVISIT" | "RESOLVE" | "DISMISS";
const SEVS: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const STATUSES: IssueStatus[] = ["OPEN", "ASSIGNED", "INVESTIGATING", "REVISIT_REQUESTED", "RESOLVED", "DISMISSED"];

export function Quality() {
  const engine = useEngine();
  const { t, tx, L, lb, ar, locale } = useI18n();
  const { govId } = useScope();
  const actor = useApp((s) => s.actor);
  const bump = useApp((s) => s.bump);
  const [sev, setSev] = useState("ALL");
  const [status, setStatus] = useState("OPENISH");
  const [rule, setRule] = useState("ALL");
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<string | null>(null);
  const [pending, setPending] = useState<{ id: string; action: Action } | null>(null);
  const [note, setNote] = useState("");
  const [assignee, setAssignee] = useState("");
  const [supId, setSupId] = useState("");
  const v = engine.version;

  const scoped = useMemo(() => engine.issues.filter((x) => !govId || x.govId === govId), [engine, v, govId, engine.issues.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = useMemo(() => scoped.filter((x) => (sev === "ALL" || x.severity === sev) && (rule === "ALL" || x.ruleId === rule) && (status === "ALL" || (status === "OPENISH" ? isOpen(x.status) : x.status === status))).slice().reverse(), [scoped, sev, rule, status]);
  const counts = useMemo(() => {
    const byRule: Record<string, number> = {};
    for (const x of scoped) byRule[x.ruleId] = (byRule[x.ruleId] ?? 0) + 1;
    return byRule;
  }, [scoped]);
  const agg = engine.aggregate(govId ? (a) => a.govId === govId : undefined);

  const act = (id: string, action: Action) => {
    if (action === "DISMISS" || action === "ASSIGN") {
      const issue = engine.issues.find((x) => x.id === id);
      const k = issue?.eaId ? engine.world.eaIdx.get(issue.eaId) : undefined;
      const sup = k !== undefined ? engine.world.eas[k].supervisorId : "DQ-UNIT";
      setSupId(sup);
      setAssignee(sup);
      setNote("");
      setPending({ id, action });
      return;
    }
    engine.issueAction(id, action, actor);
    bump();
  };
  const confirm = () => {
    if (!pending) return;
    if (pending.action === "DISMISS" && note.trim().length < 5) return;
    engine.issueAction(pending.id, pending.action, actor, note || undefined, pending.action === "ASSIGN" ? assignee : undefined);
    setPending(null);
    bump();
  };

  const columns = useMemo<ColumnDef<QualityIssue, unknown>[]>(() => [
    { accessorKey: "id", header: "ID", cell: (c) => <span className="font-mono text-[11.5px]">{c.getValue() as string}</span> },
    { accessorKey: "severity", header: t("severity"), cell: (c) => <SeverityBadge s={c.getValue() as Severity} />, sortingFn: (a, b) => SEVS.indexOf(b.original.severity) - SEVS.indexOf(a.original.severity) },
    { accessorKey: "ruleId", header: L("Rule", "القاعدة"), cell: (c) => <span title={tx(RULE_INDEX[c.getValue() as string]?.title)}><span className="font-mono text-[11.5px]">{c.getValue() as string}</span> <span className="text-ink-500">{tx(RULE_INDEX[c.getValue() as string]?.title)}</span></span> },
    { id: "message", header: L("Finding", "النتيجة"), accessorFn: (r) => tx(r.message), cell: (c) => <span className="line-clamp-2 max-w-[360px] text-[12px]">{c.getValue() as string}</span> },
    { accessorKey: "entityId", header: L("Record", "السجل"), cell: (c) => <span className="font-mono text-[11px]">{c.getValue() as string}</span> },
    { accessorKey: "govId", header: t("governorate"), cell: (c) => tx(engine.world.gov[c.getValue() as QualityIssue["govId"]].name) },
    { accessorKey: "status", header: t("status"), cell: (c) => <Pill>{lb("issueStatus", c.getValue() as string)}</Pill> },
    {
      id: "actions", header: t("actions"), enableSorting: false,
      cell: (c) => {
        const r = c.row.original;
        if (!isOpen(r.status)) return <span className="text-[11.5px] text-ink-400">{r.dismissReason ? `“${r.dismissReason}”` : r.history.at(-1)?.by}</span>;
        return (
          <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
            <Button size="xs" onClick={() => act(r.id, "ASSIGN")}>{L("Assign", "إسناد")}</Button>
            <Button size="xs" onClick={() => act(r.id, "INVESTIGATE")}>{L("Investigate", "تحقيق")}</Button>
            <Button size="xs" onClick={() => act(r.id, "REQUEST_REVISIT")} disabled={!r.eaId}>{L("Revisit", "زيارة")}</Button>
            <Button size="xs" variant="primary" onClick={() => act(r.id, "RESOLVE")}>{L("Resolve", "حل")}</Button>
            <Button size="xs" variant="ghost" onClick={() => act(r.id, "DISMISS")}>{L("Dismiss", "استبعاد")}</Button>
          </div>
        );
      },
    },
  ], [t, tx, L, lb, engine]); // eslint-disable-line react-hooks/exhaustive-deps

  const issue = detail ? engine.issues.find((x) => x.id === detail) : null;
  const ruleChart = useMemo(() => {
    const list = RULES.filter((r) => counts[r.id]).sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0));
    return barH(list.map((r) => `${r.id} ${tx(r.title)}`), [{ name: L("Issues", "المسائل"), data: list.map((r) => counts[r.id]), color: VIZ[5] }], { rtl: ar, showLabels: true });
  }, [counts, tx, ar, L]);

  return (
    <div>
      <PageHeader index={navIndex("/quality")} title={t("nav08")} subtitle={L("Deterministic edit rules run on every enumerated record at the end of each field day. Every issue follows a human workflow: assign, investigate, request revisit, resolve or dismiss with a reason.", "تُطبّق قواعد تدقيق حتمية على كل سجل معدود في نهاية كل يوم ميداني. تتبع كل مسألة مساراً بشرياً: إسناد، تحقيق، طلب زيارة متابعة، حل أو استبعاد مع ذكر السبب.")}>
        <Button onClick={() => downloadCsv("quality-issues.csv", scoped.map((x) => ({ id: x.id, rule: x.ruleId, rule_title: RULE_INDEX[x.ruleId]?.title.en, severity: x.severity, entity_type: x.entityType, entity_id: x.entityId, household: x.householdId ?? "", ea: x.eaId ?? "", enumerator: x.enumeratorId ?? "", governorate: x.govId, detected: engine.timeOf(x.step).toISOString(), status: x.status, assignee: x.assignee ?? "", dismiss_reason: x.dismissReason ?? "", message: x.message.en, evidence: x.evidence.en })))}>{t("exportCsv")} ({fmtInt(scoped.length)})</Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label={L("Issues detected", "المسائل المرصودة")} value={fmtInt(scoped.length)} nature="SYNTHETIC_OPERATIONAL" sources={["OPS_QUALITY"]} />
        {SEVS.slice(0, 3).map((s) => <Kpi key={s} label={`${t(`sev${s}`)} — ${L("open", "مفتوحة")}`} value={fmtInt(scoped.filter((x) => x.severity === s && isOpen(x.status)).length)} tone={s === "CRITICAL" && scoped.some((x) => x.severity === s && isOpen(x.status)) ? "crit" : undefined} nature="SYNTHETIC_OPERATIONAL" />)}
        <Kpi label={L("Resolved / dismissed", "محلولة / مستبعدة")} value={`${fmtInt(scoped.filter((x) => x.status === "RESOLVED").length)} / ${fmtInt(scoped.filter((x) => x.status === "DISMISSED").length)}`} nature="SYNTHETIC_OPERATIONAL" />
        <Kpi label={t("kValidation")} value={fmtPct(agg.validationRate)} sub={`${fmtInt(agg.failed)} ${L("failed records", "سجل مخفق")}`} nature="SYNTHETIC_OPERATIONAL" />
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Panel title={L("Issues by rule", "المسائل حسب القاعدة")} nature="SYNTHETIC_OPERATIONAL">{Object.keys(counts).length ? <EChart option={ruleChart} height={Math.max(160, Object.keys(counts).length * 24 + 20)} /> : <p className="py-10 text-center text-[12.5px] text-ink-500">{L("Start the census to generate quality issues.", "ابدأ التعداد لتوليد مسائل الجودة.")}</p>}</Panel>
        <Panel title={L("Rule catalogue", "دليل القواعد")} subtitle={L("Rules are real logic; the records they run on are synthetic.", "القواعد منطق حقيقي؛ والسجلات اصطناعية.")} sources={["OPS_QUALITY"]}>
          <div className="thin-scroll max-h-[360px] overflow-y-auto">
            <table className="w-full text-[12px]">
              <thead className="sticky top-0 bg-card"><tr className="text-[10.5px] uppercase tracking-wide text-ink-500"><th className="py-1 text-start">ID</th><th className="text-start">{L("Rule", "القاعدة")}</th><th className="text-start">{L("Logic", "المنطق")}</th><th className="text-start">{t("severity")}</th><th className="text-end">{t("count")}</th></tr></thead>
              <tbody>
                {RULES.map((r) => (
                  <tr key={r.id} className="cursor-pointer border-t border-line/60 hover:bg-sand-50" onClick={() => setRule(r.id === rule ? "ALL" : r.id)}>
                    <td className="py-1.5 font-mono text-[11px]">{r.id}</td><td className="font-medium">{tx(r.title)}</td><td className="text-ink-500">{tx(r.logic)}</td><td><SeverityBadge s={r.severity} /></td><td className="text-end tabular">{fmtInt(counts[r.id] ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <Panel className="mt-3" title={L("Quality issue register", "سجل مسائل الجودة")} nature="SYNTHETIC_OPERATIONAL" sources={["OPS_QUALITY", "OPS_QUESTIONNAIRE"]}>
        <DataTable
          data={rows}
          columns={columns}
          globalFilter={q}
          pageSize={12}
          onRowClick={(r) => setDetail(r.id)}
          getRowId={(r) => r.id}
          initialSort={[{ id: "severity", desc: false }]}
          toolbar={
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Input placeholder={`${t("search")}…`} value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />
              <Select value={sev} onChange={(e) => setSev(e.target.value)} aria-label={t("severity")}><option value="ALL">{t("severity")}: {t("all")}</option>{SEVS.map((s) => <option key={s} value={s}>{t(`sev${s}`)}</option>)}</Select>
              <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label={t("status")}><option value="OPENISH">{L("Open (any stage)", "مفتوحة (أي مرحلة)")}</option><option value="ALL">{t("all")}</option>{STATUSES.map((s) => <option key={s} value={s}>{lb("issueStatus", s)}</option>)}</Select>
              <Select value={rule} onChange={(e) => setRule(e.target.value)} aria-label={L("Rule", "القاعدة")}><option value="ALL">{L("Rule", "القاعدة")}: {t("all")}</option>{RULES.map((r) => <option key={r.id} value={r.id}>{r.id} {tx(r.title)}</option>)}</Select>
            </div>
          }
          emptyText={L("No issues match the filters.", "لا توجد مسائل تطابق عوامل التصفية.")}
        />
      </Panel>

      <Sheet open={!!issue} onOpenChange={(o) => !o && setDetail(null)} title={issue ? <span className="flex items-center gap-2"><span className="font-mono">{issue.id}</span><SeverityBadge s={issue.severity} /></span> : ""} width={560}>
        {issue ? (
          <div className="space-y-3 text-[12.5px]">
            <div><div className="text-[11px] uppercase tracking-wide text-ink-500">{L("Rule", "القاعدة")}</div><div className="font-medium">{issue.ruleId} — {tx(RULE_INDEX[issue.ruleId]?.title)}</div><div className="text-ink-500">{tx(RULE_INDEX[issue.ruleId]?.logic)}</div></div>
            <div><div className="text-[11px] uppercase tracking-wide text-ink-500">{L("Finding", "النتيجة")}</div><div>{tx(issue.message)}</div></div>
            <div><div className="text-[11px] uppercase tracking-wide text-ink-500">{L("Evidence", "الدليل")}</div><div className="font-mono text-[12px]">{tx(issue.evidence)}</div></div>
            <div className="grid grid-cols-2 gap-2 text-[12px]">
              <div>{L("Record", "السجل")}: <span className="font-mono">{issue.entityId}</span></div>
              <div>EA: <span className="font-mono">{issue.eaId ?? "—"}</span></div>
              <div>{L("Enumerator", "العدّاد")}: <span className="font-mono">{issue.enumeratorId ?? "—"}</span></div>
              <div>{L("Assignee", "المكلف")}: <span className="font-mono">{issue.assignee ?? "—"}</span></div>
            </div>
            <div>
              <div className="mb-1 text-[11px] uppercase tracking-wide text-ink-500">{L("Audit trail", "سجل التدقيق")}</div>
              <ol className="space-y-1 border-s-2 border-line ps-3">
                {issue.history.map((h, i) => <li key={i} className="text-[12px]"><span className="text-ink-400 tabular">{fmtDateTime(engine.timeOf(h.step), locale)}</span> · <b>{h.action}</b> · {h.by}{h.note ? ` — “${h.note}”` : ""}</li>)}
              </ol>
            </div>
            {isOpen(issue.status) ? (
              <div className="flex flex-wrap gap-1.5 border-t border-line pt-3">
                <Button size="sm" onClick={() => act(issue.id, "ASSIGN")}>{L("Assign", "إسناد")}</Button>
                <Button size="sm" onClick={() => act(issue.id, "INVESTIGATE")}>{L("Investigate", "تحقيق")}</Button>
                <Button size="sm" onClick={() => act(issue.id, "REQUEST_REVISIT")} disabled={!issue.eaId}>{L("Request revisit", "طلب زيارة متابعة")}</Button>
                <Button size="sm" variant="primary" onClick={() => act(issue.id, "RESOLVE")}>{L("Resolve", "حل")}</Button>
                <Button size="sm" variant="ghost" onClick={() => act(issue.id, "DISMISS")}>{L("Dismiss with reason", "استبعاد مع السبب")}</Button>
              </div>
            ) : null}
            <Callout>{L("Actions are recorded with the acting officer and simulated timestamp. No action alters the submitted response; corrections require a revisit.", "تُسجل الإجراءات باسم الضابط والوقت المحاكى. لا يغيّر أي إجراء الإجابة المرسلة؛ والتصحيحات تتطلب زيارة متابعة.")}</Callout>
          </div>
        ) : null}
      </Sheet>

      <Modal open={!!pending} onOpenChange={(o) => !o && setPending(null)} title={pending?.action === "DISMISS" ? L("Dismiss issue — reason required", "استبعاد المسألة — السبب مطلوب") : L("Assign issue", "إسناد المسألة")} footer={<><Button onClick={() => setPending(null)}>{t("cancel")}</Button><Button variant="primary" onClick={confirm} disabled={pending?.action === "DISMISS" && note.trim().length < 5}>{t("confirm")}</Button></>}>
        {pending?.action === "DISMISS" ? (
          <Field label={L("Reason (min. 5 characters)", "السبب (5 أحرف على الأقل)")} error={note && note.trim().length < 5 ? L("Too short", "قصير جداً") : undefined}>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={L("e.g. Verified on revisit: age correct (documented)", "مثال: تم التحقق في الزيارة: العمر صحيح (موثق)")} autoFocus />
          </Field>
        ) : (
          <div className="space-y-2">
            <Field label={L("Assign to", "إسناد إلى")}>
              <Select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                {supId !== "DQ-UNIT" ? <option value={supId}>{supId} ({L("EA supervisor", "مشرف المنطقة")})</option> : null}
                <option value="DQ-UNIT">{L("Data Quality Unit", "وحدة جودة البيانات")}</option>
                <option value="GOV-COORD">{L("Governorate field coordinator", "منسق المحافظة الميداني")}</option>
              </Select>
            </Field>
            <Field label={t("notes")}><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
