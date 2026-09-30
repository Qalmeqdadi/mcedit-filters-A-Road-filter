"use client";

import Link from "next/link";
import { ArrowRight, Bot, CalendarDays, CircleDollarSign, Landmark, Target, UserCheck, Users } from "lucide-react";
import { AGENT_BY_ID } from "@/data/agents";
import { CASE } from "@/data/case";
import { STAGES } from "@/data/stages";
import { SUPPLIER_BY_ID } from "@/data/suppliers";
import { PageHeader } from "@/components/common/page-header";
import { LifecycleStepper } from "@/components/common/lifecycle-stepper";
import { StageStatusBadge } from "@/components/common/status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useApp, type CaseData } from "@/lib/store";
import { cn, formatAED, formatDate, formatDateTime } from "@/lib/utils";
import { currentStage, progressPercent } from "@/services/workflow";
import type { StageId } from "@/types";

function outcome(id: StageId, c: CaseData): string {
  switch (id) {
    case "intake":
      return c.intake.decision === "approved"
        ? `Route approved: ${c.intake.analysis?.route ?? "Open RFP"}`
        : c.intake.analysis
          ? `Analysis ready — completeness ${c.intake.analysis.completeness}%`
          : "Request received; awaiting agent analysis";
    case "rfx":
      return c.rfx.status === "approved" ? "RFx v1.0 released by Category Manager" : c.rfx.status === "in_review" ? "In Category Manager review" : c.rfx.sections.length ? "Draft generated; editing in progress" : "Not yet drafted";
    case "suppliers":
      return c.suppliers.shortlistConfirmed
        ? `Shortlist: ${c.suppliers.shortlist.map((s) => SUPPLIER_BY_ID[s].shortName).join(", ")}`
        : c.suppliers.assessment
          ? "Shortlist recommended; awaiting confirmation"
          : "4 invited suppliers to assess";
    case "evaluation":
      return c.evaluation.award ? `Awarded to ${SUPPLIER_BY_ID[c.evaluation.award.supplierId].name}` : c.evaluation.brief ? "Committee brief ready — human decision required" : c.evaluation.scores ? "Scores computed" : "Submissions sealed";
    case "approvals": {
      const a = c.approvals.steps.filter((s) => s.status === "approved").length;
      return c.approvals.completedAt ? "All 6 approvals obtained" : c.approvals.routed ? `${a} of 6 approvals obtained` : "Awaiting award decision";
    }
    case "contract":
      return c.contract.validated ? "Obligations register validated by Legal" : c.contract.extracted ? "Terms extracted; Legal validation pending" : "Awaiting executed contract";
    case "monitoring":
      return c.monitoring.escalation ? `Delay event handled — escalation ${c.monitoring.escalation}` : c.monitoring.assessment ? "Delay event — escalation decision pending" : c.monitoring.activated ? "Monitoring active" : "Activates after contract validation";
  }
}

export default function CasePage() {
  const c = useApp((s) => s.caseData);
  const audit = useApp((s) => s.audit);
  const cur = currentStage(c.stageStatus);
  const pct = progressPercent(c.stageStatus);
  const decisions = audit.filter((a) => a.actorType === "human" && a.stage && a.stage !== "platform" && a.stage !== "governance").slice(0, 8);
  const curRoute = STAGES.find((s) => s.id === cur)!.route;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Agentic procurement case · ${CASE.id}`}
        title={CASE.title}
        description="End-to-end lifecycle orchestrated by seven specialist agents under human accountability. Select any stage to open it."
        actions={
          <Button asChild>
            <Link href={curRoute}>
              Continue at current stage <ArrowRight />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { icon: Landmark, label: "Business owner", value: CASE.businessOwner },
          { icon: CircleDollarSign, label: "Estimated value", value: formatAED(CASE.estimatedValue) },
          { icon: CalendarDays, label: "Opened", value: formatDate(CASE.openedOn) },
          { icon: Target, label: "Target completion", value: `${CASE.targetDays} days · ${formatDate(CASE.targetCompletion)}` },
          { icon: Users, label: "Invited suppliers", value: "4 (synthetic)" },
        ].map((f) => (
          <Card key={f.label} className="flex items-center gap-3 p-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-50 text-gold-600">
              <f.icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="text-[11.5px] text-navy-500">{f.label}</div>
              <div className="truncate text-[13.5px] font-semibold text-navy-900">{f.value}</div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <LifecycleStepper active={cur} />
        <div className="mt-5 flex items-center gap-3">
          <Progress value={pct} className="h-2" indicatorClassName="bg-gradient-to-r from-gold-400 to-gold-500" />
          <span className="tabular w-24 shrink-0 text-right text-[13px] font-semibold text-navy-800">{pct}% complete</span>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="grid gap-4 md:grid-cols-2">
          {STAGES.map((s) => {
            const st = c.stageStatus[s.id];
            return (
              <Card key={s.id} className={cn("flex flex-col p-5 transition hover:shadow-lift", s.id === cur && "border-navy-200 ring-1 ring-navy-100")}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-gold-600">Stage {s.number}</div>
                    <div className="text-[15px] font-semibold text-navy-900">{s.name}</div>
                  </div>
                  <StageStatusBadge status={st} />
                </div>
                <p className="mt-1 text-[12.5px] text-navy-500">{s.description}</p>
                <div className="mt-3 flex items-center gap-1.5 text-[12px] text-navy-600">
                  <Bot className="h-3.5 w-3.5 text-gold-500" /> {AGENT_BY_ID[s.agentId].name}
                </div>
                <div className="mt-3 flex-1 rounded-lg bg-navy-50/50 px-3 py-2 text-[12.5px] text-navy-800">{outcome(s.id, c)}</div>
                <Button variant={s.id === cur ? "default" : "outline"} size="sm" className="mt-4 self-start" asChild>
                  <Link href={s.route}>
                    Open {s.short} <ArrowRight />
                  </Link>
                </Button>
              </Card>
            );
          })}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-magenta-500" /> Human decision record
            </CardTitle>
            <CardDescription>Every material decision on this case, by an accountable person.</CardDescription>
          </CardHeader>
          <CardContent>
            {decisions.length === 0 ? (
              <div className="rounded-lg border border-dashed px-4 py-8 text-center text-[13px] text-navy-500">No decisions recorded yet.</div>
            ) : (
              <ol className="relative space-y-4 border-l border-navy-100 pl-4">
                {decisions.map((d) => (
                  <li key={d.id} className="relative">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-magenta-500" />
                    <div className="text-[13px] font-medium text-navy-900">{d.action}</div>
                    <div className="text-[12px] text-navy-500">{d.actor}</div>
                    {d.detail && <div className="mt-0.5 text-[12px] text-navy-600">{d.detail}</div>}
                    <div className="mt-0.5 text-[11px] text-navy-400">{formatDateTime(d.timestamp)}</div>
                  </li>
                ))}
              </ol>
            )}
            <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
              <Link href="/audit">Open full audit trail</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
