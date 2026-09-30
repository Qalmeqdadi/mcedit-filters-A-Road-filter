import type { AgentRunRequest, AgentRunResult } from "@/types";
import { MockAgentProvider } from "./mock";
import type { AgentProvider } from "./types";

/**
 * Calls the server route /api/agents/run, which forwards to an
 * OpenAI-compatible Chat Completions endpoint (OpenAI, Azure OpenAI or a
 * gateway). Keys never reach the browser. If the route is not configured or
 * fails, the deterministic mock is used so a live demo can never break.
 */
export class OpenAICompatibleProvider implements AgentProvider {
  readonly id = "openai-compatible";
  readonly label = "OpenAI-compatible LLM (server route)";
  private fallback = new MockAgentProvider();

  async run<TOutput>(request: AgentRunRequest): Promise<AgentRunResult<TOutput>> {
    try {
      const res = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      if (!res.ok) throw new Error(`Agent route returned ${res.status}`);
      return (await res.json()) as AgentRunResult<TOutput>;
    } catch (err) {
      console.warn("[agent-service] LLM provider unavailable, using deterministic mock.", err);
      const result = await this.fallback.run<TOutput>(request);
      return { ...result, provider: "mock-fallback" };
    }
  }
}
