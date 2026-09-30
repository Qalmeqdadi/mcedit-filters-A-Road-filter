"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, ArrowRight, BellRing, CheckCircle2, FileCheck2, FileText, FolderOpen, Gavel, MessageSquareReply, RotateCcw, Siren, Sparkles, UserCheck, Users } from "lucide-react";
import { DECISION_PACK, DOA_THRESHOLDS } from "@/data/approvals";
import { SUPPLIER_BY_ID } from "@/data/suppliers";
import { StageHeader } from "@/components/common/stage-header";
import { AgentPanel } from "@/components/common/agent-panel";
import { ReasoningSummaryCard } from "@/components/common/reasoning-summary";
import { HumanDecisionBanner } from "@/components/common/human-decision";
import { ApprovalStatusBadge } from "@/components/common/status";
import { EmptyState } from "@/components/common/empty-state";
import { Confirm } from "@/components/common/confirm";
import { useGuide } from "@/components/common/guide";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tip } from "@/components/ui/tooltip";
import {
  approveStep,
  escalateStep,
  requestClarification,
  resolveClarification,
  returnStep,
  routeApprovals,
  sendAllReminders,
  sendReminder,
  simulateRemainingApprovals,
} from "@/lib/actions";
import { useApp } from "@/lib/store";
import { cn, formatAED, formatDateTime } from "@/lib/utils";

