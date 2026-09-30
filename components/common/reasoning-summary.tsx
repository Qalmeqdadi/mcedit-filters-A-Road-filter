"use client";

import { FileSearch, Gavel, Lightbulb, ListChecks, ShieldCheck, UserCheck } from "lucide-react";
import { Tip } from "@/components/ui/tooltip";
import { ConfidenceMeter } from "@/components/common/confidence";
import { cn } from "@/lib/utils";
import type { ReasoningSummary } from "@/types";

/**
 * Explainable-AI summary: evidence considered, rules applied, recommendation,
 * confidence and the human decision required. Intentionally not a
 * chain-of-thought transcript.
 */
export function ReasoningSummaryCard({ reasoning, title = "Agent Reasoning Summary", className, dense }: { reasoning: ReasoningSummary; title?: string; className?: string; dense?: boolean }) {
  return (
    <div className={cn("rounded-xl border border-border bg-[#FCFBF8]", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-gold-500" />
          <span className="text-[13px] font-semibold text-navy-900">{title}</span>
          <Tip content="Explainable summary of the evidence and rules the agent used. Private model reasoning is not exposed.">
            <span className="cursor-help rounded-full border border-border px-1.5 text-[10px] font-medium uppercase tracking-wide text-navy-500">XAI</span>
          </Tip>
        </div>
        <div className="flex items-center gap-2 text-xs text-navy-500">
          Confidence <ConfidenceMeter value={reasoning.confidence} />
        </div>
      </div>
      <div className={cn("grid gap-4 p-4 md:grid-cols-2", dense && "gap-3 p-3")}>
        <Section icon={FileSearch} label="Evidence considered">
          <ul className="space-y-1">
            {reasoning.evidence.map((e) => (
              <li key={e} className="flex gap-2 text-[13px] leading-snug text-navy-700">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-navy-400" /> {e}
              </li>
            ))}
          </ul>
        </Section>
        <Section icon={ListChecks} label="Rules applied">
          <ul className="space-y-1">
            {reasoning.rulesApplied.map((e) => (
              <li key={e} className="flex gap-2 text-[13px] leading-snug text-navy-700">
                <Gavel className="mt-0.5 h-3 w-3 shrink-0 text-gold-500" /> {e}
              </li>
            ))}
          </ul>
        </Section>
        <Section icon={Lightbulb} label="Recommendation">
          <p className="text-[13px] font-medium leading-snug text-navy-900">{reasoning.recommendation}</p>
        </Section>
        <Section icon={UserCheck} label="Human decision required" accent>
          <p className="text-[13px] font-medium leading-snug text-magenta-600">{reasoning.humanDecision}</p>
        </Section>
      </div>
    </div>
  );
}

function Section({ icon: Icon, label, children, accent }: { icon: React.ElementType; label: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <div>
      <div className={cn("mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider", accent ? "text-magenta-500" : "text-navy-500")}>
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      {children}
    </div>
  );
}
