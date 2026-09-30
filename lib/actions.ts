"use client";

import { toast } from "sonner";
import { MOCK_RESPONSES } from "@/agents/mock-responses";
import { AGENT_BY_ID } from "@/data/agents";
import { routedApprovalSteps } from "@/data/approvals";
import { DEMO_USER, RFX_SECTIONS_GENERATED } from "@/data/case";
import { CONTRACT_RISKS, MILESTONES, OBLIGATIONS } from "@/data/contract";
import { COMMITTEE_BRIEF } from "@/data/evaluation";
import { DELAY_EVENT } from "@/data/monitoring";
import { STAGES } from "@/data/stages";
import { SUPPLIER_BY_ID } from "@/data/suppliers";
import { runGuarded } from "@/lib/agent-runner";
import { rankedScores, type ComputedScore } from "@/lib/scoring";
import { useApp, type CommitteeBrief } from "@/lib/store";
import type {
  AgentId,
  Finding,
  IntakeAnalysis,
  IntakeForm,
  MonitoringAssessment,
  Obligation,
  PolicyCheckItem,
  RfxSection,
  StageId,
  SupplierAssessment,
} from "@/types";

const S = () => useApp.getState();
const ME = `${DEMO_USER.name} (${DEMO_USER.role})`;

function fmtTime() {
  return new Date().toISOString();
}

/* ============================== Intake ============================== */

export async function analyseIntake() {
  const st = S();
  st.patchCase("intake", { decision: null });
  const r = await runGuarded<IntakeAnalysis>("demand", "intake.analyse", st.caseData.intake.form);
  if (!r) return;
  S().patchCase("intake", { analysis: r.output, reasoning: r.reasoning });
  S().dispatch("INTAKE_ANALYSED");
  toast.success("Demand & Policy Agent completed analysis", { description: `Completeness ${r.output.completeness}% · Human decision required` });
}

export function decideIntake(decision: "approved" | "changes_requested" | "escalated", note?: string) {
  const st = S();
  st.patchCase("intake", { decision, decisionNote: note });
  const label = { approved: "Approved agent recommendation", changes_requested: "Requested changes to demand", escalated: "Escalated demand to Head of Procurement" }[decision];
  st.log({ actor: ME, actorType: "human", action: label, detail: note || undefined, stage: "intake" });
  if (decision === "approved") {
    st.dispatch("INTAKE_APPROVED");
    st.patchAgent("demand", { currentTask: "Recommendation approved", status: "active" });
    st.patchAgent("sourcing", { status: "active", currentTask: "Ready to draft RFx" });
    st.notify({ title: "Demand approved", body: "Sourcing / RFx Agent can now draft the RFx pack.", tone: "success", href: "/case/rfx" });
    toast.success("Recommendation approved", { description: "Route: Open competitive RFP. Case moved to RFx Preparation." });
  } else if (decision === "changes_requested") {
    st.dispatch("INTAKE_CHANGES_REQUESTED");
    st.notify({ title: "Changes requested", body: "Requester asked to add success KPIs and funding confirmation.", tone: "warning", href: "/case/intake" });
    toast("Changes requested from requester", { description: "The request returns to Data & Technology for update." });
  } else {
    st.dispatch("INTAKE_ESCALATED");
    st.notify({ title: "Demand escalated", body: "Escalated to Head of Procurement for route confirmation.", tone: "action", href: "/case/intake" });
    toast("Escalated to Head of Procurement", { description: "An escalation record has been added to the audit trail." });
  }
}

export function updateIntakeField(key: keyof IntakeForm, value: string) {
  const st = S();
  st.patchCase("intake", { form: { ...st.caseData.intake.form, [key]: value } });
}

/* =============================== RFx ================================ */

