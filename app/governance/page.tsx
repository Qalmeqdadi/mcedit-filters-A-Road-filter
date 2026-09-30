"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Ban, Bot, CheckCircle2, Eye, FileClock, Fingerprint, KeyRound, ListChecks, Lock, PauseCircle, PlayCircle, Power, ShieldCheck, ShieldX, Tags, Undo2, UserCheck, Users } from "lucide-react";
import { AGENTS, AGENT_BY_ID } from "@/data/agents";
import { APPROVAL_THRESHOLDS, DATA_CLASSES, GLOBAL_PROHIBITED, LOCKED_HUMAN_GATES, RBAC_ROLES } from "@/data/governance";
import { PageHeader } from "@/components/common/page-header";
import { AgentStatusBadge } from "@/components/common/status";
import { Confirm } from "@/components/common/confirm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tip } from "@/components/ui/tooltip";
import { pauseAgent, pauseAllAgents, restorePermission, resumeAgent, resumeAllAgents, revokePermission, setRequireHuman } from "@/lib/actions";
import { TASK_LABEL, TASK_PERMISSION } from "@/lib/agent-runner";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { AgentId, AgentTask } from "@/types";

const PILLARS = [
  { icon: Fingerprint, label: "Identity", text: "Service identity per agent" },
  { icon: Users, label: "Role-based access", text: "6 roles, least privilege" },
  { icon: CheckCircle2, label: "Allowed actions", text: "Read · draft · analyse · notify" },
  { icon: ShieldX, label: "Prohibited actions", text: `${GLOBAL_PROHIBITED.length} hard prohibitions` },
  { icon: UserCheck, label: "Human approval thresholds", text: `${APPROVAL_THRESHOLDS.length} gates, 4 locked` },
  { icon: Tags, label: "Data classification", text: `${DATA_CLASSES.length} levels enforced` },
  { icon: FileClock, label: "Audit trail", text: "Immutable, every action" },
  { icon: Eye, label: "Monitoring", text: "Confidence & policy checks" },
  { icon: KeyRound, label: "Agent intervention", text: "Revoke / require approval" },
  { icon: Power, label: "Kill / pause control", text: "Per agent & global" },
];

const TASK_PREFIX: Record<AgentId, string> = {
  demand: "intake",
  sourcing: "rfx",
  supplier: "supplier",
  evaluation: "evaluation",
  approval: "approval",
  contract: "contract",
  monitoring: "monitoring",
};

