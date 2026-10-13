// MethanolOperationsOrchestrator — deterministic multi-agent investigation pipeline.
//
// detectEvent → classifyEvent → assignAgents → gatherEvidence → correlateFindings
//   → createReasoningSummary → estimateImpact → generateRecommendation
//   → requestHumanApproval → (human decision) → closeInvestigation
//
// Output is a fully-specified Investigation (including a timed schedule) that the UI
// "plays back". The same inputs always produce the same investigation.
import type {
  AgentId,
  AgentStep,
  Decision,
  EventCategory,
  FeedItem,
  Investigation,
  PlantEvent,
  ReasoningSummary,
  Recommendation,
  ScenarioId,
  TagLive,
  TimelineEvent,
} from "@/lib/types";
import type { InvestigationPack } from "@/lib/scenarios";
import { packImpact } from "@/lib/scenarios";
import { AGENT, isAdvisory } from "@/lib/governance";
import { clockLabel } from "@/lib/sim/plant";
import { createAgentRegistry } from "./specialists";
import type { Agent, AgentContext } from "./agent";
import { getReasoningProvider } from "@/lib/ai/provider";

const AGENT_ORDER: AgentId[] = ["operations", "process", "asset", "quality", "energy", "engineering", "hse", "production", "shift"];

const ROUTING: Record<EventCategory, AgentId[]> = {
  "production-deviation": ["process", "asset", "quality", "energy", "engineering", "hse", "production", "shift"],
  "asset-degradation": ["asset", "process", "energy", "engineering", "hse", "production", "shift"],
  "quality-risk": ["quality", "process", "energy", "engineering", "hse", "production", "shift"],
  "energy-deviation": ["energy", "process", "asset", "engineering", "hse", "production", "shift"],
  "feed-change": ["process", "quality", "energy", "engineering", "hse", "production", "shift"],
  "utility-imbalance": ["energy", "process", "engineering", "hse", "production", "shift"],
  "process-constraint": ["process", "quality", "asset", "engineering", "hse", "production", "shift"],
  "alarm-flood": ["process", "asset", "hse", "engineering", "production", "shift"],
};

export interface OrchestratorInput {
  scenarioId: ScenarioId | "E2";
  pack: InvestigationPack;
  snapshot: Record<string, TagLive>;
  /** plant-clock minutes (relative to sim start) at which the investigation is opened */
  nowMin: number;
  status?: Investigation["status"];
}

export class MethanolOperationsOrchestrator {
  private readonly agents: Record<AgentId, Agent> = createAgentRegistry();

  detectEvent(input: OrchestratorInput): PlantEvent {
    const { pack } = input;
    return {
      id: `${pack.code}-EVT`,
      time: clockLabel(pack.anchor === "sim" ? -28 : input.nowMin),
      title: pack.trigger.title,
      detail: pack.trigger.detail,
      severity: pack.trigger.severity,
      category: pack.category,
      tagIds: pack.trigger.tagIds,
    };
  }

  classifyEvent(event: PlantEvent): EventCategory {
    return event.category;
  }

  assignAgents(category: EventCategory, pack: InvestigationPack): AgentId[] {
    const routed = ROUTING[category].filter((id) => pack.work[id]);
    return ["operations", ...AGENT_ORDER.filter((id) => routed.includes(id))];
  }

  gatherEvidence(ctx: AgentContext, assigned: AgentId[]): AgentStep[] {
    return assigned.map((id) => this.agents[id].analyze(ctx)).filter((s): s is AgentStep => s !== null);
  }

  correlateFindings(steps: AgentStep[], pack: InvestigationPack) {
    const contradicting = steps.flatMap((s) => s.evidence.filter((e) => e.signal === "contradicts").map((e) => `${e.title} — ${e.detail}`));
    return { correlations: pack.correlations, contradictions: [...pack.contradictions, ...contradicting] };
  }

  createReasoningSummary(steps: AgentStep[], pack: InvestigationPack): ReasoningSummary {
    const { correlations, contradictions } = this.correlateFindings(steps, pack);
    const evidenceConsidered = steps.flatMap((s) => s.evidence).map((e) => `${AGENT[e.agentId].short}: ${e.title}${e.value ? ` (${e.value})` : ""}`);
    return { evidenceConsidered, correlations, contradictions, confidence: pack.conclusion.confidence, verification: pack.verification };
  }

