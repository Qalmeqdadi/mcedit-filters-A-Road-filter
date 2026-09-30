import type { AgentRunRequest, AgentRunResult } from "@/types";
import { MockAgentProvider } from "./providers/mock";
import { OpenAICompatibleProvider } from "./providers/openai-compatible";
import type { AgentProvider } from "./providers/types";

let provider: AgentProvider | null = null;

/** Resolve the configured provider. Defaults to the deterministic mock. */
export function getAgentProvider(): AgentProvider {
  if (provider) return provider;
  const configured = process.env.NEXT_PUBLIC_AGENT_PROVIDER ?? "mock";
  provider = configured === "openai-compatible" ? new OpenAICompatibleProvider() : new MockAgentProvider();
  return provider;
}

/** Override the provider at runtime (e.g. tests or a settings screen). */
export function setAgentProvider(p: AgentProvider) {
  provider = p;
}

export function runAgent<TOutput = unknown>(request: AgentRunRequest): Promise<AgentRunResult<TOutput>> {
  return getAgentProvider().run<TOutput>(request);
}