export async function generateRfx() {
  const r = await runGuarded<RfxSection[]>("sourcing", "rfx.generate");
  if (!r) return;
  const st = S();
  const versions = [
    ...st.caseData.rfx.versions,
    { version: `v0.${st.caseData.rfx.versions.length + 1}`, author: AGENT_BY_ID.sourcing.name, authorType: "agent" as const, timestamp: fmtTime(), note: "Initial draft generated from template IT Platforms v4.2" },
  ];
  st.patchCase("rfx", { sections: r.output.map((x) => ({ ...x })), reasoning: r.reasoning, status: "draft", versions, policy: null });
  st.dispatch("RFX_GENERATED");
  toast.success("RFx draft generated", { description: "9 sections ready for review and editing." });
}

export function editRfxSection(id: string, content: string) {
  const st = S();
  const sections = st.caseData.rfx.sections.map((s) => (s.id === id ? { ...s, content, editedByHuman: true } : s));
  const title = sections.find((s) => s.id === id)?.title ?? id;
  const prev = st.caseData.rfx.versions;
  const last = prev[prev.length - 1]?.version ?? "v0.0";
  const [maj, min] = last.replace("v", "").split(".").map(Number);
  const versions = [...prev, { version: `v${maj}.${min + 1}`, author: ME, authorType: "human" as const, timestamp: fmtTime(), note: `Edited “${title}”` }];
  st.patchCase("rfx", { sections, versions, status: st.caseData.rfx.status === "approved" ? "approved" : "draft" });
  st.log({ actor: ME, actorType: "human", action: `Edited RFx section “${title}”`, stage: "rfx" });
  toast.success("Section saved", { description: `New version ${versions[versions.length - 1].version} recorded.` });
}

export async function comparePolicy() {
  const r = await runGuarded<PolicyCheckItem[]>("sourcing", "rfx.policy");
  if (!r) return;
  S().patchCase("rfx", { policy: r.output, policyReasoning: r.reasoning });
  toast.success("Policy comparison complete", { description: "5 pass · 2 warnings" });
}

export function sendRfxForReview() {
  const st = S();
  st.patchCase("rfx", { status: "in_review" });
  st.dispatch("RFX_SENT_FOR_REVIEW");
  st.log({ actor: ME, actorType: "human", action: "Sent RFx for Category Manager review", stage: "rfx" });
  toast("RFx sent for review", { description: "Category Manager (demo persona) notified." });
  window.setTimeout(() => {
    const cur = S();
    if (cur.caseData.rfx.status !== "in_review") return;
    const versions = [
      ...cur.caseData.rfx.versions,
      { version: "v1.0", author: "Omar Siddiqui — Category Manager (demo persona)", authorType: "human" as const, timestamp: fmtTime(), note: "Reviewed and released for issue (simulated)" },
    ];
    cur.patchCase("rfx", { status: "approved", versions });
    cur.dispatch("RFX_APPROVED");
    cur.log({ actor: "Omar Siddiqui — Category Manager (demo persona)", actorType: "human", action: "Approved RFx v1.0 for release", detail: "Simulated reviewer response", stage: "rfx" });
    cur.patchAgent("supplier", { status: "active", currentTask: "Ready to assess invited suppliers" });
    cur.notify({ title: "RFx approved", body: "Category Manager released RFx v1.0. Supplier Intelligence can begin.", tone: "success", href: "/case/suppliers" });
    toast.success("RFx v1.0 approved by Category Manager", { description: "Simulated reviewer response" });
  }, 2200);
}

/* ============================ Suppliers ============================= */

export async function assessSuppliers() {
  const r = await runGuarded<SupplierAssessment>("supplier", "supplier.assess");
  if (!r) return;
  S().patchCase("suppliers", { assessment: r.output, reasoning: r.reasoning, shortlist: r.output.shortlist, shortlistConfirmed: false });
  S().dispatch("SUPPLIERS_ASSESSED");
  toast.success("Supplier due diligence complete", { description: "3 recommended for shortlist · 1 flagged for Legal review" });
}

export function toggleShortlist(id: string) {
  const st = S();
  if (st.caseData.suppliers.shortlistConfirmed) return;
  const cur = st.caseData.suppliers.shortlist;
  const shortlist = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
  st.patchCase("suppliers", { shortlist });
}

