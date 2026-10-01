"use client";

import { AlertOctagon, AlertTriangle, CheckCircle2, Circle, Info } from "lucide-react";
import type { DataNature, EAStatus, EnumeratorStatus, Severity } from "@/types/census";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";

const NATURE_STYLE: Record<DataNature, string> = {
  OFFICIAL: "border-nat-official/40 bg-nat-official/10 text-nat-official",
  REFERENCE: "border-nat-reference/35 bg-nat-reference/8 text-nat-reference",
  SIMULATED: "border-nat-simulated/40 bg-nat-simulated/10 text-nat-simulated",
  SYNTHETIC_OPERATIONAL: "border-nat-synthetic/40 bg-nat-synthetic/10 text-nat-synthetic",
};

export function NatureBadge({ nature, className, compact }: { nature: DataNature; className?: string; compact?: boolean }) {
  const { t } = useI18n();
  const key = `nat${nature}` as const;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-[3px] border px-1.5 py-[1px] text-[9.5px] font-semibold uppercase tracking-[0.06em] leading-[14px] whitespace-nowrap", NATURE_STYLE[nature], className)}>
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {compact ? t(key).split(" ")[0] : t(key)}
    </span>
  );
}

const SEV: Record<Severity, { cls: string; icon: typeof Info }> = {
  CRITICAL: { cls: "bg-crit-bg text-crit border-crit/30", icon: AlertOctagon },
  HIGH: { cls: "bg-serious-bg text-serious border-serious/30", icon: AlertTriangle },
  MEDIUM: { cls: "bg-warn-bg text-warn border-warn/30", icon: AlertTriangle },
  LOW: { cls: "bg-sand-100 text-ink-700 border-line-strong", icon: Info },
};

export function SeverityBadge({ s }: { s: Severity }) {
  const { t } = useI18n();
  const { cls, icon: Icon } = SEV[s];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded border px-1.5 py-[1px] text-[11px] font-semibold whitespace-nowrap", cls)}>
      <Icon size={11} strokeWidth={2.4} />
      {t(`sev${s}`)}
    </span>
  );
}

export const EA_STATUS_COLOR: Record<EAStatus, string> = {
  NOT_STARTED: "#b9b2a3",
  IN_PROGRESS: "#2f62a6",
  COMPLETED: "#1f8a3b",
  COVERAGE_RISK: "#c0302f",
  REVISIT_REQUIRED: "#d08a00",
};

export function EAStatusChip({ s }: { s: EAStatus }) {
  const { t } = useI18n();
  const Icon = s === "COMPLETED" ? CheckCircle2 : s === "COVERAGE_RISK" ? AlertOctagon : s === "REVISIT_REQUIRED" ? AlertTriangle : Circle;
  return (
    <span className="inline-flex items-center gap-1 text-[12px] font-medium text-ink-700 whitespace-nowrap">
      <Icon size={12} style={{ color: EA_STATUS_COLOR[s] }} strokeWidth={2.4} />
      {t(`st${s}`)}
    </span>
  );
}

const ENUM_STATUS: Record<EnumeratorStatus, string> = {
  ACTIVE: "#1f8a3b", IDLE: "#a88a52", OFFLINE: "#c0302f", UNDER_REVIEW: "#c25a2c", COMPLETED: "#2f62a6", NOT_STARTED: "#b9b2a3",
};

export function EnumStatusChip({ s }: { s: EnumeratorStatus }) {
  const { t } = useI18n();
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-700 whitespace-nowrap">
      <span className="h-2 w-2 rounded-full" style={{ background: ENUM_STATUS[s] }} />
      {t(`es${s}`)}
    </span>
  );
}

export function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full border border-line bg-sand-50 px-2 py-[1px] text-[11px] font-medium text-ink-700 whitespace-nowrap", className)}>{children}</span>;
}
