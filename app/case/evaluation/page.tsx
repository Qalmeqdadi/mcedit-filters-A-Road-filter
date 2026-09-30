"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertOctagon, ArrowRight, BadgeDollarSign, CheckCircle2, ClipboardCopy, FileSearch, FileText, Gavel, Lock, Mail, Scale, Sparkles, Trophy, UserCheck } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { BIDS, CRITERIA } from "@/data/evaluation";
import { SUPPLIER_BY_ID, SUPPLIERS } from "@/data/suppliers";
import { StageHeader } from "@/components/common/stage-header";
import { AgentPanel } from "@/components/common/agent-panel";
import { ReasoningSummaryCard } from "@/components/common/reasoning-summary";
import { HumanDecisionBanner } from "@/components/common/human-decision";
import { SeverityBadge } from "@/components/common/status";
import { EmptyState } from "@/components/common/empty-state";
import { ConfidenceMeter } from "@/components/common/confidence";
import { Confirm } from "@/components/common/confirm";
import { useGuide } from "@/components/common/guide";
import { ChartLegend, ChartTooltip } from "@/components/charts/chart-tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { Tip } from "@/components/ui/tooltip";
import { analyseBids, decideAward, detectCommercial, generateBrief, highlightDeviations, identifyMissing } from "@/lib/actions";
import { CHART } from "@/lib/chart";
import { useApp } from "@/lib/store";
import { cn, formatAED, formatDateTime } from "@/lib/utils";
import type { Finding } from "@/types";

