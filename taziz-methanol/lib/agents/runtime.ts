// Pure derivation of the live council state from an investigation + elapsed time.
// Because it is a pure function, the demo can pause, fast-forward or replay deterministically.
import type { AgentId, AgentStatus, FeedItem, Investigation } from "@/lib/types";
import { clockLabel } from "@/lib/sim/plant";

export interface AgentRuntime {
  status: AgentStatus;
  task: string;
  message: string;
  confidence: number | null;
  sources: string[];
  lastUpdate: string | null;
  progress: number;
}

export interface RunView {
  agents: Partial<Record<AgentId, AgentRuntime>>;
  feed: FeedItem[];
  phase: string;
  progress: number;
  done: boolean;
  started: boolean;
  consolidating: boolean;
}

export function deriveRun(inv: Investigation, elapsed: number, startMin: number): RunView {
  const at = (ms: number) => clockLabel(startMin + ms / 60000, true);
  const agents: RunView["agents"] = {};
  const started = elapsed > 0;
  const done = elapsed >= inv.totalMs;
  const c = inv.consolidation;
  const consolidating = elapsed >= c.start && !done;

  for (const s of inv.steps) {
    const end = s.startMs + s.durationMs;
    let status: AgentStatus = "idle";
    let message = "Standing by";
    let progress = 0;
    let lastUpdate: string | null = null;
    if (!started) {
      status = "idle";
    } else if (elapsed >= end) {
      status = "completed";
      message = s.findings[0]?.text ?? "Analysis complete";
      progress = 1;
      lastUpdate = at(end);
    } else if (elapsed >= s.startMs) {
      status = "investigating";
      progress = (elapsed - s.startMs) / s.durationMs;
      message = s.loading[Math.min(s.loading.length - 1, Math.floor(progress * s.loading.length))];
      lastUpdate = at(elapsed);
    } else if (s.awaitingFromMs !== undefined && elapsed >= s.awaitingFromMs) {
      status = "awaiting";
      message = `Awaiting ${s.awaitingOn}`;
      lastUpdate = at(s.awaitingFromMs);
    }
    agents[s.agentId] = {
      status,
      task: s.task,
      message,
      confidence: status === "completed" ? s.confidence : null,
      sources: status === "idle" ? [] : s.sources,
      lastUpdate,
      progress,
    };
  }

  // The Operations Agent coordinates: detect → wait on specialists → consolidate.
  const ops = inv.steps.find((s) => s.agentId === "operations");
  if (ops && started) {
    const opsEnd = ops.startMs + ops.durationMs;
    if (done) {
      agents.operations = { ...agents.operations!, status: "completed", message: `Conclusion ready · ${inv.conclusion.confidence}% confidence`, confidence: inv.conclusion.confidence, lastUpdate: at(inv.totalMs), progress: 1 };
    } else if (consolidating) {
      const p = (elapsed - c.start) / c.dur;
      agents.operations = { ...agents.operations!, status: "investigating", message: c.loading[Math.min(c.loading.length - 1, Math.floor(p * c.loading.length))], lastUpdate: at(elapsed), progress: p };
    } else if (elapsed >= opsEnd) {
      agents.operations = { ...agents.operations!, status: "awaiting", message: "Coordinating council · awaiting specialist findings", confidence: null, lastUpdate: at(elapsed), progress: 1 };
    }
  }

  const active = inv.steps.filter((s) => agents[s.agentId]?.status === "investigating");
  const phase = !started
    ? "Ready"
    : done
      ? "Investigation complete — human approval required"
      : consolidating
        ? (agents.operations?.message ?? "Consolidating")
        : active.length
          ? `${active.length} agent${active.length > 1 ? "s" : ""} investigating`
          : "Coordinating";

  return {
    agents,
    feed: inv.feed.filter((f) => f.atMs <= elapsed),
    phase,
    progress: Math.min(1, elapsed / inv.totalMs),
    done,
    started,
    consolidating,
  };
}
