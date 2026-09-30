import { MOCK_RESPONSES } from "@/agents/mock-responses";
import { TASK_STEPS } from "@/agents/task-steps";
import type { AgentRunRequest, AgentRunResult } from "@/types";
import type { AgentProvider } from "./types";

const STEP_MS = 520;

/** Deterministic provider: always returns the same result, with realistic latency. */
export class MockAgentProvider implements AgentProvider {
  readonly id = "mock";
  readonly label = "Deterministic mock (demo)";

  async run<TOutput>(request: AgentRunRequest): Promise<AgentRunResult<TOutput>> {
    const started = Date.now();
    const steps = TASK_STEPS[request.task]?.length ?? 3;
    await new Promise((r) => setTimeout(r, steps * STEP_MS + 250));
    const handler = MOCK_RESPONSES[request.task];
    if (!handler) throw new Error(`No mock response registered for task ${request.task}`);
    const { output, reasoning } = handler(request.input);
    return {
      agentId: request.agentId,
      task: request.task,
      output: output as TOutput,
      reasoning,
      provider: this.id,
      durationMs: Date.now() - started,
      completedAt: new Date().toISOString(),
    };
  }
}

export const MOCK_STEP_MS = STEP_MS;
