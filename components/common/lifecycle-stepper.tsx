"use client";

import Link from "next/link";
import { Check, UserCheck } from "lucide-react";
import { STAGES } from "@/data/stages";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { StageId } from "@/types";

export function LifecycleStepper({ active, size = "md", className }: { active?: StageId; size?: "sm" | "md"; className?: string }) {
  const status = useApp((s) => s.caseData.stageStatus);
  return (
    <ol className={cn("grid grid-cols-7 gap-1", className)}>
      {STAGES.map((st, i) => {
        const s = status[st.id];
        const isActive = active === st.id;
        return (
          <li key={st.id} className="relative">
            {i > 0 && (
              <span
                className={cn(
                  "absolute right-1/2 top-[15px] h-[2px] w-full -translate-y-1/2",
                  size === "sm" && "top-[11px]",
                  status[STAGES[i - 1].id] === "completed" ? "bg-gold-400" : "bg-navy-100",
                )}
              />
            )}
            <Link href={st.route} className="group relative flex flex-col items-center gap-1.5 text-center focus:outline-none">
              <span
                className={cn(
                  "relative z-10 flex items-center justify-center rounded-full border-2 text-[11px] font-semibold tabular transition",
                  size === "md" ? "h-[30px] w-[30px]" : "h-[22px] w-[22px] text-[10px]",
                  s === "completed" && "border-gold-400 bg-gold-400 text-white",
                  s === "awaiting_human" && "border-magenta-400 bg-magenta-50 text-magenta-600",
                  s === "in_progress" && "border-sky-500 bg-sky-50 text-sky-700",
                  s === "not_started" && "border-navy-100 bg-white text-navy-400",
                  isActive && "ring-4 ring-navy-100",
                  "group-hover:scale-105 group-focus-visible:ring-4 group-focus-visible:ring-sky-100",
                )}
              >
                {s === "completed" ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : s === "awaiting_human" ? <UserCheck className="h-3.5 w-3.5" /> : st.number}
              </span>
              <span
                className={cn(
                  "hidden px-0.5 leading-tight sm:block",
                  size === "md" ? "text-[12px]" : "text-[10.5px]",
                  isActive ? "font-semibold text-navy-900" : "text-navy-500 group-hover:text-navy-800",
                )}
              >
                <span className="hidden lg:inline">{st.name}</span>
                <span className="lg:hidden">{st.short}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
