import { STAGES } from "@/data/stages";
import type { StageId, StageStatus } from "@/types";

/**
 * Explicit, declarative workflow state machine for the procurement lifecycle.
 * Each event maps to stage-status transitions. Guards ensure events are only
 * accepted in valid states, so the UI can never put the case into an
 * inconsistent state.
 */
export type WorkflowEvent =
  | "INTAKE_ANALYSED"
  | "INTAKE_APPROVED"
  | "INTAKE_CHANGES_REQUESTED"
  | "INTAKE_ESCALATED"
  | "RFX_GENERATED"
  | "RFX_SENT_FOR_REVIEW"
  | "RFX_APPROVED"
  | "SUPPLIERS_ASSESSED"
  | "SHORTLIST_CONFIRMED"
  | "BIDS_ANALYSED"
  | "BRIEF_GENERATED"
  | "AWARD_DECIDED"
  | "APPROVALS_ROUTED"
  | "APPROVALS_COMPLETED"
  | "CONTRACT_EXTRACTED"
  | "CONTRACT_VALIDATED"
  | "MONITORING_ACTIVATED";

export type StageStatusMap = Record<StageId, StageStatus>;

interface Transition {
  guard?: (s: StageStatusMap) => boolean;
  set: Partial<StageStatusMap>;
}

const T: Record<WorkflowEvent, Transition> = {
  INTAKE_ANALYSED: { set: { intake: "awaiting_human" } },
  INTAKE_APPROVED: { set: { intake: "completed", rfx: "in_progress" } },
  INTAKE_CHANGES_REQUESTED: { set: { intake: "in_progress" } },
  INTAKE_ESCALATED: { set: { intake: "awaiting_human" } },
  RFX_GENERATED: { set: { rfx: "in_progress" } },
  RFX_SENT_FOR_REVIEW: { set: { rfx: "awaiting_human" } },
  RFX_APPROVED: { set: { rfx: "completed", suppliers: "in_progress" } },
  SUPPLIERS_ASSESSED: { set: { suppliers: "awaiting_human" } },
  SHORTLIST_CONFIRMED: { set: { suppliers: "completed", evaluation: "in_progress" } },
  BIDS_ANALYSED: { set: { evaluation: "in_progress" } },
  BRIEF_GENERATED: { set: { evaluation: "awaiting_human" } },
  AWARD_DECIDED: { set: { evaluation: "completed", approvals: "in_progress" } },
  APPROVALS_ROUTED: { set: { approvals: "awaiting_human" } },
  APPROVALS_COMPLETED: { set: { approvals: "completed", contract: "in_progress" } },
  CONTRACT_EXTRACTED: { set: { contract: "awaiting_human" } },
  CONTRACT_VALIDATED: { set: { contract: "completed", monitoring: "in_progress" } },
  MONITORING_ACTIVATED: { set: { monitoring: "in_progress" } },
};

export function initialStageStatus(): StageStatusMap {
  return {
    intake: "in_progress",
    rfx: "not_started",
    suppliers: "not_started",
    evaluation: "not_started",
    approvals: "not_started",
    contract: "not_started",
    monitoring: "not_started",
  };
}

export function transition(state: StageStatusMap, event: WorkflowEvent): StageStatusMap {
  const t = T[event];
  if (t.guard && !t.guard(state)) return state;
  // Never regress a completed stage via a later event.
  const next = { ...state };
  for (const [k, v] of Object.entries(t.set) as [StageId, StageStatus][]) {
    if (state[k] === "completed" && v !== "completed") continue;
    next[k] = v;
  }
  return next;
}

export function currentStage(state: StageStatusMap): StageId {
  const active = STAGES.find((s) => state[s.id] !== "completed" && state[s.id] !== "not_started");
  if (active) return active.id;
  const firstOpen = STAGES.find((s) => state[s.id] !== "completed");
  return firstOpen ? firstOpen.id : "monitoring";
}

export function progressPercent(state: StageStatusMap): number {
  const weights: Record<StageStatus, number> = { not_started: 0, in_progress: 0.35, awaiting_human: 0.7, completed: 1 };
  const total = STAGES.reduce((a, s) => a + weights[state[s.id]], 0);
  return Math.round((total / STAGES.length) * 100);
}

export const STATUS_LABEL: Record<StageStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  awaiting_human: "Human decision",
  completed: "Completed",
};
