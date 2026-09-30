import type { BidScore, EvaluationCriterion, Finding } from "@/types";

export const CRITERIA: EvaluationCriterion[] = [
  { id: "technical", name: "Technical fit", weight: 25, group: "technical", description: "Coverage of functional & technical requirements T1–T6." },
  { id: "security", name: "Security & compliance", weight: 20, group: "technical", description: "Mandatory requirements, certifications, data residency." },
  { id: "architecture", name: "Architecture", weight: 15, group: "technical", description: "Scalability, integration, openness and resilience." },
  { id: "implementation", name: "Implementation approach", weight: 15, group: "technical", description: "Plan, migration method, team and governance." },
  { id: "commercial", name: "Commercial", weight: 15, group: "commercial", description: "Total cost of ownership over 3 years and commercial terms." },
  { id: "experience", name: "Experience", weight: 10, group: "technical", description: "Comparable regulated-sector deployments and references." },
];

/** SYNTHETIC bid scores (0–10) — illustrative only. */
export const BIDS: BidScore[] = [
  {
    supplierId: "alpha",
    scores: { technical: 8.6, security: 8.8, architecture: 8.2, implementation: 8.0, commercial: 7.9, experience: 8.5 },
    price: 2_150_000,
    riskAdjustment: 1.5,
    notes: { security: "UAE primary + DR; ISO 27001 & SOC 2", commercial: "Within budget; fixed-price implementation" },
  },
  {
    supplierId: "gulf",
    scores: { technical: 8.1, security: 8.2, architecture: 8.4, implementation: 7.4, commercial: 7.2, experience: 8.8 },
    price: 2_320_000,
    riskAdjustment: 2.0,
    notes: { implementation: "Aggressive plan; history of slippage", architecture: "Best-in-class integration design" },
  },
  {
    supplierId: "nova",
    scores: { technical: 8.3, security: 6.4, architecture: 7.8, implementation: 6.6, commercial: 9.4, experience: 6.2 },
    price: 1_780_000,
    riskAdjustment: 6.5,
    notes: { security: "ISO 27001 pending; backups outside UAE", commercial: "Lowest price; excludes rule migration" },
  },
  {
    supplierId: "meridian",
    scores: { technical: 7.6, security: 7.9, architecture: 7.2, implementation: 7.8, commercial: 6.3, experience: 7.4 },
    price: 2_460_000,
    riskAdjustment: 4.0,
    notes: { commercial: "Exceeds approved budget by AED 60K", experience: "Advisory-heavy experience" },
  },
];

export const DEVIATIONS: Finding[] = [
  { id: "DEV-1", supplierId: "nova", title: "Backup/DR region outside UAE", detail: "Standard offering replicates backups to an EU region. Conflicts with mandatory requirement M1.", severity: "high", reference: "Nova — Technical Response §4.3" },
  { id: "DEV-2", supplierId: "gulf", title: "Licensor support not back-to-back", detail: "Platform licensor's SLA (8×5) does not match proposed 24×7 managed-service SLA.", severity: "medium", reference: "Gulf Digital — Commercial Schedule B" },
  { id: "DEV-3", supplierId: "meridian", title: "Liability cap below RFx terms", detail: "Proposes liability cap at 50% of annual fees vs. 100% of contract value requested.", severity: "medium", reference: "Meridian — Legal Deviations Table, row 7" },
];

export const MISSING_RESPONSES: Finding[] = [
  { id: "MIS-1", supplierId: "nova", title: "Q5 sub-processor list not provided", detail: "Response states 'available on request'.", severity: "high", reference: "RFx Supplier Question Q5" },
  { id: "MIS-2", supplierId: "alpha", title: "Key-person CVs incomplete", detail: "2 of 5 named key personnel lack CVs.", severity: "low", reference: "RFx Supplier Question Q4" },
];

export const COMMERCIAL_ANOMALIES: Finding[] = [
  { id: "COM-1", supplierId: "nova", title: "Price 26% below median; rule migration excluded", detail: "Migration of ~1,200 rules listed as exclusion — estimated AED 280–350K additional cost if procured separately.", severity: "high", reference: "Nova — Commercial Assumptions A4" },
  { id: "COM-2", supplierId: "gulf", title: "Licence indexation of 7% p.a. from Year 2", detail: "Increases 3-year TCO by ~AED 96K versus flat pricing.", severity: "medium", reference: "Gulf Digital — Pricing Schedule note 3" },
];

export const COMMITTEE_BRIEF = {
  title: "Evaluation Committee Brief — PRC-2026-0147",
  sections: [
    { heading: "Purpose", body: "To support the Evaluation Committee's award decision for the Enterprise Data Quality & Analytics Platform. This brief is agent-prepared and must be validated by the committee." },
    { heading: "Summary of scores", body: "Alpha Data Systems ranks first on both weighted (83.8) and risk-adjusted (82.3) scores. Gulf Digital Solutions ranks second (78.0 risk-adjusted). Nova Analytics offers the lowest price but carries material security and residency deviations. Meridian Technologies exceeds budget and has a potential conflict of interest under Legal review." },
    { heading: "Recommendation", body: "Recommend award to Alpha Data Systems at AED 2.15M (within the AED 2.4M estimate), subject to: (1) receipt of outstanding key-person CVs, (2) recusal of one evaluator with prior engagement involvement, (3) a key-person retention clause in the contract." },
    { heading: "Key trade-offs", body: "Choosing Nova would save ~AED 370K upfront but exposes ECB to data-residency non-compliance and unpriced migration effort. Gulf Digital offers the strongest architecture but increases supplier concentration and schedule risk." },
    { heading: "Decision required", body: "The Evaluation Committee (human) must confirm or reject the recommendation and record its rationale." },
  ],
};
