// Reasoning provider abstraction.
//
// The demo ships with a deterministic MockReasoningProvider so it runs with no API keys and
// no network. To connect a real LLM later, implement ReasoningProvider (e.g. calling a
// server-side route that talks to your model gateway) and return it from getReasoningProvider().
// Keep LLM calls server-side; never expose API keys to the browser. The LLM should only ever
// receive approved, read-only context and must never be given tools that write to OT systems.
import type { AgentStep } from "@/lib/types";
import type { InvestigationPack } from "@/lib/scenarios";

export interface ReasoningProvider {
  readonly name: string;
  /** One-line narration when an agent starts its task. */
  narrateStart(agentName: string, step: AgentStep): string;
  /** One-line narration of the consolidated conclusion. */
  narrateConclusion(pack: InvestigationPack): string;
}

export class MockReasoningProvider implements ReasoningProvider {
  readonly name = "Deterministic simulation (no LLM)";
  narrateStart(agentName: string, step: AgentStep) {
    return `${agentName} Agent → ${step.checks.slice(0, 4).join(" · ")}`;
  }
  narrateConclusion(pack: InvestigationPack) {
    return `Likely cause: ${pack.conclusion.likelyCause} (${pack.conclusion.confidence}% confidence). Human approval required.`;
  }
}

let provider: ReasoningProvider = new MockReasoningProvider();

export const getReasoningProvider = () => provider;

/** Swap in a real provider at app start-up (e.g. in app/layout.tsx). */
export const setReasoningProvider = (p: ReasoningProvider) => {
  provider = p;
};
