/** SYNTHETIC procurement portfolio shown on the Command Center. */
export const PORTFOLIO = [
  { id: "PRC-2026-0141", title: "Cyber threat intelligence subscription", owner: "Information Security", value: 640_000, stage: "Bid Evaluation", health: "on_track" as const, agent: "Evaluation Agent" },
  { id: "PRC-2026-0138", title: "Contact-centre CX platform renewal", owner: "Operations", value: 1_150_000, stage: "Approval Orchestration", health: "at_risk" as const, agent: "Approval Agent" },
  { id: "PRC-2026-0133", title: "Cloud cost optimisation services", owner: "Data & Technology", value: 380_000, stage: "RFx Preparation", health: "on_track" as const, agent: "Sourcing / RFx Agent" },
  { id: "PRC-2026-0129", title: "Regulatory reporting advisory", owner: "Risk & Compliance", value: 910_000, stage: "Contract Intelligence", health: "on_track" as const, agent: "Contract Intelligence Agent" },
  { id: "PRC-2026-0122", title: "Workplace facilities management", owner: "Corporate Services", value: 1_720_000, stage: "Continuous Monitoring", health: "attention" as const, agent: "Monitoring & Risk Agent" },
];

export const PIPELINE_BY_STAGE = [
  { stage: "Intake", count: 3 },
  { stage: "RFx", count: 2 },
  { stage: "Suppliers", count: 2 },
  { stage: "Evaluation", count: 2 },
  { stage: "Approvals", count: 2 },
  { stage: "Contract", count: 1 },
  { stage: "Monitoring", count: 2 },
];

export const PORTFOLIO_KPIS = {
  activeProcurements: 14,
  supplierRisks: 6,
  contractsApproachingMilestones: 5,
  cycleTimeImprovement: "30–40%",
  manualHoursAvoided: "~1,900 hrs / yr",
};
