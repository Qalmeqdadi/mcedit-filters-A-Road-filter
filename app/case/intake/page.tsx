"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, ClipboardList, FileQuestion, Layers, Route, Scale, Sparkles, Users } from "lucide-react";
import { BUDGET_RANGES, CLASSIFICATIONS, DEPARTMENTS, REG_LEVELS, STRATEGIC_LEVELS } from "@/data/case";
import { StageHeader } from "@/components/common/stage-header";
import { AgentPanel } from "@/components/common/agent-panel";
import { ReasoningSummaryCard } from "@/components/common/reasoning-summary";
import { HumanDecisionBanner } from "@/components/common/human-decision";
import { SeverityBadge } from "@/components/common/status";
import { EmptyState } from "@/components/common/empty-state";
import { Confirm } from "@/components/common/confirm";
import { useGuide } from "@/components/common/guide";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/select";
import { Tip } from "@/components/ui/tooltip";
import { analyseIntake, decideIntake, updateIntakeField } from "@/lib/actions";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { IntakeForm } from "@/types";

export default function IntakePage() {
  const intake = useApp((s) => s.caseData.intake);
  const running = useApp((s) => s.running.includes("intake.analyse"));
  const gAnalyse = useGuide("intake-analyse");
  const gApprove = useGuide("intake-approve");
  const f = intake.form;
  const a = intake.analysis;
  const locked = intake.decision === "approved";

  const set = (k: keyof IntakeForm) => (v: string) => updateIntakeField(k, v);

  return (
    <div className="space-y-6">
      <StageHeader stage="intake" />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Intake form */}
        <Card className="h-fit">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-gold-500" /> Intelligent request intake
              </CardTitle>
              {locked ? <Badge variant="ok">Locked after approval</Badge> : <Badge variant="outline">Editable</Badge>}
            </div>
            <CardDescription>Submitted by Data & Technology (demo persona). Edits are captured before analysis.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Business objective">
              <Textarea rows={3} value={f.objective} onChange={(e) => set("objective")(e.target.value)} disabled={locked} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Requesting department">
                <SimpleSelect value={f.department} onValueChange={set("department")} options={DEPARTMENTS} disabled={locked} />
              </Field>
              <Field label="Budget range">
                <SimpleSelect value={f.budgetRange} onValueChange={set("budgetRange")} options={BUDGET_RANGES} disabled={locked} />
              </Field>
            </div>
            <Field label="Requirement description">
              <Textarea rows={5} value={f.description} onChange={(e) => set("description")(e.target.value)} disabled={locked} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Required-by date">
                <Input type="date" value={f.requiredBy} onChange={(e) => set("requiredBy")(e.target.value)} disabled={locked} />
              </Field>
              <Field label="Strategic importance">
                <SimpleSelect value={f.strategicImportance} onValueChange={set("strategicImportance")} options={STRATEGIC_LEVELS} disabled={locked} />
              </Field>
            </div>
            <Field label="Existing vendors">
              <Input value={f.existingVendors} onChange={(e) => set("existingVendors")(e.target.value)} disabled={locked} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Data classification">
                <SimpleSelect value={f.dataClassification} onValueChange={set("dataClassification")} options={CLASSIFICATIONS} disabled={locked} />
              </Field>
              <Field label="Regulatory sensitivity">
                <SimpleSelect value={f.regulatorySensitivity} onValueChange={set("regulatorySensitivity")} options={REG_LEVELS} disabled={locked} />
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* Agent */}
        <div className="space-y-6">
          <AgentPanel
            agentId="demand"
            watchTasks={["intake.analyse"]}
            actions={
              <>
                <Button onClick={analyseIntake} disabled={running || locked} className={gAnalyse} data-testid="intake-analyse">
                  <Sparkles /> {a ? "Re-analyse Request" : "Analyse Request"}
                </Button>
                <span className="text-xs text-navy-500">Reads the request, applies policy PP-3 / PP-4 / PP-7 and IS-2, and recommends a route.</span>
              </>
            }
          >
            {!a && !running && (
              <EmptyState icon={Sparkles} title="No analysis yet" description="Run the Demand & Policy Agent to qualify this request against procurement policy." />
            )}

            {a && !running && (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="flex items-center gap-3 rounded-xl border p-3">
                    <Ring value={a.completeness} />
                    <div>
                      <div className="text-[11.5px] text-navy-500">Request completeness</div>
                      <div className="tabular text-xl font-semibold text-navy-900">{a.completeness}%</div>
                    </div>
                  </div>
                  <Metric icon={Layers} label="Category" value={a.category} sub={a.subCategory} />
                  <Metric icon={AlertTriangle} label="Risk level" value={<SeverityBadge severity={a.riskLevel} className="text-xs" />} sub={a.riskDrivers.join(" · ")} />
                </div>

                <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-4">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-sky-700">
                    <Route className="h-3.5 w-3.5" /> Recommended procurement route
                  </div>
                  <div className="mt-1 text-[15px] font-semibold text-navy-900">{a.route}</div>
                  <div className="mt-0.5 text-[13px] text-navy-600">{a.routeRationale}</div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <SubHead icon={Scale} label="Potential policy issues" />
                    <ul className="space-y-2">
                      {a.policyIssues.map((p) => (
                        <li key={p.title} className="rounded-lg border px-3 py-2">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[13px] font-medium text-navy-900">{p.title}</span>
                            <SeverityBadge severity={p.severity} />
                          </div>
                          <div className="mt-0.5 text-[12px] text-navy-600">{p.detail}</div>
                          <div className="mt-1 text-[11px] font-medium text-gold-600">Policy {p.policyRef}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <SubHead icon={FileQuestion} label="Missing information" />
                      <ul className="space-y-1.5">
                        {a.missingInformation.map((m) => (
                          <li key={m} className="flex gap-2 rounded-lg bg-warn-50 px-3 py-2 text-[12.5px] text-navy-800">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn-500" /> {m}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <SubHead icon={Users} label="Recommended stakeholders" />
                      <ul className="space-y-1">
                        {a.stakeholders.map((s) => (
                          <li key={s.role} className="text-[12.5px]">
                            <Tip content={s.reason}>
                              <span className="cursor-help font-medium text-navy-900 underline decoration-navy-200 decoration-dotted underline-offset-2">{s.role}</span>
                            </Tip>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border px-3 py-2.5 text-[13px]">
                  <span className="font-medium text-navy-900">Suggested evaluation methodology: </span>
                  <span className="text-navy-700">{a.methodology}</span>
                </div>

                {intake.reasoning && <ReasoningSummaryCard reasoning={intake.reasoning} />}
              </div>
            )}
          </AgentPanel>

          {a && !running && (
            <Card className="p-5">
              {intake.decision === "approved" ? (
                <div className="space-y-4">
                  <HumanDecisionBanner title="DECISION RECORDED" decided>
                    Recommendation approved by the Procurement Manager. Route: {a.route}.
                  </HumanDecisionBanner>
                  <Button asChild>
                    <Link href="/case/rfx">
                      Continue to RFx Preparation <ArrowRight />
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <HumanDecisionBanner>
                    The agent recommends; the Procurement Manager decides.
                    {intake.decision === "changes_requested" && <strong className="block text-warn-600">Changes were requested — re-analyse after the requester updates the form.</strong>}
                    {intake.decision === "escalated" && <strong className="block text-magenta-600">Escalated to Head of Procurement — you may now approve as escalation owner.</strong>}
                  </HumanDecisionBanner>
                  <div className="flex flex-wrap gap-2">
                    <Confirm
                      title="Approve recommendation?"
                      description={`You are approving the route “${a.route}”. This will unlock RFx preparation and be recorded in the audit trail under your name.`}
                      confirmLabel="Approve recommendation"
                      variant="success"
                      withComment
                      defaultComment="Approved. Requester to add success KPIs before RFx release."
                      onConfirm={(c) => decideIntake("approved", c)}
                    >
                      <Button variant="success" className={cn(gApprove)} data-testid="intake-approve">
                        Approve recommendation
                      </Button>
                    </Confirm>
                    <Confirm
                      title="Request changes"
                      description="The request returns to the requester with your comments."
                      confirmLabel="Request changes"
                      withComment
                      commentRequired
                      defaultComment="Please add measurable success KPIs and confirm the multi-year budget code."
                      onConfirm={(c) => decideIntake("changes_requested", c)}
                    >
                      <Button variant="outline">Request changes</Button>
                    </Confirm>
                    <Confirm
                      title="Escalate this request"
                      description="Escalate to the Head of Procurement for route confirmation."
                      confirmLabel="Escalate"
                      variant="magenta"
                      withComment
                      defaultComment="Compressed timeline for a >AED 2M open tender — requesting confirmation."
                      onConfirm={(c) => decideIntake("escalated", c)}
                    >
                      <Button variant="outline">Escalate</Button>
                    </Confirm>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function SubHead({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-navy-500">
      <Icon className="h-3.5 w-3.5 text-gold-500" /> {label}
    </div>
  );
}

function Metric({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-xl border p-3">
      <div className="flex items-center gap-1.5 text-[11.5px] text-navy-500">
        <Icon className="h-3.5 w-3.5 text-gold-500" /> {label}
      </div>
      <div className="mt-1 text-[13.5px] font-semibold text-navy-900">{value}</div>
      {sub && <div className="mt-0.5 text-[11.5px] leading-snug text-navy-500">{sub}</div>}
    </div>
  );
}

function Ring({ value }: { value: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <svg width="46" height="46" viewBox="0 0 46 46" className="-rotate-90" aria-hidden>
      <circle cx="23" cy="23" r={r} fill="none" stroke="#EEF1F6" strokeWidth="5" />
      <circle cx="23" cy="23" r={r} fill="none" stroke="#1F7A5A" strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} style={{ transition: "stroke-dashoffset 0.8s ease" }} />
    </svg>
  );
}
