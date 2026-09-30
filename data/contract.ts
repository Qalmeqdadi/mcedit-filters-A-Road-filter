import type { ContractMilestone, Obligation } from "@/types";

/** SYNTHETIC contract — illustrative only. */
export const CONTRACT = {
  id: "CTR-2026-0093",
  title: "Master Services & Licence Agreement — Enterprise Data Quality & Analytics Platform",
  supplierId: "alpha",
  value: 2_150_000,
  term: "3 years",
  start: "2026-11-15",
  end: "2029-11-14",
  governingLaw: "Laws of the Emirate of Abu Dhabi and applicable UAE federal law",
  pages: 64,
  clauses: 38,
};

export const OBLIGATIONS: Obligation[] = [
  { id: "OB-01", category: "Obligation", title: "Deliver data-quality foundation (Phase 1)", clause: "Sch. 2 §3.1", summary: "Supplier to deploy profiling, cleansing and monitoring for 14 core pipelines.", party: "Supplier", due: "2027-02-15", risk: "medium" },
  { id: "OB-02", category: "Obligation", title: "Migrate legacy quality rules", clause: "Sch. 2 §3.4", summary: "Migrate ~1,200 rules with documented equivalence testing signed off by ECB.", party: "Supplier", due: "2027-03-31", risk: "high" },
  { id: "OB-03", category: "SLA", title: "Platform availability 99.7%", clause: "Sch. 4 §1.2", summary: "Measured monthly, excluding agreed maintenance windows.", party: "Supplier", risk: "medium" },
  { id: "OB-04", category: "SLA", title: "P1 incident response ≤ 30 minutes, 24×7", clause: "Sch. 4 §2.1", summary: "Resolution target 4 hours; root-cause report within 5 business days.", party: "Supplier", risk: "medium" },
  { id: "OB-05", category: "Payment", title: "Milestone-based implementation payments", clause: "Sch. 5 §1", summary: "Payment within 30 days of ECB acceptance certificate for each milestone.", party: "ECB", risk: "low" },
  { id: "OB-06", category: "Renewal", title: "Renewal notice window", clause: "Cl. 3.3", summary: "Either party may give notice of non-renewal no later than 90 days before expiry (by 16 Aug 2029).", party: "Both", due: "2029-08-16", risk: "medium" },
  { id: "OB-07", category: "Termination", title: "Termination for convenience", clause: "Cl. 21.2", summary: "ECB may terminate on 90 days' notice; pays for accepted deliverables and wind-down costs capped at AED 150K.", party: "ECB", risk: "low" },
  { id: "OB-08", category: "Termination", title: "Termination for material breach", clause: "Cl. 21.3", summary: "30-day cure period after written notice of material breach.", party: "Both", risk: "low" },
  { id: "OB-09", category: "Penalty", title: "Delay liquidated damages", clause: "Cl. 14.3", summary: "0.5% of milestone value per week of delay, capped at 10% of milestone value.", party: "Supplier", risk: "medium" },
  { id: "OB-10", category: "Penalty", title: "SLA service credits", clause: "Sch. 4 §4", summary: "Up to 15% of monthly managed-service fee for SLA shortfall.", party: "Supplier", risk: "low" },
  { id: "OB-11", category: "Data", title: "UAE data residency", clause: "Cl. 17.1", summary: "All ECB data, backups and DR copies stored and processed only within the UAE.", party: "Supplier", risk: "high" },
  { id: "OB-12", category: "Data", title: "Data return & deletion on exit", clause: "Cl. 17.6", summary: "Return data in open format within 30 days of exit and certify deletion.", party: "Supplier", risk: "medium" },
  { id: "OB-13", category: "Security", title: "Maintain ISO 27001 & annual penetration test", clause: "Cl. 18.2", summary: "Share certificate renewals and pen-test summaries annually.", party: "Supplier", due: "2027-11-15", risk: "medium" },
  { id: "OB-14", category: "Security", title: "Security incident notification within 24h", clause: "Cl. 18.5", summary: "Notify ECB of any security incident affecting ECB data within 24 hours.", party: "Supplier", risk: "high" },
];

