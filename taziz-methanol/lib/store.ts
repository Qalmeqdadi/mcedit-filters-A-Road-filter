"use client";
// Global demo state (plant simulator, investigations, approvals, audit, assistant, demo mode).
import { create } from "zustand";
import type {
  AreaId,
  AreaState,
  AuditEntry,
  ChatMessage,
  DecisionKind,
  Investigation,
  Kpis,
  PlantAlert,
  ScenarioId,
  TagLive,
  ViewId,
} from "./types";
import { AREAS, TAG, TAGS, clockLabel, initialTags, tickTags } from "./sim/plant";
import { SCENARIOS, scenarioById, secondaryPack } from "./scenarios";
import { orchestrator } from "./agents/orchestrator";
import { AGENT, evaluateAction } from "./governance";
import { DEMO, aedM } from "@/config/demo";
import { answerQuestion } from "./assistant";

export interface RunState {
  elapsed: number;
  playing: boolean;
  startMin: number;
}

const BASE_ALERTS: PlantAlert[] = [
  { id: "a1", area: "synthesis", severity: "alert", title: "Recycle flow 5.8% below model", detail: "SYN-F-210 3,840 Nm³/h vs 4,077 expected.", tagId: "SYN-F-210", raisedBy: "process", time: "04:41" },
  { id: "a2", area: "synthesis", severity: "alert", title: "C-201 suction pressure below normal band", detail: "74.6 barg (band 75.5–77.5).", tagId: "COMP-PI-201S", raisedBy: "process", time: "05:02" },
  { id: "a3", area: "synthesis", severity: "watch", title: "C-201 vibration +18% (24 h trend)", detail: "6.8 mm/s, alert limit 7.1 mm/s.", tagId: "COMP-VIB-201", raisedBy: "asset", time: "05:30" },
  { id: "a4", area: "reform", severity: "watch", title: "Reformer excess O₂ above target", detail: "2.4% vs 1.8% target — INV-26-0411.", tagId: "REF-AI-205", raisedBy: "energy", time: "03:20" },
];

const BASE_AREAS: Record<AreaId, AreaState> = {
  feed: { id: "feed", status: "normal", health: 96, alerts: 0 },
  pretreat: { id: "pretreat", status: "normal", health: 98, alerts: 0 },
  reform: { id: "reform", status: "watch", health: 88, alerts: 1 },
  compress: { id: "compress", status: "normal", health: 93, alerts: 0 },
  synthesis: { id: "synthesis", status: "alert", health: 74, alerts: 3 },
  distill: { id: "distill", status: "normal", health: 95, alerts: 0 },
  storage: { id: "storage", status: "normal", health: 97, alerts: 0 },
};

const SEED_AUDIT: AuditEntry[] = [
  { id: "s1", at: "03:20:12", actorType: "agent", actor: "Energy Agent", action: "Opened investigation", detail: "INV-26-0411 · reformer energy deviation", outcome: "info" },
  { id: "s2", at: "03:24:40", actorType: "system", actor: "Policy engine", action: "Human approval requested", detail: "INV-26-0411 recommendations awaiting shift supervisor", outcome: "pending" },
  { id: "s3", at: "04:41:05", actorType: "agent", actor: "Process Agent", action: "Raised advisory", detail: "Recycle flow 5.8% below model (SYN-F-210)", outcome: "info" },
  { id: "s4", at: "06:30:02", actorType: "agent", actor: "Operations Agent", action: "Opened investigation", detail: "INV-26-0412 · production 4.0% below target — council requested", outcome: "info" },
];

const baselineTargets = () => Object.fromEntries(TAGS.map((t) => [t.id, t.baseline])) as Record<string, number>;

function buildInitialInvestigations(tags: Record<string, TagLive>) {
  const hero = orchestrator.run({ scenarioId: "A", pack: scenarioById("A").pack, snapshot: tags, nowMin: 0, status: "queued" });
  const secondary = orchestrator.run({ scenarioId: "E2", pack: secondaryPack, snapshot: tags, nowMin: 0, status: "awaiting-approval" });
  secondary.openedAt = "03:20";
  secondary.trigger = { ...secondary.trigger, time: "03:20" };
  return { hero, secondary };
}

let auditSeq = 0;
let msgSeq = 0;

interface State {
  // navigation
  view: ViewId;
  selectedArea: AreaId;
  focusTag: string | null;
  // clock & simulator
  realStart: number;
  tick: number;
  tags: Record<string, TagLive>;
  targets: Record<string, number>;
  scenarioId: ScenarioId;
  areas: Record<AreaId, AreaState>;
  alerts: PlantAlert[];
  // investigations
  investigations: Investigation[];
  activeInvId: string;
  runs: Record<string, RunState>;
  analysisPending: string | null;
  // governance
  audit: AuditEntry[];
  // modules
  qualitySim: "normal" | "running" | "deviation";
  // assistant
  assistantOpen: boolean;
  messages: ChatMessage[];
  thinking: boolean;
  // demo mode
  demo: { active: boolean; step: number };
  highlight: string | null;

