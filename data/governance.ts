/** Synthetic governance policy set used by AI Control (illustrative). */
export const RBAC_ROLES = [
  { role: "Procurement Lead", id: "procurement.lead", can: ["Approve routes", "Confirm shortlist", "Chair evaluation", "Manage AI Control"], cannot: ["Approve own requests"] },
  { role: "Category Manager", id: "procurement.category", can: ["Edit & release RFx", "Issue clarifications"], cannot: ["Award contracts"] },
  { role: "Evaluation Committee", id: "evaluation.member", can: ["Score bids", "Make award decision"], cannot: ["Edit weightings after issue"] },
  { role: "Approver (DoA)", id: "approver.doa", can: ["Approve / return / clarify within limit"], cannot: ["Approve above delegated limit"] },
  { role: "Auditor", id: "audit.readonly", can: ["Read audit trail & evidence"], cannot: ["Change any record"] },
  { role: "Agent service identity", id: "svc-agent-*", can: ["Scoped read, draft, analyse, notify"], cannot: ["Approve, award, sign, pay, contact suppliers"] },
];

export const APPROVAL_THRESHOLDS = [
  { action: "Sourcing route recommendation", gate: "Procurement Manager", locked: false },
  { action: "RFx release to market", gate: "Category Manager", locked: false },
  { action: "Supplier shortlist / exclusion", gate: "Procurement Manager", locked: false },
  { action: "Contract award", gate: "Evaluation Committee — always human", locked: true },
  { action: "Approvals > AED 500K", gate: "Finance + DoA approvers", locked: true },
  { action: "Approvals > AED 2M", gate: "Legal + Executive Approver", locked: true },
  { action: "Contractual remedies / escalation", gate: "Contract Owner", locked: true },
];

export const GLOBAL_PROHIBITED = [
  "Make or communicate an award decision",
  "Approve on behalf of any human",
  "Sign, amend or terminate contracts",
  "Initiate payments or apply penalties",
  "Access consumer credit files",
  "Contact suppliers without human release",
];

export const DATA_CLASSES = [
  { level: "Public", handling: "No restriction", agents: "—" },
  { level: "Internal", handling: "Tenant-only processing", agents: "Demand & Policy, Sourcing / RFx" },
  { level: "Confidential", handling: "UAE-resident processing; masked in logs", agents: "Supplier, Approval, Monitoring" },
  { level: "Commercial in Confidence", handling: "Sealed until technical lock; need-to-know", agents: "Evaluation" },
  { level: "Legal", handling: "Legal-validated outputs only", agents: "Contract Intelligence" },
];

/** Tasks whose human gate cannot be relaxed. */
export const LOCKED_HUMAN_GATES = new Set(["evaluation", "approval", "monitoring"]);