export const CONTRACT_RISKS = [
  { title: "Key-person dependency", detail: "Retention clause covers solution architect only for 12 months (Cl. 9.4).", severity: "medium" as const },
  { title: "Rule-migration acceptance ambiguity", detail: "Equivalence test criteria reference an annex not yet finalised (Sch. 2 §3.4).", severity: "high" as const },
  { title: "Liability cap exclusions", detail: "Data-breach liability sits within general cap; Legal may seek a super-cap.", severity: "medium" as const },
];

export const MILESTONES: ContractMilestone[] = [
  { id: "M0", label: "Contract signature", date: "2026-11-15", type: "review", status: "upcoming" },
  { id: "M1", label: "Mobilisation", date: "2026-12-01", type: "payment", amount: "AED 215,000 (10%)", status: "upcoming" },
  { id: "M2", label: "Data-quality foundation", date: "2027-02-15", type: "payment", amount: "AED 537,500 (25%)", status: "upcoming" },
  { id: "M3", label: "Analytics platform build", date: "2027-05-30", type: "delivery", amount: "AED 537,500 (25%)", status: "upcoming" },
  { id: "M4", label: "Go-live & acceptance", date: "2027-07-15", type: "payment", amount: "AED 322,500 (15%)", status: "upcoming" },
  { id: "M5", label: "Annual service review", date: "2027-11-15", type: "review", status: "upcoming" },
  { id: "M6", label: "Renewal notice deadline", date: "2029-08-16", type: "renewal", status: "upcoming" },
];

export const CONTRACT_FAQ: { match: string[]; question: string; answer: string; citations: string[] }[] = [
  {
    match: ["terminat", "exit", "convenience"],
    question: "Can ECB terminate early, and what would it cost?",
    answer: "Yes. ECB may terminate for convenience on 90 days' written notice. ECB pays for deliverables accepted to date plus documented wind-down costs, capped at AED 150,000. Either party may terminate for material breach after a 30-day cure period.",
    citations: ["Cl. 21.2", "Cl. 21.3"],
  },
  {
    match: ["residen", "data", "backup", "location"],
    question: "Where must ECB data be stored?",
    answer: "All ECB data — including backups and disaster-recovery copies — must be stored and processed only within the UAE. On exit, the supplier must return data in an open format within 30 days and certify deletion.",
    citations: ["Cl. 17.1", "Cl. 17.6"],
  },
  {
    match: ["delay", "late", "penalt", "liquidated", "damages"],
    question: "What happens if a milestone is delayed?",
    answer: "Delay liquidated damages apply at 0.5% of the affected milestone value per week of delay, capped at 10% of that milestone's value. Application of damages is a human decision for ECB's contract owner.",
    citations: ["Cl. 14.3"],
  },
  {
    match: ["renew", "expir", "notice"],
    question: "When do we need to decide on renewal?",
    answer: "The contract expires on 14 Nov 2029. Notice of non-renewal must be given no later than 90 days before expiry — by 16 Aug 2029. A reminder can be created in the obligation register.",
    citations: ["Cl. 3.3"],
  },
  {
    match: ["sla", "availability", "incident", "uptime"],
    question: "What SLAs apply?",
    answer: "Platform availability of 99.7% measured monthly; P1 incident response within 30 minutes (24×7) with a 4-hour resolution target. Service credits up to 15% of the monthly managed-service fee apply for shortfalls.",
    citations: ["Sch. 4 §1.2", "Sch. 4 §2.1", "Sch. 4 §4"],
  },
  {
    match: ["pay", "invoice", "milestone"],
    question: "How are payments structured?",
    answer: "Implementation is paid by milestone (10% / 25% / 25% / 15%) within 30 days of ECB's acceptance certificate, with the remaining 25% as managed-service fees over three years.",
    citations: ["Sch. 5 §1"],
  },
];

export const SUGGESTED_QUESTIONS = [
  "Can ECB terminate early, and what would it cost?",
  "Where must ECB data be stored?",
  "What happens if a milestone is delayed?",
  "When do we need to decide on renewal?",
];

export const OWNERS = [
  "Contract Manager — Procurement",
  "Data Platform Lead — Data & Technology",
  "Information Security Officer",
  "Finance — Accounts Payable",
  "Legal Counsel",
];
