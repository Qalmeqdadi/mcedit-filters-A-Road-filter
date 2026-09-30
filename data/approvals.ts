import type { ApprovalStep } from "@/types";

/** Synthetic delegation-of-authority matrix (illustrative thresholds only). */
export const DOA_THRESHOLDS = [
  { band: "Up to AED 500K", approvers: "Procurement Manager + Business Owner" },
  { band: "AED 500K – 2M", approvers: "+ Finance, + Information Security (if data involved)" },
  { band: "Above AED 2M", approvers: "+ Legal, + Executive Approver" },
];

/** Synthetic approver personas — not real individuals. */
export function initialApprovalSteps(): ApprovalStep[] {
  return [
    { id: "pm", role: "Procurement Manager", approver: "Khalid Mansour (demo persona)", reason: "Process owner — confirms policy compliance", status: "not_started", sla: "1 business day", dueInHours: 24, remindersSent: 0 },
    { id: "bo", role: "Business Owner", approver: "Mariam Al Suwaidi (demo persona)", reason: "Budget holder — Data & Technology", status: "not_started", sla: "2 business days", dueInHours: 48, remindersSent: 0 },
    { id: "fin", role: "Finance", approver: "Rahul Menon (demo persona)", reason: "Value > AED 500K — budget availability & payment terms", status: "not_started", sla: "2 business days", dueInHours: 48, remindersSent: 0 },
    { id: "sec", role: "Information Security", approver: "Hessa Al Ketbi (demo persona)", reason: "Confidential data & third-party hosting", status: "not_started", sla: "2 business days", dueInHours: 48, remindersSent: 0 },
    { id: "legal", role: "Legal", approver: "Nadia Farouk (demo persona)", reason: "Value > AED 2M — contract terms & deviations", status: "not_started", sla: "3 business days", dueInHours: 72, remindersSent: 0 },
    { id: "exec", role: "Executive Approver", approver: "Executive Committee delegate (demo persona)", reason: "Value > AED 2M — final authority", status: "not_started", sla: "3 business days", dueInHours: 72, remindersSent: 0 },
  ];
}

/** State after the Approval Agent routes the pack (simulated approver responses). */
export function routedApprovalSteps(): ApprovalStep[] {
  const now = new Date().toISOString();
  return initialApprovalSteps().map((s) => {
    switch (s.id) {
      case "pm":
        return { ...s, status: "approved", decidedAt: now, comment: "Process followed; two-envelope evaluation evidenced." };
      case "bo":
        return { ...s, status: "approved", decidedAt: now, comment: "Supports 2027 data strategy. Approved." };
      case "fin":
        return { ...s, status: "pending", dueInHours: 30 };
      case "sec":
        return {
          ...s,
          status: "needs_clarification",
          comment: "Please confirm DR backups remain in UAE and provide supplier sub-processor list.",
          dueInHours: 36,
        };
      case "legal":
        return { ...s, status: "pending", dueInHours: -6, overdue: true };
      case "exec":
        return { ...s, status: "not_started" };
      default:
        return s;
    }
  });
}

export const DECISION_PACK = [
  { name: "Evaluation Committee Brief", type: "PDF", source: "Evaluation Agent", pages: 6 },
  { name: "Weighted & risk-adjusted score matrix", type: "XLSX", source: "Evaluation Agent", pages: 1 },
  { name: "Supplier 360 — Alpha Data Systems", type: "PDF", source: "Supplier Intelligence Agent", pages: 4 },
  { name: "Policy compliance check", type: "PDF", source: "Sourcing / RFx Agent", pages: 2 },
  { name: "Award decision record (human)", type: "PDF", source: "Evaluation Committee", pages: 1 },
  { name: "DoA threshold validation", type: "PDF", source: "Approval Agent", pages: 1 },
];
