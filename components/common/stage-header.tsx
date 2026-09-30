"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Bot, FastForward } from "lucide-react";
import { AGENT_BY_ID } from "@/data/agents";
import { CASE } from "@/data/case";
import { STAGES, STAGE_BY_ID } from "@/data/stages";
import { StageStatusBadge } from "@/components/common/status";
import { LifecycleStepper } from "@/components/common/lifecycle-stepper";
import { Confirm } from "@/components/common/confirm";
import { Button } from "@/components/ui/button";
import { Tip } from "@/components/ui/tooltip";
import { fastForwardTo } from "@/lib/actions";
import { useApp } from "@/lib/store";
import type { StageId } from "@/types";

export function StageHeader({ stage, children }: { stage: StageId; children?: React.ReactNode }) {
  const def = STAGE_BY_ID[stage];
  const status = useApp((s) => s.caseData.stageStatus);
  const idx = STAGES.findIndex((s) => s.id === stage);
  const prev = STAGES[idx - 1];
  const next = STAGES[idx + 1];
  const priorIncomplete = STAGES.slice(0, idx).some((s) => status[s.id] !== "completed");

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/80 bg-white px-5 py-4 shadow-card">
        <LifecycleStepper active={stage} size="sm" />
      </div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs text-navy-500">
            <Link href="/case" className="hover:text-navy-800 hover:underline">
              {CASE.id}
            </Link>
            <span>/</span>
            <span>Stage {def.number}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-[28px] font-semibold leading-tight tracking-tight text-navy-900 sm:text-[32px]">
              <span className="mr-2 text-gold-500">{def.number}</span>
              {def.name}
            </h1>
            <StageStatusBadge status={status[stage]} />
          </div>
          <p className="mt-1 max-w-2xl text-sm text-navy-500">{def.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tip content={AGENT_BY_ID[def.agentId].mission}>
            <span className="inline-flex cursor-help items-center gap-1.5 rounded-lg border border-navy-100 bg-navy-50/60 px-2.5 py-1.5 text-xs font-medium text-navy-700">
              <Bot className="h-3.5 w-3.5 text-gold-500" /> {AGENT_BY_ID[def.agentId].name}
            </span>
          </Tip>
          {priorIncomplete && (
            <Confirm
              title={`Fast-forward to ${def.name}?`}
              description="Earlier stages will be completed instantly with the agents' recommended choices and simulated human approvals. Use this when presenting a single stage. Every step is recorded in the audit trail."
              confirmLabel="Fast-forward"
              onConfirm={() => fastForwardTo(stage)}
            >
              <Button variant="outline" size="sm">
                <FastForward /> Fast-forward here
              </Button>
            </Confirm>
          )}
          {prev && (
            <Button variant="ghost" size="sm" asChild>
              <Link href={prev.route}>
                <ArrowLeft /> {prev.short}
              </Link>
            </Button>
          )}
          {next && (
            <Button variant="outline" size="sm" asChild>
              <Link href={next.route}>
                {next.short} <ArrowRight />
              </Link>
            </Button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
