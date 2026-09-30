"use client";

import Link from "next/link";
import { ArrowRight, Ban, CheckCircle2, Eye, Fingerprint, Lock, PauseCircle, PlayCircle, ShieldAlert, ShieldCheck, Tags, UserCheck } from "lucide-react";
import { AGENTS } from "@/data/agents";
import { APPROVAL_THRESHOLDS, DATA_CLASSES, GLOBAL_PROHIBITED } from "@/data/governance";
import { DEMO_USER } from "@/data/case";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AgentStatusBadge } from "@/components/common/status";
import { Confirm } from "@/components/common/confirm";
import { pauseAgent, pauseAllAgents, resumeAgent, resumeAllAgents } from "@/lib/actions";
import { useApp } from "@/lib/store";
import { cn, formatTime } from "@/lib/utils";

export function AiControlSheet() {
  const open = useApp((s) => s.aiControlOpen);
  const setOpen = useApp((s) => s.setAiControlOpen);
  const agents = useApp((s) => s.agents);
  const audit = useApp((s) => s.audit);
  const paused = Object.values(agents).filter((a) => a.status === "paused").length;
  const blocked = audit.filter((a) => a.action.startsWith("Blocked")).length;
  const agentActions = audit.filter((a) => a.actorType === "agent").length;
  const humanDecisions = audit.filter((a) => a.actorType === "human").length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="sm:max-w-[560px]">
        <div className="border-b bg-navy-900 px-6 pb-5 pt-6 text-white">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-300">
            <ShieldCheck className="h-4 w-4" /> Persistent AI Control layer
          </div>
          <SheetTitle className="mt-1 text-xl font-semibold tracking-tight">AI Control</SheetTitle>
          <SheetDescription className="mt-1 text-[13px] text-navy-200">
            Identity, permissions, human-approval thresholds and a kill-switch for every agent — available from any screen.
          </SheetDescription>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Stat label="Agents paused" value={paused} tone={paused ? "risk" : "ok"} />
            <Stat label="Agent actions" value={agentActions} />
            <Stat label="Blocked by policy" value={blocked} tone={blocked ? "warn" : undefined} />
          </div>
        </div>

        <div className="scrollbar-thin flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <Block icon={PauseCircle} title="Agent intervention">
            <div className="mb-3 flex flex-wrap gap-2">
              <Confirm
                title="Pause all agents?"
                description="Global kill-switch: every agent stops acting immediately. Human users can continue to work. This is recorded in the audit trail."
                confirmLabel="Pause all agents"
                variant="destructive"
                onConfirm={pauseAllAgents}
              >
                <Button size="sm" variant="outline-destructive">
                  <Ban /> Pause all (kill-switch)
                </Button>
              </Confirm>
              <Button size="sm" variant="outline" onClick={resumeAllAgents} disabled={paused === 0}>
                <PlayCircle /> Resume all
              </Button>
            </div>
            <ul className="divide-y rounded-xl border">
              {AGENTS.map((a) => {
                const rt = agents[a.id];
                return (
                  <li key={a.id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium text-navy-900">{a.name}</div>
                      <div className="truncate text-[11.5px] text-navy-500">{rt.currentTask}</div>
                    </div>
                    <AgentStatusBadge status={rt.status} />
                    {rt.status === "paused" ? (
                      <Button size="xs" variant="outline" onClick={() => resumeAgent(a.id)}>
                        Resume
                      </Button>
                    ) : (
                      <Button size="xs" variant="outline-destructive" onClick={() => pauseAgent(a.id)}>
                        Pause
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </Block>

          <Block icon={Fingerprint} title="Identity & role-based access">
            <div className="rounded-xl border bg-navy-50/40 p-3 text-[13px] text-navy-700">
              <div>
                Human session: <span className="font-medium text-navy-900">{DEMO_USER.name}</span> · role <code className="rounded bg-white px-1 text-[12px]">procurement.lead</code>
              </div>
              <div className="mt-1">
                Agents act under dedicated service identities (<code className="rounded bg-white px-1 text-[12px]">svc-agent-*</code>) with least-privilege scopes. RBAC-ready: authentication is disabled for this demo.
              </div>
            </div>
          </Block>

          <Block icon={CheckCircle2} title="Allowed vs prohibited actions">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-ok-100 bg-ok-50/50 p-3">
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ok-600">Agents may</div>
                <ul className="space-y-1 text-[12.5px] text-navy-700">
                  <li>Read scoped systems of record</li>
                  <li>Draft, classify, score, extract</li>
                  <li>Recommend with evidence</li>
                  <li>Send reminders & raise alerts</li>
                </ul>
              </div>
              <div className="rounded-xl border border-risk-100 bg-risk-50/50 p-3">
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-risk-600">Agents may never</div>
                <ul className="space-y-1 text-[12.5px] text-navy-700">
                  {GLOBAL_PROHIBITED.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Block>

          <Block icon={UserCheck} title="Human approval thresholds">
            <ul className="divide-y rounded-xl border">
              {APPROVAL_THRESHOLDS.map((t) => (
                <li key={t.action} className="flex items-center justify-between gap-3 px-3 py-2 text-[12.5px]">
                  <span className="text-navy-700">{t.action}</span>
                  <span className="flex items-center gap-1.5 text-right font-medium text-navy-900">
                    {t.locked && <Lock className="h-3 w-3 text-gold-500" />}
                    {t.gate}
                  </span>
                </li>
              ))}
            </ul>
          </Block>

          <Block icon={Tags} title="Data classification">
            <div className="flex flex-wrap gap-1.5">
              {DATA_CLASSES.map((d) => (
                <Badge key={d.level} variant={d.level === "Public" ? "outline" : d.level === "Internal" ? "sky" : "gold"}>
                  {d.level}
                </Badge>
              ))}
            </div>
            <p className="mt-2 text-[12px] text-navy-500">Confidential data processed in UAE-resident services only; sensitive fields masked in logs.</p>
          </Block>

          <Block icon={Eye} title="Monitoring & audit trail">
            <div className="mb-2 grid grid-cols-2 gap-2 text-[12.5px]">
              <div className="rounded-lg border px-3 py-2">
                <div className="text-navy-500">Human decisions logged</div>
                <div className="tabular text-lg font-semibold text-navy-900">{humanDecisions}</div>
              </div>
              <div className="rounded-lg border px-3 py-2">
                <div className="text-navy-500">Policy violations</div>
                <div className="tabular text-lg font-semibold text-ok-600">0</div>
              </div>
            </div>
            <ul className="space-y-1.5">
              {audit.slice(0, 5).map((e) => (
                <li key={e.id} className="flex gap-2 text-[12.5px]">
                  <span className="tabular w-11 shrink-0 text-navy-400">{formatTime(e.timestamp)}</span>
                  <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", e.actorType === "agent" ? "bg-sky-500" : e.actorType === "human" ? "bg-magenta-500" : "bg-navy-300")} />
                  <span className="text-navy-700">
                    <span className="font-medium text-navy-900">{e.actor}</span> — {e.action}
                  </span>
                </li>
              ))}
            </ul>
          </Block>
        </div>

        <div className="flex flex-wrap gap-2 border-t bg-white px-6 py-3">
          <Button size="sm" asChild onClick={() => setOpen(false)}>
            <Link href="/governance">
              <ShieldAlert /> Full governance console <ArrowRight />
            </Link>
          </Button>
          <Button size="sm" variant="outline" asChild onClick={() => setOpen(false)}>
            <Link href="/audit">View audit trail</Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "ok" | "warn" | "risk" }) {
  return (
    <div className="rounded-lg bg-navy-800 px-3 py-2">
      <div className={cn("tabular text-xl font-semibold", tone === "risk" && "text-risk-100", tone === "warn" && "text-warn-100", tone === "ok" && "text-ok-100")}>{value}</div>
      <div className="text-[11px] text-navy-200">{label}</div>
    </div>
  );
}

function Block({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-navy-900">
        <Icon className="h-4 w-4 text-gold-500" /> {title}
      </h3>
      {children}
    </section>
  );
}
