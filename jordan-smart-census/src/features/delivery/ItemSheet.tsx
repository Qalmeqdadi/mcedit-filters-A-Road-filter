"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, Plus, Trash2, Undo2 } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { useEngine } from "@/store/engine";
import { Sheet } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Pill, SeverityBadge } from "@/components/ui/badges";
import { ProgressBar } from "@/components/ui/kpi";
import { fmtDate, fmtInt } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SECTOR_LABEL } from "@/simulation/lab/actions";
import { expectedProgress, healthOf, isoDay, kpiProgress, stageOf, uid, HEALTH_COLOR, type PortfolioItem } from "@/delivery/model";
import { addComment, currentActor, decide, removeItem, updateItem, useDelivery } from "@/delivery/store";
import { DemoBadge, EventLine, HealthBadge, StageBadge, jod } from "./parts";

const area = "w-full rounded-md border border-line-strong bg-card px-2.5 py-1.5 text-[13px] text-ink-900 placeholder:text-ink-400 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20";

function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-3">
      <div className="mb-1.5 flex items-center justify-between gap-2"><h3 className="text-[11.5px] font-semibold uppercase tracking-wider text-ink-500">{title}</h3>{aside}</div>
      {children}
    </section>
  );
}

export function ItemSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data } = useDelivery();
  const item = id ? data.items[id] : null;
  return (
    <Sheet open={!!item} onOpenChange={(o) => !o && onClose()} title={item ? <ItemTitle item={item} /> : ""} width={600}>
      {item ? <ItemBody key={item.id} item={item} onClose={onClose} /> : null}
    </Sheet>
  );
}

function ItemTitle({ item }: { item: PortfolioItem }) {
  const { tx } = useI18n();
  return <span data-testid="item-title">{tx(item.title)}</span>;
}

