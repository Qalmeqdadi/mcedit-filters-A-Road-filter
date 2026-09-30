"use client";

import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, CalendarClock, Clock3, FolderKanban, Gauge, ShieldAlert, Timer, UserCheck } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AGENT_BY_ID } from "@/data/agents";
import { CASE } from "@/data/case";
import { PIPELINE_BY_STAGE, PORTFOLIO, PORTFOLIO_KPIS } from "@/data/portfolio";
import { STAGE_BY_ID, STAGES } from "@/data/stages";
import { PageHeader } from "@/components/common/page-header";
import { LifecycleStepper } from "@/components/common/lifecycle-stepper";
import { StageStatusBadge } from "@/components/common/status";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { StartGuidedButton } from "@/components/shell/guided-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tip } from "@/components/ui/tooltip";
import { CHART } from "@/lib/chart";
import { useApp } from "@/lib/store";
import { cn, formatAED, formatDate, formatTime } from "@/lib/utils";
import { currentStage, progressPercent } from "@/services/workflow";

const HUMAN_DECISION_TEXT: Record<string, string> = {
  intake: "Approve sourcing route recommendation",
  rfx: "Category Manager review of RFx",
  suppliers: "Confirm supplier shortlist",
  evaluation: "Evaluation Committee award decision",
  approvals: "Outstanding DoA approvals",
  contract: "Legal validation of obligations",
  monitoring: "Escalation decision",
};

