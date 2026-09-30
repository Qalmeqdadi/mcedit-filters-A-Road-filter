import type { MonitoringAssessment, MonitoringEvent } from "@/types";

/** SYNTHETIC monitoring data — simulated forward view (contract month 6). */
export const SLA_TREND = [
  { month: "Dec", availability: 99.82, target: 99.7, incidents: 1 },
  { month: "Jan", availability: 99.9, target: 99.7, incidents: 0 },
  { month: "Feb", availability: 99.76, target: 99.7, incidents: 2 },
  { month: "Mar", availability: 99.64, target: 99.7, incidents: 3 },
  { month: "Apr", availability: 99.81, target: 99.7, incidents: 1 },
  { month: "May", availability: 99.78, target: 99.7, incidents: 1 },
];

export const PERFORMANCE_TREND = [
  { month: "Dec", delivery: 88, quality: 84, relationship: 82 },
  { month: "Jan", delivery: 90, quality: 86, relationship: 84 },
  { month: "Feb", delivery: 91, quality: 87, relationship: 85 },
  { month: "Mar", delivery: 86, quality: 85, relationship: 83 },
  { month: "Apr", delivery: 87, quality: 88, relationship: 84 },
  { month: "May", delivery: 84, quality: 88, relationship: 82 },
];

export const OPEN_ISSUES = [
  { id: "MON-118", title: "Rule-migration equivalence test backlog (212 rules)", owner: "Data Platform Lead", severity: "medium" as const, age: "9 days" },
  { id: "MON-121", title: "March availability below SLA (99.64%)", owner: "Contract Manager", severity: "low" as const, age: "38 days", note: "Service credit applied" },
  { id: "MON-124", title: "Pen-test finding (medium) — remediation in progress", owner: "Information Security Officer", severity: "medium" as const, age: "14 days" },
];

export const COMPLIANCE_EVENTS = [
  { date: "2027-05-02", title: "Quarterly sanctions re-screen — clear", tone: "ok" as const },
  { date: "2027-04-18", title: "ISO 27001 surveillance audit passed", tone: "ok" as const },
  { date: "2027-03-31", title: "Service credit applied — March availability", tone: "warn" as const },
  { date: "2027-02-20", title: "Sub-processor change notified (UAE-hosted log analytics)", tone: "info" as const },
];

export const RISK_INDICATORS = [
  { label: "Financial stability", value: "Stable", tone: "ok" as const, note: "External / credit-risk information — where legally permitted and authorised" },
  { label: "Sanctions screening", value: "Clear", tone: "ok" as const, note: "Re-screened 02 May 2027" },
  { label: "Key-person retention", value: "Watch", tone: "warn" as const, note: "Solution architect retention clause ends Nov 2027" },
  { label: "Adverse media", value: "None", tone: "ok" as const, note: "Automated scan, weekly" },
];

export const DELAY_EVENT: MonitoringEvent = {
  id: "EVT-2027-031",
  title: "Supplier delivery milestone delayed by 12 days",
  detail: "Alpha Data Systems reports that Milestone M3 — Analytics platform build — will move from 30 May 2027 to 11 Jun 2027 due to integration dependency on the enterprise identity upgrade.",
  severity: "high",
  detectedAt: "2027-05-19 09:41",
  source: "Delivery Tracker (sim.) — supplier weekly status report",
};

export const DELAY_ASSESSMENT: MonitoringAssessment = {
  impact:
    "12-day slip on M3 pushes Go-live (M4) from 15 Jul to ~27 Jul 2027 unless recovered. Downstream: Q3 regulatory data-quality reporting dry-run would lose its buffer. Payment M3 (AED 537,500) remains contingent on acceptance.",
  affectedObligation: "OB-01/M3 — Analytics platform build (Sch. 2 §3.2) · Delay LDs (Cl. 14.3)",
  riskLevel: "high",
  riskScoreBefore: 28,
  riskScoreAfter: 54,
  recommendedActions: [
    "Request a formal recovery plan from supplier within 5 business days (Sch. 2 §6.1).",
    "Escalate to the joint Steering Committee and notify the Business Owner.",
    "Hold M3 payment until acceptance certificate is issued (no change to contract terms).",
    "Record potential LD exposure (up to AED 9,214 at 0.5%/week for ~1.7 weeks) — application is a human decision.",
    "Re-baseline dependency with ECB identity-upgrade programme.",
  ],
  escalationRequired: true,
};

export const RELATIONSHIP_SCORE = { before: 84, after: 79 };
