import type { AgentRunRequest, AgentRunResult } from "@/types";

/**
 * Provider abstraction. Any LLM backend (OpenAI, Azure OpenAI, a private
 * gateway, etc.) implements this interface and returns the same structured
 * result shape, so UI and workflow code never depend on a specific vendor.
 */
export interface AgentProvider {
  readonly id: string;
  readonly label: string;
  run<TOutput = unknown>(request: AgentRunRequest): Promise<AgentRunResult<TOutput>>;
}
