// Core domain model for the Intelligent Methanol Plant demo.
// Everything here describes SYNTHETIC simulation data only.

export type ViewId =
  | "overview"
  | "plant"
  | "council"
  | "investigation"
  | "optimization"
  | "assets"
  | "energy"
  | "quality"
  | "knowledge"
  | "shift"
  | "control"
  | "scenarios"
  | "value";

export type AreaId = "feed" | "pretreat" | "reform" | "compress" | "synthesis" | "distill" | "storage";

export type Health = "normal" | "watch" | "alert" | "critical";

export type AgentId =
  | "operations"
  | "process"
  | "asset"
  | "energy"
  | "quality"
  | "hse"
  | "engineering"
  | "production"
  | "shift";

export type AgentStatus = "idle" | "investigating" | "awaiting" | "completed";

export type ScenarioId = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";

export type EvidenceSourceId =
  | "historian"
  | "alarms"
  | "asset-health"
  | "maintenance"
  | "lab"
  | "documents"
  | "procedures"
  | "production-plan";

export interface TagDef {
  id: string;
  name: string;
  area: AreaId;
  unit: string;
  /** expected / design value under normal operation */
  expected: number;
  /** normal operating band */
  low: number;
  high: number;
  decimals: number;
  /** relative noise amplitude (fraction of value) */
  noise: number;
  /** higher deviation is bad when "high", lower is bad when "low" */
  bad?: "high" | "low" | "both";
}

export interface TagPoint {
  t: number; // epoch ms (simulated clock)
  v: number;
}

export interface TagLive {
  id: string;
  value: number;
  target: number;
  history: TagPoint[];
  status: Health;
  /** % deviation from expected */
  deviationPct: number;
}

export interface Kpis {
  production: number; // t/day
  target: number; // t/day
  performance: number; // %
  purity: number; // wt %
  energyIntensity: number; // GJ/t
  availability: number; // %
  activeAlerts: number;
  investigations: number;
  recoveryTpd: number;
  opportunityAedM: number; // AED million / day (illustrative)
}

export interface AreaState {
  id: AreaId;
  status: Health;
  health: number;
  alerts: number;
  note?: string;
}

export interface PlantAlert {
  id: string;
  area: AreaId;
  severity: Health;
  title: string;
  detail: string;
  tagId?: string;
  raisedBy: AgentId | "dcs";
  time: string; // HH:MM plant time
}

export interface TimelineEvent {
  time: string;
  title: string;
  detail?: string;
  kind: "signal" | "deviation" | "agent" | "human" | "system";
  tagId?: string;
}

export interface Evidence {
  id: string;
  source: EvidenceSourceId;
  agentId: AgentId;
  title: string;
  detail: string;
  value?: string;
  signal: "supports" | "neutral" | "contradicts";
}

export interface Finding {
  id: string;
  agentId: AgentId;
  text: string;
  weight: "primary" | "contributing" | "context" | "ruled-out";
}

export interface Recommendation {
  id: string;
  title: string;
  detail: string;
  owner: string;
  kind: "verify" | "inspect" | "review" | "schedule" | "monitor";
}

export interface Impact {
  metrics: { label: string; value: string; sub?: string; tone?: "alert" | "warn" | "ok" | "info" }[];
  /** AED million per day (illustrative), null when not a production-loss case */
  exposureAedM: [number, number] | null;
  note: string;
}

export interface ReasoningSummary {
  evidenceConsidered: string[];
  correlations: string[];
  contradictions: string[];
  confidence: number;
  verification: string[];
}

/** One specialised agent's contribution in an investigation (output of Agent.analyze). */
export interface AgentStep {
  agentId: AgentId;
  task: string;
  checks: string[];
  loading: string[];
  sources: string[];
  evidence: Evidence[];
  findings: Finding[];
  confidence: number;
  /** schedule (ms from investigation start) used by the deterministic runner */
  startMs: number;
  durationMs: number;
  awaitingFromMs?: number;
  awaitingOn?: string;
}

export type DecisionKind = "approve" | "more-analysis" | "assign" | "maintenance-review" | "dismiss";

export interface Decision {
  kind: DecisionKind;
  by: string;
  role: string;
  at: string;
  note?: string;
}

export type InvestigationStatus = "queued" | "running" | "awaiting-approval" | "approved" | "assigned" | "dismissed";

export interface PlantEvent {
  id: string;
  time: string;
  title: string;
  detail: string;
  severity: Health;
  category: EventCategory;
  tagIds: string[];
}

export type EventCategory =
  | "production-deviation"
  | "asset-degradation"
  | "quality-risk"
  | "energy-deviation"
  | "feed-change"
  | "utility-imbalance"
  | "process-constraint"
  | "alarm-flood";

export interface Investigation {
  id: string;
  code: string;
  scenarioId: ScenarioId | "E2";
  title: string;
  question: string;
  trigger: PlantEvent;
  agents: AgentId[];
  steps: AgentStep[];
  consolidation: { start: number; dur: number; loading: string[] };
  totalMs: number;
  conclusion: { likelyCause: string; confidence: number; contributing: string[] };
  impact: Impact;
  reasoning: ReasoningSummary;
  recommendations: Recommendation[];
  timeline: TimelineEvent[];
  feed: FeedItem[];
  status: InvestigationStatus;
  decisions: Decision[];
  openedAt: string;
  extraAnalysis?: Finding[];
}

export interface AuditEntry {
  id: string;
  at: string; // HH:MM:SS plant time
  actorType: "agent" | "human" | "system" | "policy";
  actor: string;
  action: string;
  detail: string;
  outcome: "info" | "allowed" | "pending" | "approved" | "blocked" | "dismissed";
}

export interface FeedItem {
  atMs: number;
  agentId: AgentId;
  text: string;
  tone?: "info" | "finding" | "handoff" | "done";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  sections?: { title: string; items: string[] }[];
  sources?: string[];
}
