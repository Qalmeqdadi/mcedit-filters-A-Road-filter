import type { IntakeForm, RfxSection } from "@/types";

/** The single seeded procurement case. All values are synthetic demo data. */
export const CASE = {
  id: "PRC-2026-0147",
  title: "Enterprise Data Quality & Analytics Platform",
  businessOwner: "Data & Technology",
  sponsor: "Chief Data Officer (demo persona)",
  estimatedValue: 2_400_000,
  targetDays: 45,
  openedOn: "2026-09-28",
  targetCompletion: "2026-11-12",
  category: "IT Software & Platforms",
};

export const DEMO_USER = {
  name: "Aisha Rahman",
  role: "Head of Procurement",
  initials: "AR",
  note: "Synthetic demo persona",
};

export const INITIAL_INTAKE: IntakeForm = {
  objective:
    "Establish an enterprise data quality and analytics capability that improves the accuracy, timeliness and lineage of bureau data assets and enables self-service analytics for internal teams.",
  department: "Data & Technology",
  description:
    "Platform to profile, cleanse, match and monitor data quality across core bureau data pipelines, with governed analytics workspaces, lineage tracking and role-based access. Includes implementation, data migration of existing quality rules (~1,200 rules), knowledge transfer and 3 years of managed support.",
  budgetRange: "AED 2.0M – 2.5M",
  requiredBy: "2026-11-12",
  strategicImportance: "High — supports 2027 data strategy",
  existingVendors: "Current rule engine (in-house, end of support Q2 2027)",
  dataClassification: "Confidential",
  regulatorySensitivity: "High — regulated bureau data; UAE data residency applies",
};

export const DEPARTMENTS = ["Data & Technology", "Risk & Compliance", "Operations", "Finance", "Corporate Services"];
export const BUDGET_RANGES = ["< AED 500K", "AED 500K – 2.0M", "AED 2.0M – 2.5M", "AED 2.5M – 5.0M", "> AED 5.0M"];
export const STRATEGIC_LEVELS = ["Low — operational", "Medium — departmental", "High — supports 2027 data strategy", "Critical — regulatory mandate"];
export const CLASSIFICATIONS = ["Public", "Internal", "Confidential", "Restricted"];
export const REG_LEVELS = ["Low", "Medium", "High — regulated bureau data; UAE data residency applies"];

export const RFX_SECTIONS_GENERATED: RfxSection[] = [
  {
    id: "summary",
    title: "Executive summary",
    content:
      "Etihad Credit Bureau (\"ECB\") invites qualified suppliers to propose an Enterprise Data Quality & Analytics Platform. The solution will strengthen data accuracy, lineage and timeliness across bureau data pipelines and provide governed self-service analytics. The engagement comprises platform licensing, implementation, migration of existing quality rules, knowledge transfer and three years of managed support. [Synthetic demo content]",
  },
  {
    id: "scope",
    title: "Scope of work",
    content:
      "1. Data profiling, cleansing, matching and continuous quality monitoring for 14 core pipelines.\n2. Governed analytics workspaces with role-based access and full lineage.\n3. Migration of ~1,200 existing data-quality rules from the in-house engine.\n4. Integration with the enterprise data platform, identity provider and SIEM.\n5. Knowledge transfer, runbooks and 3-year managed support with defined SLAs.",
  },
  {
    id: "mandatory",
    title: "Mandatory requirements",
    content:
      "M1. All data processed and stored within the UAE (primary and backup).\nM2. ISO/IEC 27001 certification valid for the contract term.\nM3. Support for ECB's role-based access model and SSO (SAML 2.0 / OIDC).\nM4. Full audit logging exportable to ECB SIEM.\nM5. Compliance with applicable UAE data protection legislation and ECB information security policy.",
  },
  {
    id: "technical",
    title: "Technical requirements",
    content:
      "T1. Rule authoring for business users with version control.\nT2. Real-time and batch quality checks with configurable thresholds.\nT3. Column-level lineage from source to report.\nT4. Horizontal scalability to 3× current volumes without re-architecture.\nT5. Open APIs for orchestration and metadata exchange.\nT6. Encryption at rest (AES-256) and in transit (TLS 1.2+).",
  },
  {
    id: "commercial",
    title: "Commercial response structure",
    content:
      "C1. One-time implementation fee (fixed price, milestone-based).\nC2. Annual licence / subscription for years 1–3.\nC3. Managed support fee per year, linked to SLA tiers.\nC4. Rate card for change requests.\nC5. All assumptions, exclusions and dependencies stated explicitly. Prices in AED excluding VAT.",
  },
  {
    id: "questions",
    title: "Supplier questions",
    content:
      "Q1. Describe two comparable deployments in regulated financial-services environments.\nQ2. How is data residency guaranteed for backups and disaster recovery?\nQ3. Describe your approach to migrating legacy quality rules and validating equivalence.\nQ4. Provide your proposed team structure and key-person commitments.\nQ5. What sub-processors will have access to ECB data?",
  },
  {
    id: "methodology",
    title: "Evaluation methodology",
    content:
      "Two-envelope evaluation. Mandatory requirements assessed pass/fail. Technical and commercial envelopes scored 0–10 by an Evaluation Committee against published criteria, with a risk adjustment applied from due-diligence findings. Commercial envelope opened only after technical scoring is locked.",
  },
  {
    id: "weightings",
    title: "Weightings",
    content:
      "Technical fit 25% · Security & compliance 20% · Architecture 15% · Implementation approach 15% · Commercial 15% · Experience 10%",
  },
  {
    id: "timetable",
    title: "Submission timetable",
    content:
      "RFP issued: 06 Oct 2026\nClarification deadline: 13 Oct 2026\nSubmission deadline: 20 Oct 2026, 14:00 GST\nEvaluation complete: 29 Oct 2026\nAward recommendation: 03 Nov 2026\nContract signature (target): 12 Nov 2026",
  },
];

export const POLICY_CHECK = [
  { rule: "Open competitive tender required above AED 1M", ref: "PP-3.2", status: "pass" as const, note: "Route set to Open RFP; 4 suppliers invited." },
  { rule: "Evaluation criteria and weightings published in RFx", ref: "PP-5.1", status: "pass" as const, note: "Six weighted criteria published." },
  { rule: "Minimum 10 working days for complex submissions", ref: "PP-4.4", status: "warning" as const, note: "Timetable allows 10 working days — at minimum; consider +3 days." },
  { rule: "UAE data residency clause for Confidential data", ref: "IS-2.7", status: "pass" as const, note: "Mandatory requirement M1 present." },
  { rule: "Conflict-of-interest declarations from evaluators", ref: "PP-6.3", status: "warning" as const, note: "Declaration template not yet attached to evaluator pack." },
  { rule: "Sub-processor disclosure required", ref: "IS-4.1", status: "pass" as const, note: "Supplier question Q5 covers sub-processors." },
  { rule: "Commercial envelope sealed until technical lock", ref: "PP-5.6", status: "pass" as const, note: "Two-envelope method specified." },
];