export function confirmShortlist() {
  const st = S();
  const names = st.caseData.suppliers.shortlist.map((id) => SUPPLIER_BY_ID[id].name).join(", ");
  st.patchCase("suppliers", { shortlistConfirmed: true });
  st.dispatch("SHORTLIST_CONFIRMED");
  st.log({ actor: ME, actorType: "human", action: "Confirmed supplier shortlist", detail: names, stage: "suppliers" });
  st.patchAgent("evaluation", { status: "active", currentTask: "Ready to analyse submissions" });
  st.notify({ title: "Shortlist confirmed", body: `${names}. Bid submissions received (simulated).`, tone: "success", href: "/case/evaluation" });
  toast.success("Shortlist confirmed", { description: names });
}

/* ============================ Evaluation ============================ */

export async function analyseBids() {
  const r = await runGuarded<ComputedScore[]>("evaluation", "evaluation.analyse");
  if (!r) return;
  S().patchCase("evaluation", { scores: r.output, scoresReasoning: r.reasoning });
  S().dispatch("BIDS_ANALYSED");
  toast.success("Submissions analysed", { description: "Weighted and risk-adjusted scores calculated." });
}

async function runFinding(task: "evaluation.deviations" | "evaluation.missing" | "evaluation.commercial", key: "deviations" | "missing" | "commercial", label: string) {
  const r = await runGuarded<Finding[]>("evaluation", task);
  if (!r) return;
  S().patchCase("evaluation", { [key]: r.output });
  toast.success(`${r.output.length} ${label}`);
}

export const highlightDeviations = () => runFinding("evaluation.deviations", "deviations", "deviations identified");
export const identifyMissing = () => runFinding("evaluation.missing", "missing", "missing responses identified");
export const detectCommercial = () => runFinding("evaluation.commercial", "commercial", "unusual commercial assumptions detected");

export async function generateBrief() {
  const r = await runGuarded<CommitteeBrief>("evaluation", "evaluation.brief");
  if (!r) return;
  S().patchCase("evaluation", { brief: r.output, briefReasoning: r.reasoning });
  S().dispatch("BRIEF_GENERATED");
  S().notify({ title: "Human decision required", body: "Committee brief ready. Evaluation Committee must decide the award.", tone: "action", href: "/case/evaluation" });
  toast.success("Committee brief generated", { description: "HUMAN DECISION REQUIRED" });
}

export function decideAward(supplierId: string, rationale: string) {
  const st = S();
  const recommended = rankedScores()[0].supplierId;
  const award = { supplierId, decidedBy: `Evaluation Committee — chaired by ${DEMO_USER.name}`, rationale, followedRecommendation: supplierId === recommended, decidedAt: fmtTime() };
  st.patchCase("evaluation", { award });
  st.dispatch("AWARD_DECIDED");
  st.log({
    actor: `Evaluation Committee (${DEMO_USER.name})`,
    actorType: "human",
    action: `Award decision: ${SUPPLIER_BY_ID[supplierId].name}`,
    detail: `${award.followedRecommendation ? "Accepted agent recommendation" : "Overrode agent recommendation"} — ${rationale}`,
    stage: "evaluation",
  });
  st.patchAgent("approval", { status: "active", currentTask: "Ready to route decision pack" });
  st.notify({ title: "Award decision recorded", body: `${SUPPLIER_BY_ID[supplierId].name} selected by the Evaluation Committee.`, tone: "success", href: "/case/approvals" });
  toast.success("Award decision recorded", { description: `${SUPPLIER_BY_ID[supplierId].name} — decision by humans, evidence by agents.` });
}

/* ============================= Approvals ============================ */

