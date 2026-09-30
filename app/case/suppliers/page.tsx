"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Building2, CheckCircle2, Columns3, Eye, GitCompareArrows, MapPin, Sparkles, Star } from "lucide-react";
import { SUPPLIERS, SUPPLIER_BY_ID } from "@/data/suppliers";
import { StageHeader } from "@/components/common/stage-header";
import { AgentPanel } from "@/components/common/agent-panel";
import { ReasoningSummaryCard } from "@/components/common/reasoning-summary";
import { HumanDecisionBanner } from "@/components/common/human-decision";
import { RagBadge, RagDot, SeverityBadge } from "@/components/common/status";
import { Confirm } from "@/components/common/confirm";
import { useGuide } from "@/components/common/guide";
import { CreditDisclaimer, SanctionsBadge, Supplier360Dialog } from "@/components/suppliers/supplier-360";
import { PerformanceSparkline } from "@/components/suppliers/sparkline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tip } from "@/components/ui/tooltip";
import { assessSuppliers, confirmShortlist, toggleShortlist } from "@/lib/actions";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Supplier } from "@/types";

export default function SuppliersPage() {
  const sup = useApp((s) => s.caseData.suppliers);
  const running = useApp((s) => s.running.includes("supplier.assess"));
  const [open360, setOpen360] = useState<Supplier | null>(null);
  const [compare, setCompare] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const gAssess = useGuide("suppliers-assess");
  const gConfirm = useGuide("suppliers-confirm");
  const assessed = !!sup.assessment;

  const toggleCompare = (id: string) => setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  return (
    <div className="space-y-6">
      <StageHeader stage="suppliers" />

      <AgentPanel
        agentId="supplier"
        watchTasks={["supplier.assess"]}
        actions={
          <>
            <Button onClick={assessSuppliers} disabled={running || sup.shortlistConfirmed} className={gAssess} data-testid="suppliers-assess">
              <Sparkles /> {assessed ? "Re-run due diligence" : "Run Supplier Intelligence Agent"}
            </Button>
            <Button variant="outline" onClick={() => setCompareOpen(true)} disabled={compare.length < 2}>
              <GitCompareArrows /> Compare suppliers {compare.length > 0 && `(${compare.length})`}
            </Button>
            <span className="text-xs text-navy-500">Tick “Compare” on two or more cards to compare side by side.</span>
          </>
        }
      >
        {!assessed && !running && (
          <p className="text-[13px] text-navy-500">
            Four suppliers responded to the RFx. Run the agent to screen sanctions, review performance history, check conflicts and identify due-diligence gaps. Supplier 360 profiles below are available now.
          </p>
        )}
        {assessed && !running && sup.assessment && (
          <div className="space-y-4">
            <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-sky-700">Recommended shortlist</div>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {sup.assessment.shortlist.map((id) => (
                  <Badge key={id} variant="solid" className="px-2.5 py-1 text-[12px]">
                    <Star className="text-gold-300" /> {SUPPLIER_BY_ID[id].name}
                  </Badge>
                ))}
              </div>
              <p className="mt-2 text-[13px] text-navy-700">{sup.assessment.summary}</p>
              {sup.assessment.excluded.map((e) => (
                <p key={e.supplierId} className="mt-1 text-[12.5px] text-warn-600">
                  <strong>{SUPPLIER_BY_ID[e.supplierId].name}:</strong> {e.reason}
                </p>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
              {SUPPLIERS.map((s) => (
                <div key={s.id} className="rounded-xl border p-3">
                  <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-navy-900">
                    <RagDot rag={s.overall.rag} /> {s.name}
                  </div>
                  <Mini title="Strengths" items={s.strengths.slice(0, 2)} tone="text-ok-600" />
                  <Mini title="Risks" items={s.risks.slice(0, 2)} tone="text-risk-600" />
                  <Mini title="Potential conflicts" items={s.conflicts} tone="text-navy-600" />
                  <Mini title="Due-diligence gaps" items={s.diligenceGaps} tone="text-warn-600" />
                </div>
              ))}
            </div>

            {sup.reasoning && <ReasoningSummaryCard reasoning={sup.reasoning} />}

            {sup.shortlistConfirmed ? (
              <div className="space-y-3">
                <HumanDecisionBanner title="SHORTLIST CONFIRMED BY HUMAN" decided>
                  {sup.shortlist.map((id) => SUPPLIER_BY_ID[id].name).join(", ")} proceed to bid evaluation.
                </HumanDecisionBanner>
                <Button asChild>
                  <Link href="/case/evaluation">
                    Continue to Bid Evaluation <ArrowRight />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-magenta-200 bg-magenta-50 px-4 py-3">
                <div className="min-w-0 flex-1 text-[13px] text-navy-800">
                  <span className="font-bold tracking-[0.12em] text-magenta-600">HUMAN DECISION REQUIRED · </span>
                  Select suppliers using the cards below, then confirm. No supplier is excluded without a human decision.
                </div>
                <Confirm
                  title="Confirm supplier shortlist?"
                  description={
                    <span>
                      Shortlist: <strong>{sup.shortlist.map((id) => SUPPLIER_BY_ID[id].name).join(", ") || "none"}</strong>. Suppliers not shortlisted will be notified by Procurement (not by the agent).
                    </span>
                  }
                  confirmLabel="Confirm shortlist"
                  variant="success"
                  onConfirm={confirmShortlist}
                >
                  <Button variant="success" disabled={sup.shortlist.length === 0} className={gConfirm} data-testid="suppliers-confirm">
                    <CheckCircle2 /> Confirm shortlist ({sup.shortlist.length})
                  </Button>
                </Confirm>
              </div>
            )}
          </div>
        )}
      </AgentPanel>

      {/* Supplier 360 cards */}
      <div>
        <div className="mb-3 flex items-end justify-between gap-2">
          <div>
            <h2 className="text-[17px] font-semibold tracking-tight text-navy-900">Supplier 360</h2>
            <p className="text-[12.5px] text-navy-500">Synthetic supplier profiles — fictional companies created for this demonstration.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
          {SUPPLIERS.map((s) => {
            const shortlisted = sup.shortlist.includes(s.id);
            return (
              <Card key={s.id} className={cn("flex flex-col overflow-hidden transition hover:shadow-lift", shortlisted && assessed && "border-gold-300 ring-1 ring-gold-200")}>
                <div className="border-b bg-gradient-to-br from-[#FBF9F5] to-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-800 text-[12px] font-semibold text-gold-300">{s.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span>
                        <div className="min-w-0">
                          <div className="truncate text-[14.5px] font-semibold text-navy-900">{s.name}</div>
                          <div className="flex items-center gap-1 truncate text-[11.5px] text-navy-500">
                            <MapPin className="h-3 w-3" /> {s.hq}
                          </div>
                        </div>
                      </div>
                    </div>
                    <ScoreRing score={s.overall.score} rag={s.overall.rag} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <RagBadge rag={s.overall.rag}>{s.overall.label}</RagBadge>
                    {shortlisted && assessed && (
                      <Badge variant="gold">
                        <Star /> Shortlist
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex-1 space-y-2.5 p-4 text-[12.5px]">
                  <Row label="Financial stability">
                    <RagBadge rag={s.financialStability.rag}>{s.financialStability.indicator}</RagBadge>
                  </Row>
                  <CreditDisclaimer />
                  <Row label="Compliance">
                    <RagBadge rag={s.compliance.rag}>{s.compliance.status}</RagBadge>
                  </Row>
                  <Row label="Sanctions / compliance check">
                    <SanctionsBadge status={s.sanctionsCheck.status} />
                  </Row>
                  <Row label="Historical performance">
                    <span className="tabular font-medium text-navy-900">{s.historicalPerformance.score ? `${s.historicalPerformance.score} / 5` : "No history"}</span>
                  </Row>
                  <Row label="Delivery on time">
                    <span className="tabular font-medium text-navy-900">{s.deliveryPerformance.onTime ? `${s.deliveryPerformance.onTime}%` : "—"}</span>
                  </Row>
                  <Row label="Contract history">
                    <span className="tabular font-medium text-navy-900">
                      {s.contractHistory.contracts} · {s.contractHistory.totalValue}
                    </span>
                  </Row>
                  <Row label="Relationship exposure">
                    <Tip content={s.relationshipExposure.note}>
                      <span className="cursor-help">
                        <RagBadge rag={s.relationshipExposure.rag}>{s.relationshipExposure.level}</RagBadge>
                      </span>
                    </Tip>
                  </Row>
                  <Row label="Open issues">
                    <span className="font-medium text-navy-900">{s.openIssues.length}</span>
                  </Row>
                  <div>
                    <div className="mb-1 flex items-center justify-between text-navy-500">
                      <span>Data completeness</span>
                      <span className="tabular font-medium text-navy-900">{s.dataCompleteness}%</span>
                    </div>
                    <Progress value={s.dataCompleteness} indicatorClassName={s.dataCompleteness >= 90 ? "bg-ok-500" : s.dataCompleteness >= 75 ? "bg-warn-500" : "bg-risk-500"} />
                  </div>
                  <div>
                    <div className="mb-1 text-navy-500">Relevant experience</div>
                    <div className="line-clamp-2 text-navy-700">{s.relevantExperience.join(" · ")}</div>
                  </div>
                  <div>
                    <div className="mb-1 text-navy-500">Risk indicators</div>
                    <ul className="space-y-1">
                      {s.riskIndicators.map((r) => (
                        <li key={r.label} className="flex items-start justify-between gap-2">
                          <span className="leading-snug text-navy-700">{r.label}</span>
                          <SeverityBadge severity={r.severity} />
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="mb-0.5 text-navy-500">Performance trend</div>
                    <PerformanceSparkline data={s.trend} />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t bg-navy-50/30 px-4 py-3">
                  <Button size="xs" onClick={() => setOpen360(s)}>
                    <Eye /> Open Supplier 360
                  </Button>
                  <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-navy-700">
                    <Checkbox checked={compare.includes(s.id)} onCheckedChange={() => toggleCompare(s.id)} /> Compare
                  </label>
                  <Tip content={!assessed ? "Run the agent before selecting" : sup.shortlistConfirmed ? "Shortlist is confirmed" : "Include in shortlist"}>
                    <label className={cn("ml-auto flex items-center gap-1.5 text-[12px] font-medium text-navy-800", (!assessed || sup.shortlistConfirmed) ? "cursor-not-allowed opacity-50" : "cursor-pointer")}>
                      <Checkbox checked={shortlisted} disabled={!assessed || sup.shortlistConfirmed} onCheckedChange={() => toggleShortlist(s.id)} /> Select
                    </label>
                  </Tip>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <Supplier360Dialog supplier={open360} open={!!open360} onOpenChange={(o) => !o && setOpen360(null)} />

      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Columns3 className="h-5 w-5 text-gold-500" /> Supplier comparison
            </DialogTitle>
            <DialogDescription>Side-by-side Supplier 360 view (synthetic data).</DialogDescription>
          </DialogHeader>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[12.5px]">
              <thead>
                <tr className="border-b">
                  <th className="w-44 py-2 pr-3 text-left text-[11px] font-semibold uppercase tracking-wider text-navy-500">Dimension</th>
                  {compare.map((id) => (
                    <th key={id} className="px-3 py-2 text-left text-[13px] font-semibold text-navy-900">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-gold-500" /> {SUPPLIER_BY_ID[id].name}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {(
                  [
                    ["Overall assessment", (s: Supplier) => <RagBadge rag={s.overall.rag}>{`${s.overall.score} · ${s.overall.label}`}</RagBadge>],
                    ["Financial stability*", (s: Supplier) => <RagBadge rag={s.financialStability.rag}>{s.financialStability.indicator}</RagBadge>],
                    ["Compliance", (s: Supplier) => <RagBadge rag={s.compliance.rag}>{s.compliance.status}</RagBadge>],
                    ["Certifications", (s: Supplier) => s.compliance.certifications.join(", ")],
                    ["Sanctions check", (s: Supplier) => <SanctionsBadge status={s.sanctionsCheck.status} />],
                    ["Historical performance", (s: Supplier) => (s.historicalPerformance.score ? `${s.historicalPerformance.score} / 5` : "No history")],
                    ["On-time delivery", (s: Supplier) => (s.deliveryPerformance.onTime ? `${s.deliveryPerformance.onTime}%` : "—")],
                    ["Contract history", (s: Supplier) => `${s.contractHistory.contracts} contracts · ${s.contractHistory.totalValue}`],
                    ["Relationship exposure", (s: Supplier) => <RagBadge rag={s.relationshipExposure.rag}>{s.relationshipExposure.level}</RagBadge>],
                    ["Open issues", (s: Supplier) => String(s.openIssues.length)],
                    ["Data completeness", (s: Supplier) => `${s.dataCompleteness}%`],
                    ["Key risk", (s: Supplier) => s.risks[0]],
                    ["Diligence gaps", (s: Supplier) => s.diligenceGaps.join("; ")],
                  ] as [string, (s: Supplier) => React.ReactNode][]
                ).map(([label, render]) => (
                  <tr key={label}>
                    <td className="py-2 pr-3 font-medium text-navy-600">{label}</td>
                    {compare.map((id) => (
                      <td key={id} className="px-3 py-2 align-top text-navy-800">
                        {render(SUPPLIER_BY_ID[id])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-navy-500">* External / credit-risk information — where legally permitted and authorised.</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-navy-500">{label}</span>
      {children}
    </div>
  );
}

function Mini({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  return (
    <div className="mb-1.5">
      <div className={cn("text-[10.5px] font-semibold uppercase tracking-wider", tone)}>{title}</div>
      <ul className="text-[12px] leading-snug text-navy-700">
        {items.map((i) => (
          <li key={i}>· {i}</li>
        ))}
      </ul>
    </div>
  );
}

function ScoreRing({ score, rag }: { score: number; rag: "green" | "amber" | "red" }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const color = rag === "green" ? "#1F7A5A" : rag === "amber" ? "#B7791F" : "#B42318";
  return (
    <div className="relative h-[52px] w-[52px] shrink-0">
      <svg width="52" height="52" viewBox="0 0 52 52" className="-rotate-90" aria-hidden>
        <circle cx="26" cy="26" r={r} fill="none" stroke="#EEF1F6" strokeWidth="5" />
        <circle cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} />
      </svg>
      <span className="tabular absolute inset-0 flex items-center justify-center text-[14px] font-semibold text-navy-900">{score}</span>
    </div>
  );
}
