"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, BellPlus, Bot, CalendarClock, CheckCircle2, Eye, FileSignature, MessageCircleQuestion, Send, ShieldAlert, Sparkles, UserPlus } from "lucide-react";
import { CONTRACT, CONTRACT_RISKS, MILESTONES, OWNERS, SUGGESTED_QUESTIONS } from "@/data/contract";
import { SUPPLIER_BY_ID } from "@/data/suppliers";
import { StageHeader } from "@/components/common/stage-header";
import { AgentPanel } from "@/components/common/agent-panel";
import { ReasoningSummaryCard } from "@/components/common/reasoning-summary";
import { HumanDecisionBanner } from "@/components/common/human-decision";
import { SeverityBadge } from "@/components/common/status";
import { EmptyState } from "@/components/common/empty-state";
import { AgentThinking } from "@/components/common/agent-thinking";
import { Confirm } from "@/components/common/confirm";
import { useGuide } from "@/components/common/guide";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { askContract, assignOwner, createReminder, extractContract, validateContract } from "@/lib/actions";
import { useApp } from "@/lib/store";
import { cn, formatAED, formatDate, formatTime } from "@/lib/utils";
import type { Obligation } from "@/types";

const CATS = ["All", "Obligation", "SLA", "Payment", "Renewal", "Termination", "Penalty", "Data", "Security"] as const;