export default function CommandCenter() {
  const caseData = useApp((s) => s.caseData);
  const audit = useApp((s) => s.audit);
  const status = caseData.stageStatus;
  const cur = currentStage(status);
  const curDef = STAGE_BY_ID[cur];
  const pct = progressPercent(status);
  const casePending = caseData.approvals.steps.filter((s) => ["pending", "needs_clarification"].includes(s.status)).length;
  const pendingApprovals = 3 + casePending;
  const awaiting = STAGES.filter((s) => status[s.id] === "awaiting_human");
  const agentEvents = audit.filter((a) => a.stage !== "platform").slice(0, 6);

  const kpis = [
    { label: "Active procurements", value: String(PORTFOLIO_KPIS.activeProcurements), sub: "AED 18.6M total estimated value", icon: FolderKanban },
    { label: "Pending approvals", value: String(pendingApprovals), sub: casePending ? `${casePending} on PRC-2026-0147` : "Across 3 procurements", icon: UserCheck, tone: "magenta" as const },
    { label: "Supplier risks", value: String(PORTFOLIO_KPIS.supplierRisks), sub: "2 high · 4 medium", icon: ShieldAlert, tone: "risk" as const },
    { label: "Contracts approaching milestones", value: String(PORTFOLIO_KPIS.contractsApproachingMilestones), sub: "Next 30 days", icon: CalendarClock },
    { label: "Est. cycle-time improvement", value: PORTFOLIO_KPIS.cycleTimeImprovement, sub: "Illustrative hypothesis", icon: Timer, hypothesis: true },
    { label: "Potential manual hours avoided", value: PORTFOLIO_KPIS.manualHoursAvoided, sub: "Illustrative hypothesis", icon: Clock3, hypothesis: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Procurement Intelligence"
        title="Procurement Intelligence Command Center"
        description="A single view of active sourcing, supplier risk and agent activity — with every material decision held by an accountable human."
        actions={
          <>
            <StartGuidedButton label="Launch Demo Journey" size="default" compact={false} />
            <Button asChild>
              <Link href="/case">
                <BriefcaseBusiness /> Open Agentic Procurement Case
              </Link>
            </Button>
          </>
        }
      />

      {/* KPI tiles */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[12px] font-medium leading-tight text-navy-500">{k.label}</span>
              <k.icon className={cn("h-4 w-4 shrink-0", k.tone === "magenta" ? "text-magenta-500" : k.tone === "risk" ? "text-risk-500" : "text-gold-500")} />
            </div>
            <div className="tabular mt-2 font-serif text-[28px] font-semibold leading-none text-navy-900">{k.value}</div>
            <div className="mt-2 flex items-center gap-1 text-[11.5px] text-navy-500">
              {k.hypothesis ? (
                <Tip content="Illustrative value hypothesis — to be validated during PoV.">
                  <span className="cursor-help underline decoration-dotted underline-offset-2">{k.sub}</span>
                </Tip>
              ) : (
                k.sub
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Hero case */}
      <Card className="overflow-hidden">
        <div className="grid lg:grid-cols-[1fr_320px]">
          <div className="p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="solid">{CASE.id}</Badge>
              <Badge variant="sky">
                <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-sky-500" /> Active · agent-orchestrated
              </Badge>
              <StageStatusBadge status={status[cur]} />
            </div>
            <h2 className="mt-3 font-serif text-2xl font-semibold tracking-tight text-navy-900 sm:text-[28px]">{CASE.title}</h2>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-navy-600">
              <span>
                Business owner: <strong className="font-medium text-navy-900">{CASE.businessOwner}</strong>
              </span>
              <span>
                Estimated value: <strong className="tabular font-medium text-navy-900">{formatAED(CASE.estimatedValue, { compact: true })}</strong>
              </span>
              <span>
                Target: <strong className="font-medium text-navy-900">{CASE.targetDays} days</strong> ({formatDate(CASE.targetCompletion)})
              </span>
            </div>
            <div className="mt-6">
              <LifecycleStepper active={cur} />
            </div>
            <div className="mt-6 flex items-center gap-3">
              <Progress value={pct} className="h-2" indicatorClassName="bg-gradient-to-r from-gold-400 to-gold-500" />
              <span className="tabular w-24 shrink-0 text-right text-[13px] font-semibold text-navy-800">{pct}% complete</span>
            </div>
          </div>
          <div className="flex flex-col justify-between gap-4 border-t border-border/70 bg-[#FBF9F5] p-6 lg:border-l lg:border-t-0">
            <div className="space-y-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-navy-500">Current stage</div>
                <div className="mt-1 text-[15px] font-semibold text-navy-900">
                  {curDef.number} {curDef.name}
                </div>
                <div className="text-[12.5px] text-navy-500">Led by {AGENT_BY_ID[curDef.agentId].name}</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-magenta-500">Next human decision</div>
                <div className="mt-1 text-[13.5px] font-medium text-navy-900">{HUMAN_DECISION_TEXT[cur]}</div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button asChild>
                <Link href="/case">
                  Open Agentic Procurement Case <ArrowRight />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={curDef.route}>Go to {curDef.name}</Link>
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Human decisions */}
        <Card>
          <CardHeader>
            <CardTitle>Awaiting human decision</CardTitle>
            <CardDescription>Agents prepare; people decide.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {awaiting.length === 0 && (
              <div className="rounded-lg border border-dashed px-4 py-6 text-center text-[13px] text-navy-500">
                No decisions waiting on PRC-2026-0147 right now. Run the next agent step to generate one.
              </div>
            )}
            {awaiting.map((s) => (
              <Link key={s.id} href={s.route} className="flex items-center gap-3 rounded-lg border border-magenta-100 bg-magenta-50/50 px-3 py-2.5 transition hover:bg-magenta-50">
                <UserCheck className="h-4 w-4 text-magenta-500" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-navy-900">{HUMAN_DECISION_TEXT[s.id]}</div>
                  <div className="text-[11.5px] text-navy-500">
                    {CASE.id} · {s.name}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-navy-400" />
              </Link>
            ))}
            {[
              { t: "Approve CX platform renewal (Finance)", id: "PRC-2026-0138" },
              { t: "Confirm threat-intel award", id: "PRC-2026-0141" },
            ].map((x) => (
              <div key={x.id} className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
                <UserCheck className="h-4 w-4 text-navy-300" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-navy-800">{x.t}</div>
                  <div className="text-[11.5px] text-navy-500">{x.id} · portfolio (synthetic)</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Pipeline chart */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline by lifecycle stage</CardTitle>
            <CardDescription>14 active procurements (synthetic portfolio)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={PIPELINE_BY_STAGE} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }} barCategoryGap={6}>
                  <CartesianGrid horizontal={false} stroke={CHART.grid} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: CHART.inkMuted }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="stage" width={78} tick={{ fontSize: 11.5, fill: CHART.ink }} axisLine={false} tickLine={false} interval={0} />
                  <Tooltip cursor={{ fill: "rgba(58,102,167,0.06)" }} content={<ChartTooltip format={(v) => `${v} procurements`} />} />
                  <Bar dataKey="count" name="Procurements" fill={CHART.series[0]} radius={[0, 4, 4, 0]} maxBarSize={18} label={{ position: "right", fontSize: 11, fill: CHART.ink }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Agent activity */}
        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Agent & human activity</CardTitle>
              <CardDescription>Latest audited actions</CardDescription>
            </div>
            <Button variant="ghost" size="xs" asChild>
              <Link href="/agents">
                View all <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5">
              {agentEvents.map((e) => (
                <li key={e.id} className="flex gap-2.5 text-[12.5px]">
                  <span className="tabular w-10 shrink-0 pt-px text-navy-400">{formatTime(e.timestamp)}</span>
                  <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", e.actorType === "agent" ? "bg-sky-500" : e.actorType === "human" ? "bg-magenta-500" : "bg-navy-300")} />
                  <span className="min-w-0 text-navy-700">
                    <span className="font-medium text-navy-900">{e.actor}</span> {e.action.charAt(0).toLowerCase() + e.action.slice(1)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Portfolio */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Active procurement portfolio</CardTitle>
            <CardDescription>Synthetic portfolio for illustration</CardDescription>
          </div>
          <Gauge className="h-4 w-4 text-gold-500" />
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[760px] text-[13px]">
            <thead>
              <tr className="border-y border-border/70 bg-navy-50/40 text-left text-[11px] uppercase tracking-wider text-navy-500">
                <th className="px-5 py-2.5 font-semibold">Procurement</th>
                <th className="px-3 py-2.5 font-semibold">Owner</th>
                <th className="px-3 py-2.5 text-right font-semibold">Value</th>
                <th className="px-3 py-2.5 font-semibold">Stage</th>
                <th className="px-3 py-2.5 font-semibold">Lead agent</th>
                <th className="px-5 py-2.5 font-semibold">Health</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/60 bg-gold-50/40">
                <td className="px-5 py-3">
                  <Link href="/case" className="font-medium text-navy-900 hover:underline">
                    {CASE.title}
                  </Link>
                  <div className="text-[11.5px] text-navy-500">{CASE.id} · featured case</div>
                </td>
                <td className="px-3 py-3 text-navy-700">{CASE.businessOwner}</td>
                <td className="tabular px-3 py-3 text-right text-navy-900">{formatAED(CASE.estimatedValue, { compact: true })}</td>
                <td className="px-3 py-3 text-navy-700">{curDef.name}</td>
                <td className="px-3 py-3 text-navy-700">{AGENT_BY_ID[curDef.agentId].name}</td>
                <td className="px-5 py-3">
                  <Badge variant="ok">On track</Badge>
                </td>
              </tr>
              {PORTFOLIO.map((p) => (
                <tr key={p.id} className="border-b border-border/60 last:border-0">
                  <td className="px-5 py-3">
                    <div className="font-medium text-navy-900">{p.title}</div>
                    <div className="text-[11.5px] text-navy-500">{p.id}</div>
                  </td>
                  <td className="px-3 py-3 text-navy-700">{p.owner}</td>
                  <td className="tabular px-3 py-3 text-right text-navy-900">{formatAED(p.value, { compact: true })}</td>
                  <td className="px-3 py-3 text-navy-700">{p.stage}</td>
                  <td className="px-3 py-3 text-navy-700">{p.agent}</td>
                  <td className="px-5 py-3">
                    {p.health === "on_track" ? <Badge variant="ok">On track</Badge> : p.health === "at_risk" ? <Badge variant="risk">At risk</Badge> : <Badge variant="warn">Attention</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