export async function routeApprovals() {
  const r = await runGuarded("approval", "approval.prepare");
  if (!r) return;
  const st = S();
  st.patchCase("approvals", { routed: true, steps: routedApprovalSteps(), reasoning: r.reasoning });
  st.dispatch("APPROVALS_ROUTED");
  st.log({ actor: "Khalid Mansour — Procurement Manager (demo persona)", actorType: "human", action: "Approved decision pack", detail: "Simulated approver response", stage: "approvals" });
  st.log({ actor: "Mariam Al Suwaidi — Business Owner (demo persona)", actorType: "human", action: "Approved decision pack", detail: "Simulated approver response", stage: "approvals" });
  st.log({ actor: "Hessa Al Ketbi — Information Security (demo persona)", actorType: "human", action: "Requested clarification", detail: "DR backup residency & sub-processor list", stage: "approvals" });
  st.log({ actor: AGENT_BY_ID.approval.name, actorType: "agent", action: "Routed decision to Information Security", detail: "Clarification loop opened", stage: "approvals", agentId: "approval" });
  st.notify({ title: "Clarification requested", body: "Information Security needs DR residency confirmation.", tone: "warning", href: "/case/approvals" });
  st.notify({ title: "Approval overdue", body: "Legal approval is 6 hours past SLA.", tone: "warning", href: "/case/approvals" });
  toast.success("Decision pack routed to 6 approvers", { description: "2 approved · 1 clarification · 1 overdue" });
}

function patchStep(id: string, patch: Partial<import("@/types").ApprovalStep>) {
  const st = S();
  const steps = st.caseData.approvals.steps.map((s) => (s.id === id ? { ...s, ...patch } : s));
  st.patchCase("approvals", { steps });
  return steps;
}

function afterApprovalChange() {
  const st = S();
  const steps = st.caseData.approvals.steps;
  const others = steps.filter((s) => s.id !== "exec");
  const exec = steps.find((s) => s.id === "exec")!;
  if (others.every((s) => s.status === "approved") && exec.status === "not_started") {
    patchStep("exec", { status: "pending", dueInHours: 72 });
    st.log({ actor: AGENT_BY_ID.approval.name, actorType: "agent", action: "All prerequisite approvals complete — routed to Executive Approver", stage: "approvals", agentId: "approval" });
    st.notify({ title: "Executive approval required", body: "Decision pack routed to the Executive Approver.", tone: "action", href: "/case/approvals" });
  }
  if (S().caseData.approvals.steps.every((s) => s.status === "approved") && !S().caseData.approvals.completedAt) {
    S().patchCase("approvals", { completedAt: fmtTime() });
    S().dispatch("APPROVALS_COMPLETED");
    S().patchAgent("approval", { currentTask: "Approvals complete", lastAction: "All 6 approvals obtained" });
    S().patchAgent("contract", { status: "active", currentTask: "Ready to extract contract terms" });
    S().notify({ title: "All approvals obtained", body: "Contract CTR-2026-0093 executed (simulated). Ready for Contract Intelligence.", tone: "success", href: "/case/contract" });
    toast.success("All approvals obtained", { description: "Contract executed (simulated) — Contract Intelligence unlocked." });
  }
}

export function approveStep(id: string, comment?: string) {
  const step = S().caseData.approvals.steps.find((s) => s.id === id)!;
  patchStep(id, { status: "approved", decidedAt: fmtTime(), comment: comment || "Approved.", overdue: false });
  S().log({ actor: `${step.approver} — ${step.role}`, actorType: "human", action: "Approved", detail: comment || "Presenter acting on behalf of demo persona", stage: "approvals" });
  toast.success(`${step.role} approved`);
  afterApprovalChange();
}

export function returnStep(id: string, comment: string) {
  const step = S().caseData.approvals.steps.find((s) => s.id === id)!;
  patchStep(id, { status: "returned", comment, decidedAt: fmtTime() });
  S().log({ actor: `${step.approver} — ${step.role}`, actorType: "human", action: "Returned decision pack", detail: comment, stage: "approvals" });
  S().notify({ title: `${step.role} returned the pack`, body: comment, tone: "warning", href: "/case/approvals" });
  toast(`${step.role} returned the pack`, { description: "Approval Agent will re-route once the issue is addressed." });
}

export function requestClarification(id: string, comment: string) {
  const step = S().caseData.approvals.steps.find((s) => s.id === id)!;
  patchStep(id, { status: "needs_clarification", comment });
  S().log({ actor: `${step.approver} — ${step.role}`, actorType: "human", action: "Requested clarification", detail: comment, stage: "approvals" });
  toast(`Clarification requested by ${step.role}`);
}