function GovernanceInner() {
  const params = useSearchParams();
  const initial = (params.get("agent") as AgentId) || "demand";
  const [sel, setSel] = useState<AgentId>(AGENT_BY_ID[initial] ? initial : "demand");
  const agents = useApp((s) => s.agents);
  const audit = useApp((s) => s.audit);
  const a = AGENT_BY_ID[sel];
  const rt = agents[sel];
  const locked = LOCKED_HUMAN_GATES.has(sel);
  const blocked = audit.filter((e) => e.action.startsWith("Blocked")).length;
  const overrides = audit.filter((e) => e.detail?.startsWith("Overrode")).length;
  const interventions = audit.filter((e) => e.stage === "governance" && e.actorType === "human").length;
  const paused = Object.values(agents).filter((x) => x.status === "paused").length;
  const tasksFor = (perm: string) =>
    (Object.keys(TASK_PERMISSION) as AgentTask[]).filter((t) => TASK_PERMISSION[t] === perm && t.startsWith(`${TASK_PREFIX[sel]}.`));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI Control"
        title="Governance & Controls"
        description="How agent autonomy is bounded: identity, role-based access, allowed and prohibited actions, human-approval thresholds, data classification, audit, monitoring and intervention."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/audit">
                <FileClock /> View Audit Trail
              </Link>
            </Button>
            {paused > 0 ? (
              <Button variant="outline" onClick={resumeAllAgents}>
                <PlayCircle /> Resume all
              </Button>
            ) : (
              <Confirm title="Engage global kill-switch?" description="Every agent stops acting immediately. Humans can continue working." confirmLabel="Pause all agents" variant="destructive" onConfirm={pauseAllAgents}>
                <Button variant="destructive">
                  <Power /> Global kill-switch
                </Button>
              </Confirm>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {PILLARS.map((p) => (
          <Card key={p.label} className="p-3.5">
            <div className="flex items-center justify-between">
              <p.icon className="h-4 w-4 text-gold-500" />
              <Badge variant="ok" className="text-[10px]">
                Enforced
              </Badge>
            </div>
            <div className="mt-2 text-[13px] font-semibold text-navy-900">{p.label}</div>
            <div className="text-[11.5px] text-navy-500">{p.text}</div>
          </Card>
        ))}
      </div>

      {/* Agent control console */}
      <Card>
        <CardHeader>
          <CardTitle>Agent control console</CardTitle>
          <CardDescription>Pause an agent, revoke a permission or require human approval — the effect is immediate and audited. Try revoking a permission, then run that agent.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <ul className="space-y-1">
            {AGENTS.map((ag) => (
              <li key={ag.id}>
                <button
                  onClick={() => setSel(ag.id)}
                  className={cn("flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition", sel === ag.id ? "bg-navy-800 text-white" : "hover:bg-navy-50")}
                >
                  <Bot className={cn("h-4 w-4", sel === ag.id ? "text-gold-300" : "text-navy-400")} />
                  <span className="flex-1 truncate font-medium">{ag.name}</span>
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      agents[ag.id].status === "paused" ? "bg-risk-500" : agents[ag.id].revokedPermissions.length ? "bg-warn-500" : agents[ag.id].status === "idle" ? "bg-navy-200" : "bg-ok-500",
                    )}
                  />
                </button>
              </li>
            ))}
          </ul>

          <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border bg-navy-50/40 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[16px] font-semibold text-navy-900">{a.name}</span>
                  <AgentStatusBadge status={rt.status} />
                </div>
                <div className="mt-0.5 text-[12.5px] text-navy-600">{a.mission}</div>
                <div className="mt-2 flex flex-wrap gap-3 text-[12px] text-navy-600">
                  <span>
                    Identity: <code className="rounded bg-white px-1.5 py-0.5 text-[11.5px] text-navy-900 ring-1 ring-border">{a.identity}</code>
                  </span>
                  <span>
                    Data classification: <Badge variant="gold">{a.dataClassification}</Badge>
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {rt.status === "paused" ? (
                  <Button variant="success" size="sm" onClick={() => resumeAgent(sel)}>
                    <PlayCircle /> Resume Agent
                  </Button>
                ) : (
                  <Confirm title={`Pause ${a.name}?`} description="The agent stops all autonomous actions until resumed. Attempts to run it will be blocked and logged." confirmLabel="Pause Agent" variant="destructive" onConfirm={() => pauseAgent(sel)}>
                    <Button variant="destructive" size="sm">
                      <PauseCircle /> Pause Agent
                    </Button>
                  </Confirm>
                )}
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/audit?agent=${sel}`}>
                    <FileClock /> View Audit Trail
                  </Link>
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
              <div>
                <div className="flex items-center gap-2 text-[13.5px] font-semibold text-navy-900">
                  <UserCheck className="h-4 w-4 text-magenta-500" /> Require Human Approval
                  {locked && (
                    <Tip content="Locked by policy: this decision class always requires a human.">
                      <Badge variant="gold" className="cursor-help">
                        <Lock /> Locked by policy
                      </Badge>
                    </Tip>
                  )}
                </div>
                <div className="mt-0.5 text-[12.5px] text-navy-600">{a.humanApproval}</div>
              </div>
              {locked ? (
                <Switch checked disabled aria-label="Require human approval (locked)" />
              ) : rt.requireHumanApproval ? (
                <Confirm
                  title="Relax the human-approval gate?"
                  description={`${a.name} outputs would be accepted without explicit sign-off. For this PoV this is shown to demonstrate configurability — production policy would require a risk-owner approval.`}
                  confirmLabel="Relax gate"
                  variant="destructive"
                  onConfirm={() => setRequireHuman(sel, false)}
                >
                  <Switch checked aria-label="Require human approval" />
                </Confirm>
              ) : (
                <Switch checked={false} onCheckedChange={() => setRequireHuman(sel, true)} aria-label="Require human approval" />
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-ok-600">
                  <ListChecks className="h-3.5 w-3.5" /> Allowed actions (permissions)
                </div>
                <ul className="divide-y rounded-xl border">
                  {a.permissions.map((p) => {
                    const revoked = rt.revokedPermissions.includes(p);
                    const tasks = tasksFor(p);
                    return (
                      <li key={p} className="flex items-center gap-3 px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <div className={cn("text-[13px] font-medium", revoked ? "text-risk-600 line-through" : "text-navy-900")}>{p}</div>
                          {tasks.length > 0 && <div className="text-[11px] text-navy-500">Used by: {tasks.map((t) => TASK_LABEL[t]).join(", ")}</div>}
                        </div>
                        {revoked ? (
                          <Button size="xs" variant="outline" onClick={() => restorePermission(sel, p)}>
                            <Undo2 /> Restore
                          </Button>
                        ) : (
                          <Confirm title="Revoke Permission?" description={`${a.name} will immediately lose “${p}”. Any task requiring it will be blocked and logged.`} confirmLabel="Revoke Permission" variant="destructive" onConfirm={() => revokePermission(sel, p)}>
                            <Button size="xs" variant="outline-destructive">
                              <Ban /> Revoke
                            </Button>
                          </Confirm>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-risk-600">
                    <ShieldX className="h-3.5 w-3.5" /> Prohibited actions
                  </div>
                  <ul className="space-y-1.5 rounded-xl border border-risk-100 bg-risk-50/40 p-3">
                    {a.prohibited.map((p) => (
                      <li key={p} className="flex items-center gap-2 text-[12.5px] text-navy-800">
                        <Ban className="h-3.5 w-3.5 text-risk-500" /> {p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-navy-500">Systems accessed</div>
                  <div className="flex flex-wrap gap-1.5">
                    {a.systems.map((s) => (
                      <Badge key={s} variant="sky">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gold-500" /> Role-based access (RBAC-ready)
            </CardTitle>
            <CardDescription>Authentication is disabled in this demo; the model is designed for enterprise IdP integration.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[560px] text-[12.5px]">
              <thead>
                <tr className="border-y bg-navy-50/40 text-left text-[11px] uppercase tracking-wider text-navy-500">
                  <th className="px-5 py-2 font-semibold">Role</th>
                  <th className="px-3 py-2 font-semibold">Can</th>
                  <th className="px-5 py-2 font-semibold">Cannot</th>
                </tr>
              </thead>
              <tbody>
                {RBAC_ROLES.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="px-5 py-2.5">
                      <div className="font-medium text-navy-900">{r.role}</div>
                      <code className="text-[11px] text-navy-500">{r.id}</code>
                    </td>
                    <td className="px-3 py-2.5 text-navy-700">{r.can.join(" · ")}</td>
                    <td className="px-5 py-2.5 text-risk-600">{r.cannot.join(" · ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-magenta-500" /> Human approval thresholds
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y border-t">
                {APPROVAL_THRESHOLDS.map((t) => (
                  <li key={t.action} className="flex items-center justify-between gap-3 px-5 py-2.5 text-[12.5px]">
                    <span className="text-navy-700">{t.action}</span>
                    <span className="flex items-center gap-1.5 text-right font-medium text-navy-900">
                      {t.locked && <Lock className="h-3 w-3 text-gold-500" />} {t.gate}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tags className="h-4 w-4 text-gold-500" /> Data classification
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y border-t">
                {DATA_CLASSES.map((d) => (
                  <li key={d.level} className="grid grid-cols-[140px_1fr] gap-3 px-5 py-2.5 text-[12.5px] sm:grid-cols-[170px_1fr_1fr]">
                    <span className="font-medium text-navy-900">{d.level}</span>
                    <span className="text-navy-700">{d.handling}</span>
                    <span className="hidden text-navy-500 sm:block">{d.agents}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-ok-500" /> Monitoring & guardrails
          </CardTitle>
          <CardDescription>Live counters from this demo session</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { l: "Actions blocked by policy", v: blocked },
            { l: "Human overrides of agent advice", v: overrides },
            { l: "Human interventions (AI Control)", v: interventions },
            { l: "Agents currently paused", v: paused },
          ].map((x) => (
            <div key={x.l} className="rounded-xl bg-navy-50/60 p-4">
              <div className="tabular font-serif text-3xl font-semibold text-navy-900">{x.v}</div>
              <div className="text-[12px] text-navy-500">{x.l}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function GovernancePage() {
  return (
    <Suspense fallback={null}>
      <GovernanceInner />
    </Suspense>
  );
}
