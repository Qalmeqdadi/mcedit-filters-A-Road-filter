import type { StageDefinition } from "@/types";

export const STAGES: StageDefinition[] = [
  {
    id: "intake",
    number: "01",
    name: "Demand Intake",
    short: "Intake",
    route: "/case/intake",
    agentId: "demand",
    description: "Capture and qualify the business need against procurement policy.",
  },
  {
    id: "rfx",
    number: "02",
    name: "RFx Preparation",
    short: "RFx",
    route: "/case/rfx",
    agentId: "sourcing",
    description: "Draft a policy-aligned RFP pack for human review.",
  },
  {
    id: "suppliers",
    number: "03",
    name: "Supplier Intelligence",
    short: "Suppliers",
    route: "/case/suppliers",
    agentId: "supplier",
    description: "Assemble a Supplier 360 view and recommend a shortlist.",
  },
  {
    id: "evaluation",
    number: "04",
    name: "Bid Evaluation",
    short: "Evaluation",
    route: "/case/evaluation",
    agentId: "evaluation",
    description: "Score submissions consistently and brief the committee.",
  },
  {
    id: "approvals",
    number: "05",
    name: "Approval Orchestration",
    short: "Approvals",
    route: "/case/approvals",
    agentId: "approval",
    description: "Route the decision pack through the delegation-of-authority matrix.",
  },
  {
    id: "contract",
    number: "06",
    name: "Contract Intelligence",
    short: "Contract",
    route: "/case/contract",
    agentId: "contract",
    description: "Extract obligations, SLAs, milestones and risks.",
  },
  {
    id: "monitoring",
    number: "07",
    name: "Continuous Monitoring",
    short: "Monitoring",
    route: "/case/monitoring",
    agentId: "monitoring",
    description: "Watch delivery, SLAs and risk signals across the contract life.",
  },
];

export const STAGE_BY_ID = Object.fromEntries(STAGES.map((s) => [s.id, s])) as Record<
  StageDefinition["id"],
  StageDefinition
>;