export function resolveClarification(id: string) {
  const step = S().caseData.approvals.steps.find((s) => s.id === id)!;
  const comment =
    step.status === "returned"
      ? "Issue addressed by Procurement and pack re-routed by the Approval Agent."
      : step.id === "sec"
        ? "Clarification provided: supplier confirmed UAE primary & DR sites (Abu Dhabi / Dubai) and submitted sub-processor list."
        : "Clarification provided by Procurement with supporting evidence.";
  patchStep(id, { status: "pending", comment });
  S().log({ actor: AGENT_BY_ID.approval.name, actorType: "agent", action: `Attached clarification evidence for ${step.role}`, detail: "Supplier letter + sub-processor list", stage: "approvals", agentId: "approval" });
  S().log({ actor: ME, actorType: "human", action: `Confirmed clarification response to ${step.role}`, stage: "approvals" });
  toast.success("Clarification sent", { description: `${step.role} can now approve.` });
}

export function sendReminder(id: string) {
  const step = S().caseData.approvals.steps.find((s) => s.id === id)!;
  patchStep(id, { remindersSent: step.remindersSent + 1 });
  S().log({ actor: AGENT_BY_ID.approval.name, actorType: "agent", action: `Sent reminder to ${step.role}`, detail: `${step.approver} via email & Teams (simulated)`, stage: "approvals", agentId: "approval" });
  toast.success(`Reminder sent to ${step.role}`, { description: "Simulated email & Teams notification" });
}

export function sendAllReminders() {
  const pending = S().caseData.approvals.steps.filter((s) => s.status === "pending" || s.status === "needs_clarification");
  pending.forEach((s) => patchStep(s.id, { remindersSent: s.remindersSent + 1 }));
  S().log({ actor: AGENT_BY_ID.approval.name, actorType: "agent", action: `Sent reminders to ${pending.length} outstanding approvers`, detail: pending.map((p) => p.role).join(", "), stage: "approvals", agentId: "approval" });
  toast.success(`Reminders sent to ${pending.length} approvers`, { description: "Simulated email & Teams notifications" });
}

export function escalateStep(id: string) {
  const step = S().caseData.approvals.steps.find((s) => s.id === id)!;
  patchStep(id, { escalated: true });
  S().log({ actor: AGENT_BY_ID.approval.name, actorType: "agent", action: `Escalated overdue approval: ${step.role}`, detail: "Escalated to General Counsel (demo persona) per DoA rule ESC-2", stage: "approvals", agentId: "approval" });
  S().notify({ title: "Overdue approval escalated", body: `${step.role} escalated per rule ESC-2.`, tone: "warning", href: "/case/approvals" });
  toast.success(`${step.role} escalated`, { description: "Escalated to line manager per DoA rule ESC-2" });
}

/** Presenter shortcut: simulate outstanding human approvers approving in sequence. */
export function simulateRemainingApprovals() {
  const order = ["pm", "bo", "fin", "sec", "legal", "exec"];
  for (const id of order) {
    const step = S().caseData.approvals.steps.find((s) => s.id === id)!;
    if (step.status === "approved") continue;
    if (step.status === "needs_clarification") resolveClarification(id);
    if (id === "exec") afterApprovalChange();
    approveStep(id, "Approved (simulated approver response).");
  }
}

/* ============================== Contract ============================ */

export async function extractContract() {
  const r = await runGuarded("contract", "contract.extract");
  if (!r) return;
  S().patchCase("contract", { extracted: true, reasoning: r.reasoning });
  S().dispatch("CONTRACT_EXTRACTED");
  toast.success("Contract analysed", { description: `${OBLIGATIONS.length} obligations · ${MILESTONES.length} milestones · ${CONTRACT_RISKS.length} key risks` });
}

export async function askContract(question: string) {
  const r = await runGuarded<{ answer: string; citations: string[] }>("contract", "contract.ask", { question });
  if (!r) return;
  const qa = [{ question, answer: r.output.answer, citations: r.output.citations, askedAt: fmtTime() }, ...S().caseData.contract.qa];
  S().patchCase("contract", { qa });
}

