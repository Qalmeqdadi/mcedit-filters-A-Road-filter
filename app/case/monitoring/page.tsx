"use client";

import Link from "next/link";
import { Activity, AlertTriangle, ArrowRight, BellRing, CalendarClock, CheckCircle2, CircleAlert, FileWarning, Gauge, HeartHandshake, Radar, ShieldCheck, Siren, Truck, UserCheck, Zap } from "lucide-react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MILESTONES } from "@/data/contract";
import { COMPLIANCE_EVENTS, DELAY_EVENT, OPEN_ISSUES, PERFORMANCE_TREND, RELATIONSHIP_SCORE, RISK_INDICATORS, SLA_TREND } from "@/data/monitoring";
import { StageHeader } from "@/components/common/stage-header";
import { AgentPanel } from "@/components/common/agent-panel";
import { ReasoningSummaryCard } from "@/components/common/reasoning-summary";
import { HumanDecisionBanner } from "@/components/common/human-decision";
import { SeverityBadge } from "@/components/common/status";
import { EmptyState } from "@/components/common/empty-state";
import { Confirm } from "@/components/common/confirm";
import { useGuide } from "@/components/common/guide";
import { ChartLegend, ChartTooltip } from "@/components/charts/chart-tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { activateMonitoring, decideEscalation, injectDelayEvent } from "@/lib/actions";
import { CHART } from "@/lib/chart";
import { useApp } from "@/lib/store";
import { cn, formatDate } from "@/lib/utils";