export default function ApprovalsPage() {
  const ap = useApp((s) => s.caseData.approvals);
  const award = useApp((s) => s.caseData.evaluation.award);
  const running = useApp((s) => s.running.includes("approval.prepare"));
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const gRoute = useGuide("appr-route");
  const gRemind = useGuide("appr-remind");
  const gSim = useGuide("appr-simulate");

  const approved = ap.steps.filter((s) => s.status === "approved").length;
  const outstanding = ap.steps.filter((s) => ["pending", "needs_clarification", "returned"].includes(s.status));
  const value = 2_150_000;

  return (
    <div className="space-y-6">
      <StageHeader stage="approvals" />

      {!award ? (
        <EmptyState icon={Gavel} title="Awaiting award decision" description="The Approval Agent routes the decision pack once the Evaluation Committee has recorded its award decision.">
          <Button asChild>
            <Link href="/case/evaluation">
              Go to Bid Evaluation <ArrowRight />
            </Link>
          </Button>
        </EmptyState>
      ) : (
        <>
          <AgentPanel
            agentId="approval"
            watchTasks={["approval.prepare"]}
            actions={
              <>
                <Button onClick={routeApprovals} disabled={running || ap.routed} className={gRoute} data-testid="appr-route">
                  <Sparkles /> {ap.routed ? "Pack routed" : "Prepare decision pack & route"}
                </Button>
                <Button variant="outline" onClick={() => setEvidenceOpen(true)} disabled={!ap.routed}>
                  <FolderOpen /> View Approval Evidence
                </Button>
                <Button variant="outline" onClick={sendAllReminders} disabled={!ap.routed || outstanding.length === 0} className={gRemind}>
                  <BellRing /> Send reminders
                </Button>
                <Tip content="Presenter shortcut: simulates each outstanding human approver responding">
                  <Button variant="ghost" onClick={simulateRemainingApprovals} disabled={!ap.routed || !!ap.completedAt} className={gSim} data-testid="appr-simulate">
                    <Users /> Simulate remaining approvers
                  </Button>
                </Tip>
              </>
            }
          >
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border p-4">
                <div className="text-[11.5px] text-navy-500">Decision</div>
                <div className="mt-1 text-[14px] font-semibold text-navy-900">Award to {SUPPLIER_BY_ID[award.supplierId].name}</div>
                <div className="tabular text-[13px] text-navy-600">{formatAED(value)} · 3-year term</div>
              </div>
              <div className="rounded-xl border p-4 lg:col-span-2">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11.5px] text-navy-500">Approval threshold validation (DoA matrix v2026.1 — synthetic)</span>
                  {ap.routed && (
                    <Badge variant="ok">
                      <CheckCircle2 /> Validated
                    </Badge>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {DOA_THRESHOLDS.map((t, i) => (
                    <div key={t.band} className={cn("rounded-lg border px-3 py-2", i === 2 ? "border-gold-300 bg-gold-50" : "opacity-70")}>
                      <div className="text-[12px] font-semibold text-navy-900">{t.band}</div>
                      <div className="text-[11.5px] text-navy-600">{t.approvers}</div>
                      {i === 2 && <div className="mt-1 text-[11px] font-medium text-gold-700">← AED 2.15M applies</div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {ap.reasoning && !running && <ReasoningSummaryCard reasoning={ap.reasoning} dense />}
          </AgentPanel>

          {ap.completedAt && (
            <div className="space-y-3">
              <HumanDecisionBanner title="ALL APPROVALS OBTAINED" decided>
                Six human approvals recorded. Contract CTR-2026-0093 executed (simulated) on {formatDateTime(ap.completedAt)}.
              </HumanDecisionBanner>
              <Button asChild>
                <Link href="/case/contract">
                  Continue to Contract Intelligence <ArrowRight />
                </Link>
              </Button>
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Approval workflow</CardTitle>
                  <CardDescription>Every approval is a human action. Presenter acts on behalf of synthetic personas.</CardDescription>
                </div>
                <Badge variant={approved === 6 ? "ok" : "default"} className="tabular">
                  {approved} / 6 approved
                </Badge>
              </CardHeader>
              <CardContent>
                {!ap.routed ? (
                  <EmptyState icon={Users} title="Not yet routed" description="The Approval Agent will determine the required approvers from the delegation-of-authority matrix." className="py-8" />
                ) : (
                  <ol className="relative space-y-3">
                    {ap.steps.map((s, i) => {
                      const actionable = s.status === "pending" || s.status === "needs_clarification" || s.status === "returned";
                      return (
                        <li key={s.id} className={cn("relative rounded-xl border p-4", s.status === "approved" && "bg-ok-50/40", s.overdue && s.status === "pending" && "border-risk-100 bg-risk-50/30")}>
                          <div className="flex flex-wrap items-start gap-3">
                            <span
                              className={cn(
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold",
                                s.status === "approved" ? "bg-ok-500 text-white" : s.status === "not_started" ? "bg-navy-50 text-navy-400" : "bg-navy-800 text-white",
                              )}
                            >
                              {s.status === "approved" ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[14px] font-semibold text-navy-900">{s.role}</span>
                                <ApprovalStatusBadge status={s.status} overdue={s.overdue} />
                                {s.escalated && (
                                  <Badge variant="risk">
                                    <Siren /> Escalated
                                  </Badge>
                                )}
                                {s.remindersSent > 0 && (
                                  <Badge variant="outline">
                                    <BellRing /> {s.remindersSent} reminder{s.remindersSent > 1 ? "s" : ""}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[12.5px] text-navy-600">
                                {s.approver} · {s.reason}
                              </div>
                              <div className="mt-0.5 text-[11.5px] text-navy-500">
                                SLA {s.sla}
                                {s.status === "pending" && (s.dueInHours < 0 ? ` · ${Math.abs(s.dueInHours)}h overdue` : ` · due in ${s.dueInHours}h`)}
                                {s.decidedAt && s.status === "approved" && ` · approved ${formatDateTime(s.decidedAt)}`}
                              </div>
                              {s.comment && <div className="mt-2 rounded-lg bg-white/80 px-3 py-2 text-[12.5px] italic text-navy-700 ring-1 ring-border">“{s.comment}”</div>}
                            </div>
                          </div>
                          {actionable && (
                            <div className="mt-3 flex flex-wrap gap-2 pl-11">
                              {s.status === "needs_clarification" ? (
                                <Button size="xs" variant="magenta" onClick={() => resolveClarification(s.id)}>
                                  <MessageSquareReply /> Provide clarification
                                </Button>
                              ) : (
                                <Confirm
                                  title={`Approve as ${s.role}?`}
                                  description={`You are approving on behalf of ${s.approver}. This is recorded as a human approval in the audit trail.`}
                                  confirmLabel="Approve"
                                  variant="success"
                                  withComment
                                  defaultComment="Approved."
                                  onConfirm={(c) => approveStep(s.id, c)}
                                >
                                  <Button size="xs" variant="success" disabled={s.status === "returned"}>
                                    <UserCheck /> Approve
                                  </Button>
                                </Confirm>
                              )}
                              <Confirm
                                title={`Return pack (${s.role})?`}
                                description="The decision pack is returned to Procurement with your comments."
                                confirmLabel="Return"
                                variant="destructive"
                                withComment
                                commentRequired
                                defaultComment="Please attach the key-person retention clause before approval."
                                onConfirm={(c) => returnStep(s.id, c)}
                              >
                                <Button size="xs" variant="outline-destructive">
                                  <RotateCcw /> Return
                                </Button>
                              </Confirm>
                              {s.status !== "needs_clarification" && (
                                <Confirm
                                  title={`Request clarification (${s.role})`}
                                  description="The Approval Agent will collect the clarification and re-route."
                                  confirmLabel="Request clarification"
                                  variant="magenta"
                                  withComment
                                  commentRequired
                                  defaultComment="Please confirm payment milestones align with acceptance criteria."
                                  onConfirm={(c) => requestClarification(s.id, c)}
                                >
                                  <Button size="xs" variant="outline">
                                    Request Clarification
                                  </Button>
                                </Confirm>
                              )}
                              {s.status === "returned" && (
                                <Button size="xs" variant="outline" onClick={() => resolveClarification(s.id)}>
                                  <MessageSquareReply /> Address & re-route
                                </Button>
                              )}
                              <Button size="xs" variant="ghost" onClick={() => sendReminder(s.id)}>
                                <BellRing /> Remind
                              </Button>
                              {s.overdue && !s.escalated && (
                                <Confirm title={`Escalate ${s.role}?`} description="Escalate the overdue approval to the approver's line manager per DoA rule ESC-2." confirmLabel="Escalate" variant="destructive" onConfirm={() => escalateStep(s.id)}>
                                  <Button size="xs" variant="ghost" className="text-risk-600">
                                    <Siren /> Escalate overdue
                                  </Button>
                                </Confirm>
                              )}
                            </div>
                          )}
                          {s.status === "not_started" && s.id === "exec" && <div className="mt-2 pl-11 text-[12px] text-navy-500">Routed automatically once all five prerequisite approvals are obtained.</div>}
                        </li>
                      );
                    })}
                  </ol>
                )}
              </CardContent>
            </Card>

            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warn-500" /> Outstanding actions
                </CardTitle>
                <CardDescription>Tracked by the Approval Agent</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {!ap.routed && <div className="text-[13px] text-navy-500">Nothing to track yet.</div>}
                {ap.routed && outstanding.length === 0 && (
                  <div className="flex items-center gap-2 text-[13px] text-ok-600">
                    <CheckCircle2 className="h-4 w-4" /> No outstanding actions
                  </div>
                )}
                {outstanding.map((s) => (
                  <div key={s.id} className="rounded-lg border px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-medium text-navy-900">{s.role}</span>
                      <ApprovalStatusBadge status={s.status} overdue={s.overdue} />
                    </div>
                    <div className="text-[12px] text-navy-500">
                      {s.status === "needs_clarification" ? "Awaiting clarification response" : s.status === "returned" ? "Returned — needs rework" : s.overdue ? "Past SLA — escalation available" : `Due in ${s.dueInHours}h`}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Dialog open={evidenceOpen} onOpenChange={setEvidenceOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileCheck2 className="h-5 w-5 text-gold-500" /> Approval evidence — decision pack
                </DialogTitle>
                <DialogDescription>Assembled by the Approval Agent. Each document links to its source agent or human decision. Synthetic documents.</DialogDescription>
              </DialogHeader>
              <ul className="divide-y rounded-xl border">
                {DECISION_PACK.map((d) => (
                  <li key={d.name} className="flex items-center gap-3 px-4 py-3">
                    <FileText className="h-4 w-4 text-navy-400" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-navy-900">{d.name}</div>
                      <div className="text-[11.5px] text-navy-500">
                        Source: {d.source} · {d.pages} page{d.pages > 1 ? "s" : ""}
                      </div>
                    </div>
                    <Badge variant="outline">{d.type}</Badge>
                  </li>
                ))}
              </ul>
              <div className="rounded-xl bg-navy-50/60 p-3 text-[12.5px] text-navy-700">
                <strong className="text-navy-900">Threshold check:</strong> AED 2,150,000 &gt; AED 2M → requires Legal and Executive Approver in addition to Procurement, Business Owner, Finance and Information Security. No approver may be skipped by the agent.
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