export function assignOwner(id: string, owner: string) {
  const st = S();
  const obligations = st.caseData.contract.obligations.map((o) => (o.id === id ? { ...o, owner } : o));
  st.patchCase("contract", { obligations });
  const ob = obligations.find((o) => o.id === id)!;
  st.log({ actor: ME, actorType: "human", action: `Assigned owner for ${ob.id}`, detail: `${ob.title} → ${owner}`, stage: "contract" });
  toast.success("Owner assigned", { description: `${ob.title} → ${owner}` });
}

export function createReminder(id: string, date: string) {
  const st = S();
  const obligations = st.caseData.contract.obligations.map((o) => (o.id === id ? { ...o, reminder: date } : o));
  st.patchCase("contract", { obligations });
  const ob = obligations.find((o) => o.id === id)!;
  st.log({ actor: ME, actorType: "human", action: `Created reminder for ${ob.id}`, detail: `${ob.title} on ${date}`, stage: "contract" });
  toast.success("Reminder created", { description: `${ob.title} — ${date}` });
}

export function validateContract() {
  const st = S();
  st.patchCase("contract", { validated: true });
  st.dispatch("CONTRACT_VALIDATED");
  st.log({ actor: "Nadia Farouk — Legal (demo persona)", actorType: "human", action: "Validated extracted obligations register", detail: "Simulated Legal validation", stage: "contract" });
  st.patchAgent("monitoring", { status: "active", currentTask: "Ready to activate monitoring" });
  toast.success("Obligations validated by Legal", { description: "Continuous Monitoring can now be activated." });
}

/* ============================= Monitoring =========================== */

export function activateMonitoring() {
  const st = S();
  if (!st.caseData.contract.validated) {
    st.patchCase("contract", { validated: true });
    st.dispatch("CONTRACT_VALIDATED");
  }
  st.patchCase("monitoring", { activated: true });
  st.dispatch("MONITORING_ACTIVATED");
  st.patchAgent("monitoring", { status: "active", currentTask: "Watching 14 obligations, 7 milestones, 4 risk feeds" });
  st.log({ actor: ME, actorType: "human", action: "Activated continuous monitoring", detail: "CTR-2026-0093 — Alpha Data Systems", stage: "monitoring" });
  toast.success("Continuous monitoring activated", { description: "Simulated forward view: contract month 6" });
}

export async function injectDelayEvent() {
  const st = S();
  if (!st.caseData.monitoring.activated) activateMonitoring();
  S().patchCase("monitoring", { eventInjected: true, assessment: null, escalation: null });
  S().log({ actor: "Delivery Tracker (sim.)", actorType: "system", action: "New event: " + DELAY_EVENT.title, detail: DELAY_EVENT.detail, stage: "monitoring" });
  S().notify({ title: "Delivery risk detected", body: DELAY_EVENT.title, tone: "warning", href: "/case/monitoring" });
  const r = await runGuarded<MonitoringAssessment>("monitoring", "monitoring.assess");
  if (!r) return;
  S().patchCase("monitoring", { assessment: r.output, reasoning: r.reasoning });
  S().notify({ title: "Escalation approval required", body: "Monitoring & Risk Agent recommends escalation to Steering Committee.", tone: "action", href: "/case/monitoring" });
  toast.warning("Risk level HIGH — escalation recommended", { description: "Human approval required" });
}

export function decideEscalation(decision: "approved" | "declined", note?: string) {
  const st = S();
  st.patchCase("monitoring", { escalation: decision });
  st.log({ actor: `${ME} — Contract Owner`, actorType: "human", action: decision === "approved" ? "Approved escalation to Steering Committee" : "Declined escalation — monitor only", detail: note, stage: "monitoring" });
  if (decision === "approved") {
    st.log({ actor: AGENT_BY_ID.monitoring.name, actorType: "agent", action: "Issued recovery-plan request and Steering Committee notice", detail: "Drafts sent for human review (simulated)", stage: "monitoring", agentId: "monitoring" });
    st.patchAgent("monitoring", { currentTask: "Tracking recovery plan (due in 5 business days)" });
    toast.success("Escalation approved", { description: "Recovery plan requested; Steering Committee notified (simulated)." });
  } else {
    st.patchAgent("monitoring", { currentTask: "Heightened monitoring — weekly check-ins" });
    toast("Escalation declined", { description: "Agent will continue heightened monitoring." });
  }
}

