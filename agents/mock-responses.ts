import { CONTRACT_FAQ, CONTRACT_RISKS, MILESTONES, OBLIGATIONS } from "@/data/contract";
import { POLICY_CHECK, RFX_SECTIONS_GENERATED } from "@/data/case";
import { COMMERCIAL_ANOMALIES, COMMITTEE_BRIEF, DEVIATIONS, MISSING_RESPONSES } from "@/data/evaluation";
import { DELAY_ASSESSMENT } from "@/data/monitoring";
import { rankedScores } from "@/lib/scoring";
import type { AgentTask, IntakeAnalysis, IntakeForm, ReasoningSummary, SupplierAssessment } from "@/types";

type MockHandler = (input: unknown) => { output: unknown; reasoning: ReasoningSummary };

/**
 * Deterministic mock responses. Each returns a structured output plus an
 * explainable evidence summary (evidence, rules, recommendation, confidence,
 * human decision) — never a chain-of-thought transcript.
 */
export const MOCK_RESPONSES: Record<AgentTask, MockHandler> = {
  "intake.analyse": (input) => {
    const form = (input ?? {}) as Partial<IntakeForm>;
    const filled = Object.values(form).filter((v) => typeof v === "string" && v.trim().length > 0).length;
    const total = 9;
    // Seeded request is designed to land at 92% (success-criteria & KPI info missing from the form).
    const completeness = filled >= total ? 92 : Math.max(40, Math.round((filled / total) * 92));
    const analysis: IntakeAnalysis = {
      completeness,
      category: "IT Software & Platforms",
      subCategory: "Data management & analytics platforms (SaaS + services)",
      route: "Open competitive RFP (two-envelope)",
      routeRationale: "Estimated value AED 2.4M exceeds the AED 1M open-tender threshold; multiple capable suppliers exist in market.",
      policyIssues: [
        { title: "Required-by date is aggressive for an open RFP", detail: "45 days allows the policy minimum for each phase with no contingency.", severity: "medium", policyRef: "PP-4.4" },
        { title: "Confidential data with third-party hosting", detail: "Information Security assessment and UAE data-residency clause mandatory.", severity: "high", policyRef: "IS-2.7" },
        { title: "Incumbent rule engine end-of-support", detail: "Exit and migration plan should be part of scope to avoid a follow-on single-source award.", severity: "low", policyRef: "PP-7.1" },
      ],
      missingInformation: [
        "Measurable success criteria / KPIs for the platform",
        "Confirmation of budget code and multi-year funding approval",
      ],
      riskLevel: "high",
      riskDrivers: ["Regulated bureau data", "Value > AED 2M", "Compressed timeline"],
      stakeholders: [
        { role: "Business Owner — Data & Technology", reason: "Requirement owner & budget holder" },
        { role: "Information Security", reason: "Confidential data, third-party hosting" },
        { role: "Legal", reason: "Value > AED 2M; data-processing terms" },
        { role: "Finance", reason: "Multi-year commitment" },
        { role: "Enterprise Architecture", reason: "Integration with data platform & IdP" },
      ],
      methodology: "Two-envelope weighted scoring: 85% technical (incl. security) / 15% commercial, with risk adjustment from due diligence.",
    };
    return {
      output: analysis,
      reasoning: {
        evidence: [
          "Intake form (9 fields) submitted by Data & Technology",
          "Budget range AED 2.0M–2.5M; estimate AED 2.4M",
          "Data classification: Confidential; regulatory sensitivity: High",
          "Existing vendor landscape: in-house engine, end of support Q2 2027",
        ],
        rulesApplied: ["PP-3.2 Open tender above AED 1M", "PP-4.4 Minimum response periods", "IS-2.7 Data residency for Confidential data", "PP-7.1 Exit planning"],
        recommendation: "Proceed via Open competitive RFP; add success KPIs and funding confirmation before RFx release.",
        confidence: 0.91,
        humanDecision: "Procurement Manager to approve route, request changes or escalate.",
      },
    };
  },

  "rfx.generate": () => ({
    output: RFX_SECTIONS_GENERATED,
    reasoning: {
      evidence: ["Approved demand PRC-2026-0147", "Template: IT Platforms RFP v4.2", "Demand & Policy Agent recommendation (approved)"],
      rulesApplied: ["PP-5.1 Publish criteria & weightings", "PP-5.6 Two-envelope method", "IS-2.7 Residency clause"],
      recommendation: "Draft RFx pack ready for Category Manager review. 9 sections generated.",
      confidence: 0.88,
      humanDecision: "Category Manager must review, edit and release the RFx.",
    },
  }),

  "rfx.policy": () => ({
    output: POLICY_CHECK,
    reasoning: {
      evidence: ["Current RFx draft", "Procurement Policy (7 applicable rules)", "Information Security Policy"],
      rulesApplied: POLICY_CHECK.map((p) => `${p.ref} ${p.rule}`),
      recommendation: "5 of 7 rules pass; 2 warnings to resolve or accept before release.",
      confidence: 0.94,
      humanDecision: "Reviewer accepts or remediates the 2 warnings.",
    },
  }),

  "supplier.assess": () => {
    const out: SupplierAssessment = {
      shortlist: ["alpha", "gulf", "nova"],
      excluded: [{ supplierId: "meridian", reason: "Potential organisational conflict of interest and sanctions name-match pending — proceed only after Legal clearance." }],
      summary: "Three suppliers recommended for shortlist. Meridian Technologies flagged for Legal review; may be re-admitted if cleared.",
    };
    return {
      output: out,
      reasoning: {
        evidence: ["Supplier master records (4)", "Sanctions screening across 5 lists", "Performance scorecards 2023–2026", "External risk indicators (permitted use only)", "Conflict-of-interest register"],
        rulesApplied: ["PP-6.3 Conflict of interest", "CP-2.1 Sanctions screening", "PP-6.5 Minimum diligence evidence"],
        recommendation: "Shortlist Alpha Data Systems, Gulf Digital Solutions and Nova Analytics (conditional). Hold Meridian pending Legal review.",
        confidence: 0.84,
        humanDecision: "Procurement Manager confirms or amends the shortlist. No supplier is excluded without a human decision.",
      },
    };
  },

  "evaluation.analyse": () => {
    const ranked = rankedScores();
    return {
      output: ranked,
      reasoning: {
        evidence: ["4 sealed submissions", "Published criteria & weightings", "Supplier 360 risk findings"],
        rulesApplied: ["PP-5.1 Score only against published criteria", "PP-5.6 Commercial opened after technical lock"],
        recommendation: `Highest risk-adjusted score: Alpha Data Systems (${ranked[0].riskAdjusted}).`,
        confidence: 0.87,
        humanDecision: "Evaluation Committee must validate scores before any recommendation is accepted.",
      },
    };
  },

  "evaluation.deviations": () => ({
    output: DEVIATIONS,
    reasoning: {
      evidence: ["Supplier technical & legal deviation tables", "RFx mandatory requirements M1–M5"],
      rulesApplied: ["PP-5.3 Deviations must be recorded"],
      recommendation: "3 deviations identified — 1 high (Nova residency).",
      confidence: 0.9,
      humanDecision: "Committee decides whether deviations are acceptable or disqualifying.",
    },
  }),

  "evaluation.missing": () => ({
    output: MISSING_RESPONSES,
    reasoning: {
      evidence: ["Response completeness matrix (5 questions × 4 suppliers)"],
      rulesApplied: ["PP-5.2 Complete responses to mandatory questions"],
      recommendation: "2 missing responses — clarification requests suggested.",
      confidence: 0.95,
      humanDecision: "Procurement decides whether to issue clarification requests.",
    },
  }),

  "evaluation.commercial": () => ({
    output: COMMERCIAL_ANOMALIES,
    reasoning: {
      evidence: ["Pricing schedules normalised to 3-year TCO", "Commercial assumptions & exclusions"],
      rulesApplied: ["PP-5.4 Abnormally low tender review"],
      recommendation: "Nova's price is abnormally low due to excluded scope; Gulf's indexation increases TCO.",
      confidence: 0.86,
      humanDecision: "Committee to consider normalised TCO in commercial scoring.",
    },
  }),

  "evaluation.brief": () => ({
    output: COMMITTEE_BRIEF,
    reasoning: {
      evidence: ["Score matrix", "3 deviations, 2 missing responses, 2 commercial anomalies", "Supplier 360 profiles"],
      rulesApplied: ["PP-5.7 Committee brief format", "PP-6.3 Conflict-of-interest recusal"],
      recommendation: "Award to Alpha Data Systems (AED 2.15M) subject to three conditions.",
      confidence: 0.86,
      humanDecision: "The Evaluation Committee makes the award decision; the agent cannot.",
    },
  }),

  "approval.prepare": () => ({
    output: { approvers: 6, threshold: "Above AED 2M", pack: 6 },
    reasoning: {
      evidence: ["Award decision record (human)", "Contract value AED 2.15M", "Delegation-of-authority matrix v2026.1"],
      rulesApplied: ["DoA-1: Above AED 2M requires Legal + Executive Approver", "DoA-4: Confidential data requires Information Security"],
      recommendation: "Route to 6 approvers; Executive Approver last.",
      confidence: 0.97,
      humanDecision: "Each approver decides individually. The agent cannot approve.",
    },
  }),

  "contract.extract": () => ({
    output: { obligations: OBLIGATIONS, milestones: MILESTONES, risks: CONTRACT_RISKS },
    reasoning: {
      evidence: ["Executed contract CTR-2026-0093 (64 pages)", "Schedules 2, 4 and 5"],
      rulesApplied: ["Obligation taxonomy v1.3", "LC-2 Legal validation of extracted terms"],
      recommendation: `${OBLIGATIONS.length} obligations, ${MILESTONES.length} milestones and ${CONTRACT_RISKS.length} key risks extracted.`,
      confidence: 0.89,
      humanDecision: "Legal validates extraction; owners accept assigned obligations.",
    },
  }),

  "contract.ask": (input) => {
    const q = String((input as { question?: string })?.question ?? "").toLowerCase();
    const hit = CONTRACT_FAQ.find((f) => f.match.some((m) => q.includes(m)));
    const answer = hit
      ? { answer: hit.answer, citations: hit.citations }
      : {
          answer:
            "I couldn't find a clause that directly answers that question in CTR-2026-0093. Try asking about termination, data residency, delays, renewal, SLAs or payments — or refer the question to Legal Counsel.",
          citations: [],
        };
    return {
      output: answer,
      reasoning: {
        evidence: hit ? hit.citations.map((c) => `Contract ${c}`) : ["Full-text search of 38 clauses — no direct match"],
        rulesApplied: ["Answers must cite clauses", "No legal advice"],
        recommendation: hit ? "Cited answer provided." : "Refer to Legal Counsel.",
        confidence: hit ? 0.9 : 0.35,
        humanDecision: "Legal Counsel remains accountable for interpretation.",
      },
    };
  },

  "monitoring.assess": () => ({
    output: DELAY_ASSESSMENT,
    reasoning: {
      evidence: ["Supplier weekly status report (19 May 2027)", "Contract milestone M3 (30 May 2027)", "Delay LD clause 14.3", "Current supplier risk score 28"],
      rulesApplied: ["SRM-3 Escalate delays > 10 days on payment milestones", "Cl. 14.3 LD calculation"],
      recommendation: "Escalate to Steering Committee and request a recovery plan within 5 business days.",
      confidence: 0.88,
      humanDecision: "Contract Owner approves or declines escalation. LDs are never applied automatically.",
    },
  }),
};