export default function ContractPage() {
  const ct = useApp((s) => s.caseData.contract);
  const approvalsDone = useApp((s) => !!s.caseData.approvals.completedAt);
  const running = useApp((s) => s.running);
  const extracting = running.includes("contract.extract");
  const asking = running.includes("contract.ask");
  const [cat, setCat] = useState<(typeof CATS)[number]>("All");
  const [view, setView] = useState<Obligation | null>(null);
  const [assign, setAssign] = useState<Obligation | null>(null);
  const [owner, setOwner] = useState(OWNERS[0]);
  const [remind, setRemind] = useState<Obligation | null>(null);
  const [remindDate, setRemindDate] = useState("");
  const [q, setQ] = useState("");
  const gExtract = useGuide("contract-extract");
  const gValidate = useGuide("contract-validate");

  const rows = ct.obligations.filter((o) => cat === "All" || o.category === cat);
  const ask = (question: string) => {
    if (!question.trim()) return;
    askContract(question.trim());
    setQ("");
  };

  if (!approvalsDone)
    return (
      <div className="space-y-6">
        <StageHeader stage="contract" />
        <EmptyState icon={FileSignature} title="Contract not yet executed" description="Contract Intelligence starts once all six approvals are obtained and the contract is executed. Use “Fast-forward here” above to jump straight to this stage.">
          <Button asChild>
            <Link href="/case/approvals">
              Go to Approval Orchestration <ArrowRight />
            </Link>
          </Button>
        </EmptyState>
      </div>
    );

  return (
    <div className="space-y-6">
      <StageHeader stage="contract" />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
        <AgentPanel
          agentId="contract"
          watchTasks={["contract.extract"]}
          actions={
            <>
              <Button onClick={extractContract} disabled={extracting || ct.validated} className={gExtract} data-testid="contract-extract">
                <Sparkles /> {ct.extracted ? "Re-extract terms" : "Extract contract terms"}
              </Button>
              <Confirm
                title="Validate obligations register?"
                description="Simulates Legal Counsel validating the agent-extracted obligations so they become the system of record. Recorded in the audit trail."
                confirmLabel="Validate (Legal)"
                variant="success"
                onConfirm={validateContract}
              >
                <Button variant="success" disabled={!ct.extracted || ct.validated} className={gValidate} data-testid="contract-validate">
                  <CheckCircle2 /> Legal validates obligations
                </Button>
              </Confirm>
            </>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Fact label="Contract" value={CONTRACT.id} sub={`${CONTRACT.pages} pages · ${CONTRACT.clauses} clauses`} />
            <Fact label="Supplier" value={SUPPLIER_BY_ID[CONTRACT.supplierId].name} sub="Synthetic" />
            <Fact label="Value" value={formatAED(CONTRACT.value, { compact: true })} sub={`${CONTRACT.term} term`} />
            <Fact label="Term" value={`${formatDate(CONTRACT.start)} – ${formatDate(CONTRACT.end)}`} sub={CONTRACT.governingLaw} />
          </div>
          {!ct.extracted && !extracting && <p className="text-[13px] text-navy-500">Run the agent to extract obligations, SLAs, payment milestones, renewal and termination terms, penalties, data and security obligations and key risks.</p>}
          {ct.extracted && !extracting && (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Kpi label="Obligations & terms" value={ct.obligations.length} />
                <Kpi label="SLAs" value={ct.obligations.filter((o) => o.category === "SLA").length} />
                <Kpi label="Payment milestones" value={MILESTONES.filter((m) => m.type === "payment" || m.id === "M3").length} />
                <Kpi label="Renewal notice by" value={formatDate("2029-08-16")} small />
              </div>
              {ct.reasoning && <ReasoningSummaryCard reasoning={ct.reasoning} dense />}
              {ct.validated ? (
                <div className="space-y-3">
                  <HumanDecisionBanner title="VALIDATED BY LEGAL" decided>
                    The obligations register is now the system of record. Continuous monitoring can be activated.
                  </HumanDecisionBanner>
                  <Button asChild>
                    <Link href="/case/monitoring">
                      Continue to Continuous Monitoring <ArrowRight />
                    </Link>
                  </Button>
                </div>
              ) : (
                <HumanDecisionBanner>Legal must validate the extracted terms before they become binding records. Owners accept assigned obligations.</HumanDecisionBanner>
              )}
            </>
          )}
        </AgentPanel>

        {/* Ask about contract */}
        <Card className="flex h-fit flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircleQuestion className="h-4 w-4 text-gold-500" /> Ask about the contract
            </CardTitle>
            <CardDescription>Answers cite clauses. Not legal advice.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_QUESTIONS.map((s) => (
                <button key={s} onClick={() => ask(s)} disabled={asking} className="rounded-full border bg-white px-2.5 py-1 text-left text-[11.5px] text-navy-700 transition hover:border-navy-200 hover:bg-navy-50 disabled:opacity-50">
                  {s}
                </button>
              ))}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                ask(q);
              }}
            >
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. What are the data obligations?" disabled={asking} />
              <Button type="submit" size="icon" disabled={asking || !q.trim()} aria-label="Ask">
                <Send />
              </Button>
            </form>
            {asking && <AgentThinking task="contract.ask" compact />}
            <div className="scrollbar-thin max-h-[420px] space-y-3 overflow-y-auto">
              {ct.qa.length === 0 && !asking && <div className="rounded-lg border border-dashed px-3 py-6 text-center text-[12.5px] text-navy-500">Ask a question or choose a suggestion.</div>}
              {ct.qa.map((x) => (
                <div key={x.askedAt} className="space-y-1.5">
                  <div className="ml-auto w-fit max-w-[90%] rounded-2xl rounded-br-sm bg-navy-800 px-3 py-2 text-[12.5px] text-white">{x.question}</div>
                  <div className="max-w-[95%] rounded-2xl rounded-bl-sm border bg-[#FCFBF8] px-3 py-2 text-[12.5px] leading-relaxed text-navy-800">
                    <div className="mb-1 flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wider text-navy-500">
                      <Bot className="h-3 w-3 text-gold-500" /> Contract Intelligence Agent · {formatTime(x.askedAt)}
                    </div>
                    {x.answer}
                    {x.citations.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {x.citations.map((c) => (
                          <Badge key={c} variant="gold">
                            {c}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {ct.extracted && !extracting && (
        <>
          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-gold-500" /> Major milestones
              </CardTitle>
              <CardDescription>Extracted from Schedule 5 and clauses 3.3 / 21</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <ol className="relative flex min-w-[860px] justify-between pb-2 pt-6">
                <span className="absolute left-4 right-4 top-[31px] h-[2px] bg-gradient-to-r from-gold-300 via-navy-100 to-navy-100" />
                {MILESTONES.map((m) => (
                  <li key={m.id} className="relative flex w-[13%] flex-col items-center text-center">
                    <span
                      className={cn(
                        "z-10 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-white ring-2",
                        m.type === "payment" ? "bg-gold-400 ring-gold-200" : m.type === "renewal" ? "bg-magenta-400 ring-magenta-100" : m.type === "delivery" ? "bg-sky-500 ring-sky-100" : "bg-navy-600 ring-navy-100",
                      )}
                    />
                    <span className="tabular mt-2 text-[11px] font-semibold text-navy-500">{formatDate(m.date)}</span>
                    <span className="mt-0.5 text-[12.5px] font-medium leading-tight text-navy-900">{m.label}</span>
                    {m.amount && <span className="tabular mt-0.5 text-[11px] text-navy-500">{m.amount}</span>}
                    <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-navy-400">{m.id}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-3 flex flex-wrap gap-4 text-[11.5px] text-navy-600">
                <Legend color="bg-gold-400" label="Payment" />
                <Legend color="bg-sky-500" label="Delivery" />
                <Legend color="bg-navy-600" label="Review" />
                <Legend color="bg-magenta-400" label="Renewal" />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,9fr)_minmax(0,3fr)]">
            {/* Obligations register */}
            <Card>
              <CardHeader className="gap-3">
                <div>
                  <CardTitle>Obligations register</CardTitle>
                  <CardDescription>Key obligations, SLAs, payment, renewal, termination, penalties, data & security obligations</CardDescription>
                </div>
                <Tabs value={cat} onValueChange={(v) => setCat(v as (typeof CATS)[number])}>
                  <TabsList className="flex h-auto flex-wrap justify-start">
                    {CATS.map((c) => (
                      <TabsTrigger key={c} value={c}>
                        {c}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full min-w-[820px] text-[12.5px]">
                  <thead>
                    <tr className="border-y bg-navy-50/40 text-left text-[11px] uppercase tracking-wider text-navy-500">
                      <th className="px-5 py-2 font-semibold">Term</th>
                      <th className="px-3 py-2 font-semibold">Clause</th>
                      <th className="px-3 py-2 font-semibold">Party</th>
                      <th className="px-3 py-2 font-semibold">Owner</th>
                      <th className="px-3 py-2 font-semibold">Reminder</th>
                      <th className="px-5 py-2 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((o) => (
                      <tr key={o.id} className="border-b last:border-0 hover:bg-navy-50/30">
                        <td className="px-5 py-2.5">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{o.category}</Badge>
                            <span className="font-medium text-navy-900">{o.title}</span>
                            {o.risk === "high" && <SeverityBadge severity="high" />}
                          </div>
                          <div className="mt-0.5 line-clamp-1 text-navy-500">{o.summary}</div>
                        </td>
                        <td className="px-3 py-2.5 font-medium text-gold-600">{o.clause}</td>
                        <td className="px-3 py-2.5 text-navy-700">{o.party}</td>
                        <td className="px-3 py-2.5 text-navy-700">{o.owner ?? <span className="text-navy-400">Unassigned</span>}</td>
                        <td className="px-3 py-2.5 text-navy-700">{o.reminder ? formatDate(o.reminder) : <span className="text-navy-400">—</span>}</td>
                        <td className="px-5 py-2.5">
                          <div className="flex justify-end gap-1">
                            <Button size="xs" variant="ghost" onClick={() => setView(o)} aria-label="View obligation">
                              <Eye /> View
                            </Button>
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => {
                                setOwner(o.owner ?? OWNERS[0]);
                                setAssign(o);
                              }}
                            >
                              <UserPlus /> Owner
                            </Button>
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => {
                                setRemindDate(o.reminder ?? defaultReminder(o));
                                setRemind(o);
                              }}
                            >
                              <BellPlus /> Remind
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-risk-500" /> Key risks
                </CardTitle>
                <CardDescription>Flagged for Legal attention</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {CONTRACT_RISKS.map((r) => (
                  <div key={r.title} className="rounded-lg border px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[13px] font-medium text-navy-900">{r.title}</span>
                      <SeverityBadge severity={r.severity} />
                    </div>
                    <div className="mt-0.5 text-[12px] leading-snug text-navy-600">{r.detail}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* View obligation */}
      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent>
          {view && (
            <>
              <DialogHeader>
                <div className="flex gap-1.5">
                  <Badge variant="outline">{view.category}</Badge>
                  <Badge variant="gold">{view.clause}</Badge>
                  {view.risk && <SeverityBadge severity={view.risk} />}
                </div>
                <DialogTitle>{view.title}</DialogTitle>
                <DialogDescription>
                  {view.id} · Responsible party: {view.party}
                </DialogDescription>
              </DialogHeader>
              <p className="text-[13.5px] leading-relaxed text-navy-700">{view.summary}</p>
              <div className="grid grid-cols-3 gap-3 text-[12.5px]">
                <Fact label="Due" value={view.due ? formatDate(view.due) : "Ongoing"} />
                <Fact label="Owner" value={ct.obligations.find((o) => o.id === view.id)?.owner ?? "Unassigned"} />
                <Fact label="Reminder" value={ct.obligations.find((o) => o.id === view.id)?.reminder ?? "None"} />
              </div>
              <div className="rounded-lg bg-navy-50/60 px-3 py-2 text-[12px] text-navy-600">Extracted by the Contract Intelligence Agent from {CONTRACT.id}. Validation status: {ct.validated ? "validated by Legal" : "pending Legal validation"}.</div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign owner */}
      <Dialog open={!!assign} onOpenChange={(o) => !o && setAssign(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign owner</DialogTitle>
            <DialogDescription>{assign?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Obligation owner</Label>
            <SimpleSelect value={owner} onValueChange={setOwner} options={OWNERS} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssign(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (assign) assignOwner(assign.id, owner);
                setAssign(null);
              }}
            >
              Assign owner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create reminder */}
      <Dialog open={!!remind} onOpenChange={(o) => !o && setRemind(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create reminder</DialogTitle>
            <DialogDescription>{remind?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Reminder date</Label>
            <Input type="date" value={remindDate} onChange={(e) => setRemindDate(e.target.value)} />
            <p className="text-[12px] text-navy-500">The owner and Contract Manager will be notified (simulated).</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemind(null)}>
              Cancel
            </Button>
            <Button
              disabled={!remindDate}
              onClick={() => {
                if (remind) createReminder(remind.id, remindDate);
                setRemind(null);
              }}
            >
              Create reminder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function defaultReminder(o: Obligation) {
  if (!o.due) return "2027-01-15";
  const d = new Date(`${o.due}T00:00:00`);
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function Fact({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border p-3">
      <div className="text-[11.5px] text-navy-500">{label}</div>
      <div className="mt-0.5 text-[13px] font-semibold leading-snug text-navy-900">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] leading-snug text-navy-500">{sub}</div>}
    </div>
  );
}

function Kpi({ label, value, small }: { label: string; value: string | number; small?: boolean }) {
  return (
    <div className="rounded-xl bg-navy-50/60 p-3">
      <div className={cn("tabular font-serif font-semibold text-navy-900", small ? "text-[17px]" : "text-2xl")}>{value}</div>
      <div className="text-[11.5px] text-navy-500">{label}</div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-2.5 w-2.5 rounded-full", color)} /> {label}
    </span>
  );
}
