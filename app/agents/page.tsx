"use client";

import Link from "next/link";
import { Ban, Bot, Database, FileClock, Lock, PauseCircle, PlayCircle, Radio, Settings2, UserCheck } from "lucide-react";
import { AGENTS } from "@/data/agents";
import { STAGE_BY_ID } from "@/data/stages";
import { PageHeader } from "@/components/common/page-header";
import { AgentStatusBadge } from "@/components/common/status";
import { ConfidenceMeter } from "@/components/common/confidence";
import { Confirm } from "@/components/common/confirm";
import { ActivityFeed } from "@/components/governance/activity-feed";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tip } from "@/components/ui/tooltip";
import { pauseAgent, pauseAllAgents, resumeAgent, resumeAllAgents } from "@/lib/actions";
import { useApp } from "@/lib/store";
import { cn, relativeTime } from "@/lib/utils";
import { getAgentProvider } from "@/services/agent-service";

export default function AgentsPage() {
  const agents = useApp((s) => s.agents);
  const audit = useApp((s) => s.audit);
  const setAiControlOpen = useApp((s) => s.setAiControlOpen);
  const list = Object.values(agents);
  const paused = list.filter((a) => a.status === "paused").length;
  const stats = [
    { label: "Specialist agents", value: AGENTS.length },
    { label: "Active / working", value: list.filter((a) => a.status === "active" || a.status === "running").length },
    { label: "Paused", value: paused },
    { label: "Agent actions (case)", value: audit.filter((a) => a.actorType === "agent").length },
    { label: "Human decisions (case)", value: audit.filter((a) => a.actorType === "human").length },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Governance"
        title="AI Control & Agent Activity"
        description="Seven specialist agents, each with a least-privilege identity, scoped permissions, named systems and a defined human-approval gate."
        actions={
          <>
            <Button variant="outline" onClick={() => setAiControlOpen(true)}>
              <Settings2 /> Open AI Control
            </Button>
            {paused > 0 ? (
              <Button variant="outline" onClick={resumeAllAgents}>
                <PlayCircle /> Resume all
              </Button>
            ) : (
              <Confirm title="Pause all agents?" description="Global kill-switch: all agents stop acting immediately. Humans can continue." confirmLabel="Pause all agents" variant="destructive" onConfirm={pauseAllAgents}>
                <Button variant="outline-destructive">
                  <Ban /> Pause all agents
                </Button>
              </Confirm>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <div className="text-[12px] text-navy-500">{s.label}</div>
            <div className={cn("tabular mt-1 font-serif text-[26px] font-semibold", s.label === "Paused" && s.value > 0 ? "text-risk-600" : "text-navy-900")}>{s.value}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
        <div className="grid gap-4 lg:grid-cols-2">
          {AGENTS.map((a) => {
            const rt = agents[a.id];
            const stage = STAGE_BY_ID[a.stage];
            return (
              <Card key={a.id} className={cn("flex flex-col", rt.status === "paused" && "border-risk-100 bg-risk-50/20")}>
                <div className="flex items-start justify-between gap-3 border-b p-4">
                  <div className="flex min-w-0 gap-3">
                    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", rt.status === "paused" ? "bg-risk-500 text-white" : "bg-navy-800 text-gold-300")}>
                      <Bot className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-[14.5px] font-semibold text-navy-900">{a.name}</div>
                      <Link href={stage.route} className="text-[12px] text-navy-500 hover:text-navy-800 hover:underline">
                        Stage {stage.number} · {stage.name}
                      </Link>
                    </div>
                  </div>
                  <AgentStatusBadge status={rt.status} />
                </div>
                <div className="flex-1 space-y-3 p-4 text-[12.5px]">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-navy-400">Current task</div>
                    <div className="mt-0.5 font-medium text-navy-900">{rt.currentTask}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-navy-400">Last action</div>
                    <div className="mt-0.5 line-clamp-2 text-navy-700">{rt.lastAction}</div>
                    {rt.lastActionAt && <div className="text-[11px] text-navy-400">{relativeTime(rt.lastActionAt)}</div>}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-navy-400">Confidence</span>
                    {rt.confidence !== null ? <ConfidenceMeter value={rt.confidence} /> : <span className="text-navy-400">—</span>}
                  </div>
                  <div>
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-navy-400">Permissions</div>
                    <div className="flex flex-wrap gap-1">
                      {a.permissions.map((p) => {
                        const revoked = rt.revokedPermissions.includes(p);
                        return (
                          <Badge key={p} variant={revoked ? "risk" : "outline"} className={cn("whitespace-normal text-left", revoked && "line-through")}>
                            {revoked ? <Ban /> : <Lock className="text-gold-500" />} {p}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-navy-400">Systems accessed</div>
                    <div className="flex flex-wrap gap-1">
                      {a.systems.map((s) => (
                        <Badge key={s} variant="sky" className="whitespace-normal text-left">
                          <Database /> {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 rounded-lg bg-magenta-50/70 px-3 py-2 text-magenta-600">
                    <UserCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span className="text-[12px] font-medium">{a.humanApproval}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 border-t px-4 py-3">
                  {rt.status === "paused" ? (
                    <Button size="xs" variant="outline" onClick={() => resumeAgent(a.id)}>
                      <PlayCircle /> Resume
                    </Button>
                  ) : (
                    <Button size="xs" variant="outline-destructive" onClick={() => pauseAgent(a.id)}>
                      <PauseCircle /> Pause agent
                    </Button>
                  )}
                  <Button size="xs" variant="outline" asChild>
                    <Link href={`/governance?agent=${a.id}`}>
                      <Settings2 /> Manage controls
                    </Link>
                  </Button>
                  <Button size="xs" variant="ghost" asChild>
                    <Link href={`/audit?agent=${a.id}`}>
                      <FileClock /> Audit
                    </Link>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="h-fit xl:sticky xl:top-24">
          <CardHeader className="flex-row items-center justify-between space-y-0 border-b pb-3">
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-magenta-500" /> Activity feed
            </CardTitle>
            <Tip content={`Provider: ${getAgentProvider().label}`}>
              <Badge variant="ok" className="cursor-help">
                <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-ok-500" /> Live
              </Badge>
            </Tip>
          </CardHeader>
          <CardContent className="scrollbar-thin max-h-[calc(100vh-220px)] overflow-y-auto pt-2">
            <ActivityFeed />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
