"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Bot, CheckCircle2, FileText, History, Loader2, Pencil, Scale, Send, Sparkles, User, XCircle, AlertTriangle } from "lucide-react";
import { StageHeader } from "@/components/common/stage-header";
import { AgentPanel } from "@/components/common/agent-panel";
import { ReasoningSummaryCard } from "@/components/common/reasoning-summary";
import { HumanDecisionBanner } from "@/components/common/human-decision";
import { EmptyState } from "@/components/common/empty-state";
import { Confirm } from "@/components/common/confirm";
import { useGuide } from "@/components/common/guide";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { comparePolicy, editRfxSection, generateRfx, sendRfxForReview } from "@/lib/actions";
import { useApp } from "@/lib/store";
import { cn, formatDateTime } from "@/lib/utils";

export default function RfxPage() {
  const rfx = useApp((s) => s.caseData.rfx);
  const intakeApproved = useApp((s) => s.caseData.intake.decision === "approved");
  const running = useApp((s) => s.running);
  const generating = running.includes("rfx.generate");
  const checking = running.includes("rfx.policy");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const gGen = useGuide("rfx-generate");
  const gPol = useGuide("rfx-policy");
  const gRev = useGuide("rfx-review");

  const hasDraft = rfx.sections.length > 0;
  const statusBadge = {
    not_started: <Badge variant="outline">Not drafted</Badge>,
    draft: <Badge variant="sky">Draft</Badge>,
    in_review: (
      <Badge variant="magenta">
        <Loader2 className="animate-spin" /> In review
      </Badge>
    ),
    approved: (
      <Badge variant="ok">
        <CheckCircle2 /> Approved for release
      </Badge>
    ),
  }[rfx.status];

  return (
    <div className="space-y-6">
      <StageHeader stage="rfx" />

      {!intakeApproved && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-warn-100 bg-warn-50 px-4 py-3 text-[13px] text-navy-800">
          <AlertTriangle className="h-4 w-4 text-warn-500" />
          The demand has not yet been approved. You can explore this stage, but policy requires an approved demand before RFx release.
          <Button variant="outline" size="xs" asChild className="ml-auto">
            <Link href="/case/intake">Go to Demand Intake</Link>
          </Button>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        {/* Document */}
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gold-500" /> Request for Proposal — Enterprise Data Quality & Analytics Platform
              </CardTitle>
              <CardDescription>
                PRC-2026-0147 · {rfx.versions.length ? `Current version ${rfx.versions[rfx.versions.length - 1].version}` : "No version yet"} · Synthetic demo content
              </CardDescription>
            </div>
            {statusBadge}
          </CardHeader>
          <CardContent>
            {generating && (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-5/6" />
                  </div>
                ))}
              </div>
            )}
            {!generating && !hasDraft && (
              <EmptyState icon={FileText} title="No RFx drafted yet" description="The Sourcing / RFx Agent will draft all nine sections from the approved template and the approved demand.">
                <Button onClick={generateRfx} className={gGen}>
                  <Sparkles /> Generate RFx
                </Button>
              </EmptyState>
            )}
            {!generating && hasDraft && (
              <div className="divide-y divide-border/70">
                {rfx.sections.map((s, i) => (
                  <section key={s.id} className="group py-4 first:pt-0 last:pb-0">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <h3 className="flex items-center gap-2 text-[14px] font-semibold text-navy-900">
                        <span className="tabular text-[12px] text-gold-500">{String(i + 1).padStart(2, "0")}</span>
                        {s.title}
                        {s.editedByHuman ? (
                          <Badge variant="magenta">
                            <User /> Human-edited
                          </Badge>
                        ) : (
                          <Badge variant="sky">
                            <Bot /> Agent draft
                          </Badge>
                        )}
                      </h3>
                      {editing !== s.id && (
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => {
                            setEditing(s.id);
                            setDraft(s.content);
                          }}
                          disabled={rfx.status === "in_review"}
                        >
                          <Pencil /> Edit
                        </Button>
                      )}
                    </div>
                    {editing === s.id ? (
                      <div className="space-y-2">
                        <Textarea rows={Math.max(4, s.content.split("\n").length + 1)} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              editRfxSection(s.id, draft);
                              setEditing(null);
                            }}
                            disabled={!draft.trim() || draft === s.content}
                          >
                            Save as new version
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-line text-[13px] leading-relaxed text-navy-700">{s.content}</p>
                    )}
                  </section>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Agent + controls */}
        <div className="space-y-6">
          <AgentPanel
            agentId="sourcing"
            watchTasks={["rfx.generate", "rfx.policy"]}
            actions={
              <>
                <Button onClick={generateRfx} disabled={generating || rfx.status === "in_review" || rfx.status === "approved"} className={gGen} data-testid="rfx-generate">
                  <Sparkles /> {hasDraft ? "Regenerate" : "Generate RFx"}
                </Button>
                <Button variant="outline" onClick={comparePolicy} disabled={!hasDraft || checking} className={gPol} data-testid="rfx-policy">
                  <Scale /> Compare to policy
                </Button>
                <Confirm
                  title="Send RFx for review?"
                  description="The Category Manager will review the draft. The RFx cannot be released to suppliers without human approval."
                  confirmLabel="Send for review"
                  onConfirm={sendRfxForReview}
                >
                  <Button variant="magenta" disabled={!hasDraft || rfx.status !== "draft"} className={gRev} data-testid="rfx-review">
                    <Send /> Send for review
                  </Button>
                </Confirm>
              </>
            }
          >
            {!rfx.reasoning && !generating && !checking && <p className="text-[13px] text-navy-500">Generate the RFx to see the agent&apos;s evidence summary and run the policy comparison.</p>}

            {rfx.policy && !checking && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-[13px] font-semibold text-navy-900">Policy comparison</div>
                  <div className="flex gap-1.5">
                    <Badge variant="ok">{rfx.policy.filter((p) => p.status === "pass").length} pass</Badge>
                    <Badge variant="warn">{rfx.policy.filter((p) => p.status === "warning").length} warnings</Badge>
                  </div>
                </div>
                <ul className="divide-y rounded-xl border">
                  {rfx.policy.map((p) => (
                    <li key={p.ref} className="flex gap-2.5 px-3 py-2">
                      {p.status === "pass" ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok-500" />
                      ) : p.status === "warning" ? (
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn-500" />
                      ) : (
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-risk-500" />
                      )}
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-medium text-navy-900">
                          <span className="mr-1.5 text-gold-600">{p.ref}</span>
                          {p.rule}
                        </div>
                        <div className="text-[12px] text-navy-500">{p.note}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {rfx.reasoning && !generating && <ReasoningSummaryCard reasoning={rfx.policyReasoning ?? rfx.reasoning} dense />}

            {rfx.status === "in_review" && (
              <HumanDecisionBanner title="AWAITING CATEGORY MANAGER REVIEW">Omar Siddiqui (demo persona) has been notified. A simulated response will arrive shortly.</HumanDecisionBanner>
            )}
            {rfx.status === "approved" && (
              <div className="space-y-3">
                <HumanDecisionBanner title="RELEASED BY HUMAN REVIEWER" decided>
                  RFx v1.0 approved by the Category Manager and issued to 4 invited suppliers (simulated).
                </HumanDecisionBanner>
                <Button asChild>
                  <Link href="/case/suppliers">
                    Continue to Supplier Intelligence <ArrowRight />
                  </Link>
                </Button>
              </div>
            )}
          </AgentPanel>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-4 w-4 text-gold-500" /> Version history
              </CardTitle>
              <CardDescription>Every agent draft and human edit is versioned.</CardDescription>
            </CardHeader>
            <CardContent>
              {rfx.versions.length === 0 ? (
                <div className="rounded-lg border border-dashed px-4 py-6 text-center text-[13px] text-navy-500">No versions yet.</div>
              ) : (
                <ol className="space-y-3">
                  {[...rfx.versions].reverse().map((v) => (
                    <li key={v.version + v.timestamp} className="flex gap-3">
                      <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full", v.authorType === "agent" ? "bg-sky-50 text-sky-600" : "bg-magenta-50 text-magenta-600")}>
                        {v.authorType === "agent" ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                      </span>
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-navy-900">
                          {v.version} · <span className="font-normal text-navy-600">{v.note}</span>
                        </div>
                        <div className="text-[11.5px] text-navy-500">
                          {v.author} · {formatDateTime(v.timestamp)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