  estimateImpact(pack: InvestigationPack) {
    return packImpact(pack);
  }

  /** Recommendations are passed through the HSE / policy filter: advisory actions only. */
  generateRecommendation(ctx: AgentContext, steps: AgentStep[]): Recommendation[] {
    const recs = this.agents.operations.recommend(ctx, steps.flatMap((s) => s.findings));
    return recs.filter((r) => isAdvisory(`${r.title} ${r.detail}`));
  }

  requestHumanApproval(inv: Investigation): Investigation {
    return { ...inv, status: "awaiting-approval" };
  }

  closeInvestigation(inv: Investigation, decision: Decision): Investigation {
    const status: Investigation["status"] =
      decision.kind === "dismiss" ? "dismissed" : decision.kind === "approve" || decision.kind === "maintenance-review" ? "approved" : decision.kind === "assign" ? "assigned" : inv.status;
    return { ...inv, status, decisions: [...inv.decisions, decision] };
  }

  /** Build the complete investigation (deterministic). */
  run(input: OrchestratorInput): Investigation {
    const { pack } = input;
    const event = this.detectEvent(input);
    const category = this.classifyEvent(event);
    const assigned = this.assignAgents(category, pack);
    const ctx: AgentContext = { pack, snapshot: input.snapshot, investigationId: pack.code };
    const steps = this.gatherEvidence(ctx, assigned);
    const reasoning = this.createReasoningSummary(steps, pack);
    const impact = this.estimateImpact(pack);
    const recommendations = this.generateRecommendation(ctx, steps);
    const totalMs = Math.max(pack.consolidation.start + pack.consolidation.dur, ...steps.map((s) => s.startMs + s.durationMs)) + 400;
    const anchorMin = pack.anchor === "sim" ? 0 : input.nowMin;
    const timeline: TimelineEvent[] = pack.timeline.map((t) => ({ time: clockLabel(anchorMin + t.offset), title: t.title, detail: t.detail, kind: t.kind, tagId: t.tagId }));

    const inv: Investigation = {
      id: pack.code,
      code: pack.code,
      scenarioId: input.scenarioId,
      title: pack.title,
      question: pack.question,
      trigger: event,
      agents: steps.map((s) => s.agentId),
      steps,
      consolidation: pack.consolidation,
      totalMs,
      conclusion: pack.conclusion,
      impact,
      reasoning,
      recommendations,
      timeline,
      feed: this.buildFeed(steps, pack, totalMs),
      status: input.status ?? "queued",
      decisions: [],
      openedAt: event.time,
    };
    return inv;
  }

  /** Narrated council feed (what the audience sees agents "say"). Uses the reasoning provider abstraction. */
  private buildFeed(steps: AgentStep[], pack: InvestigationPack, totalMs: number): FeedItem[] {
    const provider = getReasoningProvider();
    const feed: FeedItem[] = [];
    for (const s of steps) {
      const name = AGENT[s.agentId].short;
      if (s.awaitingFromMs !== undefined) feed.push({ atMs: s.awaitingFromMs, agentId: s.agentId, text: `${name} Agent waiting on ${s.awaitingOn}`, tone: "handoff" });
      feed.push({ atMs: s.startMs, agentId: s.agentId, text: provider.narrateStart(name, s), tone: "info" });
      const main = s.findings.filter((f) => f.weight !== "context" || s.findings.length === 1);
      main.slice(0, 2).forEach((f, i) => feed.push({ atMs: s.startMs + s.durationMs * (0.55 + i * 0.25), agentId: s.agentId, text: f.text, tone: "finding" }));
      feed.push({ atMs: s.startMs + s.durationMs, agentId: s.agentId, text: `${name} Agent completed · confidence ${s.confidence}%`, tone: "done" });
    }
    feed.push({ atMs: pack.consolidation.start, agentId: "operations", text: "Consolidating findings from the council…", tone: "info" });
    feed.push({ atMs: totalMs - 300, agentId: "operations", text: provider.narrateConclusion(pack), tone: "done" });
    return feed.sort((a, b) => a.atMs - b.atMs);
  }
}

export const orchestrator = new MethanolOperationsOrchestrator();