export default function EvaluationPage() {
  const ev = useApp((s) => s.caseData.evaluation);
  const sup = useApp((s) => s.caseData.suppliers);
  const running = useApp((s) => s.running);
  const [briefOpen, setBriefOpen] = useState(false);
  const g = {
    analyse: useGuide("eval-analyse"),
    dev: useGuide("eval-deviations"),
    com: useGuide("eval-commercial"),
    brief: useGuide("eval-brief"),
    decide: useGuide("eval-decide"),
  };

  const columns = useMemo(() => (sup.shortlistConfirmed ? sup.shortlist : SUPPLIERS.map((s) => s.id)), [sup]);
  const scores = useMemo(() => (ev.scores ?? []).filter((s) => columns.includes(s.supplierId)), [ev.scores, columns]);
  const ranked = [...scores].sort((a, b) => b.riskAdjusted - a.riskAdjusted);
  const recommended = ranked[0]?.supplierId;
  const [choice, setChoice] = useState<string | null>(null);
  const selected = choice ?? recommended ?? null;
  const [rationale, setRationale] = useState("Highest risk-adjusted score; within budget; strongest security & data-residency posture. Conditions per committee brief.");
  const isRunning = (t: string) => running.includes(t as never);
  const anyRunning = running.some((t) => t.startsWith("evaluation"));

  const chartData = scores.map((s) => ({ name: SUPPLIER_BY_ID[s.supplierId].shortName, Weighted: s.weighted, "Risk-adjusted": s.riskAdjusted }));

  return (
    <div className="space-y-6">
      <StageHeader stage="evaluation" />

      <AgentPanel
        agentId="evaluation"
        watchTasks={["evaluation.analyse", "evaluation.deviations", "evaluation.missing", "evaluation.commercial", "evaluation.brief"]}
        actions={
          <>
            <Button onClick={analyseBids} disabled={anyRunning || !!ev.award} className={g.analyse} data-testid="eval-analyse">
              <Sparkles /> Analyse submissions
            </Button>
            <Button variant="outline" onClick={highlightDeviations} disabled={!ev.scores || anyRunning} className={g.dev}>
              <Scale /> Highlight deviations
            </Button>
            <Button variant="outline" onClick={identifyMissing} disabled={!ev.scores || anyRunning}>
              <FileSearch /> Identify missing responses
            </Button>
            <Button variant="outline" onClick={detectCommercial} disabled={!ev.scores || anyRunning} className={g.com}>
              <BadgeDollarSign /> Detect unusual commercial assumptions
            </Button>
            <Button variant="gold" onClick={generateBrief} disabled={!ev.scores || anyRunning || !!ev.award} className={g.brief} data-testid="eval-brief">
              <FileText /> Generate committee brief
            </Button>
          </>
        }
      >
        {!ev.scores && !isRunning("evaluation.analyse") && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {BIDS.filter((b) => columns.includes(b.supplierId)).map((b) => (
              <div key={b.supplierId} className="flex items-center gap-3 rounded-xl border border-dashed p-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-50 text-navy-500">
                  <Lock className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-[13px] font-medium text-navy-900">{SUPPLIER_BY_ID[b.supplierId].name}</div>
                  <div className="text-[11.5px] text-navy-500">Submission received · sealed (simulated)</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {ev.scoresReasoning && !anyRunning && <ReasoningSummaryCard reasoning={ev.briefReasoning ?? ev.scoresReasoning} dense />}
      </AgentPanel>

      {/* Scoring matrix */}
      <Card>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Bid comparison matrix</CardTitle>
            <CardDescription>Scores 0–10 against published criteria and weightings. Risk adjustment from Supplier 360 due diligence. Synthetic data.</CardDescription>
          </div>
          {!sup.shortlistConfirmed && <Badge variant="warn">Shortlist not yet confirmed — showing all submissions</Badge>}
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {!ev.scores ? (
            <EmptyState icon={Lock} title="Submissions sealed" description="Run the Evaluation Agent to score all submissions consistently against the published criteria.">
              <Button onClick={analyseBids} disabled={anyRunning}>
                <Sparkles /> Analyse submissions
              </Button>
            </EmptyState>
          ) : (
            <table className="w-full min-w-[760px] border-separate border-spacing-0 text-[13px]">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 w-60 bg-white py-2 pr-3 text-left text-[11px] font-semibold uppercase tracking-wider text-navy-500">Criterion (weight)</th>
                  {columns.map((id) => (
                    <th key={id} className={cn("px-3 py-2 text-left", id === recommended && "rounded-t-lg bg-gold-50")}>
                      <div className="text-[13.5px] font-semibold text-navy-900">{SUPPLIER_BY_ID[id].name}</div>
                      {id === recommended ? (
                        <Badge variant="gold" className="mt-1">
                          <Trophy /> Agent recommendation
                        </Badge>
                      ) : (
                        <div className="mt-1 h-5" />
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CRITERIA.map((c) => (
                  <tr key={c.id}>
                    <td className="sticky left-0 z-10 border-t bg-white py-2.5 pr-3">
                      <Tip content={c.description}>
                        <span className="cursor-help font-medium text-navy-800">{c.name}</span>
                      </Tip>
                      <span className="tabular ml-2 text-navy-500">{c.weight}%</span>
                    </td>
                    {columns.map((id) => {
                      const bid = BIDS.find((b) => b.supplierId === id)!;
                      const v = bid.scores[c.id];
                      const note = bid.notes[c.id];
                      return (
                        <td key={id} className={cn("border-t px-3 py-2.5", id === recommended && "bg-gold-50/60")}>
                          <div className="flex items-center gap-2">
                            <span className="tabular w-8 font-semibold text-navy-900">{v.toFixed(1)}</span>
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-navy-50">
                              <div className={cn("h-full rounded-full", v >= 8 ? "bg-ok-500" : v >= 7 ? "bg-sky-500" : "bg-warn-500")} style={{ width: `${v * 10}%` }} />
                            </div>
                          </div>
                          {note && <div className="mt-1 text-[11.5px] leading-snug text-navy-500">{note}</div>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {(
                  [
                    ["Technical score", "technical", "Weighted across technical criteria (85%)"],
                    ["Commercial score", "commercial", "Commercial criterion (15%)"],
                    ["Total weighted score", "weighted", "Sum of weighted criteria"],
                  ] as const
                ).map(([label, key, tip]) => (
                  <tr key={key} className="bg-navy-50/40">
                    <td className="sticky left-0 z-10 border-t bg-[#F6F7FA] py-2.5 pr-3 font-semibold text-navy-900">
                      <Tip content={tip}>
                        <span className="cursor-help">{label}</span>
                      </Tip>
                    </td>
                    {columns.map((id) => {
                      const s = scores.find((x) => x.supplierId === id)!;
                      return (
                        <td key={id} className="tabular border-t px-3 py-2.5 font-semibold text-navy-900">
                          {s[key].toFixed(1)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr>
                  <td className="sticky left-0 z-10 border-t bg-white py-2.5 pr-3 text-navy-700">Risk adjustment</td>
                  {columns.map((id) => (
                    <td key={id} className="tabular border-t px-3 py-2.5 text-risk-600">
                      −{BIDS.find((b) => b.supplierId === id)!.riskAdjustment.toFixed(1)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="sticky left-0 z-10 border-t-2 border-navy-800 bg-white py-3 pr-3 text-[14px] font-bold text-navy-900">Risk-adjusted score</td>
                  {columns.map((id) => {
                    const s = scores.find((x) => x.supplierId === id)!;
                    return (
                      <td key={id} className={cn("border-t-2 border-navy-800 px-3 py-3", id === recommended && "rounded-b-lg bg-gold-50")}>
                        <span className="tabular font-serif text-[22px] font-semibold text-navy-900">{s.riskAdjusted.toFixed(1)}</span>
                        <span className="ml-1.5 text-[11.5px] text-navy-500">#{ranked.findIndex((r) => r.supplierId === id) + 1}</span>
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="sticky left-0 z-10 bg-white py-2 pr-3 text-navy-700">3-year price (excl. VAT)</td>
                  {columns.map((id) => (
                    <td key={id} className="tabular px-3 py-2 text-navy-800">
                      {formatAED(BIDS.find((b) => b.supplierId === id)!.price)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Findings */}
      <div className="grid gap-4 lg:grid-cols-3">
        <FindingsCard title="Deviations" icon={Scale} items={ev.deviations} running={isRunning("evaluation.deviations")} onRun={highlightDeviations} disabled={!ev.scores || anyRunning} cta="Highlight deviations" />
        <FindingsCard title="Missing responses" icon={FileSearch} items={ev.missing} running={isRunning("evaluation.missing")} onRun={identifyMissing} disabled={!ev.scores || anyRunning} cta="Identify missing responses" />
        <FindingsCard title="Unusual commercial assumptions" icon={BadgeDollarSign} items={ev.commercial} running={isRunning("evaluation.commercial")} onRun={detectCommercial} disabled={!ev.scores || anyRunning} cta="Detect anomalies" />
      </div>

      {/* Recommendation & human decision */}
      {ev.scores && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <Card className={cn("border-2", ev.award ? "border-ok-100" : "border-magenta-200")}>
            <div className={cn("rounded-t-[10px] px-5 py-3", ev.award ? "bg-ok-50" : "bg-magenta-500")}>
              <div className={cn("flex items-center gap-2 text-sm font-bold tracking-[0.16em]", ev.award ? "text-ok-600" : "text-white")}>
                <Gavel className="h-4 w-4" /> {ev.award ? "AWARD DECISION RECORDED" : "HUMAN DECISION REQUIRED"}
              </div>
              {!ev.award && <div className="mt-0.5 text-[12.5px] text-magenta-50">The Evaluation Agent recommends. Only the Evaluation Committee can make the award decision.</div>}
            </div>
            <CardContent className="space-y-5 pt-5">
              <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-navy-500">Agent recommendation</div>
                  <div className="mt-1 flex items-center gap-2 text-lg font-semibold text-navy-900">
                    <Trophy className="h-5 w-5 text-gold-500" /> {recommended && SUPPLIER_BY_ID[recommended].name}
                  </div>
                  <div className="text-[13px] text-navy-600">
                    Risk-adjusted {ranked[0]?.riskAdjusted.toFixed(1)} · {ranked[0] && formatAED(ranked[0].price)} (within AED 2.4M estimate)
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-navy-500">Confidence</div>
                  <ConfidenceMeter value={0.86} className="mt-2" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-navy-500">Evidence</div>
                  <ul className="space-y-1 text-[12.5px] text-navy-700">
                    <li>· Highest technical (84.6) and security (8.8) scores</li>
                    <li>· UAE primary & DR hosting; ISO 27001, SOC 2 Type II</li>
                    <li>· 92% on-time delivery in 3 prior ECB engagements</li>
                    <li>· Lowest risk adjustment (−1.5) after due diligence</li>
                  </ul>
                </div>
                <div>
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-navy-500">Key trade-offs</div>
                  <ul className="space-y-1 text-[12.5px] text-navy-700">
                    <li>· Nova is ~AED 370K cheaper but fails data-residency and excludes migration</li>
                    <li>· Gulf Digital has the best architecture but higher concentration & schedule risk</li>
                    <li>· Alpha increases ECB data-spend concentration to ~34%</li>
                  </ul>
                </div>
              </div>

              {ev.award ? (
                <div className="space-y-3">
                  <HumanDecisionBanner title="DECIDED BY THE EVALUATION COMMITTEE" decided>
                    <strong>{SUPPLIER_BY_ID[ev.award.supplierId].name}</strong> — {ev.award.followedRecommendation ? "agent recommendation accepted" : "agent recommendation overridden"}. “{ev.award.rationale}”
                    <div className="mt-1 text-[11.5px] text-navy-500">
                      {ev.award.decidedBy} · {formatDateTime(ev.award.decidedAt)}
                    </div>
                  </HumanDecisionBanner>
                  <Button asChild>
                    <Link href="/case/approvals">
                      Continue to Approval Orchestration <ArrowRight />
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 rounded-xl border bg-[#FCFBF8] p-4">
                  <div className="text-[13px] font-semibold text-navy-900">Committee decision</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {columns.map((id) => (
                      <button
                        key={id}
                        onClick={() => setChoice(id)}
                        className={cn(
                          "flex items-center justify-between rounded-lg border px-3 py-2 text-left text-[13px] transition",
                          selected === id ? "border-navy-800 bg-white ring-2 ring-navy-100" : "bg-white hover:border-navy-200",
                        )}
                      >
                        <span className="font-medium text-navy-900">{SUPPLIER_BY_ID[id].name}</span>
                        <span className="tabular text-navy-500">{scores.find((s) => s.supplierId === id)?.riskAdjusted.toFixed(1)}</span>
                      </button>
                    ))}
                  </div>
                  {selected && selected !== recommended && (
                    <div className="rounded-lg bg-warn-50 px-3 py-2 text-[12.5px] text-warn-600">You are overriding the agent recommendation. A documented rationale is mandatory and will be flagged in the audit trail.</div>
                  )}
                  <Textarea rows={2} value={rationale} onChange={(e) => setRationale(e.target.value)} placeholder="Decision rationale (recorded in audit trail)" />
                  <Confirm
                    title="Record award decision?"
                    description={
                      <span>
                        The Evaluation Committee awards to <strong>{selected && SUPPLIER_BY_ID[selected].name}</strong>. This is a human decision; the agent will prepare the approval pack but cannot change it.
                      </span>
                    }
                    confirmLabel="Record award decision"
                    variant="success"
                    onConfirm={() => selected && decideAward(selected, rationale)}
                  >
                    <Button variant="magenta" disabled={!selected || !rationale.trim()} className={g.decide} data-testid="eval-decide">
                      <UserCheck /> Record committee decision
                    </Button>
                  </Confirm>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Weighted vs risk-adjusted</CardTitle>
                <CardDescription>Score out of 100 · risk adjustment from due diligence</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartLegend
                  items={[
                    { label: "Weighted", color: CHART.series[0] },
                    { label: "Risk-adjusted", color: CHART.series[1] },
                  ]}
                />
                <div className="mt-2 h-[210px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 18, right: 4, left: -20, bottom: 0 }} barGap={2} barCategoryGap="22%">
                      <CartesianGrid vertical={false} stroke={CHART.grid} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: CHART.inkMuted }} axisLine={false} tickLine={false} />
                      <YAxis domain={[50, 90]} tick={{ fontSize: 11, fill: CHART.inkMuted }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: "rgba(58,102,167,0.06)" }} content={<ChartTooltip format={(v) => Number(v).toFixed(1)} />} />
                      <Bar dataKey="Weighted" fill={CHART.series[0]} radius={[4, 4, 0, 0]} maxBarSize={22} />
                      <Bar dataKey="Risk-adjusted" fill={CHART.series[1]} radius={[4, 4, 0, 0]} maxBarSize={22} label={{ position: "top", fontSize: 10.5, fill: CHART.ink, formatter: (v: number) => v.toFixed(1) }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gold-500" /> Committee brief
                </CardTitle>
                <CardDescription>Agent-prepared, human-validated decision document</CardDescription>
              </CardHeader>
              <CardContent>
                {ev.brief ? (
                  <div className="space-y-3">
                    <p className="text-[13px] text-navy-700">{ev.brief.sections[2].body}</p>
                    <Button variant="outline" onClick={() => setBriefOpen(true)}>
                      <FileText /> View committee brief
                    </Button>
                  </div>
                ) : (
                  <EmptyState icon={FileText} title="Brief not generated" description="Generate the committee brief once scoring and findings are complete." className="py-6">
                    <Button size="sm" variant="gold" onClick={generateBrief} disabled={anyRunning}>
                      Generate committee brief
                    </Button>
                  </EmptyState>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <Dialog open={briefOpen} onOpenChange={setBriefOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <Badge variant="gold" className="w-fit">
              Agent-prepared draft · requires committee validation
            </Badge>
            <DialogTitle>{ev.brief?.title}</DialogTitle>
            <DialogDescription>Commercial in Confidence · Synthetic demo content</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {ev.brief?.sections.map((s) => (
              <section key={s.heading}>
                <h4 className="text-[13px] font-semibold text-navy-900">{s.heading}</h4>
                <p className="mt-1 text-[13px] leading-relaxed text-navy-700">{s.body}</p>
              </section>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button
              variant="outline"
              onClick={() => {
                const text = ev.brief ? [ev.brief.title, ...ev.brief.sections.map((s) => `${s.heading}\n${s.body}`)].join("\n\n") : "";
                navigator.clipboard?.writeText(text).then(
                  () => toast.success("Brief copied to clipboard"),
                  () => toast.error("Clipboard not available in this browser"),
                );
              }}
            >
              <ClipboardCopy /> Copy text
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                useApp.getState().log({ actor: "Evaluation Agent", actorType: "agent", action: "Circulated committee brief to 5 committee members", detail: "Simulated email distribution", stage: "evaluation", agentId: "evaluation" });
                toast.success("Brief circulated to committee", { description: "Simulated email to 5 members" });
              }}
            >
              <Mail /> Circulate to committee
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FindingsCard({
  title,
  icon: Icon,
  items,
  running,
  onRun,
  disabled,
  cta,
}: {
  title: string;
  icon: React.ElementType;
  items: Finding[] | null;
  running: boolean;
  onRun: () => void;
  disabled: boolean;
  cta: string;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-gold-500" /> {title}
        </CardTitle>
        {items && <Badge variant={items.length ? "warn" : "ok"}>{items.length} found</Badge>}
      </CardHeader>
      <CardContent>
        {running ? (
          <div className="space-y-2">
            <div className="h-14 animate-pulse rounded-lg bg-navy-50" />
            <div className="h-14 animate-pulse rounded-lg bg-navy-50" />
          </div>
        ) : !items ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-3 py-6 text-center">
            <span className="text-[12.5px] text-navy-500">Not yet analysed</span>
            <Button size="xs" variant="outline" onClick={onRun} disabled={disabled}>
              {cta}
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center gap-2 text-[13px] text-ok-600">
            <CheckCircle2 className="h-4 w-4" /> None found
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((f) => (
              <li key={f.id} className="rounded-lg border px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[12.5px] font-medium text-navy-900">
                    <AlertOctagon className="mr-1 inline h-3.5 w-3.5 text-warn-500" />
                    {f.title}
                  </span>
                  <SeverityBadge severity={f.severity} />
                </div>
                <div className="mt-0.5 text-[11.5px] font-medium text-navy-500">{SUPPLIER_BY_ID[f.supplierId].name}</div>
                <div className="mt-0.5 text-[12px] leading-snug text-navy-600">{f.detail}</div>
                <div className="mt-1 text-[11px] text-gold-600">Source: {f.reference}</div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
