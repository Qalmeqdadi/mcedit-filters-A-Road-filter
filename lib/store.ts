"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { initialAgentRuntime } from "@/data/agents";
import { initialApprovalSteps } from "@/data/approvals";
import { CASE, INITIAL_INTAKE } from "@/data/case";
import { OBLIGATIONS } from "@/data/contract";
import { createAuditEvent, newId, type AuditInput } from "@/services/audit";
import { initialStageStatus, transition, type StageStatusMap, type WorkflowEvent } from "@/services/workflow";
import type {
  AgentId,
  AgentRuntimeState,
  AgentTask,
  AppNotification,
  ApprovalStep,
  AuditEvent,
  AwardDecision,
  ContractQA,
  Finding,
  IntakeAnalysis,
  IntakeForm,
  MonitoringAssessment,
  Obligation,
  PolicyCheckItem,
  ReasoningSummary,
  RfxSection,
  RfxVersion,
  SupplierAssessment,
} from "@/types";
import type { ComputedScore } from "@/lib/scoring";

export interface CommitteeBrief {
  title: string;
  sections: { heading: string; body: string }[];
}

export interface CaseData {
  stageStatus: StageStatusMap;
  intake: {
    form: IntakeForm;
    analysis: IntakeAnalysis | null;
    reasoning: ReasoningSummary | null;
    decision: null | "approved" | "changes_requested" | "escalated";
    decisionNote?: string;
  };
  rfx: {
    status: "not_started" | "draft" | "in_review" | "approved";
    sections: RfxSection[];
    reasoning: ReasoningSummary | null;
    policy: PolicyCheckItem[] | null;
    policyReasoning: ReasoningSummary | null;
    versions: RfxVersion[];
  };
  suppliers: {
    assessment: SupplierAssessment | null;
    reasoning: ReasoningSummary | null;
    shortlist: string[];
    shortlistConfirmed: boolean;
  };
  evaluation: {
    scores: ComputedScore[] | null;
    scoresReasoning: ReasoningSummary | null;
    deviations: Finding[] | null;
    missing: Finding[] | null;
    commercial: Finding[] | null;
    brief: CommitteeBrief | null;
    briefReasoning: ReasoningSummary | null;
    award: AwardDecision | null;
  };
  approvals: {
    routed: boolean;
    steps: ApprovalStep[];
    reasoning: ReasoningSummary | null;
    completedAt: string | null;
  };
  contract: {
    extracted: boolean;
    reasoning: ReasoningSummary | null;
    obligations: Obligation[];
    qa: ContractQA[];
    validated: boolean;
  };
  monitoring: {
    activated: boolean;
    eventInjected: boolean;
    assessment: MonitoringAssessment | null;
    reasoning: ReasoningSummary | null;
    escalation: null | "approved" | "declined";
  };
}

export interface GuidedState {
  active: boolean;
  step: number;
  minimized: boolean;
}

export interface AppState {
  hydrated: boolean;
  caseData: CaseData;
  agents: Record<AgentId, AgentRuntimeState>;
  audit: AuditEvent[];
  notifications: AppNotification[];
  guided: GuidedState;
  running: AgentTask[];
  aiControlOpen: boolean;
  demoStartedAt: string;

  // generic
  log: (input: AuditInput) => void;
  notify: (n: Omit<AppNotification, "id" | "timestamp" | "read">) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  dispatch: (event: WorkflowEvent) => void;
  patchCase: <K extends keyof CaseData>(key: K, patch: Partial<CaseData[K]>) => void;
  setRunning: (task: AgentTask, on: boolean) => void;
  setAiControlOpen: (open: boolean) => void;

  // agents
  patchAgent: (id: AgentId, patch: Partial<AgentRuntimeState>) => void;

  // guided demo
  setGuided: (patch: Partial<GuidedState>) => void;

  // lifecycle
  resetDemo: () => void;
  setHydrated: () => void;
}