/* ============================= Governance =========================== */

export function pauseAgent(id: AgentId) {
  const st = S();
  st.patchAgent(id, { status: "paused", currentTask: "Paused by AI Control" });
  st.log({ actor: ME, actorType: "human", action: `Paused ${AGENT_BY_ID[id].name}`, detail: "Kill-switch engaged: all autonomous actions suspended", stage: "governance", agentId: id });
  toast.warning(`${AGENT_BY_ID[id].name} paused`, { description: "The agent cannot act until resumed." });
}

export function resumeAgent(id: AgentId) {
  const st = S();
  st.patchAgent(id, { status: "active", currentTask: "Resumed — standing by" });
  st.log({ actor: ME, actorType: "human", action: `Resumed ${AGENT_BY_ID[id].name}`, stage: "governance", agentId: id });
  toast.success(`${AGENT_BY_ID[id].name} resumed`);
}

export function pauseAllAgents() {
  (Object.keys(S().agents) as AgentId[]).forEach((id) => S().patchAgent(id, { status: "paused", currentTask: "Paused by AI Control" }));
  S().log({ actor: ME, actorType: "human", action: "Paused ALL agents (global kill-switch)", stage: "governance" });
  toast.warning("All agents paused", { description: "Global kill-switch engaged." });
}

export function resumeAllAgents() {
  (Object.keys(S().agents) as AgentId[]).forEach((id) => {
    if (S().agents[id].status === "paused") S().patchAgent(id, { status: "active", currentTask: "Resumed — standing by" });
  });
  S().log({ actor: ME, actorType: "human", action: "Resumed all agents", stage: "governance" });
  toast.success("All agents resumed");
}

export function revokePermission(id: AgentId, perm: string) {
  const rt = S().agents[id];
  if (rt.revokedPermissions.includes(perm)) return;
  S().patchAgent(id, { revokedPermissions: [...rt.revokedPermissions, perm] });
  S().log({ actor: ME, actorType: "human", action: `Revoked permission from ${AGENT_BY_ID[id].name}`, detail: perm, stage: "governance", agentId: id });
  toast.warning("Permission revoked", { description: `${AGENT_BY_ID[id].name}: ${perm}` });
}

export function restorePermission(id: AgentId, perm: string) {
  const rt = S().agents[id];
  S().patchAgent(id, { revokedPermissions: rt.revokedPermissions.filter((p) => p !== perm) });
  S().log({ actor: ME, actorType: "human", action: `Restored permission for ${AGENT_BY_ID[id].name}`, detail: perm, stage: "governance", agentId: id });
  toast.success("Permission restored", { description: perm });
}

export function setRequireHuman(id: AgentId, value: boolean) {
  S().patchAgent(id, { requireHumanApproval: value });
  S().log({ actor: ME, actorType: "human", action: `${value ? "Enabled" : "Relaxed"} human-approval gate for ${AGENT_BY_ID[id].name}`, stage: "governance", agentId: id });
  toast.success(value ? "Human approval required" : "Human approval gate relaxed", { description: AGENT_BY_ID[id].name });
}

/* ========================= Demo fast-forward ======================== */

/**
 * Completes every stage BEFORE `target` with the recommended choices, instantly.
 * Lets a presenter jump into any stage without waiting for agent animations.
 */
