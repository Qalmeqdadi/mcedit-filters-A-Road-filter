"use client";

import { AlertTriangle, Building2, CheckCircle2, CircleSlash, FileWarning, Info, ShieldCheck, ShieldQuestion } from "lucide-react";
import { CREDIT_RISK_DISCLAIMER } from "@/data/suppliers";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RagBadge, SeverityBadge, SyntheticBadge } from "@/components/common/status";
import { PerformanceSparkline } from "@/components/suppliers/sparkline";
import type { Supplier } from "@/types";

export function SanctionsBadge({ status }: { status: Supplier["sanctionsCheck"]["status"] }) {
  if (status === "clear")
    return (
      <Badge variant="ok">
        <ShieldCheck /> Clear
      </Badge>
    );
  if (status === "review")
    return (
      <Badge variant="warn">
        <ShieldQuestion /> Analyst review
      </Badge>
    );
  return (
    <Badge variant="risk">
      <CircleSlash /> Flag
    </Badge>
  );
}

export function CreditDisclaimer() {
  return (
    <div className="flex items-start gap-1.5 rounded-md bg-gold-50 px-2 py-1 text-[10.5px] leading-snug text-gold-700">
      <Info className="mt-px h-3 w-3 shrink-0" />
      {CREDIT_RISK_DISCLAIMER}
    </div>
  );
}

