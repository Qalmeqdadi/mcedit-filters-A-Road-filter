"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Bot, BriefcaseBusiness, FileClock, LayoutDashboard, ShieldCheck, TrendingUp } from "lucide-react";
import { STAGES } from "@/data/stages";
import { ProductMark } from "@/components/shell/brand";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

const OVERVIEW = [
  { href: "/", label: "Command Center", icon: LayoutDashboard },
  { href: "/case", label: "Procurement Case", icon: BriefcaseBusiness },
];

const GOVERNANCE = [
  { href: "/agents", label: "AI Control & Agent Activity", icon: Bot },
  { href: "/governance", label: "Governance & Controls", icon: ShieldCheck },
  { href: "/audit", label: "Audit Trail", icon: FileClock },
  { href: "/value", label: "Value Realisation", icon: TrendingUp },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const status = useApp((s) => s.caseData.stageStatus);
  const paused = useApp((s) => Object.values(s.agents).filter((a) => a.status === "paused").length);

  const item = (href: string, label: string, Icon: React.ElementType, extra?: React.ReactNode) => {
    const active = href === "/" ? pathname === "/" : pathname === href;
    return (
      <Link
        key={href}
        href={href}
        onClick={onNavigate}
        className={cn(
          "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition",
          active ? "bg-navy-800 text-white shadow-sm" : "text-navy-600 hover:bg-navy-50 hover:text-navy-900",
        )}
      >
        <Icon className={cn("h-4 w-4 shrink-0", active ? "text-gold-300" : "text-navy-400 group-hover:text-navy-600")} />
        <span className="flex-1 truncate">{label}</span>
        {extra}
      </Link>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pb-4 pt-5">
        <Link href="/" onClick={onNavigate}>
          <ProductMark />
        </Link>
      </div>
      <nav className="scrollbar-thin flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        <div className="space-y-0.5">{OVERVIEW.map((n) => item(n.href, n.label, n.icon))}</div>

        <div>
          <div className="mb-1.5 px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-navy-400">Lifecycle</div>
          <div className="space-y-0.5">
            {STAGES.map((st) => {
              const s = status[st.id];
              const active = pathname === st.route;
              return (
                <Link
                  key={st.id}
                  href={st.route}
                  onClick={onNavigate}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] transition",
                    active ? "bg-navy-800 font-medium text-white shadow-sm" : "text-navy-600 hover:bg-navy-50 hover:text-navy-900",
                  )}
                >
                  <span className={cn("tabular w-5 text-[11px] font-semibold", active ? "text-gold-300" : "text-navy-400")}>{st.number}</span>
                  <span className="flex-1 truncate">{st.name}</span>
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      s === "completed" && "bg-gold-400",
                      s === "awaiting_human" && "bg-magenta-400 animate-pulse-dot",
                      s === "in_progress" && "bg-sky-500",
                      s === "not_started" && (active ? "bg-navy-600" : "bg-navy-100"),
                    )}
                    title={s.replace("_", " ")}
                  />
                </Link>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-1.5 px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-navy-400">Governance & value</div>
          <div className="space-y-0.5">
            {GOVERNANCE.map((n) =>
              item(
                n.href,
                n.label,
                n.icon,
                n.href === "/agents" && paused > 0 ? (
                  <span className="rounded-full bg-risk-500 px-1.5 text-[10px] font-semibold text-white">{paused} paused</span>
                ) : undefined,
              ),
            )}
          </div>
        </div>
      </nav>
      <div className="border-t border-border/70 px-4 py-3">
        <div className="flex items-center gap-2 rounded-lg bg-gold-50 px-3 py-2 text-[11px] leading-snug text-gold-700">
          <Activity className="h-3.5 w-3.5 shrink-0" />
          Illustrative Proof of Value. All data is synthetic.
        </div>
      </div>
    </div>
  );
}