export function fastForwardTo(target: StageId) {
  const order = STAGES.map((s) => s.id);
  const idx = order.indexOf(target);
  const st = () => S();
  const done = (id: StageId) => st().caseData.stageStatus[id] === "completed";

  if (idx > 0 && !done("intake")) {
    const r = MOCK_RESPONSES["intake.analyse"](st().caseData.intake.form);
    st().patchCase("intake", { analysis: r.output as IntakeAnalysis, reasoning: r.reasoning, decision: "approved" });
    st().dispatch("INTAKE_ANALYSED");
    st().dispatch("INTAKE_APPROVED");
  }
  if (idx > 1 && !done("rfx")) {
    const p = MOCK_RESPONSES["rfx.policy"](null);
    const g = MOCK_RESPONSES["rfx.generate"](null);
    st().patchCase("rfx", {
      sections: RFX_SECTIONS_GENERATED.map((x) => ({ ...x })),
      reasoning: g.reasoning,
      policy: p.output as PolicyCheckItem[],
      policyReasoning: p.reasoning,
      status: "approved",
      versions: [
        { version: "v0.1", author: AGENT_BY_ID.sourcing.name, authorType: "agent", timestamp: fmtTime(), note: "Initial draft generated from template IT Platforms v4.2" },
        { version: "v1.0", author: "Omar Siddiqui — Category Manager (demo persona)", authorType: "human", timestamp: fmtTime(), note: "Reviewed and released for issue (simulated)" },
      ],
    });
    st().dispatch("RFX_APPROVED");
  }
  if (idx > 2 && !done("suppliers")) {
    const r = MOCK_RESPONSES["supplier.assess"](null);
    const a = r.output as SupplierAssessment;
    st().patchCase("suppliers", { assessment: a, reasoning: r.reasoning, shortlist: a.shortlist, shortlistConfirmed: true });
    st().dispatch("SHORTLIST_CONFIRMED");
  }
  if (idx > 3 && !done("evaluation")) {
    const a = MOCK_RESPONSES["evaluation.analyse"](null);
    const b = MOCK_RESPONSES["evaluation.brief"](null);
    st().patchCase("evaluation", {
      scores: a.output as ComputedScore[],
      scoresReasoning: a.reasoning,
      deviations: MOCK_RESPONSES["evaluation.deviations"](null).output as Finding[],
      missing: MOCK_RESPONSES["evaluation.missing"](null).output as Finding[],
      commercial: MOCK_RESPONSES["evaluation.commercial"](null).output as Finding[],
      brief: COMMITTEE_BRIEF,
      briefReasoning: b.reasoning,
      award: { supplierId: "alpha", decidedBy: `Evaluation Committee — chaired by ${DEMO_USER.name}`, rationale: "Highest risk-adjusted score; within budget; strongest security posture.", followedRecommendation: true, decidedAt: fmtTime() },
    });
    st().dispatch("AWARD_DECIDED");
  }
  if (idx > 4 && !done("approvals")) {
    const r = MOCK_RESPONSES["approval.prepare"](null);
    const steps = routedApprovalSteps().map((s) => ({ ...s, status: "approved" as const, overdue: false, decidedAt: fmtTime(), comment: s.comment ?? "Approved (simulated)." }));
    st().patchCase("approvals", { routed: true, steps, reasoning: r.reasoning, completedAt: fmtTime() });
    st().dispatch("APPROVALS_COMPLETED");
  }
  if (idx > 5 && !done("contract")) {
    const r = MOCK_RESPONSES["contract.extract"](null);
    st().patchCase("contract", { extracted: true, reasoning: r.reasoning, validated: true });
    st().dispatch("CONTRACT_VALIDATED");
  }
  const stage = STAGES[idx];
  st().patchAgent(stage.agentId, { status: "active", currentTask: "Ready" });
  st().log({ actor: "Presenter", actorType: "human", action: `Fast-forwarded demo to ${stage.number} ${stage.name}`, detail: "Earlier stages completed with recommended choices", stage: "platform" });
  toast.success(`Fast-forwarded to ${stage.name}`, { description: "Earlier stages completed with recommended choices." });
}

export function resetDemo() {
  S().resetDemo();
  toast.success("Demo reset", { description: "All stages, agents and audit events restored to the starting state." });
}

export type { Obligation };
