/**
 * Illustrative value hypotheses — to be validated during the PoV.
 * Baselines are placeholders to be replaced with ECB-measured figures.
 */
export interface ValueMetric {
  id: string;
  name: string;
  unit: string;
  baseline: string;
  baselineIndex: number; // indexed to 100
  targetIndex: number; // midpoint of target range, indexed
  target: string;
  measurement: string;
  demoSignal: string; // key into observed-demo calculator
}

export const VALUE_METRICS: ValueMetric[] = [
  {
    id: "cycle",
    name: "Procurement cycle time",
    unit: "days, intake → contract",
    baseline: "90–120 days (illustrative, to be baselined)",
    baselineIndex: 100,
    targetIndex: 65,
    target: "30–40% reduction",
    measurement: "Workflow timestamps from intake to contract signature across ≥10 PoV cases vs. 12-month historical sample.",
    demoSignal: "cycle",
  },
  {
    id: "effort",
    name: "Manual effort per sourcing event",
    unit: "person-hours",
    baseline: "~160 hrs (illustrative)",
    baselineIndex: 100,
    targetIndex: 55,
    target: "40–50% reduction",
    measurement: "Time-and-motion sampling of procurement team plus agent task logs; drafting and collation time isolated.",
    demoSignal: "effort",
  },
  {
    id: "onboarding",
    name: "Supplier onboarding / due-diligence time",
    unit: "days",
    baseline: "20–30 days (illustrative)",
    baselineIndex: 100,
    targetIndex: 60,
    target: "~40% reduction",
    measurement: "Elapsed time from supplier invitation to completed Supplier 360 with diligence gaps closed.",
    demoSignal: "onboarding",
  },
  {
    id: "evalprep",
    name: "Evaluation preparation effort",
    unit: "person-days",
    baseline: "5–8 person-days (illustrative)",
    baselineIndex: 100,
    targetIndex: 45,
    target: "50–60% reduction",
    measurement: "Effort to produce score matrix, deviation log and committee brief — agent-drafted vs. manual.",
    demoSignal: "evalprep",
  },
  {
    id: "approval",
    name: "Approval turnaround",
    unit: "business days",
    baseline: "10–15 days (illustrative)",
    baselineIndex: 100,
    targetIndex: 60,
    target: "30–50% reduction",
    measurement: "Time from decision-pack submission to final executive approval, including clarification loops.",
    demoSignal: "approval",
  },
  {
    id: "compliance",
    name: "Compliance exceptions",
    unit: "exceptions found post-award",
    baseline: "To be measured in PoV discovery",
    baselineIndex: 100,
    targetIndex: 50,
    target: "Shift detection pre-award (hypothesis)",
    measurement: "Count of policy/contract exceptions found by audit after award vs. those caught by agent pre-checks.",
    demoSignal: "compliance",
  },
];

export const VALUE_DISCLAIMER = "Illustrative value hypothesis — to be validated during PoV.";