export default function MonitoringPage() {
  const mon = useApp((s) => s.caseData.monitoring);
  const approvalsDone = useApp((s) => !!s.caseData.approvals.completedAt);
  const assessing = useApp((s) => s.running.includes("monitoring.assess"));
  const gAct = useGuide("mon-activate");
  const gInj = useGuide("mon-inject");
  const gEsc = useGuide("mon-escalate");

  const eventActive = mon.eventInjected;
  const a = mon.assessment;
  const relationship = eventActive ? RELATIONSHIP_SCORE.after : RELATIONSHIP_SCORE.before;

  if (!approvalsDone)
    return (
      <div className="space-y-6">
        <StageHeader stage="monitoring" />
        <EmptyState icon={Radar} title="No active contract to monitor" description="Continuous monitoring begins after the contract is executed and its obligations are validated. Use “Fast-forward here” above to jump straight to this stage.">
          <Button asChild>
            <Link href="/case/contract">
              Go to Contract Intelligence <ArrowRight />
            </Link>
          </Button>
        </EmptyState>
      </div>
    );

  return (
    <div className="space-y-6">
      <StageHeader stage="monitoring" />

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-sky-100 bg-sky-50/60 px-4 py-2.5 text-[12.5px] text-navy-700">
        <CalendarClock className="h-4 w-4 text-sky-600" />
        <strong className="text-navy-900">Simulated forward view:</strong> contract month 6 (May 2027) · Alpha Data Systems · CTR-2026-0093 · all monitoring data synthetic
      </div>

      <AgentPanel
        agentId="monitoring"
        watchTasks={["monitoring.assess"]}
        actions={
          <>
            <Button onClick={activateMonitoring} disabled={mon.activated} className={gAct} data-testid="mon-activate">
              <Radar /> {mon.activated ? "Monitoring active" : "Activate monitoring"}
            </Button>
            <Button variant="magenta" onClick={injectDelayEvent} disabled={assessing || (eventActive && !mon.escalation)} className={gInj} data-testid="mon-inject">
              <Zap /> Simulate event: milestone delayed 12 days
            </Button>
          </>
        }
      >
        {!mon.activated && <p className="text-[13px] text-navy-500">Activate monitoring to start watching 14 obligations, 7 milestones and 4 risk signal feeds for this contract.</p>}

        {mon.activated && !eventActive && (
          <div className="flex items-center gap-3 rounded-xl border border-ok-100 bg-ok-50/60 px-4 py-3 text-[13px] text-navy-800">
            <CheckCircle2 className="h-4 w-4 text-ok-500" /> All signals within tolerance. Next scheduled check: SLA report ingest (daily 06:00).
          </div>
        )}

        {eventActive && (
          <div className="space-y-4">
            <div className="flex gap-3 rounded-xl border border-risk-100 bg-risk-50/60 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-risk-500 text-white">
                <Siren className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-semibold text-navy-900">{DELAY_EVENT.title}</span>
                  <SeverityBadge severity={DELAY_EVENT.severity} />
                  <Badge variant="outline">{DELAY_EVENT.id}</Badge>
                </div>
                <p className="mt-1 text-[13px] text-navy-700">{DELAY_EVENT.detail}</p>
                <p className="mt-1 text-[11.5px] text-navy-500">
                  Detected {DELAY_EVENT.detectedAt} (simulated) · {DELAY_EVENT.source}
                </p>
              </div>
            </div>

            {/* Agent response pipeline */}
            <ol className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
              {[
                { t: "Detect event", d: !!eventActive },
                { t: "Assess impact", d: !!a },
                { t: "Identify obligation", d: !!a },
                { t: "Calculate risk", d: !!a },
                { t: "Recommend action", d: !!a },
                { t: "Human approval", d: !!mon.escalation, human: true },
              ].map((s, i) => (
                <li
                  key={s.t}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-[12.5px]",
                    s.d ? (s.human ? "border-ok-100 bg-ok-50 text-ok-600" : "border-sky-100 bg-sky-50 text-sky-700") : s.human && a ? "border-magenta-200 bg-magenta-50 text-magenta-600" : "text-navy-400",
                  )}
                >
                  {s.d ? <CheckCircle2 className="h-3.5 w-3.5" /> : s.human ? <UserCheck className="h-3.5 w-3.5" /> : <span className="tabular text-[11px] font-semibold">{i + 1}</span>}
                  {s.t}
                </li>
              ))}
            </ol>

            {a && !assessing && (
              <div className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
                  <div className="space-y-3">
                    <div className="rounded-xl border p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-navy-500">Impact assessment</div>
                      <p className="mt-1 text-[13px] leading-relaxed text-navy-800">{a.impact}</p>
                    </div>
                    <div className="rounded-xl border p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-navy-500">Affected contractual obligation</div>
                      <p className="mt-1 text-[13px] font-medium text-navy-900">{a.affectedObligation}</p>
                    </div>
                  </div>
                  <div className="rounded-xl border p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-navy-500">Supplier risk score</div>
                    <div className="mt-2 flex items-end gap-3">
                      <div>
                        <div className="tabular font-serif text-2xl font-semibold text-navy-400 line-through decoration-1">{a.riskScoreBefore}</div>
                        <div className="text-[11px] text-navy-500">before</div>
                      </div>
                      <ArrowRight className="mb-3 h-4 w-4 text-navy-400" />
                      <div>
                        <div className="tabular font-serif text-4xl font-semibold text-risk-600">{a.riskScoreAfter}</div>
                        <div className="text-[11px] text-navy-500">after event</div>
                      </div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-gradient-to-r from-ok-100 via-warn-100 to-risk-100">
                      <div className="relative h-full" style={{ width: `${a.riskScoreAfter}%` }}>
                        <span className="absolute right-0 top-1/2 h-3.5 w-1.5 -translate-y-1/2 rounded bg-risk-600" />
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-[12.5px]">
                      Risk level: <SeverityBadge severity={a.riskLevel} />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border p-4">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-navy-500">Recommended actions</div>
                  <ol className="space-y-1.5">
                    {a.recommendedActions.map((r, i) => (
                      <li key={r} className="flex gap-2.5 text-[13px] text-navy-800">
                        <span className="tabular flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy-800 text-[10.5px] font-semibold text-white">{i + 1}</span>
                        {r}
                      </li>
                    ))}
                  </ol>
                </div>

                {mon.reasoning && <ReasoningSummaryCard reasoning={mon.reasoning} dense />}

                {mon.escalation ? (
                  <HumanDecisionBanner title={mon.escalation === "approved" ? "ESCALATION APPROVED BY CONTRACT OWNER" : "ESCALATION DECLINED BY CONTRACT OWNER"} decided>
                    {mon.escalation === "approved"
                      ? "Recovery plan requested and Steering Committee notified (simulated drafts, human-reviewed). No penalties applied automatically."
                      : "Agent continues heightened monitoring with weekly check-ins."}
                  </HumanDecisionBanner>
                ) : (
                  <div className="space-y-3">
                    <HumanDecisionBanner>Escalation to the Steering Committee requires the Contract Owner&apos;s approval. Liquidated damages are never applied automatically.</HumanDecisionBanner>
                    <div className="flex flex-wrap gap-2">
                      <Confirm
                        title="Approve escalation?"
                        description="The agent will draft a recovery-plan request to the supplier and a Steering Committee notice for your review. No contractual remedy is applied."
                        confirmLabel="Approve escalation"
                        variant="success"
                        withComment
                        defaultComment="Approve escalation; request recovery plan within 5 business days."
                        onConfirm={(c) => decideEscalation("approved", c)}
                      >
                        <Button variant="success" className={gEsc} data-testid="mon-escalate">
                          <UserCheck /> Approve escalation
                        </Button>
                      </Confirm>
                      <Confirm
                        title="Decline escalation?"
                        description="The event stays open under heightened monitoring. You can escalate later."
                        confirmLabel="Decline"
                        withComment
                        defaultComment="Supplier has a credible recovery path; monitor weekly."
                        onConfirm={(c) => decideEscalation("declined", c)}
                      >
                        <Button variant="outline">Decline — monitor only</Button>
                      </Confirm>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </AgentPanel>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
        <Tile icon={Gauge} label="SLA performance" value="99.78%" sub="May · target 99.7%" tone="ok" />
        <Tile icon={FileWarning} label="Open issues" value={String(OPEN_ISSUES.length + (eventActive ? 1 : 0))} sub={eventActive ? "1 new high-severity" : "0 high severity"} tone={eventActive ? "risk" : undefined} />
        <Tile icon={Truck} label="Delivery health" value={eventActive ? "At risk" : "On track"} sub={eventActive ? "M3 slipped 12 days" : "All milestones on plan"} tone={eventActive ? "risk" : "ok"} />
        <Tile icon={CalendarClock} label="Next milestone" value={eventActive ? "11 Jun 2027" : "30 May 2027"} sub="M3 · Analytics platform build" tone={eventActive ? "warn" : undefined} />
        <Tile icon={ShieldCheck} label="Financial / risk indicators" value="Stable" sub="Permitted-use external signals" tone="ok" />
        <Tile icon={HeartHandshake} label="Relationship score" value={String(relationship)} sub={eventActive ? `↓ from ${RELATIONSHIP_SCORE.before}` : "Out of 100"} tone={eventActive ? "warn" : undefined} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>SLA performance — platform availability</CardTitle>
            <CardDescription>Monthly availability vs 99.7% contractual target (Sch. 4 §1.2)</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartLegend
              items={[
                { label: "Availability", color: CHART.series[0] },
                { label: "SLA target 99.7%", color: CHART.reference, dashed: true },
              ]}
            />
            <div className="mt-2 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={SLA_TREND} margin={{ top: 10, right: 12, left: -6, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={CHART.grid} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: CHART.inkMuted }} axisLine={false} tickLine={false} />
                  <YAxis domain={[99.5, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: CHART.inkMuted }} axisLine={false} tickLine={false} width={56} />
                  <Tooltip content={<ChartTooltip format={(v) => `${v}%`} />} cursor={{ stroke: CHART.axis, strokeDasharray: "3 3" }} />
                  <ReferenceLine y={99.7} stroke={CHART.reference} strokeDasharray="5 4" strokeWidth={1.5} />
                  <Line type="monotone" dataKey="availability" name="Availability" stroke={CHART.series[0]} strokeWidth={2} dot={{ r: 4, fill: CHART.series[0], stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Supplier performance trend</CardTitle>
            <CardDescription>Delivery, quality and relationship indices (0–100)</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartLegend
              items={[
                { label: "Delivery", color: CHART.series[0] },
                { label: "Quality", color: CHART.series[1] },
                { label: "Relationship", color: CHART.series[2] },
              ]}
            />
            <div className="mt-2 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={eventActive ? PERFORMANCE_TREND.map((p, i) => (i === PERFORMANCE_TREND.length - 1 ? { ...p, delivery: 76, relationship: 79 } : p)) : PERFORMANCE_TREND} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={CHART.grid} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: CHART.inkMuted }} axisLine={false} tickLine={false} />
                  <YAxis domain={[70, 95]} tick={{ fontSize: 11, fill: CHART.inkMuted }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: CHART.axis, strokeDasharray: "3 3" }} />
                  <Line type="monotone" dataKey="delivery" name="Delivery" stroke={CHART.series[0]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="quality" name="Quality" stroke={CHART.series[1]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="relationship" name="Relationship" stroke={CHART.series[2]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CircleAlert className="h-4 w-4 text-warn-500" /> Open issues
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {eventActive && (
              <div className="rounded-lg border border-risk-100 bg-risk-50/50 px-3 py-2">
                <div className="flex items-start justify-between gap-2 text-[12.5px] font-medium text-navy-900">
                  {DELAY_EVENT.id} · M3 delay 12 days <SeverityBadge severity="high" />
                </div>
                <div className="text-[11.5px] text-navy-500">Contract Owner · new</div>
              </div>
            )}
            {OPEN_ISSUES.map((i) => (
              <div key={i.id} className="rounded-lg border px-3 py-2">
                <div className="flex items-start justify-between gap-2 text-[12.5px] font-medium text-navy-900">
                  <span>
                    {i.id} · {i.title}
                  </span>
                  <SeverityBadge severity={i.severity} />
                </div>
                <div className="text-[11.5px] text-navy-500">
                  {i.owner} · {i.age}
                  {i.note && ` · ${i.note}`}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-gold-500" /> Contract milestones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {MILESTONES.slice(1, 6).map((m) => {
              const done = ["M1", "M2"].includes(m.id);
              const risk = m.id === "M3" && eventActive;
              return (
                <div key={m.id} className="flex items-center gap-2.5 text-[12.5px]">
                  {done ? <CheckCircle2 className="h-4 w-4 text-ok-500" /> : risk ? <AlertTriangle className="h-4 w-4 text-risk-500" /> : <span className="mx-1 h-2 w-2 rounded-full bg-navy-200" />}
                  <span className="flex-1 text-navy-800">
                    {m.id} {m.label}
                  </span>
                  <span className={cn("tabular", risk ? "font-semibold text-risk-600" : "text-navy-500")}>{risk ? "11 Jun 2027" : formatDate(m.date)}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-ok-500" /> Financial / risk indicators
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {RISK_INDICATORS.map((r) => (
              <div key={r.label}>
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="text-navy-600">{r.label}</span>
                  <Badge variant={r.tone === "ok" ? "ok" : "warn"}>{r.value}</Badge>
                </div>
                <div className="text-[11px] leading-snug text-navy-400">{r.note}</div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-sky-500" /> Compliance events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="relative space-y-3 border-l border-navy-100 pl-4">
              {eventActive && (
                <li className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-risk-500" />
                  <div className="text-[12.5px] font-medium text-navy-900">Delivery delay event raised</div>
                  <div className="text-[11px] text-navy-500">19 May 2027</div>
                </li>
              )}
              {COMPLIANCE_EVENTS.map((e) => (
                <li key={e.title} className="relative">
                  <span className={cn("absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white", e.tone === "ok" ? "bg-ok-500" : e.tone === "warn" ? "bg-warn-500" : "bg-sky-500")} />
                  <div className="text-[12.5px] font-medium text-navy-900">{e.title}</div>
                  <div className="text-[11px] text-navy-500">{formatDate(e.date)}</div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      {mon.escalation && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gold-200 bg-gold-50 px-5 py-4">
          <BellRing className="h-5 w-5 text-gold-600" />
          <div className="min-w-0 flex-1 text-[13px] text-navy-800">
            <strong className="text-navy-900">Lifecycle complete.</strong> From demand to monitored contract — agents prepared, analysed and orchestrated; humans decided.
          </div>
          <Button variant="gold" asChild>
            <Link href="/value">
              View value hypothesis <ArrowRight />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

function Tile({ icon: Icon, label, value, sub, tone }: { icon: React.ElementType; label: string; value: string; sub: string; tone?: "ok" | "warn" | "risk" }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[12px] leading-tight text-navy-500">{label}</span>
        <Icon className={cn("h-4 w-4 shrink-0", tone === "ok" ? "text-ok-500" : tone === "warn" ? "text-warn-500" : tone === "risk" ? "text-risk-500" : "text-gold-500")} />
      </div>
      <div className={cn("tabular mt-1.5 font-serif text-[22px] font-semibold", tone === "risk" ? "text-risk-600" : "text-navy-900")}>{value}</div>
      <div className="text-[11.5px] text-navy-500">{sub}</div>
    </Card>
  );
}