  setView: (v: ViewId) => void;
  setArea: (a: AreaId) => void;
  setFocusTag: (t: string | null) => void;
  setActiveInv: (id: string) => void;
  nowMin: () => number;
  clock: (seconds?: boolean) => string;
  kpis: () => Kpis;
  tickPlant: () => void;
  advanceRuns: (dt: number) => void;
  startInvestigation: (id?: string) => void;
  completeInvestigation: (id?: string) => void;
  applyScenario: (id: ScenarioId, opts?: { autoRun?: boolean; navigate?: boolean }) => void;
  resetDemo: () => void;
  decide: (invId: string, kind: DecisionKind, note?: string) => void;
  requestMoreAnalysis: (invId: string) => void;
  log: (e: Omit<AuditEntry, "id" | "at">) => void;
  testGuardrail: (agent: keyof typeof AGENT, action: string) => ReturnType<typeof evaluateAction>;
  setQualitySim: (s: State["qualitySim"]) => void;
  setAssistantOpen: (o: boolean) => void;
  ask: (q: string) => void;
  setDemo: (d: Partial<State["demo"]>) => void;
  setHighlight: (h: string | null) => void;
}

function createInitial() {
  const tags = initialTags();
  const { hero, secondary } = buildInitialInvestigations(tags);
  return {
    tags,
    targets: baselineTargets(),
    scenarioId: "A" as ScenarioId,
    areas: structuredClone(BASE_AREAS),
    alerts: BASE_ALERTS.slice(),
    investigations: [hero, secondary],
    activeInvId: hero.id,
    runs: { [secondary.id]: { elapsed: secondary.totalMs, playing: false, startMin: -460 } } as Record<string, RunState>,
    analysisPending: null,
    audit: SEED_AUDIT.slice(),
    qualitySim: "normal" as const,
    tick: 0,
  };
}

