"use client";

import * as A from "@/lib/actions";
import type { AppState } from "@/lib/store";

export interface GuidedAction {
  label: string;
  actor: "agent" | "human";
  run: () => void | Promise<void>;
  done: (s: AppState) => boolean;
  target?: string; // data-guide id highlighted on the page
}

export interface GuidedStep {
  title: string;
  route: string;
  narration: string;
  talkingPoint: string;
  actions: GuidedAction[];
}

export const GUIDED_STEPS: GuidedStep[] = [
  {
    title: "New demand received",
    route: "/case/intake",
    narration: "Data & Technology has submitted a request for an Enterprise Data Quality & Analytics Platform, estimated at AED 2.4M with a 45-day target.",
    talkingPoint: "Everything starts from a structured business need — not an email chain.",
    actions: [],
  },
  {
    title: "Agent qualifies the request",
    route: "/case/intake",
    narration: "The Demand & Policy Agent checks completeness, classifies the category, applies procurement policy and recommends a route.",
    talkingPoint: "The agent recommends — the Procurement Manager decides.",
    actions: [
      { label: "Run Demand & Policy Agent", actor: "agent", run: A.analyseIntake, done: (s) => !!s.caseData.intake.analysis, target: "intake-analyse" },
      { label: "Approve recommendation", actor: "human", run: () => A.decideIntake("approved", "Approved via guided demo"), done: (s) => s.caseData.intake.decision === "approved", target: "intake-approve" },
    ],
  },
  {
    title: "RFx generated",
    route: "/case/rfx",
    narration: "The Sourcing / RFx Agent drafts a nine-section RFP from approved templates and checks it against policy before a human releases it.",
    talkingPoint: "Weeks of drafting become minutes — with version history and human edits preserved.",
    actions: [
      { label: "Generate RFx", actor: "agent", run: A.generateRfx, done: (s) => s.caseData.rfx.sections.length > 0, target: "rfx-generate" },
      { label: "Compare to policy", actor: "agent", run: A.comparePolicy, done: (s) => !!s.caseData.rfx.policy, target: "rfx-policy" },
      { label: "Send for review", actor: "human", run: A.sendRfxForReview, done: (s) => s.caseData.rfx.status === "in_review" || s.caseData.rfx.status === "approved", target: "rfx-review" },
      { label: "Await Category Manager approval", actor: "human", run: () => undefined, done: (s) => s.caseData.rfx.status === "approved" },
    ],
  },
  {
    title: "Suppliers assessed",
    route: "/case/suppliers",
    narration: "The Supplier Intelligence Agent assembles a Supplier 360 for each bidder: performance, compliance, sanctions screening, conflicts and diligence gaps.",
    talkingPoint: "External credit-risk information is used only where legally permitted and authorised.",
    actions: [
      { label: "Run Supplier Intelligence Agent", actor: "agent", run: A.assessSuppliers, done: (s) => !!s.caseData.suppliers.assessment, target: "suppliers-assess" },
      { label: "Confirm shortlist", actor: "human", run: A.confirmShortlist, done: (s) => s.caseData.suppliers.shortlistConfirmed, target: "suppliers-confirm" },
    ],
  },
  {
    title: "Bids evaluated",
    route: "/case/evaluation",
    narration: "The Evaluation Agent scores submissions against published criteria, flags deviations and unusual commercial assumptions, and drafts the committee brief.",
    talkingPoint: "Consistent, evidence-linked scoring — every number traces back to a source.",
    actions: [
      { label: "Analyse submissions", actor: "agent", run: A.analyseBids, done: (s) => !!s.caseData.evaluation.scores, target: "eval-analyse" },
      { label: "Highlight deviations", actor: "agent", run: A.highlightDeviations, done: (s) => !!s.caseData.evaluation.deviations, target: "eval-deviations" },
      { label: "Detect unusual commercial assumptions", actor: "agent", run: A.detectCommercial, done: (s) => !!s.caseData.evaluation.commercial, target: "eval-commercial" },
      { label: "Generate committee brief", actor: "agent", run: A.generateBrief, done: (s) => !!s.caseData.evaluation.brief, target: "eval-brief" },
    ],
  },
  {
    title: "Human chooses the supplier",
    route: "/case/evaluation",
    narration: "The agent has recommended Alpha Data Systems. The award decision belongs to the Evaluation Committee — a human decision, recorded with its rationale.",
    talkingPoint: "HUMAN DECISION REQUIRED — the agent never makes the award.",
    actions: [
      {
        label: "Committee awards to Alpha Data Systems",
        actor: "human",
        run: () => A.decideAward("alpha", "Highest risk-adjusted score; within budget; strongest security & residency posture."),
        done: (s) => !!s.caseData.evaluation.award,
        target: "eval-decide",
      },
    ],
  },
  {
    title: "Approval routed",
    route: "/case/approvals",
    narration: "The Approval Agent determines the six required approvers from the delegation-of-authority matrix, prepares the decision pack and chases outstanding actions.",
    talkingPoint: "The agent orchestrates; every approval is a human signature.",
    actions: [
      { label: "Prepare pack & route approvals", actor: "agent", run: A.routeApprovals, done: (s) => s.caseData.approvals.routed, target: "appr-route" },
      { label: "Send reminders", actor: "agent", run: A.sendAllReminders, done: (s) => s.caseData.approvals.steps.some((x) => x.remindersSent > 0) || !!s.caseData.approvals.completedAt, target: "appr-remind" },
      { label: "Simulate remaining approvers", actor: "human", run: A.simulateRemainingApprovals, done: (s) => !!s.caseData.approvals.completedAt, target: "appr-simulate" },
    ],
  },
  {
    title: "Contract analysed",
    route: "/case/contract",
    narration: "The Contract Intelligence Agent extracts obligations, SLAs, payment milestones, renewal and termination terms, and key risks — each with a clause citation.",
    talkingPoint: "The contract becomes a living obligations register, not a PDF in a folder.",
    actions: [
      { label: "Extract contract terms", actor: "agent", run: A.extractContract, done: (s) => s.caseData.contract.extracted, target: "contract-extract" },
      { label: "Legal validates obligations", actor: "human", run: A.validateContract, done: (s) => s.caseData.contract.validated, target: "contract-validate" },
    ],
  },
  {
    title: "Monitoring activated",
    route: "/case/monitoring",
    narration: "Monitoring runs for the life of the contract. We simulate month six: the supplier reports a 12-day delay on a payment milestone.",
    talkingPoint: "The agent detects, assesses and recommends. Escalation still needs a human.",
    actions: [
      { label: "Activate monitoring", actor: "human", run: A.activateMonitoring, done: (s) => s.caseData.monitoring.activated, target: "mon-activate" },
      { label: "Simulate 12-day delivery delay", actor: "agent", run: A.injectDelayEvent, done: (s) => !!s.caseData.monitoring.assessment, target: "mon-inject" },
      { label: "Approve escalation", actor: "human", run: () => A.decideEscalation("approved", "Approved via guided demo"), done: (s) => !!s.caseData.monitoring.escalation, target: "mon-escalate" },
    ],
  },
];
