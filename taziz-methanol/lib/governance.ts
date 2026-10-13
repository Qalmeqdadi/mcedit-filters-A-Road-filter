// Simulated AI governance / policy engine.
// In this demo EVERY control action is disabled: agents can read, analyse, recommend and prepare drafts only.
import agentsJson from "@/data/agents.json";
import type { AgentId } from "./types";

export interface AgentProfile {
  id: AgentId;
  name: string;
  short: string;
  mission: string;
  color: string;
  icon: string;
  identity: string;
  sources: string[];
  read: string[];
  prepare: string[];
}

export const AGENTS = agentsJson.agents as AgentProfile[];
export const AGENT = Object.fromEntries(AGENTS.map((a) => [a.id, a])) as Record<AgentId, AgentProfile>;

export const DATA_DOMAINS = [
  { id: "historian", label: "Historian (read replica)", zone: "OT → DMZ replica" },
  { id: "alarms", label: "Alarm & event journal", zone: "OT → DMZ replica" },
  { id: "condition", label: "Condition monitoring", zone: "OT → DMZ replica" },
  { id: "envelope", label: "Operating envelope", zone: "IT" },
  { id: "eam", label: "EAM / CMMS", zone: "IT" },
  { id: "lims", label: "LIMS", zone: "IT" },
  { id: "documents", label: "Engineering documents", zone: "IT" },
  { id: "production", label: "MES / production plan", zone: "IT" },
  { id: "energy", label: "Energy model", zone: "IT" },
  { id: "shiftlog", label: "Shift log", zone: "IT" },
] as const;

export const ALLOWED_CAPABILITIES = [
  "Read approved data",
  "Analyse data",
  "Investigate deviations",
  "Retrieve documentation",
  "Make recommendations",
  "Prepare work requests (drafts)",
];

export interface Guardrail {
  id: string;
  title: string;
  detail: string;
  /** example action an agent might attempt, used by the guardrail test */
  probe: { agent: AgentId; action: string };
}

export const PROHIBITED: Guardrail[] = [
  { id: "GR-01", title: "Modify DCS settings", detail: "No writes to DCS set-points, modes or tuning.", probe: { agent: "process", action: "Write set-point: C-201 speed +2%" } },
  { id: "GR-02", title: "Modify SIS logic", detail: "Safety instrumented systems are out of scope for AI agents.", probe: { agent: "hse", action: "Change SIS trip setting on C-201 vibration" } },
  { id: "GR-03", title: "Bypass safety systems", detail: "No bypass, inhibit or override of any protection.", probe: { agent: "asset", action: "Inhibit machinery-protection trip on C-201" } },
  { id: "GR-04", title: "Execute plant commands", detail: "No start/stop/open/close commands to field equipment.", probe: { agent: "operations", action: "Open anti-surge valve FV-201" } },
  { id: "GR-05", title: "Change operating limits", detail: "Operating envelope changes only via MOC and human authority.", probe: { agent: "energy", action: "Raise reformer excess O₂ low limit" } },
  { id: "GR-06", title: "Close safety-critical alarms", detail: "Alarms are acknowledged and closed by operators only.", probe: { agent: "operations", action: "Acknowledge & close 38 flood alarms" } },
];

export const APPROVAL_GATES = [
  { action: "Approve investigation plan", approver: "Shift supervisor", sla: "Same shift" },
  { action: "Assign task to engineer", approver: "Shift supervisor / area engineer", sla: "Same shift" },
  { action: "Create maintenance review / notification", approver: "Maintenance planner", sla: "24 h" },
  { action: "Any operational change (set-points, line-ups)", approver: "Operator via DCS — outside AI scope", sla: "—" },
  { action: "Changes to limits / anti-surge / SIS", approver: "MOC process — outside AI scope", sla: "—" },
];

export interface PolicyDecision {
  allowed: boolean;
  policy: string;
  reason: string;
}

const CONTROL_VERBS = /(write|set-?point|open|close|start|stop|inhibit|bypass|override|change|raise|lower|acknowledge|trip)/i;

export function evaluateAction(agent: AgentId, action: string): PolicyDecision {
  const hit = PROHIBITED.find((g) => g.probe.action === action);
  if (hit) return { allowed: false, policy: hit.id, reason: `${hit.title} is prohibited for AI agents. Demo: all control actions disabled.` };
  if (CONTROL_VERBS.test(action)) return { allowed: false, policy: "GR-00", reason: "Control-type action detected. Agents may only recommend; humans act through authorised systems." };
  return { allowed: true, policy: "PA-READ", reason: `${AGENT[agent]?.short ?? agent} may ${action.toLowerCase()} (read / advisory scope).` };
}

/** Validates that a recommendation is advisory (used by the HSE agent during orchestration). */
export function isAdvisory(text: string) {
  return !/(write set-?point|bypass|inhibit|override|change sis)/i.test(text);
}
