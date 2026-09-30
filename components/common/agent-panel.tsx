"use client";

import { Bot, Lock } from "lucide-react";
import { AGENT_BY_ID } from "@/data/agents";
import { AgentStatusBadge } from "@/components/common/status";
import { AgentThinking } from "@/components/common/agent-thinking";
import { Tip } from "@/components/ui/tooltip";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { AgentId, AgentTask } from "@/types";

/** Frame for a specialist agent: identity, status, actions and results. */
export function AgentPanel({
  agentId,
  actions,
  children,
  className,
  watchTasks = [],
  subtitle,
}: {
  agentId: AgentId;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  watchTasks?: AgentTask[];
  subtitle?: string;
}) {
  const agent = AGENT_BY_ID[agentId];
  const rt = useApp((s) => s.agents[agentId]);
  const running = useApp((s) => s.running.find((t) => watchTasks.includes(t)));

  return (
    <section className={cn("overflow-hidden rounded-xl border border-navy-100 bg-white shadow-card", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy-50 bg-gradient-to-r from-navy-50/70 via-white to-white px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-800 text-gold-300 shadow-sm">
            <Bot className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[15px] font-semibold tracking-tight text-navy-900">{agent.name}</h2>
              <AgentStatusBadge status={rt.status} />
            </div>
            <p className="truncate text-xs text-navy-500">{subtitle ?? agent.mission}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Tip
            content={
              <div className="space-y-1">
                <div className="font-semibold">Least-privilege identity: {agent.identity}</div>
                <div>Allowed: {agent.permissions.join(", ")}</div>
                <div>Prohibited: {agent.prohibited.join(", ")}</div>
              </div>
            }
          >
            <span className="inline-flex cursor-help items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-navy-600">
              <Lock className="h-3 w-3 text-gold-500" /> {agent.permissions.length - rt.revokedPermissions.length} permissions
            </span>
          </Tip>
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 border-b border-navy-50 px-5 py-3">{actions}</div>}
      <div className="space-y-4 p-5">
        {running && <AgentThinking task={running} />}
        {children}
      </div>
    </section>
  );
}
