/**
 * Domain types for the Agentic Supplier & Procurement Lifecycle Orchestrator.
 * All data used with these types in the demo is SYNTHETIC.
 */

export type StageId =
  | "intake"
  | "rfx"
  | "suppliers"
  | "evaluation"
  | "approvals"
  | "contract"
  | "monitoring";

export type StageStatus = "not_started" | "in_progress" | "awaiting_human" | "completed";

export interface StageDefinition {
  id: StageId;
  number: string;
  name: string;
  short: string;
  route: string;
  agentId: AgentId;
  description: string;
}

export type AgentId =
  | "demand"
  | "sourcing"
  | "supplier"
  | "evaluation"
  | "approval"
  | "contract"
  | "monitoring";

export type AgentRuntimeStatus = "active" | "idle" | "running" | "paused";

export interface AgentDefinition {
  id: AgentId;
  name: string;
  shortName: string;
  stage: StageId;
  mission: string;
  permissions: string[];
  prohibited: string[];
  systems: string[];
  humanApproval: string;
  dataClassification: string;
  identity: string;
}

export interface AgentRuntimeState {
  status: AgentRuntimeStatus;
  currentTask: string;
  lastAction: string;
  lastActionAt: string | null;
  confidence: number | null;
  revokedPermissions: string[];
  requireHumanApproval: boolean;
  runs: number;
}

/** Explainable-AI evidence summary. Deliberately NOT chain-of-thought. */
export interface ReasoningSummary {
  evidence: string[];
  rulesApplied: string[];
  recommendation: string;
  confidence: number;
  humanDecision: string;
}

export interface AgentRunRequest<TInput = unknown> {
  agentId: AgentId;
  task: AgentTask;
  input?: TInput;
}

export type AgentTask =
  | "intake.analyse"
  | "rfx.generate"
  | "rfx.policy"
  | "supplier.assess"
  | "evaluation.analyse"
  | "evaluation.deviations"
  | "evaluation.missing"
  | "evaluation.commercial"
  | "evaluation.brief"
  | "approval.prepare"
  | "contract.extract"
  | "contract.ask"
  | "monitoring.assess";

export interface AgentRunResult<TOutput = unknown> {
  agentId: AgentId;
  task: AgentTask;
  output: TOutput;
  reasoning: ReasoningSummary;
  provider: string;
  durationMs: number;
  completedAt: string;
}

export type Severity = "low" | "medium" | "high" | "critical";

/* ----------------------------- Intake ----------------------------- */

export interface IntakeForm {
  objective: string;
  department: string;
  description: string;
  budgetRange: string;
  requiredBy: string;
  strategicImportance: string;
  existingVendors: string;
  dataClassification: string;
  regulatorySensitivity: string;
}

export interface IntakeAnalysis {
  completeness: number;
  category: string;
  subCategory: string;
  route: string;
  routeRationale: string;
  policyIssues: { title: string; detail: string; severity: Severity; policyRef: string }[];
  missingInformation: string[];
  riskLevel: Severity;
  riskDrivers: string[];
  stakeholders: { role: string; reason: string }[];
  methodology: string;
}

/* ------------------------------ RFx ------------------------------- */

export interface RfxSection {
  id: string;
  title: string;
  content: string;
  editedByHuman?: boolean;
}

export interface RfxVersion {
  version: string;
  author: string;
  authorType: "agent" | "human";
  timestamp: string;
  note: string;
}

export interface PolicyCheckItem {
  rule: string;
  ref: string;
  status: "pass" | "warning" | "fail";
  note: string;
}

/* ---------------------------- Suppliers ---------------------------- */

export type RagStatus = "green" | "amber" | "red";

export interface Supplier {
  id: string;
  name: string;
  shortName: string;
  hq: string;
  founded: number;
  employees: string;
  tagline: string;
  overall: { score: number; label: string; rag: RagStatus };
  financialStability: { indicator: string; rag: RagStatus; note: string };
  compliance: { status: string; rag: RagStatus; certifications: string[] };
  historicalPerformance: { score: number; note: string };
  relevantExperience: string[];
  contractHistory: { contracts: number; totalValue: string; lastEngagement: string };
  deliveryPerformance: { onTime: number; note: string };
  riskIndicators: { label: string; severity: Severity }[];
  openIssues: { id: string; title: string; severity: Severity }[];
  sanctionsCheck: { status: "clear" | "review" | "flag"; screenedAt: string; lists: string };
  dataCompleteness: number;
  relationshipExposure: { level: string; rag: RagStatus; note: string };
  strengths: string[];
  risks: string[];
  conflicts: string[];
  diligenceGaps: string[];
  trend: number[];
}

export interface SupplierAssessment {
  shortlist: string[];
  excluded: { supplierId: string; reason: string }[];
  summary: string;
}

/* --------------------------- Evaluation ---------------------------- */

export interface EvaluationCriterion {
  id: string;
  name: string;
  weight: number;
  group: "technical" | "commercial";
  description: string;
}

export interface BidScore {
  supplierId: string;
  scores: Record<string, number>; // criterionId -> 0..10
  price: number; // AED
  riskAdjustment: number; // penalty points
  notes: Record<string, string>;
}

export interface Finding {
  id: string;
  supplierId: string;
  title: string;
  detail: string;
  severity: Severity;
  reference: string;
}

export interface AwardDecision {
  supplierId: string;
  decidedBy: string;
  rationale: string;
  followedRecommendation: boolean;
  decidedAt: string;
}

/* ---------------------------- Approvals ---------------------------- */

export type ApprovalStatus = "not_started" | "pending" | "approved" | "needs_clarification" | "returned";

export interface ApprovalStep {
  id: string;
  role: string;
  approver: string;
  reason: string;
  status: ApprovalStatus;
  sla: string;
  dueInHours: number;
  overdue?: boolean;
  remindersSent: number;
  escalated?: boolean;
  comment?: string;
  decidedAt?: string;
}

/* ---------------------------- Contract ----------------------------- */

export interface Obligation {
  id: string;
  category: "Obligation" | "SLA" | "Payment" | "Renewal" | "Termination" | "Penalty" | "Data" | "Security";
  title: string;
  clause: string;
  summary: string;
  party: "Supplier" | "ECB" | "Both";
  due?: string;
  owner?: string;
  reminder?: string;
  risk?: Severity;
}

export interface ContractMilestone {
  id: string;
  label: string;
  date: string;
  type: "payment" | "delivery" | "review" | "renewal";
  amount?: string;
  status: "done" | "upcoming" | "at_risk";
}

export interface ContractQA {
  question: string;
  answer: string;
  citations: string[];
  askedAt: string;
}

/* --------------------------- Monitoring ---------------------------- */

export interface MonitoringEvent {
  id: string;
  title: string;
  detail: string;
  severity: Severity;
  detectedAt: string;
  source: string;
}

export interface MonitoringAssessment {
  impact: string;
  affectedObligation: string;
  riskLevel: Severity;
  riskScoreBefore: number;
  riskScoreAfter: number;
  recommendedActions: string[];
  escalationRequired: boolean;
}

/* ------------------------- Audit & alerts -------------------------- */

export type ActorType = "agent" | "human" | "system";

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  actorType: ActorType;
  action: string;
  detail?: string;
  stage?: StageId | "governance" | "platform";
  agentId?: AgentId;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  tone: "info" | "success" | "warning" | "action";
  href?: string;
}
