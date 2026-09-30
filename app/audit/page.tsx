"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bot, Download, FileClock, Search, Server, ShieldCheck, UserCheck, X } from "lucide-react";
import { toast } from "sonner";
import { AGENT_BY_ID, AGENTS } from "@/data/agents";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/lib/store";
import { cn, formatDateTime } from "@/lib/utils";
import { stageLabel } from "@/services/audit";
import type { AgentId } from "@/types";

const ALL_AGENTS = "All agents";

function AuditInner() {
  const params = useSearchParams();
  const router = useRouter();
  const audit = useApp((s) => s.audit);
  const [type, setType] = useState<"all" | "agent" | "human" | "system">("all");
  const [q, setQ] = useState("");
  const agentParam = params.get("agent") as AgentId | null;
  const agentFilter = agentParam && AGENT_BY_ID[agentParam] ? agentParam : null;

  const rows = useMemo(
    () =>
      audit.filter((e) => {
        if (type !== "all" && e.actorType !== type) return false;
        if (agentFilter && e.agentId !== agentFilter && e.actor !== AGENT_BY_ID[agentFilter].name) return false;
        if (q && !`${e.actor} ${e.action} ${e.detail ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      }),
    [audit, type, q, agentFilter],
  );

  const exportCsv = () => {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = ["timestamp,actor,actor_type,action,detail,stage", ...rows.map((e) => [e.timestamp, e.actor, e.actorType, e.action, e.detail ?? "", stageLabel(e.stage)].map(esc).join(","))].join("\n");
    navigator.clipboard?.writeText(csv).then(
      () => toast.success("Audit trail copied as CSV", { description: `${rows.length} events — paste into Excel or a text file` }),
      () => toast.error("Clipboard unavailable", { description: "Your browser blocked clipboard access." }),
    );
  };

  const counts = {
    all: audit.length,
    agent: audit.filter((e) => e.actorType === "agent").length,
    human: audit.filter((e) => e.actorType === "human").length,
    system: audit.filter((e) => e.actorType === "system").length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI Control"
        title="Audit Trail"
        description="Every agent action, human decision and control intervention — timestamped, attributed and immutable."
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
            <Download /> Copy as CSV
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
          <Tabs value={type} onValueChange={(v) => setType(v as typeof type)}>
            <TabsList className="flex h-auto flex-wrap justify-start">
              <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
              <TabsTrigger value="agent">
                <Bot className="h-3.5 w-3.5" /> Agents ({counts.agent})
              </TabsTrigger>
              <TabsTrigger value="human">
                <UserCheck className="h-3.5 w-3.5" /> Humans ({counts.human})
              </TabsTrigger>
              <TabsTrigger value="system">
                <Server className="h-3.5 w-3.5" /> System ({counts.system})
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="w-full sm:w-60">
              <SimpleSelect
                value={agentFilter ? AGENT_BY_ID[agentFilter].name : ALL_AGENTS}
                onValueChange={(v) => {
                  const ag = AGENTS.find((a) => a.name === v);
                  router.replace(ag ? `/audit?agent=${ag.id}` : "/audit");
                }}
                options={[ALL_AGENTS, ...AGENTS.map((a) => a.name)]}
              />
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search actor, action, detail" className="pl-9" />
            </div>
          </div>
        </div>
        {agentFilter && (
          <div className="flex items-center gap-2 border-b bg-navy-50/40 px-4 py-2 text-[12.5px] text-navy-700">
            Filtered to <Badge variant="sky">{AGENT_BY_ID[agentFilter].name}</Badge>
            <Button size="xs" variant="ghost" onClick={() => router.replace("/audit")}>
              <X /> Clear
            </Button>
          </div>
        )}
        <CardContent className="overflow-x-auto p-0">
          {rows.length === 0 ? (
            <EmptyState icon={FileClock} title="No matching events" description="Adjust the filters, or run an agent step to generate audit events." className="m-4" />
          ) : (
            <table className="w-full min-w-[820px] text-[12.5px]">
              <thead>
                <tr className="border-b bg-navy-50/40 text-left text-[11px] uppercase tracking-wider text-navy-500">
                  <th className="px-5 py-2 font-semibold">Timestamp</th>
                  <th className="px-3 py-2 font-semibold">Actor</th>
                  <th className="px-3 py-2 font-semibold">Action</th>
                  <th className="px-3 py-2 font-semibold">Context</th>
                  <th className="px-5 py-2 font-semibold">Event ID</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id} className="border-b last:border-0 align-top hover:bg-navy-50/30">
                    <td className="tabular whitespace-nowrap px-5 py-2.5 text-navy-500">{formatDateTime(e.timestamp)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                            e.actorType === "agent" ? "bg-sky-50 text-sky-600" : e.actorType === "human" ? "bg-magenta-50 text-magenta-600" : "bg-navy-50 text-navy-500",
                          )}
                        >
                          {e.actorType === "agent" ? <Bot className="h-3.5 w-3.5" /> : e.actorType === "human" ? <UserCheck className="h-3.5 w-3.5" /> : e.stage === "governance" ? <ShieldCheck className="h-3.5 w-3.5" /> : <Server className="h-3.5 w-3.5" />}
                        </span>
                        <span className="font-medium text-navy-900">{e.actor}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-navy-800">{e.action}</div>
                      {e.detail && <div className="mt-0.5 text-navy-500">{e.detail}</div>}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant={e.stage === "governance" ? "gold" : "outline"}>{stageLabel(e.stage)}</Badge>
                    </td>
                    <td className="px-5 py-2.5 font-mono text-[11px] text-navy-400">{e.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuditPage() {
  return (
    <Suspense fallback={null}>
      <AuditInner />
    </Suspense>
  );
}
