import { AlertTriangle, CheckCircle2, CircleDashed, CircleDot, Clock, HelpCircle, PauseCircle, RotateCcw, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AgentRuntimeStatus, ApprovalStatus, RagStatus, Severity, StageStatus } from "@/types";

export function StageStatusBadge({ status, className }: { status: StageStatus; className?: string }) {
  const map = {
    not_started: { v: "outline" as const, icon: CircleDashed, label: "Not started" },
    in_progress: { v: "sky" as const, icon: CircleDot, label: "In progress" },
    awaiting_human: { v: "magenta" as const, icon: UserCheck, label: "Human decision" },
    completed: { v: "ok" as const, icon: CheckCircle2, label: "Completed" },
  }[status];
  const Icon = map.icon;
  return (
    <Badge variant={map.v} className={className}>
      <Icon /> {map.label}
    </Badge>
  );
}

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  const v = { low: "sky", medium: "warn", high: "risk", critical: "risk" } as const;
  return (
    <Badge variant={v[severity]} className={cn("capitalize", className)}>
      {severity}
    </Badge>
  );
}

export function RagDot({ rag, className }: { rag: RagStatus; className?: string }) {
  const c = { green: "bg-ok-500", amber: "bg-warn-500", red: "bg-risk-500" }[rag];
  return <span className={cn("inline-block h-2 w-2 shrink-0 rounded-full", c, className)} />;
}

export function RagBadge({ rag, children }: { rag: RagStatus; children: React.ReactNode }) {
  const v = { green: "ok", amber: "warn", red: "risk" } as const;
  return (
    <Badge variant={v[rag]}>
      <RagDot rag={rag} className="h-1.5 w-1.5" />
      {children}
    </Badge>
  );
}

export function AgentStatusBadge({ status }: { status: AgentRuntimeStatus }) {
  const map = {
    active: { v: "ok" as const, label: "Active" },
    idle: { v: "outline" as const, label: "Idle" },
    running: { v: "sky" as const, label: "Working" },
    paused: { v: "risk" as const, label: "Paused" },
  }[status];
  return (
    <Badge variant={map.v}>
      {status === "paused" ? (
        <PauseCircle />
      ) : (
        <span className={cn("h-1.5 w-1.5 rounded-full", status === "active" && "bg-ok-500", status === "running" && "bg-sky-500 animate-pulse-dot", status === "idle" && "bg-navy-200")} />
      )}
      {map.label}
    </Badge>
  );
}

export function ApprovalStatusBadge({ status, overdue }: { status: ApprovalStatus; overdue?: boolean }) {
  if (overdue && status === "pending")
    return (
      <Badge variant="risk">
        <AlertTriangle /> Overdue
      </Badge>
    );
  const map = {
    not_started: { v: "outline" as const, icon: CircleDashed, label: "Not started" },
    pending: { v: "warn" as const, icon: Clock, label: "Pending" },
    approved: { v: "ok" as const, icon: CheckCircle2, label: "Approved" },
    needs_clarification: { v: "magenta" as const, icon: HelpCircle, label: "Needs clarification" },
    returned: { v: "risk" as const, icon: RotateCcw, label: "Returned" },
  }[status];
  const Icon = map.icon;
  return (
    <Badge variant={map.v}>
      <Icon /> {map.label}
    </Badge>
  );
}

export function SyntheticBadge({ className }: { className?: string }) {
  return (
    <Badge variant="gold" className={cn("uppercase tracking-wider", className)}>
      Synthetic demo data
    </Badge>
  );
}
