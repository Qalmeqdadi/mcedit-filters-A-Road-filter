"use client";

import { AlertCircle, CalendarRange, FlaskConical, Ruler, Target } from "lucide-react";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { VALUE_DISCLAIMER, VALUE_METRICS } from "@/data/value";
import { PageHeader } from "@/components/common/page-header";
import { ChartLegend, ChartTooltip } from "@/components/charts/chart-tooltip";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART } from "@/lib/chart";
import { useApp, type AppState } from "@/lib/store";
import { cn } from "@/lib/utils";

function observed(signal: string, s: AppState): { text: string; live: boolean } {
  const c = s.caseData;
  const completed = Object.values(c.stageStatus).filter((x) => x === "completed").length;
  const agentRuns = s.audit.filter((a) => a.actorType === "agent" && a.action.startsWith("Completed")).length;
  switch (signal) {
    case "cycle":
      return completed > 0
        ? { text: `${completed} of 7 stages completed in this session against a 45-day plan (simulated)`, live: true }
        : { text: "Not yet observed — start the guided demo", live: false };
    case "effort":
      return agentRuns > 0 ? { text: `${agentRuns} agent-prepared artefacts / analyses, each human-reviewed`, live: true } : { text: "Not yet observed", live: false };
    case "onboarding":
      return c.suppliers.assessment ? { text: "4 Supplier 360 profiles with sanctions, conflicts and gaps assembled in one agent run", live: true } : { text: "Not yet observed — run Supplier Intelligence", live: false };
    case "evalprep":
      return c.evaluation.brief ? { text: "Score matrix, findings log and committee brief drafted in under a minute (simulated)", live: true } : { text: "Not yet observed — run Bid Evaluation", live: false };
    case "approval": {
      if (!c.approvals.routed) return { text: "Not yet observed — route approvals", live: false };
      const reminders = c.approvals.steps.reduce((a, x) => a + x.remindersSent, 0);
      return { text: `6 approvers derived from DoA automatically; ${reminders} reminder(s), 1 clarification loop, 1 overdue escalation handled`, live: true };
    }
    case "compliance": {
      const n = (c.intake.analysis?.policyIssues.length ?? 0) + (c.rfx.policy?.filter((p) => p.status !== "pass").length ?? 0) + (c.evaluation.deviations?.length ?? 0) + (c.evaluation.missing?.length ?? 0) + (c.evaluation.commercial?.length ?? 0);
      return n > 0 ? { text: `${n} policy / compliance issues surfaced before award`, live: true } : { text: "Not yet observed", live: false };
    }
  }
  return { text: "—", live: false };
}

export default function ValuePage() {
  const state = useApp();
  const chartData = VALUE_METRICS.map((m) => ({ name: m.name.replace("Supplier onboarding / due-diligence time", "Supplier onboarding").replace("Manual effort per sourcing event", "Manual effort"), Baseline: m.baselineIndex, "PoV target": m.targetIndex }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Executive value"
        title="Value Realisation"
        description="Baseline versus PoV target for six value drivers, with how each will be measured. These are hypotheses to test — not commitments."
      />

      <div className="flex items-start gap-3 rounded-xl border border-gold-200 bg-gold-50 px-4 py-3">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
        <div className="text-[13px] text-navy-800">
          <strong className="text-navy-900">{VALUE_DISCLAIMER}</strong> Baselines are illustrative placeholders to be replaced with ECB-measured data during PoV discovery. No improvement is guaranteed.
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Baseline vs PoV target</CardTitle>
            <CardDescription>Indexed: baseline = 100 · target shown at the midpoint of the hypothesis range · lower is better</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartLegend
              items={[
                { label: "Baseline (indexed 100)", color: CHART.series[0] },
                { label: "PoV target (hypothesis)", color: CHART.series[1] },
              ]}
            />
            <div className="mt-2 h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 36, left: 8, bottom: 0 }} barGap={2} barCategoryGap="24%">
                  <CartesianGrid horizontal={false} stroke={CHART.grid} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: CHART.inkMuted }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11.5, fill: CHART.ink }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "rgba(58,102,167,0.06)" }} content={<ChartTooltip format={(v) => `${v} (index)`} />} />
                  <Bar dataKey="Baseline" fill={CHART.series[0]} radius={[0, 4, 4, 0]} maxBarSize={14} />
                  <Bar dataKey="PoV target" fill={CHART.series[1]} radius={[0, 4, 4, 0]} maxBarSize={14}>
                    <LabelList dataKey="PoV target" position="right" style={{ fontSize: 11, fill: CHART.ink }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {VALUE_METRICS.map((m) => {
            const o = observed(m.demoSignal, state);
            return (
              <Card key={m.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[14px] font-semibold text-navy-900">{m.name}</div>
                    <div className="text-[11.5px] text-navy-500">{m.unit}</div>
                  </div>
                  <Badge variant="gold">Hypothesis</Badge>
                </div>
                <dl className="mt-3 flex-1 space-y-2 text-[12.5px]">
                  <Item icon={Ruler} label="Baseline" value={m.baseline} />
                  <Item icon={FlaskConical} label="Observed demo result" value={o.text} highlight={o.live} />
                  <Item icon={Target} label="Target" value={m.target} strong />
                  <Item icon={CalendarRange} label="Measurement method" value={m.measurement} />
                </dl>
                <div className="mt-3 border-t pt-2 text-[10.5px] italic text-navy-400">{VALUE_DISCLAIMER}</div>
              </Card>
            );
          })}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How the PoV will validate these hypotheses</CardTitle>
          <CardDescription>Illustrative 10-week plan</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {[
            { w: "Weeks 1–2", t: "Discovery & baseline", d: "Measure current cycle time, effort and approval turnaround from historical records; confirm data access and legal permissions." },
            { w: "Weeks 3–8", t: "Controlled pilot", d: "Run 8–12 live sourcing events through the orchestrator with human approval gates; capture agent logs and time-and-motion samples." },
            { w: "Weeks 9–10", t: "Validation & decision", d: "Compare against baseline, review accuracy and override rates, assess risk & controls, and agree a scale-up business case." },
          ].map((p, i) => (
            <div key={p.w} className={cn("rounded-xl border p-4", i === 1 && "border-gold-200 bg-gold-50/40")}>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-gold-600">{p.w}</div>
              <div className="mt-1 text-[14px] font-semibold text-navy-900">{p.t}</div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-navy-600">{p.d}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Item({ icon: Icon, label, value, strong, highlight }: { icon: React.ElementType; label: string; value: string; strong?: boolean; highlight?: boolean }) {
  return (
    <div className="flex gap-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-500" />
      <div>
        <dt className="text-[11px] font-semibold uppercase tracking-wider text-navy-400">{label}</dt>
        <dd className={cn("leading-snug", strong ? "font-semibold text-navy-900" : highlight ? "font-medium text-sky-700" : "text-navy-700")}>{value}</dd>
      </div>
    </div>
  );
}
