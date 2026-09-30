"use client";

import { toast } from "sonner";
import { AGENT_BY_ID } from "@/data/agents";
import { runAgent } from "@/services/agent-service";
import { useApp } from "@/lib/store";
import type { AgentId, AgentRunResult, AgentTask } from "@/types";

/** Permission each task requires. Revoking it in AI Control blocks the task. */
export const TASK_PERMISSION: Record<AgentTask, string> = {
  "intake.analyse": "Classify category",
  "rfx.generate": "Draft RFx documents",
  "rfx.policy": "Run policy comparison",
  "supplier.assess": "Run sanctions screening",
  "evaluation.analyse": "Score against published criteria",
  "evaluation.deviations": "Flag deviations",
  "evaluation.missing": "Flag deviations",
  "evaluation.commercial": "Score against published criteria",
  "evaluation.brief": "Draft committee brief",
  "approval.prepare": "Prepare decision pack",
  "contract.extract": "Extract clauses",
  "contract.ask": "Answer contract questions with citations",
  "monitoring.assess": "Raise alerts",
};

export const TASK_LABEL: Record<AgentTask, string> = {
  "intake.analyse": "Analysing demand request",
  "rfx.generate": "Generating RFx pack",
  "rfx.policy": "Comparing RFx to policy",
  "supplier.assess": "Assessing suppliers",
  "evaluation.analyse": "Analysing submissions",
  "evaluation.deviations": "Highlighting deviations",
  "evaluation.missing": "Identifying missing responses",
  "evaluation.commercial": "Detecting unusual commercial assumptions",
  "evaluation.brief": "Generating committee brief",
  "approval.prepare": "Preparing decision pack & routing",
  "contract.extract": "Extracting contract terms",
  "contract.ask": "Answering contract question",
  "monitoring.assess": "Assessing delivery event",
};

/**
 * Runs an agent task through the provider, enforcing AI Control policies
 * (pause, revoked permissions), updating runtime state and writing audit events.
 */
export async function runGuarded<T>(agentId: AgentId, task: AgentTask, input?: unknown): Promise<AgentRunResult<T> | null> {
  const st = useApp.getState();
  const agent = AGENT_BY_ID[agentId];
  const rt = st.agents[agentId];

  if (st.running.includes(task)) return null;

  if (rt.status === "paused") {
    st.log({ actor: "AI Control", actorType: "system", action: `Blocked ${agent.name}: agent is paused`, detail: TASK_LABEL[task], stage: "governance", agentId });
    toast.error(`${agent.name} is paused`, { description: "Resume the agent in AI Control to continue." });
    return null;
  }
  const perm = TASK_PERMISSION[task];
  if (rt.revokedPermissions.includes(perm)) {
    st.log({ actor: "AI Control", actorType: "system", action: `Blocked ${agent.name}: permission revoked`, detail: perm, stage: "governance", agentId });
    toast.error("Permission revoked", { description: `${agent.name} no longer holds “${perm}”. Restore it in AI Control.` });
    return null;
  }

  st.setRunning(task, true);
  st.patchAgent(agentId, { status: "running", currentTask: TASK_LABEL[task] });
  st.log({ actor: agent.name, actorType: "agent", action: `Started: ${TASK_LABEL[task]}`, stage: agent.stage, agentId });

  try {
    const result = await runAgent<T>({ agentId, task, input });
    const now = useApp.getState();
    now.patchAgent(agentId, {
      status: "active",
      currentTask: "Awaiting human decision",
      lastAction: result.reasoning.recommendation,
      lastActionAt: result.completedAt,
      confidence: result.reasoning.confidence,
      runs: now.agents[agentId].runs + 1,
    });
    now.log({
      actor: agent.name,
      actorType: "agent",
      action: `Completed: ${TASK_LABEL[task]}`,
      detail: `${result.reasoning.recommendation} (confidence ${Math.round(result.reasoning.confidence * 100)}%)`,
      stage: agent.stage,
      agentId,
    });
    return result;
  } catch (err) {
    useApp.getState().patchAgent(agentId, { status: "active", currentTask: "Error — retry available" });
    toast.error(`${agent.name} could not complete the task`, { description: String(err) });
    return null;
  } finally {
    useApp.getState().setRunning(task, false);
  }
}
