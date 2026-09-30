/** Synthetic background activity from other procurements in the portfolio. */
export const PORTFOLIO_ACTIVITY = [
  { time: "08:31", actor: "Monitoring & Risk Agent", type: "agent" as const, action: "Completed scheduled sanctions re-screen for 42 active suppliers — all clear", ref: "Portfolio" },
  { time: "08:47", actor: "Supplier Intelligence Agent", type: "agent" as const, action: "Completed due diligence review", ref: "PRC-2026-0141" },
  { time: "08:52", actor: "Evaluation Agent", type: "agent" as const, action: "Identified 3 deviations in threat-intel submissions", ref: "PRC-2026-0141" },
  { time: "09:04", actor: "Approval Agent", type: "agent" as const, action: "Routed decision to Information Security", ref: "PRC-2026-0138" },
  { time: "09:11", actor: "Rahul Menon — Finance (demo persona)", type: "human" as const, action: "Accepted recommendation and approved budget release", ref: "PRC-2026-0138" },
  { time: "09:18", actor: "Contract Intelligence Agent", type: "agent" as const, action: "Flagged renewal notice window opening in 60 days", ref: "PRC-2026-0129" },
  { time: "09:26", actor: "Monitoring & Risk Agent", type: "agent" as const, action: "SLA breach (response time) detected — service credit recommended for human review", ref: "PRC-2026-0122" },
];

/** Ambient events that appear periodically on the activity feed (simulated). */
export const AMBIENT_ACTIVITY = [
  { actor: "Monitoring & Risk Agent", action: "Ingested daily SLA report — 3 contracts within tolerance", ref: "Portfolio" },
  { actor: "Sourcing / RFx Agent", action: "Drafted clarification response Q3 for review", ref: "PRC-2026-0133" },
  { actor: "Supplier Intelligence Agent", action: "Refreshed adverse-media scan — no new findings", ref: "Portfolio" },
  { actor: "Approval Agent", action: "Sent reminder to Legal (CX platform renewal)", ref: "PRC-2026-0138" },
  { actor: "Contract Intelligence Agent", action: "Linked 2 new obligations to owners", ref: "PRC-2026-0129" },
];
