// Minimal agent framework used by the deterministic simulation.
// Each agent exposes analyze() → collectEvidence() → produceFindings() → recommend().
import type { AgentId, AgentStep, Evidence, EvidenceSourceId, Finding, Recommendation, TagLive } from "@/lib/types";
import type { AgentWork, InvestigationPack } from "@/lib/scenarios";
import { AGENT, type AgentProfile } from "@/lib/governance";
import { TAG, fmtTag } from "@/lib/sim/plant";

export interface AgentContext {
  pack: InvestigationPack;
  /** live (synthetic) tag snapshot at the moment the investigation starts */
  snapshot: Record<string, TagLive>;
  investigationId: string;
}

export interface AgentTask {
  agentId: AgentId;
  description: string;
  work: AgentWork;
}

export abstract class Agent {
  readonly profile: AgentProfile;
  /** evidence source used when this agent reports a live tag deviation */
  protected abstract readonly tagSource: EvidenceSourceId;

  constructor(readonly id: AgentId) {
    this.profile = AGENT[id];
  }

  /** Returns null when the agent has no part in this investigation. */
  analyze(ctx: AgentContext): AgentStep | null {
    const work = ctx.pack.work[this.id];
    if (!work) return null;
    const task: AgentTask = { agentId: this.id, description: work.task, work };
    const evidence = this.collectEvidence(ctx, task);
    const findings = this.produceFindings(ctx, task, evidence);
    return {
      agentId: this.id,
      task: work.task,
      checks: work.checks,
      loading: work.loading,
      sources: work.sources,
      evidence,
      findings,
      confidence: this.scoreConfidence(work, evidence),
      startMs: work.schedule.start,
      durationMs: work.schedule.dur,
      awaitingFromMs: work.schedule.awaitFrom,
      awaitingOn: work.schedule.awaitOn,
    };
  }

  /** Live tag comparisons against model expectation + domain evidence from the knowledge pack. */
  collectEvidence(ctx: AgentContext, task: AgentTask): Evidence[] {
    const live: Evidence[] = (task.work.tagChecks ?? [])
      .filter((id) => TAG[id] && ctx.snapshot[id])
      .map((id, i) => {
        const def = TAG[id];
        const v = ctx.snapshot[id].value;
        const dev = ((v - def.expected) / def.expected) * 100;
        const significant = Math.abs(dev) >= this.significance(id);
        return {
          id: `${ctx.investigationId}-${this.id}-tag-${i}`,
          source: this.tagSource,
          agentId: this.id,
          title: `${def.name} (${id})`,
          detail: `${fmtTag(id, v)} vs model ${fmtTag(id, def.expected)} · band ${fmtTag(id, def.low, false)}–${fmtTag(id, def.high)}`,
          value: `${dev >= 0 ? "+" : ""}${dev.toFixed(1)}%`,
          signal: significant ? "supports" : "neutral",
        } satisfies Evidence;
      });
    const domain: Evidence[] = task.work.evidence.map((e, i) => ({
      id: `${ctx.investigationId}-${this.id}-ev-${i}`,
      agentId: this.id,
      signal: e.signal ?? "supports",
      ...e,
    }));
    return [...live, ...domain];
  }

  produceFindings(ctx: AgentContext, task: AgentTask, _evidence: Evidence[]): Finding[] {
    return task.work.findings.map((f, i) => ({ id: `${ctx.investigationId}-${this.id}-f-${i}`, agentId: this.id, ...f }));
  }

  /** Specialists only contribute recommendations through the Operations Agent in this demo. */
  recommend(_ctx: AgentContext, _findings: Finding[]): Recommendation[] {
    return [];
  }

  /** % deviation considered significant for this agent's domain. */
  protected significance(_tagId: string) {
    return 1.5;
  }

  protected scoreConfidence(work: AgentWork, evidence: Evidence[]) {
    // Deterministic: pack prior nudged by how much live evidence supports it (capped).
    const support = evidence.filter((e) => e.signal === "supports").length;
    const contra = evidence.filter((e) => e.signal === "contradicts").length;
    return Math.max(50, Math.min(99, work.confidence + Math.min(2, support - 2) - contra));
  }
}