export function Supplier360Dialog({ supplier, open, onOpenChange }: { supplier: Supplier | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  if (!supplier) return null;
  const s = supplier;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <SyntheticBadge />
            <RagBadge rag={s.overall.rag}>{s.overall.label}</RagBadge>
          </div>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Building2 className="h-5 w-5 text-gold-500" /> Supplier 360 — {s.name}
          </DialogTitle>
          <DialogDescription>
            {s.tagline} · {s.hq} · Founded {s.founded} · {s.employees} employees
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview">
          <TabsList className="flex h-auto flex-wrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="risk">Risk & compliance</TabsTrigger>
            <TabsTrigger value="relationship">Relationship</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Tile label="Overall assessment" value={`${s.overall.score} / 100`} />
              <Tile label="Data completeness" value={`${s.dataCompleteness}%`} />
              <Tile label="Prior ECB contracts" value={`${s.contractHistory.contracts} · ${s.contractHistory.totalValue}`} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <ListBlock title="Strengths" items={s.strengths} tone="ok" />
              <ListBlock title="Risks" items={s.risks} tone="risk" />
              <ListBlock title="Relevant experience" items={s.relevantExperience} />
              <ListBlock title="Due-diligence gaps" items={s.diligenceGaps} tone="warn" />
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Tile label="Historical performance" value={s.historicalPerformance.score ? `${s.historicalPerformance.score} / 5` : "n/a"} sub={s.historicalPerformance.note} />
              <Tile label="On-time delivery" value={s.deliveryPerformance.onTime ? `${s.deliveryPerformance.onTime}%` : "n/a"} sub={s.deliveryPerformance.note} />
              <Tile label="Last engagement" value={s.contractHistory.lastEngagement} />
            </div>
            <div className="rounded-xl border p-4">
              <div className="mb-1 text-[12px] font-medium text-navy-600">Supplier performance index — last 8 quarters (synthetic)</div>
              <PerformanceSparkline data={s.trend} height={120} />
            </div>
          </TabsContent>

          <TabsContent value="risk" className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border p-3">
                <div className="text-[11.5px] text-navy-500">Financial stability indicator</div>
                <div className="mt-1 flex items-center gap-2">
                  <RagBadge rag={s.financialStability.rag}>{s.financialStability.indicator}</RagBadge>
                </div>
                <p className="mt-1.5 text-[12.5px] text-navy-700">{s.financialStability.note}</p>
                <div className="mt-2">
                  <CreditDisclaimer />
                </div>
              </div>
              <div className="rounded-xl border p-3">
                <div className="text-[11.5px] text-navy-500">Sanctions / compliance screening</div>
                <div className="mt-1">
                  <SanctionsBadge status={s.sanctionsCheck.status} />
                </div>
                <p className="mt-1.5 text-[12.5px] text-navy-700">{s.sanctionsCheck.lists}</p>
                <p className="text-[11.5px] text-navy-500">Screened {s.sanctionsCheck.screenedAt} (simulated)</p>
              </div>
            </div>
            <div className="rounded-xl border p-3">
              <div className="mb-2 text-[11.5px] text-navy-500">Compliance status</div>
              <div className="flex flex-wrap items-center gap-1.5">
                <RagBadge rag={s.compliance.rag}>{s.compliance.status}</RagBadge>
                {s.compliance.certifications.map((c) => (
                  <Badge key={c} variant="outline">
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-2 text-[12px] font-semibold text-navy-900">Risk indicators</div>
                <ul className="space-y-1.5">
                  {s.riskIndicators.map((r) => (
                    <li key={r.label} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-[12.5px]">
                      {r.label} <SeverityBadge severity={r.severity} />
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="mb-2 text-[12px] font-semibold text-navy-900">Open issues</div>
                {s.openIssues.length === 0 ? (
                  <div className="rounded-lg border border-dashed px-3 py-4 text-center text-[12.5px] text-navy-500">No open issues</div>
                ) : (
                  <ul className="space-y-1.5">
                    {s.openIssues.map((o) => (
                      <li key={o.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-[12.5px]">
                        <span>
                          <span className="mr-1 font-medium text-navy-500">{o.id}</span> {o.title}
                        </span>
                        <SeverityBadge severity={o.severity} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <ListBlock title="Potential conflicts" items={s.conflicts} tone={s.conflicts[0]?.startsWith("None") ? undefined : "risk"} />
          </TabsContent>

          <TabsContent value="relationship" className="space-y-4">
            <div className="rounded-xl border p-4">
              <div className="text-[11.5px] text-navy-500">Relationship exposure</div>
              <div className="mt-1">
                <RagBadge rag={s.relationshipExposure.rag}>{s.relationshipExposure.level}</RagBadge>
              </div>
              <p className="mt-2 text-[13px] text-navy-700">{s.relationshipExposure.note}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Tile label="Contracts with ECB" value={String(s.contractHistory.contracts)} />
              <Tile label="Total historical value" value={s.contractHistory.totalValue} />
              <Tile label="Data completeness" value={`${s.dataCompleteness}%`} />
            </div>
            <Progress value={s.dataCompleteness} indicatorClassName={s.dataCompleteness >= 90 ? "bg-ok-500" : s.dataCompleteness >= 75 ? "bg-warn-500" : "bg-risk-500"} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border p-3">
      <div className="text-[11.5px] text-navy-500">{label}</div>
      <div className="tabular mt-0.5 text-[15px] font-semibold text-navy-900">{value}</div>
      {sub && <div className="mt-0.5 text-[11.5px] leading-snug text-navy-500">{sub}</div>}
    </div>
  );
}

function ListBlock({ title, items, tone }: { title: string; items: string[]; tone?: "ok" | "risk" | "warn" }) {
  const Icon = tone === "ok" ? CheckCircle2 : tone === "risk" ? AlertTriangle : tone === "warn" ? FileWarning : Info;
  const color = tone === "ok" ? "text-ok-500" : tone === "risk" ? "text-risk-500" : tone === "warn" ? "text-warn-500" : "text-navy-400";
  return (
    <div>
      <div className="mb-1.5 text-[12px] font-semibold text-navy-900">{title}</div>
      <ul className="space-y-1">
        {items.map((i) => (
          <li key={i} className="flex gap-2 text-[12.5px] leading-snug text-navy-700">
            <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${color}`} /> {i}
          </li>
        ))}
      </ul>
    </div>
  );
}