export const useApp = create<State>((set, get) => ({
  view: "overview",
  selectedArea: "synthesis",
  focusTag: null,
  realStart: Date.now(),
  ...createInitial(),
  assistantOpen: false,
  messages: [],
  thinking: false,
  demo: { active: false, step: 0 },
  highlight: null,

  setView: (view) => {
    set({ view });
    if (typeof window !== "undefined" && window.location.hash !== `#/${view}`) window.history.replaceState(null, "", `#/${view}`);
  },
  setArea: (selectedArea) => set({ selectedArea }),
  setFocusTag: (focusTag) => set({ focusTag }),
  setActiveInv: (activeInvId) => set({ activeInvId }),
  nowMin: () => (Date.now() - get().realStart) / 60000,
  clock: (seconds = false) => clockLabel(get().nowMin(), seconds),

  kpis: () => {
    const s = get();
    const production = s.tags.PRODUCTION.value;
    const scenario = scenarioById(s.scenarioId);
    const open = s.investigations.filter((i) => i.status === "queued" || i.status === "running" || i.status === "awaiting-approval").length;
    return {
      production,
      target: DEMO.productionTarget,
      performance: (production / DEMO.productionTarget) * 100,
      purity: s.tags["MEOH-PURITY"].value,
      energyIntensity: s.tags["EN-INT"].value,
      availability: s.scenarioId === "H" ? 96.4 : DEMO.availability,
      activeAlerts: s.alerts.length,
      investigations: Math.max(open, 0),
      recoveryTpd: scenario.recoveryTpd,
      opportunityAedM: aedM(Math.max(0, Math.round(2552 - (s.targets.PRODUCTION ?? TAG.PRODUCTION.baseline)))),
    } as Kpis;
  },

  tickPlant: () => {
    const s = get();
    const tick = s.tick + 1;
    set({ tick, tags: tickTags(s.tags, s.targets, tick) });
  },

  advanceRuns: (dt) => {
    const s = get();
    let changed = false;
    const runs = { ...s.runs };
    let investigations = s.investigations;
    const newAudit: AuditEntry[] = [];
    const at = (startMin: number, ms: number) => clockLabel(startMin + ms / 60000, true);

    for (const [id, run] of Object.entries(s.runs)) {
      if (!run.playing) continue;
      const inv = investigations.find((i) => i.id === id);
      if (!inv) continue;
      const prev = run.elapsed;
      const next = Math.min(inv.totalMs, prev + dt);
      changed = true;
      // audit entries for agent milestones crossed in this slice
      for (const step of inv.steps) {
        const name = AGENT[step.agentId].name;
        if (prev < step.startMs + 1 && next >= step.startMs + 1 && !(prev === 0 && step.startMs === 0 && false))
          newAudit.push({ id: `a${++auditSeq}`, at: at(run.startMin, step.startMs), actorType: "agent", actor: name, action: "Data access (read-only)", detail: `${inv.code} · ${step.sources.join(", ")}`, outcome: "allowed" });
        const end = step.startMs + step.durationMs;
        if (prev < end && next >= end)
          newAudit.push({ id: `a${++auditSeq}`, at: at(run.startMin, end), actorType: "agent", actor: name, action: "Findings submitted", detail: `${inv.code} · ${step.evidence.length} evidence items · confidence ${step.confidence}%`, outcome: "info" });
      }
      if (next >= inv.totalMs) {
        runs[id] = { ...run, elapsed: next, playing: false };
        investigations = investigations.map((i) => (i.id === id ? orchestrator.requestHumanApproval(i) : i));
        newAudit.push({ id: `a${++auditSeq}`, at: at(run.startMin, inv.totalMs), actorType: "agent", actor: "Methanol Operations Agent", action: "Conclusion & recommendation issued", detail: `${inv.code} · ${inv.conclusion.likelyCause} (${inv.conclusion.confidence}%)`, outcome: "info" });
        newAudit.push({ id: `a${++auditSeq}`, at: at(run.startMin, inv.totalMs), actorType: "policy", actor: "Policy engine", action: "Human approval required", detail: `${inv.code} · ${inv.recommendations.length} recommended steps · no plant action executed`, outcome: "pending" });
      } else {
        runs[id] = { ...run, elapsed: next };
      }
    }
    if (changed) set({ runs, investigations, audit: newAudit.length ? [...newAudit.reverse(), ...s.audit] : s.audit });
  },

  startInvestigation: (id) => {
    const s = get();
    const invId = id ?? s.activeInvId;
    const startMin = s.nowMin();
    set({
      activeInvId: invId,
      runs: { ...s.runs, [invId]: { elapsed: 0.01, playing: true, startMin } },
      investigations: s.investigations.map((i) => (i.id === invId ? { ...i, status: "running", decisions: [] } : i)),
    });
    get().log({ actorType: "agent", actor: "Methanol Operations Agent", action: "Council convened", detail: `${invId} · agents assigned per routing policy`, outcome: "info" });
  },

  completeInvestigation: (id) => {
    const s = get();
    const invId = id ?? s.activeInvId;
    const inv = s.investigations.find((i) => i.id === invId);
    if (!inv) return;
    const run = s.runs[invId];
    if (!run) {
      get().startInvestigation(invId);
    }
    const r = get().runs[invId];
    if (r.elapsed < inv.totalMs) {
      set({ runs: { ...get().runs, [invId]: { ...r, playing: true } } });
      get().advanceRuns(inv.totalMs);
    }
  },

  applyScenario: (id, opts = {}) => {
    const { autoRun = true, navigate = true } = opts;
    const s = get();
    const scenario = scenarioById(id);
    const nowMin = s.nowMin();
    const targets = { ...baselineTargets(), ...scenario.tagTargets };
    const areas = structuredClone(BASE_AREAS);
    for (const [a, v] of Object.entries(scenario.areas)) areas[a as AreaId] = { ...areas[a as AreaId], ...v };
    const time = clockLabel(nowMin);
    const scenarioAlerts = scenario.alerts.map((a) => ({ ...a, id: `${id}-${a.id}`, time }));
    for (const a of scenarioAlerts) areas[a.area].alerts += 1;

    let investigations = s.investigations;
    let invId = s.investigations[0].id;
    if (id === "A") {
      invId = s.investigations.find((i) => i.scenarioId === "A")!.id;
    } else {
      const snapshot: Record<string, TagLive> = { ...s.tags };
      for (const [tag, v] of Object.entries(scenario.tagTargets)) snapshot[tag] = { ...snapshot[tag], value: v };
      const inv = orchestrator.run({ scenarioId: id, pack: scenario.pack, snapshot, nowMin, status: "queued" });
      const existing = investigations.filter((i) => i.code === inv.code).length;
      if (existing) inv.id = `${inv.code}-R${existing + 1}`;
      investigations = [inv, ...investigations];
      invId = inv.id;
    }
    set({ scenarioId: id, targets, areas, alerts: [...scenarioAlerts, ...BASE_ALERTS], investigations, activeInvId: invId, qualitySim: id === "C" ? "deviation" : "normal" });
    get().log({ actorType: "human", actor: DEMO.operator.name, action: "Scenario injected (simulator)", detail: `Scenario ${id} – ${scenario.name}`, outcome: "info" });
    if (navigate) get().setView("council");
    if (autoRun) setTimeout(() => get().startInvestigation(invId), 900);
  },

  resetDemo: () => {
    set({ ...createInitial(), realStart: Date.now(), view: "overview", messages: [], highlight: null });
  },

  decide: (invId, kind, note) => {
    const s = get();
    const labels: Record<DecisionKind, string> = {
      approve: "Investigation plan approved",
      "more-analysis": "Requested more analysis",
      assign: "Assigned to process engineer",
      "maintenance-review": "Maintenance review created (draft)",
      dismiss: "Recommendation dismissed",
    };
    const decision = { kind, by: DEMO.operator.name, role: DEMO.operator.role, at: get().clock(true), note };
    set({ investigations: s.investigations.map((i) => (i.id === invId ? orchestrator.closeInvestigation(i, decision) : i)) });
    get().log({
      actorType: "human",
      actor: `${DEMO.operator.name}`,
      action: labels[kind],
      detail: `${invId}${note ? ` · ${note}` : ""} · no plant action executed by AI`,
      outcome: kind === "dismiss" ? "dismissed" : "approved",
    });
    if (kind === "approve") get().log({ actorType: "agent", actor: "Shift Agent", action: "Work requests prepared (draft)", detail: `${invId} · verification tasks queued for named owners`, outcome: "info" });
    if (kind === "maintenance-review") get().log({ actorType: "agent", actor: "Asset Agent", action: "CMMS notification drafted", detail: `${invId} · awaiting planner approval (not submitted)`, outcome: "pending" });
  },

  requestMoreAnalysis: (invId) => {
    get().decide(invId, "more-analysis");
    set({ analysisPending: invId });
    setTimeout(() => {
      const s = get();
      const inv = s.investigations.find((i) => i.id === invId);
      if (!inv) return;
      const pack = SCENARIOS.find((x) => x.pack.code === inv.code)?.pack ?? secondaryPack;
      const extra = pack.extraAnalysis.map((e, i) => ({ id: `${invId}-x-${i}`, agentId: e.agentId, text: e.text, weight: "contributing" as const }));
      set({ analysisPending: null, investigations: s.investigations.map((i) => (i.id === invId ? { ...i, extraAnalysis: extra } : i)) });
      get().log({ actorType: "agent", actor: "Methanol Operations Agent", action: "Additional analysis completed", detail: `${invId} · ${extra.length} supplementary findings`, outcome: "info" });
    }, 2600);
  },

  log: (e) => set((s) => ({ audit: [{ ...e, id: `a${++auditSeq}`, at: get().clock(true) }, ...s.audit] })),

  testGuardrail: (agent, action) => {
    const res = evaluateAction(agent, action);
    get().log({ actorType: "policy", actor: "Policy engine", action: res.allowed ? "Action allowed" : "Action BLOCKED", detail: `${AGENT[agent].name} attempted: “${action}” · ${res.policy}`, outcome: res.allowed ? "allowed" : "blocked" });
    return res;
  },

  setQualitySim: (qualitySim) => {
    set({ qualitySim });
    const s = get();
    if (qualitySim === "deviation") set({ targets: { ...s.targets, "MEOH-PURITY": 99.77, "MEOH-H2O": 780, "MEOH-ETOH": 36, "DIS-RR-301": 1.73, "DIS-QR-301": 36.6 } });
    if (qualitySim === "normal") {
      const b = baselineTargets();
      set({ targets: { ...s.targets, "MEOH-PURITY": b["MEOH-PURITY"], "MEOH-H2O": b["MEOH-H2O"], "MEOH-ETOH": b["MEOH-ETOH"], "DIS-RR-301": b["DIS-RR-301"], "DIS-QR-301": b["DIS-QR-301"] } });
    }
  },

  setAssistantOpen: (assistantOpen) => set({ assistantOpen }),
  ask: (q) => {
    const user: ChatMessage = { id: `m${++msgSeq}`, role: "user", text: q };
    set((s) => ({ messages: [...s.messages, user], thinking: true }));
    setTimeout(() => {
      const reply = answerQuestion(q, get());
      set((s) => ({ messages: [...s.messages, { ...reply, id: `m${++msgSeq}` }], thinking: false }));
    }, 750);
  },
  setDemo: (d) => set((s) => ({ demo: { ...s.demo, ...d } })),
  setHighlight: (highlight) => set({ highlight }),
}));

export type AppState = ReturnType<typeof useApp.getState>;

export const AREA_LIST = AREAS;