export function initialCaseData(): CaseData {
  return {
    stageStatus: initialStageStatus(),
    intake: { form: { ...INITIAL_INTAKE }, analysis: null, reasoning: null, decision: null },
    rfx: { status: "not_started", sections: [], reasoning: null, policy: null, policyReasoning: null, versions: [] },
    suppliers: { assessment: null, reasoning: null, shortlist: [], shortlistConfirmed: false },
    evaluation: {
      scores: null,
      scoresReasoning: null,
      deviations: null,
      missing: null,
      commercial: null,
      brief: null,
      briefReasoning: null,
      award: null,
    },
    approvals: { routed: false, steps: initialApprovalSteps(), reasoning: null, completedAt: null },
    contract: { extracted: false, reasoning: null, obligations: OBLIGATIONS.map((o) => ({ ...o })), qa: [], validated: false },
    monitoring: { activated: false, eventInjected: false, assessment: null, reasoning: null, escalation: null },
  };
}

function seedAudit(): AuditEvent[] {
  const now = Date.now();
  return [
    createAuditEvent(
      { actor: "Intake Portal", actorType: "system", action: `Case ${CASE.id} created`, detail: CASE.title, stage: "intake" },
      new Date(now - 1000 * 60 * 42),
    ),
    createAuditEvent(
      {
        actor: "Mariam Al Suwaidi (demo persona)",
        actorType: "human",
        action: "Submitted demand request",
        detail: "Data & Technology — estimated AED 2.4M",
        stage: "intake",
      },
      new Date(now - 1000 * 60 * 41),
    ),
    createAuditEvent(
      { actor: "AI Control", actorType: "system", action: "7 specialist agents registered with least-privilege policies", stage: "governance" },
      new Date(now - 1000 * 60 * 40),
    ),
  ].reverse();
}

function seedNotifications(): AppNotification[] {
  return [
    {
      id: newId("NTF"),
      title: "New demand received",
      body: "Enterprise Data Quality & Analytics Platform — AED 2.4M, Data & Technology.",
      timestamp: new Date().toISOString(),
      read: false,
      tone: "action",
      href: "/case/intake",
    },
  ];
}

function freshState() {
  return {
    caseData: initialCaseData(),
    agents: initialAgentRuntime(),
    audit: seedAudit(),
    notifications: seedNotifications(),
    guided: { active: false, step: 0, minimized: false },
    running: [] as AgentTask[],
    demoStartedAt: new Date().toISOString(),
  };
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      aiControlOpen: false,
      ...freshState(),

      log: (input) => set((s) => ({ audit: [createAuditEvent(input), ...s.audit].slice(0, 400) })),

      notify: (n) =>
        set((s) => ({
          notifications: [{ ...n, id: newId("NTF"), timestamp: new Date().toISOString(), read: false }, ...s.notifications].slice(0, 50),
        })),

      markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
      markRead: (id) => set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),

      dispatch: (event) =>
        set((s) => ({ caseData: { ...s.caseData, stageStatus: transition(s.caseData.stageStatus, event) } })),

      patchCase: (key, patch) =>
        set((s) => ({ caseData: { ...s.caseData, [key]: { ...s.caseData[key], ...patch } } })),

      setRunning: (task, on) =>
        set((s) => ({ running: on ? Array.from(new Set([...s.running, task])) : s.running.filter((t) => t !== task) })),

      setAiControlOpen: (open) => set({ aiControlOpen: open }),

      patchAgent: (id, patch) => set((s) => ({ agents: { ...s.agents, [id]: { ...s.agents[id], ...patch } } })),

      setGuided: (patch) => set((s) => ({ guided: { ...s.guided, ...patch } })),

      resetDemo: () => {
        set({ ...freshState(), aiControlOpen: false });
        get().log({ actor: "Presenter", actorType: "human", action: "Demo reset to initial state", stage: "platform" });
      },

      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "ecb-agentic-procurement-demo-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        caseData: s.caseData,
        agents: s.agents,
        audit: s.audit,
        notifications: s.notifications,
        guided: s.guided,
        demoStartedAt: s.demoStartedAt,
      }),
      skipHydration: true,
    },
  ),
);

export const useCase = () => useApp((s) => s.caseData);

/** Called once on the client: restore persisted demo state, then mark hydrated. */
export async function hydrateStore() {
  await useApp.persist.rehydrate();
  const agents = { ...useApp.getState().agents };
  (Object.keys(agents) as AgentId[]).forEach((k) => {
    // Any agent that was mid-run when the page closed is restored to active.
    if (agents[k].status === "running") agents[k] = { ...agents[k], status: "active" };
  });
  useApp.setState({ agents, hydrated: true, running: [] });
}
