import type { ActorType, AgentId, AuditEvent, StageId } from "@/types";

let counter = 0;

export function newId(prefix: string) {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}`;
}

export interface AuditInput {
  actor: string;
  actorType: ActorType;
  action: string;
  detail?: string;
  stage?: AuditEvent["stage"];
  agentId?: AgentId;
}

/** Build an immutable audit event. Storage is handled by the app store. */
export function createAuditEvent(input: AuditInput, at: Date = new Date()): AuditEvent {
  return Object.freeze({ id: newId("AUD"), timestamp: at.toISOString(), ...input });
}

export function stageLabel(stage?: StageId | "governance" | "platform") {
  if (!stage) return "Platform";
  if (stage === "governance") return "AI Control";
  if (stage === "platform") return "Platform";
  return stage.charAt(0).toUpperCase() + stage.slice(1);
}