function ItemBody({ item, onClose }: { item: PortfolioItem; onClose: () => void }) {
  const engine = useEngine();
  const { L, tx, locale } = useI18n();
  const { data, canPlan, canApprove, nameOf } = useDelivery();
  const stage = stageOf(item, data.approvals);
  const health = healthOf(item, data.approvals);
  const approval = data.approvals[item.id];
  const prog = kpiProgress(item);
  const exp = expectedProgress(item);
  const today = isoDay(new Date());
  const [note, setNote] = useState("");
  const [owner, setOwner] = useState(item.owner);
  const [spent, setSpent] = useState(String(item.spentM));
  const [reading, setReading] = useState("");
  const [ms, setMs] = useState({ title: "", due: "" });
  const [comment, setComment] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const comments = data.comments.filter((c) => c.itemId === item.id);
  const events = data.events.filter((e) => e.itemId === item.id).slice(-12).reverse();
  const editable = canPlan && stage !== "DROPPED";
  const stageBtn = (to: PortfolioItem["stage"], label: string, variant: "primary" | "outline" | "ghost" = "outline") => (
    <Button size="xs" variant={variant} onClick={() => updateItem(item.id, { stage: to }, "STAGE", label)} data-testid={`stage-${to}`}>{label}</Button>
  );

  return (
    <div className="space-y-3" data-testid="item-sheet">
      <div className="flex flex-wrap items-center gap-1.5">
        <StageBadge s={stage} /><HealthBadge h={health} /><SeverityBadge s={item.severity} />
        <Pill>{tx(SECTOR_LABEL[item.sector])}</Pill><Pill>{tx(engine.world.gov[item.govId].name)}</Pill>
        {item.demo ? <DemoBadge /> : null}
      </div>
      <p className="text-[12.5px] leading-relaxed text-ink-700">{tx(item.rationale)}</p>
      <div className="grid gap-x-4 gap-y-1 rounded-md bg-sand-50 px-3 py-2 text-[12px] sm:grid-cols-2">
        <div><span className="text-ink-500">{L("Target", "المستهدف")}: </span><span className="font-medium text-ink-900">{tx(item.target)}</span></div>
        <div><span className="text-ink-500">{L("Indicative cost", "الكلفة التقديرية")}: </span><span className="font-medium text-ink-900 tabular">{item.costM > 0 ? jod(item.costM, locale) : L("no capital cost", "دون كلفة رأسمالية")}</span></div>
        <div><span className="text-ink-500">{L("People reached", "المستفيدون")}: </span><span className="font-medium text-ink-900 tabular">{fmtInt(item.beneficiaries)}</span></div>
        <div><span className="text-ink-500">{L("Proposed by", "اقترحه")}: </span><span className="font-medium text-ink-900">{nameOf(item.createdBy)} · {fmtDate(new Date(item.createdAt), locale)}</span></div>
        <Link href={item.href} onClick={onClose} className="inline-flex items-center gap-1 font-medium text-navy-600 hover:underline sm:col-span-2">{L("Open the model behind this action", "افتح النموذج الذي أنتج هذا الإجراء")}<ArrowRight size={12} className="rtl:rotate-180" /></Link>
      </div>

      <Section title={L("Approval", "الاعتماد")}>
        {approval ? (
          <div className={cn("rounded-md border px-3 py-2 text-[12.5px]", approval.decision === "APPROVED" ? "border-ok/40 bg-ok-bg" : "border-warn/40 bg-warn-bg")} data-testid="approval-record">
            <b>{approval.decision === "APPROVED" ? L("Approved", "معتمد") : L("Returned for revision", "أعيد للمراجعة")}</b> {L("by", "بواسطة")} {nameOf(approval.by)} · {fmtDate(new Date(approval.at), locale)}
            {approval.note ? <div className="mt-0.5 text-ink-700">“{approval.note}”</div> : null}
          </div>
        ) : <p className="text-[12.5px] text-ink-500">{L("Awaiting a decision. Only people with the approver role can approve.", "بانتظار القرار. يملك صلاحية الاعتماد أصحاب دور المعتمِد فقط.")}</p>}
        {canApprove && stage === "PROPOSED" ? (
          <div className="mt-2 space-y-1.5">
            <textarea className={area} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={L("Decision note (conditions, funding source, reasons for returning)…", "ملاحظة القرار (الشروط، مصدر التمويل، أسباب الإعادة)…")} data-testid="approval-note" />
            <div className="flex gap-1.5">
              <Button size="xs" variant="success" onClick={() => { void decide(item.id, "APPROVED", note); setNote(""); }} data-testid="approve"><Check size={12} />{L("Approve", "اعتماد")}</Button>
              <Button size="xs" onClick={() => { void decide(item.id, "RETURNED", note); setNote(""); }} data-testid="return"><Undo2 size={12} />{L("Return for revision", "إعادة للمراجعة")}</Button>
            </div>
          </div>
        ) : null}
      </Section>

      <Section title={L("Delivery", "التنفيذ")}>
        <div className="flex flex-wrap gap-1.5">
          {canPlan && stage === "APPROVED" ? stageBtn("IN_DELIVERY", L("Start delivery", "بدء التنفيذ"), "primary") : null}
          {canPlan && stage === "IN_DELIVERY" ? stageBtn("DONE", L("Mark delivered", "تعليم كمنجز"), "primary") : null}
          {canPlan && stage === "DONE" ? stageBtn("IN_DELIVERY", L("Reopen", "إعادة فتح")) : null}
          {canApprove && stage !== "DROPPED" && stage !== "DONE" ? stageBtn("DROPPED", L("Drop", "استبعاد"), "ghost") : null}
          {canApprove && stage === "DROPPED" ? stageBtn("PROPOSED", L("Restore", "استعادة")) : null}
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <label className="text-[12px] text-ink-500">{L("Responsible unit", "الجهة المسؤولة")}
            <Input className="mt-0.5 w-full" value={owner} disabled={!editable} onChange={(e) => setOwner(e.target.value)} onBlur={() => owner.trim() && owner !== item.owner && updateItem(item.id, { owner: owner.trim() }, "OWNER", owner.trim())} data-testid="owner" />
          </label>
          <label className="text-[12px] text-ink-500">{L("Spent to date (JOD M)", "المنفق حتى الآن (مليون دينار)")}
            <Input className="mt-0.5 w-full tabular" type="number" min={0} step={0.1} value={spent} disabled={!editable} onChange={(e) => setSpent(e.target.value)} onBlur={() => { const v = Math.max(0, Number(spent) || 0); if (v !== item.spentM) void updateItem(item.id, { spentM: v }, "SPEND", `JOD ${v}M`); }} />
          </label>
        </div>
      </Section>

      <Section title={L("Milestones", "المراحل الرئيسية")}>
        <ul className="space-y-1">
          {[...item.milestones].sort((a, b) => a.due.localeCompare(b.due)).map((m) => {
            const late = !m.done && m.due < today;
            return (
              <li key={m.id} className="flex items-center gap-2 text-[12.5px]" data-testid="milestone">
                <input type="checkbox" checked={m.done} disabled={!editable} onChange={() => updateItem(item.id, { milestones: item.milestones.map((x) => (x.id === m.id ? { ...x, done: !x.done, doneAt: !x.done ? today : undefined } : x)) }, "MILESTONE", `${m.title.en}: ${m.done ? "reopened" : "done"}`)} className="h-3.5 w-3.5 accent-[#2f62a6]" aria-label={tx(m.title)} />
                <span className={cn("flex-1", m.done && "text-ink-500 line-through")}>{tx(m.title)}</span>
                <span className={cn("tabular text-[11.5px]", late ? "font-semibold text-crit" : "text-ink-500")}>{late ? `${L("overdue", "متأخر")} · ` : ""}{fmtDate(m.due, locale)}</span>
              </li>
            );
          })}
        </ul>
        {editable ? (
          <form className="mt-2 flex flex-wrap gap-1.5" onSubmit={(e) => { e.preventDefault(); if (!ms.title.trim() || !ms.due) return; void updateItem(item.id, { milestones: [...item.milestones, { id: uid("m"), title: { en: ms.title.trim(), ar: ms.title.trim() }, due: ms.due, done: false }] }, "MILESTONE_ADDED", ms.title.trim()); setMs({ title: "", due: "" }); }}>
            <Input className="min-w-[180px] flex-1" value={ms.title} onChange={(e) => setMs((s) => ({ ...s, title: e.target.value }))} placeholder={L("New milestone", "مرحلة جديدة")} />
            <Input type="date" value={ms.due} onChange={(e) => setMs((s) => ({ ...s, due: e.target.value }))} aria-label={L("Due date", "تاريخ الاستحقاق")} />
            <Button size="sm" type="submit"><Plus size={13} />{L("Add", "إضافة")}</Button>
          </form>
        ) : null}
      </Section>

      <Section title={L("Progress against the target", "التقدم نحو المستهدف")} aside={<span className="text-[11.5px] text-ink-500">{item.kpi.unit}</span>}>
        <div className="flex items-center gap-2">
          <ProgressBar value={prog} expected={stage === "PROPOSED" ? undefined : exp} color={HEALTH_COLOR[health]} className="flex-1" />
          <span className="w-12 text-end text-[13px] font-semibold tabular">{Math.round(prog * 100)}%</span>
        </div>
        <div className="mt-1 text-[11.5px] text-ink-500">{L("Bar = recorded progress; tick = share of the delivery window already elapsed.", "الشريط = التقدم المسجل؛ العلامة = نسبة المدة المنقضية من فترة التنفيذ.")}</div>
        {item.kpi.readings.length ? (
          <div className="mt-1.5 flex flex-wrap gap-1 text-[11.5px]">
            {item.kpi.readings.slice(-6).map((r, i) => <span key={i} className="rounded bg-sand-50 px-1.5 py-0.5 tabular text-ink-700">{fmtDate(new Date(r.at), locale)}: <b>{r.value}</b></span>)}
          </div>
        ) : null}
        {editable && stage !== "PROPOSED" ? (
          <form className="mt-2 flex gap-1.5" onSubmit={(e) => { e.preventDefault(); const v = Number(reading); if (!Number.isFinite(v) || reading === "") return; void updateItem(item.id, { kpi: { ...item.kpi, readings: [...item.kpi.readings, { at: new Date().toISOString(), value: v, by: currentActor() }].slice(-40) } }, "KPI", `${v} ${item.kpi.unit}`); setReading(""); }}>
            <Input type="number" className="w-28 tabular" value={reading} onChange={(e) => setReading(e.target.value)} placeholder={`${item.kpi.baseline}–${item.kpi.target}`} data-testid="kpi-reading" />
            <Button size="sm" type="submit" data-testid="kpi-add">{L("Record progress", "تسجيل التقدم")}</Button>
          </form>
        ) : null}
      </Section>

      <Section title={`${L("Discussion", "النقاش")} · ${comments.length}`}>
        <ul className="space-y-2">
          {comments.map((c) => (
            <li key={c.id} className="rounded-md bg-sand-50 px-2.5 py-1.5 text-[12.5px]" data-testid="comment">
              <div className="text-[11px] text-ink-500"><b className="text-ink-900">{nameOf(c.by)}</b> · {new Date(c.at).toLocaleString(locale === "ar" ? "ar-JO-u-nu-latn" : "en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
              <div className="whitespace-pre-wrap text-ink-900">{c.text}</div>
            </li>
          ))}
          {comments.length === 0 ? <li className="text-[12.5px] text-ink-500">{L("No comments yet.", "لا تعليقات بعد.")}</li> : null}
        </ul>
        {canPlan ? (
          <form className="mt-2 space-y-1.5" onSubmit={(e) => { e.preventDefault(); if (!comment.trim()) return; void addComment(item.id, comment.trim()); setComment(""); }}>
            <textarea className={area} rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={L("Add a comment, risk or decision needed…", "أضف تعليقاً أو خطراً أو قراراً مطلوباً…")} data-testid="comment-input" />
            <Button size="xs" type="submit" variant="primary" data-testid="comment-post">{L("Post", "نشر")}</Button>
          </form>
        ) : null}
      </Section>

      <Section title={L("Audit trail", "سجل التدقيق")}>
        <ul>{events.map((e) => <EventLine key={e.id} e={e} items={{}} nameOf={nameOf} />)}</ul>
      </Section>

      {(canApprove || (canPlan && stage === "PROPOSED")) ? (
        <div className="border-t border-line pt-3">
          {confirmRemove ? (
            <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
              <span>{L("Remove this action from the portfolio? Its comments and history are kept.", "إزالة هذا الإجراء من المحفظة؟ تبقى تعليقاته وسجله.")}</span>
              <Button size="xs" variant="danger" onClick={() => { void removeItem(item.id); onClose(); }}>{L("Remove", "إزالة")}</Button>
              <Button size="xs" variant="ghost" onClick={() => setConfirmRemove(false)}>{L("Cancel", "إلغاء")}</Button>
            </div>
          ) : <Button size="xs" variant="ghost" onClick={() => setConfirmRemove(true)}><Trash2 size={12} />{L("Remove from portfolio", "إزالة من المحفظة")}</Button>}
        </div>
      ) : null}
    </div>
  );
}
