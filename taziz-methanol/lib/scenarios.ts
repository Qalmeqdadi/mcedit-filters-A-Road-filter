// Scenario library + investigation knowledge packs.
// A pack is the deterministic "domain knowledge" each simulated agent draws on.
// Agents combine it with live (synthetic) tag values at run time — see lib/agents.
import type {
  AgentId,
  AreaId,
  EventCategory,
  EvidenceSourceId,
  Health,
  PlantAlert,
  Recommendation,
  ScenarioId,
} from "./types";
import { exposureBand, fmtAedM, ECONOMICS } from "@/config/demo";

export interface PackEvidence {
  source: EvidenceSourceId;
  title: string;
  detail: string;
  value?: string;
  signal?: "supports" | "neutral" | "contradicts";
}

export interface AgentWork {
  task: string;
  checks: string[];
  loading: string[];
  sources: string[];
  /** live tags this agent compares against model expectation */
  tagChecks?: string[];
  evidence: PackEvidence[];
  findings: { text: string; weight: "primary" | "contributing" | "context" | "ruled-out" }[];
  confidence: number;
  schedule: { start: number; dur: number; awaitFrom?: number; awaitOn?: string };
}

export interface InvestigationPack {
  code: string;
  title: string;
  question: string;
  category: EventCategory;
  trigger: { title: string; detail: string; severity: Health; tagIds: string[] };
  work: Partial<Record<AgentId, AgentWork>>;
  consolidation: { start: number; dur: number; loading: string[] };
  conclusion: { likelyCause: string; confidence: number; contributing: string[] };
  impact: {
    lossTpd?: number;
    recoverable?: [number, number];
    metrics?: { label: string; value: string; sub?: string; tone?: "alert" | "warn" | "ok" | "info" }[];
    note: string;
  };
  correlations: string[];
  contradictions: string[];
  verification: string[];
  recommendations: Omit<Recommendation, "id">[];
  /** offsets in minutes; anchor 'sim' = relative to simulation start (06:58), 'trigger' = relative to scenario trigger */
  timeline: { offset: number; title: string; detail?: string; kind: "signal" | "deviation" | "agent"; tagId?: string }[];
  anchor: "sim" | "trigger";
  extraAnalysis: { agentId: AgentId; text: string }[];
}

export interface ScenarioDef {
  id: ScenarioId;
  name: string;
  headline: string;
  description: string;
  icon: string;
  tagTargets: Record<string, number>;
  areas: Partial<Record<AreaId, { status: Health; health: number }>>;
  alerts: Omit<PlantAlert, "time">[];
  investigationsOpen: number;
  recoveryTpd: number;
  pack: InvestigationPack;
}

const L = {
  historian: "Consulting historian…",
  maintenance: "Reviewing maintenance records…",
  envelope: "Checking operating envelope…",
  docs: "Retrieving engineering documentation…",
  correlate: "Correlating evidence…",
  impact: "Calculating production impact…",
  recommend: "Preparing recommendation…",
  lims: "Querying LIMS sample results…",
  energy: "Reconciling energy balance…",
};

const consolidation = (start: number) => ({ start, dur: 2600, loading: [L.correlate, L.impact, L.recommend] });

// ───────────────────────────────────────────────────────────── Scenario A – the core storyline
const heroPack: InvestigationPack = {
  code: "INV-26-0412",
  title: "Production 4.0% below target — synthesis loop",
  question: "Why has production dropped ~4% during the previous six hours?",
  category: "production-deviation",
  anchor: "sim",
  trigger: {
    title: "Production deviation detected",
    detail: "Methanol production 2,450 t/day vs 2,550 t/day target (−4.0%). Decline pattern started 04:12 in the synthesis loop.",
    severity: "alert",
    tagIds: ["PRODUCTION", "SYN-F-210", "COMP-C-201"],
  },
  work: {
    operations: {
      task: "Detect deviation, classify event, convene council",
      checks: ["Production vs plan", "6-hour deviation pattern", "Active alarms", "Open work orders"],
      loading: [L.historian, "Classifying event…", "Assigning specialist agents…"],
      sources: ["Historian", "MES", "Alarm journal"],
      tagChecks: ["PRODUCTION"],
      evidence: [
        { source: "production-plan", title: "Production rate vs daily plan", detail: "Rate fell from 2,548 t/day (00:00) to 2,450 t/day; plan 2,550 t/day. Month-to-date buffer erodes within ~1 day.", value: "−4.0%", signal: "supports" },
      ],
      findings: [{ text: "Production deviation is sustained (>2 h), not a transient; origin traced to synthesis area signals.", weight: "context" }],
      confidence: 95,
      schedule: { start: 0, dur: 1400 },
    },
    process: {
      task: "Analyse synthesis loop pressure, recycle flow, reactor temperature, compressor throughput",
      checks: ["Synthesis loop pressure", "Recycle flow", "Reactor temperature", "Compressor throughput"],
      loading: [L.historian, "Running loop mass balance…", "Comparing against process model…"],
      sources: ["Historian", "Process model", "Operating envelope"],
      tagChecks: ["SYN-F-210", "SYN-P-101", "COMP-PI-201S", "SYN-R-101", "COMP-FI-101"],
      evidence: [
        { source: "historian", title: "Recycle flow decline began 04:12", detail: "SYN-F-210 declined steadily from 4,070 to 3,840 Nm³/h. Make-up gas (COMP-FI-101) essentially unchanged (−1.1%).", value: "−5.8%", signal: "supports" },
        { source: "historian", title: "Reactor temperature stable", detail: "SYN-R-101 holding 245 °C within ±1 °C — reaction side is not the initiating cause.", value: "245 °C", signal: "neutral" },
      ],
      findings: [
        { text: "Recycle loop flow approximately 5.8% below expected level.", weight: "primary" },
        { text: "Suction pressure below normal operating band (74.6 vs 75.5–77.5 barg) with stable make-up gas → loop capacity loss, not feed shortfall.", weight: "contributing" },
        { text: "Stable reactor temperature argues against catalyst or reaction-side cause.", weight: "ruled-out" },
      ],
      confidence: 88,
      schedule: { start: 1400, dur: 2600 },
    },
    asset: {
      task: "Examine C-201 vibration, bearing temperature, maintenance history, recent work orders",
      checks: ["Compressor vibration", "Bearing temperature", "Maintenance history", "Recent work orders"],
      loading: ["Reading condition-monitoring data…", L.maintenance, "Scanning recent work orders…"],
      sources: ["Condition monitoring", "EAM / CMMS", "Machinery protection"],
      tagChecks: ["COMP-C-201", "COMP-VIB-201", "COMP-TI-201B", "COMP-EFF-201"],
      evidence: [
        { source: "asset-health", title: "C-201 health index 71 (Elevated risk)", detail: "Vibration +18%, bearing temperature +7%, polytropic efficiency −4%, load stability deteriorating.", value: "71/100", signal: "supports" },
        { source: "maintenance", title: "No intervention explains the change", detail: "Last C-201 activity: vibration route 21 Sep (6.1 mm/s). No work orders, MOCs or isolations in the last 30 days.", value: "0 WOs", signal: "supports" },
      ],
      findings: [
        { text: "Compressor load trending down (97% → 92%) while efficiency falls — operating point drifting below the performance curve.", weight: "primary" },
        { text: "Vibration (6.8 mm/s) still below the 7.1 mm/s alert limit — no immediate mechanical protection risk.", weight: "context" },
        { text: "No recent maintenance intervention explains the change.", weight: "contributing" },
      ],
      confidence: 84,
      schedule: { start: 2200, dur: 2600 },
    },
    quality: {
      task: "Evaluate methanol purity, water content, distillation performance, lab samples",
      checks: ["Methanol purity", "Water content", "Distillation performance", "Lab samples"],
      loading: [L.lims, "Checking online analysers…", "Evaluating column profile…"],
      sources: ["LIMS", "Online analysers"],
      tagChecks: ["MEOH-PURITY", "MEOH-H2O", "DIS-RR-301"],
      evidence: [
        { source: "lab", title: "06:30 sample in specification", detail: "Purity 99.83 wt%, water 420 ppm, ethanol 18 mg/kg. Seven consecutive samples in spec.", value: "In spec", signal: "neutral" },
      ],
      findings: [{ text: "Quality remains within specification; distillation is not constraining rate.", weight: "ruled-out" }],
      confidence: 93,
      schedule: { start: 3400, dur: 2000 },
    },
    energy: {
      task: "Evaluate compressor power, steam balance, reformer duty, energy intensity",
      checks: ["Compressor power", "Steam balance", "Reformer duty", "Plant energy intensity"],
      loading: [L.energy, "Computing specific compressor power…"],
      sources: ["Utilities historian", "Energy model"],
      tagChecks: ["EN-INT", "COMP-JI-201", "REF-QI-201"],
      evidence: [
        { source: "historian", title: "Energy intensity +3.1% since 05:10", detail: "28.4 GJ/t vs 27.55 GJ/t model. C-201 specific power +7% per tonne recycled.", value: "+3.1%", signal: "supports" },
      ],
      findings: [
        { text: "Energy consumption per tonne increasing, consistent with compressor efficiency loss.", weight: "contributing" },
        { text: "Reformer excess O₂ elevated (2.4%) — separate, secondary energy issue tracked in INV-26-0411.", weight: "context" },
      ],
      confidence: 86,
      schedule: { start: 4200, dur: 2000 },
    },
    engineering: {
      task: "Search SOPs, compressor manual, P&IDs, troubleshooting guide, prior incidents",
      checks: ["SOPs", "Compressor manual", "P&IDs", "Troubleshooting guide", "Prior incident reports"],
      loading: [L.docs, "Matching prior incident patterns…", "Extracting cited procedures…"],
      sources: ["Document management", "MOC register", "Incident database"],
      evidence: [
        { source: "documents", title: "OEM manual §6.4 – curve verification", detail: "Operating point below curve at constant speed indicates recirculation, fouling, seal wear or inlet restriction.", value: "C-201 OEM", signal: "supports" },
        { source: "procedures", title: "Synthesis Loop SOP §3.4", detail: "Low suction response: verify make-up flow, purge valve, V-210 level and strainer ΔP. Anti-surge changes are engineering-only under MOC.", value: "SOP-0210", signal: "supports" },
        { source: "documents", title: "Incident IR-2024-017 – strainer blockage", detail: "Prior 6% recycle loss over 8 h caused by catalyst fines on S-201. Similarity to current pattern 0.78.", value: "0.78 match", signal: "supports" },
      ],
      findings: [
        { text: "Pattern resembles 2024 suction strainer restriction event; P&ID identifies S-201, V-210 demister and E-205 as restriction points.", weight: "contributing" },
        { text: "MOC register: no changes to anti-surge or purge set-points since Aug 2026.", weight: "context" },
      ],
      confidence: 81,
      schedule: { start: 5200, dur: 2400, awaitFrom: 1400, awaitOn: "Process & Asset findings" },
    },
    hse: {
      task: "Validate proposed actions remain inside the demo operating envelope",
      checks: ["Operating envelope", "Permit-to-work prerequisites", "Safety-critical elements"],
      loading: [L.envelope, "Checking permit-to-work prerequisites…"],
      sources: ["Operating envelope", "PTW rules", "SCE register"],
      evidence: [
        { source: "procedures", title: "Envelope check passed", detail: "All proposed steps are verification / inspection activities. No set-point, interlock or SIS change proposed.", value: "Pass", signal: "neutral" },
      ],
      findings: [
        { text: "Recommendations are advisory and inside the operating envelope; intrusive inspection would require isolation, gas test and permit.", weight: "context" },
      ],
      confidence: 97,
      schedule: { start: 8000, dur: 1600, awaitFrom: 3000, awaitOn: "draft recommendations" },
    },
    production: {
      task: "Quantify production and commercial impact",
      checks: ["Lost production", "Recoverable volume", "Cargo commitments"],
      loading: [L.impact, "Checking cargo schedule…"],
      sources: ["Production plan", "Tank inventory"],
      evidence: [
        { source: "production-plan", title: "Cargo MT Demo Horizon (16 Oct)", detail: "18,000 t nomination remains on track if rate is restored within 48 h.", value: "On track", signal: "neutral" },
      ],
      findings: [{ text: "~102 t/day current loss; 80–90 t/day recoverable if compressor throughput is restored.", weight: "context" }],
      confidence: 90,
      schedule: { start: 9000, dur: 1600, awaitFrom: 4000, awaitOn: "root-cause hypothesis" },
    },
    shift: {
      task: "Log investigation to shift record and handover",
      checks: ["Shift log", "Handover actions"],
      loading: ["Updating shift log…"],
      sources: ["Shift log"],
      evidence: [],
      findings: [{ text: "Investigation summary added to day-shift log; 3 handover actions drafted.", weight: "context" }],
      confidence: 99,
      schedule: { start: 11000, dur: 1200 },
    },
  },
  consolidation: consolidation(9600),
  conclusion: {
    likelyCause: "Synthesis-loop compressor throughput degradation",
    confidence: 87,
    contributing: [
      "Compressor load trending down",
      "Suction pressure below normal operating band",
      "Recycle loop flow approximately 5.8% below expected level",
      "Energy consumption per tonne increasing",
      "No recent maintenance intervention explains the change",
    ],
  },
  impact: { lossTpd: 102, recoverable: [80, 90], note: "Illustrative — based on synthetic data and an assumed value per tonne." },
  correlations: [
    "Recycle flow, C-201 load and suction pressure moved together from 04:12–04:37 (r = 0.94).",
    "Energy intensity rise lags the compressor efficiency drop by ~30 min.",
    "Make-up gas and reactor temperature stable → loop-side, not feed- or reaction-side, cause.",
  ],
  contradictions: [
    "Vibration rise (+18%) is gradual over 24 h and pre-dates the 04:12 step — may be a separate, slower mechanism.",
    "Strainer ΔP indication (PDI-201) not available in the read replica — restriction hypothesis not yet confirmed.",
  ],
  verification: [
    "Field-read PDI-201 across suction strainer S-201.",
    "Compare C-201 operating point with OEM performance curve at current speed.",
    "Confirm V-210 separator level and demister ΔP.",
    "Review anti-surge valve FV-201 position trend (read-only).",
  ],
  recommendations: [
    { title: "Validate compressor suction conditions", detail: "Field-verify suction pressure, temperature and strainer ΔP (PDI-201) against DCS readings.", owner: "Panel operator / field operator", kind: "verify" },
    { title: "Inspect recycle-loop restrictions", detail: "Check S-201 strainer, V-210 demister ΔP and E-205 tube-side ΔP for fouling or catalyst fines.", owner: "Process engineer", kind: "inspect" },
    { title: "Compare compressor operating curve", detail: "Plot current operating point on the OEM curve (OEM manual §6.4) to quantify head/flow loss.", owner: "Rotating equipment engineer", kind: "review" },
    { title: "Review anti-surge behaviour", detail: "Review FV-201 position and UIC-201 margin trend. Any controller change only via MOC.", owner: "Control engineer", kind: "review" },
    { title: "Schedule targeted inspection if degradation persists", detail: "If efficiency loss persists > 48 h, plan targeted inspection under permit (prerequisites per OEM §9.1).", owner: "Maintenance planner", kind: "schedule" },
  ],
  timeline: [
    { offset: -166, title: "Recycle flow begins declining", detail: "SYN-F-210 leaves its normal band trajectory", kind: "signal", tagId: "SYN-F-210" },
    { offset: -141, title: "Compressor load deviates from historical pattern", detail: "C-201 load 97% → trending down", kind: "signal", tagId: "COMP-C-201" },
    { offset: -108, title: "Energy intensity increases 3.1%", detail: "28.4 GJ/t vs 27.55 GJ/t model", kind: "signal", tagId: "EN-INT" },
    { offset: -74, title: "Production falls below 2,500 t/day", detail: "MES advisory raised", kind: "deviation", tagId: "PRODUCTION" },
    { offset: -28, title: "Operations Agent initiates investigation", detail: "INV-26-0412 opened, council requested", kind: "agent" },
  ],
  extraAnalysis: [
    { agentId: "process", text: "Purge rate (PIC-212 output) unchanged at 31% — purge losses do not explain the loop pressure drop." },
    { agentId: "asset", text: "Spectrum (latest route data, simulated): 1× running-speed component dominant — more consistent with fouling/imbalance than bearing instability." },
    { agentId: "engineering", text: "OEM curve overlay: current point ~6% below guaranteed flow at same head — matches observed recycle deficit." },
  ],
};

// ───────────────────────────────────────────────────────────── Secondary open investigation (energy)
export const secondaryPack: InvestigationPack = {
  code: "INV-26-0411",
  title: "Reformer energy consumption above model",
  question: "Why is reformer fired duty higher than the energy model predicts?",
  category: "energy-deviation",
  anchor: "sim",
  trigger: { title: "Reformer energy deviation", detail: "Fired duty +2.3% and flue gas excess O₂ 2.4% (target 1.8%).", severity: "watch", tagIds: ["REF-AI-205", "REF-QI-201"] },
  work: {
    operations: { task: "Classify energy deviation", checks: ["Energy model residual"], loading: [L.historian], sources: ["Historian"], evidence: [], findings: [{ text: "Energy deviation persistent since 22:00.", weight: "context" }], confidence: 92, schedule: { start: 0, dur: 1000 } },
    energy: {
      task: "Reconcile reformer heat balance",
      checks: ["Fired duty", "Excess O₂", "Stack temperature"],
      loading: [L.energy],
      sources: ["Utilities historian", "Energy model"],
      tagChecks: ["REF-AI-205", "REF-QI-201"],
      evidence: [{ source: "historian", title: "Excess O₂ 2.4% vs 1.8% target", detail: "Rising since 22:00; stack losses +0.3 GJ/t.", value: "+0.6 pt", signal: "supports" }],
      findings: [{ text: "Excess combustion air on burner row C is the most likely driver.", weight: "primary" }],
      confidence: 83,
      schedule: { start: 1000, dur: 2000 },
    },
    engineering: {
      task: "Retrieve burner tuning records",
      checks: ["Alarm response manual", "Maintenance records"],
      loading: [L.docs],
      sources: ["Document management"],
      evidence: [{ source: "maintenance", title: "Burner tuning 28 Sep", detail: "Row C retuned; WO-26-04388 inspection in progress.", value: "WO open", signal: "supports" }],
      findings: [{ text: "Row C damper positions drifted after 28 Sep tuning.", weight: "contributing" }],
      confidence: 78,
      schedule: { start: 2000, dur: 1800 },
    },
    hse: { task: "Validate envelope", checks: ["Operating envelope"], loading: [L.envelope], sources: ["Operating envelope"], evidence: [], findings: [{ text: "Air adjustment is an operator action through DCS within limits.", weight: "context" }], confidence: 97, schedule: { start: 3800, dur: 1000 } },
  },
  consolidation: { start: 4800, dur: 1200, loading: [L.correlate, L.recommend] },
  conclusion: { likelyCause: "Reformer combustion air imbalance (burner row C)", confidence: 83, contributing: ["Excess O₂ 0.6 pt above target", "Fired duty +2.3%", "Row C damper drift after tuning"] },
  impact: {
    metrics: [
      { label: "Energy penalty", value: "~0.30 GJ/t", tone: "warn" },
      { label: "Energy cost", value: `~AED ${Math.round((0.3 * 2450 * ECONOMICS.gasPriceAedPerGj) / 1000)}K/day`, tone: "warn" },
      { label: "Additional CO₂", value: "~40 t/day", tone: "warn" },
    ],
    note: "Illustrative energy-cost estimate (synthetic data, assumed gas price).",
  },
  correlations: ["Excess O₂ rise coincides with row C damper position change."],
  contradictions: ["O₂ analyser last calibrated 34 days ago — validity check advised."],
  verification: ["Validate O₂ analyser against portable reading.", "Field-check row C damper positions."],
  recommendations: [
    { title: "Validate O₂ analyser", detail: "Portable flue-gas check at reformer arch.", owner: "Instrument technician", kind: "verify" },
    { title: "Rebalance burner air (operator action)", detail: "Supervisor-approved adjustment via DCS toward 1.8% O₂.", owner: "Panel operator", kind: "review" },
  ],
  timeline: [
    { offset: -538, title: "Excess O₂ begins rising", kind: "signal", tagId: "REF-AI-205" },
    { offset: -460, title: "Energy Agent opens INV-26-0411", kind: "agent" },
  ],
  extraAnalysis: [{ agentId: "energy", text: "Stack temperature +6 °C confirms higher flue gas mass flow." }],
};

// helper to keep the shorter scenario packs compact
function work(
  task: string,
  checks: string[],
  sources: string[],
  evidence: PackEvidence[],
  findings: AgentWork["findings"],
  confidence: number,
  schedule: AgentWork["schedule"],
  loading: string[] = [L.historian],
  tagChecks?: string[],
): AgentWork {
  return { task, checks, sources, evidence, findings, confidence, schedule, loading, tagChecks };
}

const shiftLog = (start: number) =>
  work("Log investigation to shift record", ["Shift log"], ["Shift log"], [], [{ text: "Investigation summary added to shift log and handover.", weight: "context" }], 99, { start, dur: 1000 }, ["Updating shift log…"]);

const hseCheck = (start: number, text: string) =>
  work("Validate actions against operating envelope", ["Operating envelope", "PTW prerequisites"], ["Operating envelope", "PTW rules"], [{ source: "procedures", title: "Envelope check passed", detail: text, value: "Pass", signal: "neutral" }], [{ text, weight: "context" }], 97, { start, dur: 1400, awaitFrom: 2000, awaitOn: "draft recommendations" }, [L.envelope]);

const opsDetect = (text: string, tags: string[]) =>
  work("Detect deviation, classify event, convene council", ["Deviation pattern", "Active alarms"], ["Historian", "Alarm journal"], [], [{ text, weight: "context" }], 94, { start: 0, dur: 1300 }, [L.historian, "Classifying event…", "Assigning specialist agents…"], tags);

// ───────────────────────────────────────────────────────────── Scenario library
export const SCENARIOS: ScenarioDef[] = [
  {
    id: "A",
    name: "Production drop",
    headline: "Production 4% below target over six hours",
    description: "The core storyline: synthesis loop recycle flow and C-201 load decline, pulling production to 2,450 t/day.",
    icon: "TrendingDown",
    tagTargets: {},
    areas: { synthesis: { status: "alert", health: 74 }, reform: { status: "watch", health: 88 } },
    alerts: [],
    investigationsOpen: 2,
    recoveryTpd: 86,
    pack: heroPack,
  },
  {
    id: "B",
    name: "Compressor degradation",
    headline: "C-201 vibration crosses alert limit",
    description: "Vibration and bearing temperature accelerate on the synthesis loop compressor; efficiency falls further.",
    icon: "Cog",
    tagTargets: { "COMP-VIB-201": 8.4, "COMP-TI-201B": 92.4, "COMP-EFF-201": 75.1, "COMP-C-201": 90, "SYN-F-210": 3780, PRODUCTION: 2428, "EN-INT": 28.6 },
    areas: { synthesis: { status: "critical", health: 62 }, reform: { status: "watch", health: 88 } },
    alerts: [
      { id: "b1", area: "synthesis", severity: "critical", title: "C-201 vibration above alert limit", detail: "8.4 mm/s vs 7.1 mm/s alert (trip 11.0 mm/s handled by machinery protection).", tagId: "COMP-VIB-201", raisedBy: "asset" },
      { id: "b2", area: "synthesis", severity: "alert", title: "C-201 bearing temperature rising", detail: "92.4 °C, +4 °C in 40 min.", tagId: "COMP-TI-201B", raisedBy: "asset" },
    ],
    investigationsOpen: 3,
    recoveryTpd: 70,
    pack: {
      code: "INV-26-0413",
      title: "C-201 accelerated mechanical degradation",
      question: "Is C-201 at risk of an unplanned trip, and what should be done?",
      category: "asset-degradation",
      anchor: "trigger",
      trigger: { title: "Compressor degradation detected", detail: "C-201 vibration 8.4 mm/s (alert 7.1) with bearing temperature +4 °C in 40 min.", severity: "critical", tagIds: ["COMP-VIB-201", "COMP-TI-201B"] },
      work: {
        operations: opsDetect("Asset-led event with production consequence; council convened with Asset Agent as lead.", ["COMP-VIB-201"]),
        asset: work(
          "Diagnose C-201 vibration, bearing temperature and efficiency trend",
          ["Vibration spectrum", "Bearing temperature", "Lube oil", "Maintenance history"],
          ["Condition monitoring", "EAM / CMMS"],
          [
            { source: "asset-health", title: "Vibration 8.4 mm/s (+45% vs baseline)", detail: "1× and sub-synchronous components both rising (simulated spectrum).", value: "8.4 mm/s", signal: "supports" },
            { source: "maintenance", title: "Oil analysis trend", detail: "Fe 4 ppm (Aug) — next sample due; no recent bearing work.", value: "Fe ↑", signal: "supports" },
          ],
          [
            { text: "Pattern consistent with developing bearing/seal-related instability combined with internal fouling.", weight: "primary" },
            { text: "Still below machinery-protection trip setting; protection system remains in service and is not bypassed.", weight: "context" },
          ],
          82,
          { start: 1300, dur: 2600 },
          ["Reading condition-monitoring data…", L.maintenance, "Running degradation model…"],
          ["COMP-VIB-201", "COMP-TI-201B", "COMP-EFF-201"],
        ),
        process: work(
          "Assess process contribution (suction conditions, load swings)",
          ["Suction pressure", "Load stability", "Anti-surge activity"],
          ["Historian", "Process model"],
          [{ source: "historian", title: "Load swings ±2%", detail: "No surge events recorded; anti-surge margin 12% maintained.", value: "No surge", signal: "neutral" }],
          [{ text: "Process conditions are not driving the vibration rise; anti-surge behaviour normal.", weight: "ruled-out" }],
          85,
          { start: 2000, dur: 2200 },
          [L.historian],
          ["COMP-C-201", "SYN-F-210"],
        ),
        engineering: work(
          "Retrieve OEM vibration guidance and inspection prerequisites",
          ["OEM manual §7.2, §7.5, §9.1", "Maintenance strategy"],
          ["Document management"],
          [{ source: "documents", title: "OEM §7.2 vibration limits", detail: "Alert 7.1 mm/s, trip 11.0 mm/s. Rising trend at stable speed → spectrum analysis.", value: "OEM", signal: "supports" }],
          [{ text: "Maintenance strategy §4.1 requires engineering review within 7 days (threshold exceeded).", weight: "contributing" }],
          88,
          { start: 3600, dur: 2000, awaitFrom: 1300, awaitOn: "Asset diagnosis" },
          [L.docs],
        ),
        energy: work("Quantify energy penalty", ["Specific compressor power"], ["Energy model"], [{ source: "historian", title: "Specific power +9%", detail: "Efficiency 75.1% vs 80% design.", value: "+9%", signal: "supports" }], [{ text: "Energy penalty growing with efficiency loss.", weight: "contributing" }], 84, { start: 4200, dur: 1600 }, [L.energy], ["COMP-EFF-201"]),
        hse: hseCheck(6000, "Recommended actions are monitoring, analysis and planning; any intrusive work requires shutdown, isolation and permit."),
        production: work("Assess trip consequence", ["Trip exposure", "Planned vs unplanned outage"], ["Production plan"], [{ source: "production-plan", title: "Unplanned trip consequence", detail: "Full-rate loss for est. 36–48 h restart vs planned 24 h intervention window.", value: "36–48 h", signal: "neutral" }], [{ text: "A planned intervention is materially cheaper than an unplanned trip (illustrative).", weight: "context" }], 86, { start: 6800, dur: 1400 }, [L.impact]),
        shift: shiftLog(9200),
      },
      consolidation: consolidation(7200),
      conclusion: { likelyCause: "Progressive mechanical degradation of C-201 (bearing/seal-related instability with fouling contribution)", confidence: 82, contributing: ["Vibration +45% vs baseline, above alert limit", "Bearing temperature +4 °C in 40 min", "Efficiency 75.1% (−6%)", "No process-side trigger (anti-surge normal)"] },
      impact: { lossTpd: 122, recoverable: [60, 80], note: "Plus avoided unplanned-trip exposure (full rate for 36–48 h). Illustrative." },
      correlations: ["Bearing temperature and vibration rising together (r = 0.91).", "Efficiency loss tracks vibration growth."],
      contradictions: ["Oil analysis is 6 weeks old — bearing hypothesis needs a fresh sample."],
      verification: ["Urgent lube-oil sample and analysis.", "Machinery engineer spectrum review.", "Confirm readings on redundant probes."],
      recommendations: [
        { title: "Request machinery engineer spectrum review", detail: "Within 4 h; confirm on redundant probes.", owner: "Rotating equipment engineer", kind: "review" },
        { title: "Take urgent lube-oil sample", detail: "Ferrography and water content.", owner: "Field operator / lab", kind: "verify" },
        { title: "Prepare planned intervention option", detail: "Bearing set and DGS on site; prepare isolation plan and permit prerequisites (OEM §9.1).", owner: "Maintenance planner", kind: "schedule" },
        { title: "Increase monitoring frequency", detail: "Hourly vibration/temperature review until decision.", owner: "Shift supervisor", kind: "monitor" },
      ],
      timeline: [
        { offset: -40, title: "C-201 vibration trend accelerates", kind: "signal", tagId: "COMP-VIB-201" },
        { offset: -12, title: "Bearing temperature +4 °C", kind: "signal", tagId: "COMP-TI-201B" },
        { offset: -2, title: "Vibration crosses 7.1 mm/s alert", kind: "deviation", tagId: "COMP-VIB-201" },
      ],
      extraAnalysis: [{ agentId: "asset", text: "Similar signature in fleet library (simulated): 3 of 4 matched cases were thrust/journal bearing wear." }],
    },
  },
  {
    id: "C",
    name: "Methanol purity deterioration",
    headline: "Purity trending toward the demo spec limit",
    description: "Refining column performance degrades: water and ethanol rise, purity trends down toward 99.75 wt%.",
    icon: "FlaskConical",
    tagTargets: { "MEOH-PURITY": 99.77, "MEOH-H2O": 780, "MEOH-ETOH": 36, "DIS-RR-301": 1.73, "DIS-QR-301": 36.6, "DIS-TI-301": 65.3 },
    areas: { distill: { status: "alert", health: 76 }, synthesis: { status: "alert", health: 74 } },
    alerts: [
      { id: "c1", area: "distill", severity: "alert", title: "Purity trending toward spec limit", detail: "99.77 wt% (demo limit 99.75); predicted off-spec risk 68%.", tagId: "MEOH-PURITY", raisedBy: "quality" },
      { id: "c2", area: "distill", severity: "watch", title: "Water in product rising", detail: "780 ppm, +360 ppm in 90 min.", tagId: "MEOH-H2O", raisedBy: "quality" },
    ],
    investigationsOpen: 3,
    recoveryTpd: 86,
    pack: {
      code: "INV-26-0414",
      title: "Methanol purity deterioration — T-301",
      question: "Are we at risk of producing off-spec methanol, and why?",
      category: "quality-risk",
      anchor: "trigger",
      trigger: { title: "Quality risk predicted", detail: "Quality Agent predicts purity below demo spec within ~60–90 min.", severity: "alert", tagIds: ["MEOH-PURITY", "MEOH-H2O"] },
      work: {
        operations: opsDetect("Quality-risk event; council convened with Quality Agent as lead.", ["MEOH-PURITY"]),
        quality: work(
          "Evaluate purity, water, ethanol and column profile; predict off-spec risk",
          ["Methanol purity", "Water content", "Ethanol / higher alcohols", "Column temperature profile"],
          ["LIMS", "Online analysers", "Distillation model"],
          [
            { source: "lab", title: "Online analyser vs lab", detail: "Online water 780 ppm; last lab sample 420 ppm (06:30) — urgent grab sample requested.", value: "780 ppm", signal: "supports" },
            { source: "historian", title: "Column temperature profile shifted", detail: "Top temperature +0.7 °C; lower trays warmer.", value: "+0.7 °C", signal: "supports" },
          ],
          [
            { text: "Off-spec risk 68% within ~90 min if trend continues.", weight: "primary" },
            { text: "Reflux ratio deviation is the strongest contributing variable.", weight: "contributing" },
          ],
          79,
          { start: 1300, dur: 2600 },
          [L.lims, "Running purity prediction model…"],
          ["MEOH-PURITY", "MEOH-H2O", "MEOH-ETOH", "DIS-TI-301"],
        ),
        process: work("Check reflux ratio and reboiler duty", ["Reflux ratio", "Reboiler duty", "Feed composition"], ["Historian", "Process model"], [{ source: "historian", title: "Reflux ratio 1.73 vs 1.85", detail: "Reflux controller output drifting; reboiler duty swinging ±3%.", value: "−6.5%", signal: "supports" }], [{ text: "Reflux ratio deviation and reboiler duty swings are destabilising the column.", weight: "primary" }], 80, { start: 2000, dur: 2200 }, [L.historian], ["DIS-RR-301", "DIS-QR-301"]),
        energy: work("Check LP steam supply to reboiler", ["Steam header", "Reboiler steam"], ["Utilities historian"], [{ source: "historian", title: "LP steam header stable", detail: "No header disturbance — reboiler swing is local.", value: "Stable", signal: "contradicts" }], [{ text: "Steam supply is not the cause (unlike IR-2025-009).", weight: "ruled-out" }], 82, { start: 3000, dur: 1600 }, [L.energy]),
        engineering: work("Retrieve troubleshooting guide & prior events", ["Distillation troubleshooting guide", "Incident IR-2025-009"], ["Document management", "Incident database"], [{ source: "documents", title: "Troubleshooting guide §2.1", detail: "Rising water: reduced reflux, reboiler swings, profile shift, wetter crude feed.", value: "TG-0301", signal: "supports" }, { source: "documents", title: "Historical match: IR-2025-009", detail: "Similar water excursion (900 ppm) recovered in 3 h. Similarity 0.81.", value: "0.81", signal: "supports" }], [{ text: "Historical event match supports a column-control cause.", weight: "contributing" }], 84, { start: 3600, dur: 2000, awaitFrom: 1300, awaitOn: "Quality findings" }, [L.docs]),
        hse: hseCheck(5800, "Recommended checks are sampling and operator review of controller tuning; no limit changes proposed."),
        production: work("Assess product routing exposure", ["Tank quality", "Cargo schedule"], ["Tank inventory"], [{ source: "production-plan", title: "TK-401 receiving", detail: "Off-spec product could contaminate ~200 t rundown before diversion.", value: "~200 t", signal: "neutral" }], [{ text: "Diverting to off-spec tank protects saleable inventory (operator decision).", weight: "context" }], 85, { start: 6400, dur: 1400 }, [L.impact]),
        shift: shiftLog(9000),
      },
      consolidation: consolidation(7000),
      conclusion: { likelyCause: "Refining column T-301 reflux ratio deviation combined with reboiler duty swings", confidence: 79, contributing: ["Reflux ratio 1.73 vs 1.85 target", "Column temperature profile shifted upward", "Reboiler duty swinging ±3%", "Steam supply ruled out"] },
      impact: { metrics: [{ label: "Off-spec risk (90 min)", value: "68%", tone: "alert" }, { label: "Inventory at risk", value: "~200 t", sub: "TK-401 rundown", tone: "warn" }, { label: "Downgrade exposure", value: fmtAedM((200 * ECONOMICS.aedPerTonne * 0.15) / 1e6), sub: "assumed 15% price discount", tone: "warn" }], note: "Illustrative — synthetic data." },
      correlations: ["Water rise follows reflux ratio drop by ~20 min.", "Ethanol rise consistent with temperature profile shift."],
      contradictions: ["Lab sample (06:30) still in spec — analyser reading needs grab-sample confirmation."],
      verification: ["Urgent grab sample to lab.", "Check reflux flow transmitter vs controller output.", "Review tray 12–18 temperatures."],
      recommendations: [
        { title: "Request urgent grab sample", detail: "Confirm online analyser reading.", owner: "Lab / field operator", kind: "verify" },
        { title: "Review reflux controller (operator)", detail: "Panel operator to review reflux control loop; any set-point change by operator via DCS.", owner: "Panel operator", kind: "review" },
        { title: "Prepare rundown diversion option", detail: "Off-spec tank line-up ready if confirmed — operator decision.", owner: "Shift supervisor", kind: "schedule" },
      ],
      timeline: [
        { offset: -90, title: "Reflux ratio begins drifting", kind: "signal", tagId: "DIS-RR-301" },
        { offset: -45, title: "Water in product rising", kind: "signal", tagId: "MEOH-H2O" },
        { offset: -3, title: "Quality Agent predicts off-spec risk 68%", kind: "deviation", tagId: "MEOH-PURITY" },
      ],
      extraAnalysis: [{ agentId: "quality", text: "Sensitivity: restoring reflux ratio to 1.83 reduces predicted off-spec risk to ~15% (model estimate)." }],
    },
  },
  {
    id: "D",
    name: "High energy intensity",
    headline: "Energy intensity rises to 29.6 GJ/t",
    description: "Reformer excess O₂ climbs and HP steam is let down, pushing plant energy intensity 7% above model.",
    icon: "Zap",
    tagTargets: { "EN-INT": 29.6, "REF-AI-205": 3.4, "REF-QI-201": 231, "STM-PI-001": 113.9 },
    areas: { reform: { status: "alert", health: 76 }, synthesis: { status: "alert", health: 74 } },
    alerts: [{ id: "d1", area: "reform", severity: "alert", title: "Energy intensity 29.6 GJ/t", detail: "+7.4% vs model; reformer excess O₂ 3.4%.", tagId: "EN-INT", raisedBy: "energy" }],
    investigationsOpen: 3,
    recoveryTpd: 86,
    pack: {
      code: "INV-26-0415",
      title: "Energy intensity 7% above model",
      question: "What is causing energy intensity to increase?",
      category: "energy-deviation",
      anchor: "trigger",
      trigger: { title: "Energy intensity deviation", detail: "29.6 GJ/t vs 27.55 GJ/t model.", severity: "alert", tagIds: ["EN-INT", "REF-AI-205"] },
      work: {
        operations: opsDetect("Energy-led event; council convened with Energy Agent as lead.", ["EN-INT"]),
        energy: work("Reconcile plant energy balance", ["Reformer duty", "Excess O₂", "Steam balance", "Compressor power"], ["Utilities historian", "Energy model"], [{ source: "historian", title: "Excess O₂ 3.4%", detail: "Stack losses +0.9 GJ/t.", value: "+1.6 pt", signal: "supports" }, { source: "historian", title: "HP steam let-down 14 t/h", detail: "Header pressure high; let-down valve 18% open.", value: "14 t/h", signal: "supports" }], [{ text: "Combustion air excess is the dominant energy loss.", weight: "primary" }, { text: "HP→MP steam let-down wastes ~0.3 GJ/t.", weight: "contributing" }], 84, { start: 1300, dur: 2600 }, [L.energy, "Computing loss waterfall…"], ["EN-INT", "REF-AI-205", "REF-QI-201", "STM-PI-001"]),
        process: work("Check reformer conditions", ["Outlet temperature", "S/C ratio"], ["Historian"], [{ source: "historian", title: "Reformer outlet temperature normal", detail: "882 °C, S/C 2.82 — process side normal.", value: "Normal", signal: "neutral" }], [{ text: "Process-side reforming conditions normal; loss is on the combustion side.", weight: "ruled-out" }], 86, { start: 2000, dur: 2000 }, [L.historian], ["REF-TI-201", "REF-SC-201"]),
        asset: work("Check burner and analyser condition", ["Burner inspection WO", "O₂ analyser calibration"], ["EAM / CMMS"], [{ source: "maintenance", title: "WO-26-04388 in progress", detail: "Row C burner inspection open.", value: "Open WO", signal: "supports" }], [{ text: "Burner row C condition likely contributing.", weight: "contributing" }], 80, { start: 3000, dur: 1800 }, [L.maintenance]),
        engineering: work("Retrieve alarm response & tuning guidance", ["Alarm response manual F101-02"], ["Document management"], [{ source: "procedures", title: "ARM F101-02", detail: "Check analyser validity, damper positions, fuel header pressure.", value: "ARM", signal: "supports" }], [{ text: "Documented response path available for operators.", weight: "context" }], 90, { start: 3800, dur: 1600, awaitFrom: 1300, awaitOn: "Energy findings" }, [L.docs]),
        hse: hseCheck(5600, "Combustion air adjustment is an operator action via DCS within the fired-heater operating window."),
        production: work("Quantify cost and emissions", ["Energy cost", "CO₂"], ["Energy model"], [], [{ text: `Energy penalty ≈ AED ${Math.round((2.05 * 2450 * ECONOMICS.gasPriceAedPerGj) / 1000)}K/day and ~+95 t CO₂/day (illustrative).`, weight: "context" }], 88, { start: 6200, dur: 1200 }, [L.impact]),
        shift: shiftLog(8800),
      },
      consolidation: consolidation(6800),
      conclusion: { likelyCause: "Reformer combustion air imbalance plus HP steam let-down", confidence: 84, contributing: ["Excess O₂ 3.4% vs 1.8% target", "Fired duty +6%", "HP steam let-down 14 t/h", "Reformer process conditions normal"] },
      impact: { metrics: [{ label: "Energy intensity gap", value: "+2.05 GJ/t", tone: "alert" }, { label: "Energy cost", value: `~AED ${Math.round((2.05 * 2450 * ECONOMICS.gasPriceAedPerGj) / 1000)}K/day`, tone: "warn" }, { label: "Additional CO₂", value: "~95 t/day", tone: "warn" }], note: "Illustrative — synthetic data, assumed gas price." },
      correlations: ["Excess O₂ and fired duty rise together.", "Let-down flow rises when C-101 extraction falls."],
      contradictions: ["O₂ analyser calibration is 34 days old."],
      verification: ["Portable O₂ check.", "Field-verify damper positions.", "Review turbine extraction set-up."],
      recommendations: [
        { title: "Validate O₂ analyser", detail: "Portable check at reformer arch.", owner: "Instrument technician", kind: "verify" },
        { title: "Burner air rebalance (operator)", detail: "Supervisor-approved operator adjustment toward 1.8% O₂.", owner: "Panel operator", kind: "review" },
        { title: "Steam balance review", detail: "Engineer to review extraction / let-down configuration.", owner: "Process engineer", kind: "review" },
      ],
      timeline: [
        { offset: -60, title: "Excess O₂ rising on row C", kind: "signal", tagId: "REF-AI-205" },
        { offset: -25, title: "HP steam let-down opens", kind: "signal", tagId: "STM-PI-001" },
        { offset: -2, title: "Energy intensity exceeds 29.5 GJ/t", kind: "deviation", tagId: "EN-INT" },
      ],
      extraAnalysis: [{ agentId: "energy", text: "Loss waterfall: combustion air 1.1, let-down 0.35, compressor efficiency 0.4, other 0.2 GJ/t." }],
    },
  },
  {
    id: "E",
    name: "Unexpected feed composition",
    headline: "Feed gas CH₄ drops 3.3 mol%",
    description: "Upstream supply change: lower methane, higher CO₂ — syngas stoichiometric number shifts and loop efficiency drops.",
    icon: "Flame",
    tagTargets: { "FG-AI-101": 89.1, "FG-AI-102": 3.9, "SYN-SN-220": 1.96, "REF-SC-201": 2.72, "REF-FI-210": 261, PRODUCTION: 2465 },
    areas: { feed: { status: "alert", health: 80 }, reform: { status: "watch", health: 84 }, synthesis: { status: "alert", health: 74 } },
    alerts: [{ id: "e1", area: "feed", severity: "alert", title: "Feed gas composition change", detail: "CH₄ 89.1 mol% (−3.3), CO₂ 3.9 mol% (+1.8).", tagId: "FG-AI-101", raisedBy: "process" }],
    investigationsOpen: 3,
    recoveryTpd: 86,
    pack: {
      code: "INV-26-0416",
      title: "Unexpected feed gas composition",
      question: "How does the feed composition change affect the plant?",
      category: "feed-change",
      anchor: "trigger",
      trigger: { title: "Feed composition change detected", detail: "CH₄ −3.3 mol%, CO₂ +1.8 mol% within 25 minutes.", severity: "alert", tagIds: ["FG-AI-101", "FG-AI-102"] },
      work: {
        operations: opsDetect("Feed-side event; council convened with Process Agent as lead.", ["FG-AI-101"]),
        process: work("Evaluate feed effect on reforming and synthesis", ["Feed analysis", "S/C ratio", "Syngas SN", "Loop conversion"], ["Historian", "Process model"], [{ source: "historian", title: "Syngas SN 1.96 (target 2.0–2.1)", detail: "Higher CO₂ lowers stoichiometric number; loop inerts rising.", value: "1.96", signal: "supports" }], [{ text: "Feed composition change lowered syngas SN below the optimal band.", weight: "primary" }], 81, { start: 1300, dur: 2600 }, [L.historian, "Running reformer model…"], ["FG-AI-101", "FG-AI-102", "SYN-SN-220", "REF-SC-201"]),
        quality: work("Check analyser validity", ["Online GC vs lab"], ["LIMS", "Online analysers"], [{ source: "lab", title: "GC validation", detail: "Online GC last validated yesterday; lab grab sample requested.", value: "Pending", signal: "neutral" }], [{ text: "Analyser considered valid; confirmation sample requested.", weight: "context" }], 85, { start: 2200, dur: 1800 }, [L.lims]),
        energy: work("Assess energy effect", ["Fuel demand", "Energy intensity"], ["Energy model"], [], [{ text: "Fuel demand +1.2% to hold reformer outlet temperature.", weight: "contributing" }], 80, { start: 3000, dur: 1600 }, [L.energy]),
        engineering: work("Retrieve design basis feed envelope", ["Design basis", "Reactor manual §2.1"], ["Document management"], [{ source: "documents", title: "Reactor manual §2.1", detail: "Optimal SN 2.0–2.1 for per-pass conversion.", value: "SN 2.0–2.1", signal: "supports" }], [{ text: "New composition is inside design envelope but off optimum.", weight: "context" }], 88, { start: 3600, dur: 1800, awaitFrom: 1300, awaitOn: "Process findings" }, [L.docs]),
        hse: hseCheck(5600, "No safety envelope impact; feed remains within design basis. Any set-point change by operators via MOC where required."),
        production: work("Confirm with supply nomination", ["Gas supplier notice (mock)"], ["Production plan"], [{ source: "production-plan", title: "Supplier notice", detail: "No composition change notice received (mock).", value: "None", signal: "contradicts" }], [{ text: "~85 t/day lower capacity at current SN (illustrative).", weight: "context" }], 82, { start: 6200, dur: 1200 }, [L.impact]),
        shift: shiftLog(8800),
      },
      consolidation: consolidation(6800),
      conclusion: { likelyCause: "Upstream feed gas source change lowering syngas stoichiometric number", confidence: 81, contributing: ["CH₄ 89.1 mol% (−3.3)", "CO₂ 3.9 mol% (+1.8)", "Syngas SN 1.96 (below 2.0)", "No supplier notification received"] },
      impact: { lossTpd: 85, recoverable: [40, 60], note: "Partial recovery via operator adjustments; remainder depends on supply. Illustrative." },
      correlations: ["SN drop follows composition change by ~15 min.", "Fuel demand rises to hold reformer outlet temperature."],
      contradictions: ["No supplier notification — confirm with gas supplier."],
      verification: ["Lab grab sample on feed.", "Contact gas supplier / pipeline dispatcher.", "Process engineer to evaluate SN correction options."],
      recommendations: [
        { title: "Confirm composition with lab & supplier", detail: "Grab sample + supplier call.", owner: "Shift supervisor", kind: "verify" },
        { title: "Evaluate SN correction options", detail: "Engineer to evaluate hydrogen recovery / purge strategy; changes via MOC.", owner: "Process engineer", kind: "review" },
        { title: "Update production forecast", detail: "Inform planning of possible reduced rate.", owner: "Production planner", kind: "monitor" },
      ],
      timeline: [
        { offset: -25, title: "Feed CO₂ starts rising", kind: "signal", tagId: "FG-AI-102" },
        { offset: -10, title: "Syngas SN drops below 2.0", kind: "signal", tagId: "SYN-SN-220" },
        { offset: -2, title: "Process Agent flags feed change", kind: "deviation", tagId: "FG-AI-101" },
      ],
      extraAnalysis: [{ agentId: "process", text: "Model: each 0.05 drop in SN costs ~1.6% loop capacity at current catalyst activity." }],
    },
  },
  {
    id: "F",
    name: "Steam imbalance",
    headline: "HP steam header pressure falls to 107 barg",
    description: "HP steam deficit after a turbine extraction shift; S/C ratio and reboiler supply affected.",
    icon: "Waves",
    tagTargets: { "STM-PI-001": 107.2, "REF-SC-201": 2.66, "DIS-QR-301": 36.9, "COMP-C-101": 85, "EN-INT": 28.7 },
    areas: { reform: { status: "alert", health: 79 }, compress: { status: "watch", health: 86 }, synthesis: { status: "alert", health: 74 } },
    alerts: [{ id: "f1", area: "reform", severity: "alert", title: "HP steam header low", detail: "107.2 barg (band 108–115).", tagId: "STM-PI-001", raisedBy: "energy" }],
    investigationsOpen: 3,
    recoveryTpd: 86,
    pack: {
      code: "INV-26-0417",
      title: "HP steam imbalance",
      question: "Why is the HP steam header pressure low and what is at risk?",
      category: "utility-imbalance",
      anchor: "trigger",
      trigger: { title: "Steam imbalance detected", detail: "HP header 107.2 barg; S/C ratio drifting to 2.66.", severity: "alert", tagIds: ["STM-PI-001", "REF-SC-201"] },
      work: {
        operations: opsDetect("Utilities event with process consequence; Energy Agent leads.", ["STM-PI-001"]),
        energy: work("Reconcile steam balance", ["Steam generation", "Turbine extraction", "Aux boiler", "Let-down"], ["Utilities historian", "Energy model"], [{ source: "historian", title: "C-101 turbine extraction shift", detail: "Extraction increased 9 t/h at −35 min; aux boiler response lagging.", value: "+9 t/h", signal: "supports" }, { source: "historian", title: "Waste heat boiler output normal", detail: "Steam generation 420 t/h unchanged.", value: "Normal", signal: "contradicts" }], [{ text: "Demand-side shift (turbine extraction) with slow aux boiler response.", weight: "primary" }], 76, { start: 1300, dur: 2600 }, [L.energy], ["STM-PI-001", "COMP-C-101"]),
        process: work("Check process consequences", ["S/C ratio", "Reboiler duty"], ["Historian"], [{ source: "historian", title: "S/C ratio 2.66", detail: "Approaching 2.6 lower limit — carbon formation margin reducing.", value: "2.66", signal: "supports" }], [{ text: "S/C margin reducing — highest-priority consequence for operator attention.", weight: "contributing" }], 82, { start: 2000, dur: 2200 }, [L.historian], ["REF-SC-201", "DIS-QR-301"]),
        hse: hseCheck(4800, "S/C low limit protection remains with the DCS/SIS; AI raises awareness only. Operator to follow steam deficit procedure."),
        engineering: work("Retrieve steam deficit procedure", ["Utilities operating procedure"], ["Document management"], [{ source: "procedures", title: "Steam deficit procedure", detail: "Load-shed order: MP users first, protect reformer S/C.", value: "Procedure", signal: "supports" }], [{ text: "Documented load-shed order available.", weight: "context" }], 88, { start: 3400, dur: 1600, awaitFrom: 1300, awaitOn: "Energy findings" }, [L.docs]),
        production: work("Quantify exposure", ["Rate impact"], ["Production plan"], [], [{ text: "If S/C limit reached, rate reduction ~3% (illustrative).", weight: "context" }], 80, { start: 5600, dur: 1200 }, [L.impact]),
        shift: shiftLog(8400),
      },
      consolidation: consolidation(6400),
      conclusion: { likelyCause: "HP steam deficit after C-101 turbine extraction shift with lagging aux boiler response", confidence: 76, contributing: ["Extraction +9 t/h", "Aux boiler ramp lag", "Header 107.2 barg", "S/C ratio 2.66 (margin reducing)"] },
      impact: { lossTpd: 75, recoverable: [60, 75], note: "Exposure if S/C limit forces rate reduction. Illustrative." },
      correlations: ["Header pressure drop follows extraction change by 4 min."],
      contradictions: ["Waste heat boiler generation unchanged — rules out supply-side loss."],
      verification: ["Confirm extraction valve position.", "Check aux boiler load ramp limits."],
      recommendations: [
        { title: "Operator review of steam load-shed order", detail: "Per utilities procedure; protect reformer S/C.", owner: "Shift supervisor", kind: "review" },
        { title: "Check aux boiler ramp", detail: "Verify aux boiler firing response.", owner: "Utilities operator", kind: "verify" },
      ],
      timeline: [
        { offset: -35, title: "C-101 turbine extraction increases", kind: "signal", tagId: "COMP-C-101" },
        { offset: -8, title: "HP header below 108 barg", kind: "deviation", tagId: "STM-PI-001" },
      ],
      extraAnalysis: [{ agentId: "energy", text: "Steam balance closes within 1.5% — data quality sufficient for diagnosis." }],
    },
  },
  {
    id: "G",
    name: "Distillation constraint",
    headline: "Refining column approaching hydraulic limit",
    description: "T-301 differential pressure rises 25%; the column starts to constrain plant throughput.",
    icon: "Columns3",
    tagTargets: { "DIS-DP-301": 228, "DIS-QR-301": 40.2, "DIS-TI-301": 65.1, PRODUCTION: 2440 },
    areas: { distill: { status: "alert", health: 72 }, synthesis: { status: "alert", health: 74 } },
    alerts: [{ id: "g1", area: "distill", severity: "alert", title: "T-301 ΔP high", detail: "228 mbar (+25%) — approaching flooding.", tagId: "DIS-DP-301", raisedBy: "process" }],
    investigationsOpen: 3,
    recoveryTpd: 86,
    pack: {
      code: "INV-26-0418",
      title: "Distillation hydraulic constraint — T-301",
      question: "Is distillation constraining throughput?",
      category: "process-constraint",
      anchor: "trigger",
      trigger: { title: "Distillation constraint", detail: "T-301 ΔP 228 mbar with reboiler at 98% of rated duty.", severity: "alert", tagIds: ["DIS-DP-301", "DIS-QR-301"] },
      work: {
        operations: opsDetect("Constraint event; Process Agent leads.", ["DIS-DP-301"]),
        process: work("Assess column hydraulics", ["Column ΔP", "Reboiler duty", "Feed rate"], ["Historian", "Distillation model"], [{ source: "historian", title: "ΔP +25% at constant feed", detail: "Rise not explained by feed rate — suggests fouling or foaming.", value: "+25%", signal: "supports" }], [{ text: "Column approaching hydraulic limit; suspected tray fouling.", weight: "primary" }], 80, { start: 1300, dur: 2600 }, [L.historian, "Running hydraulic model…"], ["DIS-DP-301", "DIS-QR-301", "DIS-TI-301"]),
        quality: work("Check product quality margin", ["Purity", "Water"], ["LIMS"], [{ source: "lab", title: "Quality in spec", detail: "Purity 99.83 wt%; margin maintained.", value: "In spec", signal: "neutral" }], [{ text: "Quality currently protected; risk rises if duty is pushed.", weight: "context" }], 88, { start: 2200, dur: 1600 }, [L.lims]),
        asset: work("Review column inspection history", ["Gamma scan history", "Tray inspection"], ["EAM / CMMS"], [{ source: "maintenance", title: "Last gamma scan 2024", detail: "No scan since turnaround.", value: "2024", signal: "supports" }], [{ text: "Gamma scan recommended to locate fouled section.", weight: "contributing" }], 78, { start: 3000, dur: 1800 }, [L.maintenance]),
        engineering: work("Retrieve troubleshooting guide §3.2", ["Hydraulic limits"], ["Document management"], [{ source: "documents", title: "TG §3.2 hydraulic limits", detail: "Reduce reboiler duty in small steps; request gamma scan.", value: "TG-0301", signal: "supports" }], [{ text: "Documented response is operator duty reduction + gamma scan.", weight: "context" }], 90, { start: 3600, dur: 1600, awaitFrom: 1300, awaitOn: "Process findings" }, [L.docs]),
        hse: hseCheck(5400, "Duty adjustments remain operator actions; no safety envelope impact."),
        production: work("Quantify constraint", ["Max throughput"], ["Production plan"], [], [{ text: "Column caps throughput near 2,480 t/day (illustrative).", weight: "context" }], 84, { start: 6000, dur: 1200 }, [L.impact]),
        shift: shiftLog(8600),
      },
      consolidation: consolidation(6600),
      conclusion: { likelyCause: "T-301 approaching hydraulic limit — suspected tray fouling", confidence: 80, contributing: ["ΔP +25% at constant feed", "Reboiler at 98% rated duty", "No gamma scan since 2024"] },
      impact: { lossTpd: 110, recoverable: [40, 70], note: "Column becomes the bottleneck once C-201 is restored. Illustrative." },
      correlations: ["ΔP rise independent of feed rate."],
      contradictions: ["Quality still in spec — foaming would normally show impurity breakthrough."],
      verification: ["Request gamma scan.", "Check antifoam / caustic dosing records."],
      recommendations: [
        { title: "Request gamma scan", detail: "Locate fouled/flooded section.", owner: "Inspection engineer", kind: "inspect" },
        { title: "Operator duty review", detail: "Small-step reboiler duty reduction if ΔP keeps rising (operator decision).", owner: "Panel operator", kind: "review" },
      ],
      timeline: [
        { offset: -50, title: "T-301 ΔP begins rising", kind: "signal", tagId: "DIS-DP-301" },
        { offset: -3, title: "ΔP exceeds 220 mbar", kind: "deviation", tagId: "DIS-DP-301" },
      ],
      extraAnalysis: [{ agentId: "process", text: "Debottleneck view: after C-201 recovery, T-301 limits plant at ~2,480 t/day unless fouling is addressed." }],
    },
  },
  {
    id: "H",
    name: "Major alarm sequence",
    headline: "38 alarms in 10 minutes",
    description: "A feed pressure dip triggers C-101 anti-surge action and a loop transient — an alarm flood on the console.",
    icon: "Siren",
    tagTargets: { "FG-PI-101": 39.6, "COMP-PI-101D": 77.9, "COMP-C-101": 81, "SYN-P-101": 77.2, PRODUCTION: 2380, "SYN-F-210": 3760 },
    areas: { feed: { status: "alert", health: 82 }, compress: { status: "critical", health: 70 }, synthesis: { status: "critical", health: 68 } },
    alerts: [
      { id: "h1", area: "compress", severity: "critical", title: "Alarm flood: 38 alarms / 10 min", detail: "Grouped into 3 causal clusters by Operations Agent.", tagId: "COMP-PI-101D", raisedBy: "operations" },
      { id: "h2", area: "feed", severity: "alert", title: "Feed gas pressure dip", detail: "39.6 barg (band 40.5–43.5).", tagId: "FG-PI-101", raisedBy: "dcs" },
    ],
    investigationsOpen: 3,
    recoveryTpd: 86,
    pack: {
      code: "INV-26-0419",
      title: "Alarm flood — feed pressure transient",
      question: "What started the alarm sequence and what matters most right now?",
      category: "alarm-flood",
      anchor: "trigger",
      trigger: { title: "Alarm flood detected", detail: "38 alarms in 10 minutes across feed, compression and synthesis.", severity: "critical", tagIds: ["FG-PI-101", "COMP-PI-101D"] },
      work: {
        operations: opsDetect("Alarm flood; Operations Agent groups alarms into causal clusters for the console operator.", ["FG-PI-101"]),
        process: work("Reconstruct event sequence", ["First-out analysis", "Pressure propagation"], ["Historian", "Alarm journal"], [{ source: "alarms", title: "First-out: feed pressure LO (−9 min)", detail: "Followed by C-101 anti-surge opening and loop pressure LO alarms.", value: "First-out", signal: "supports" }, { source: "alarms", title: "3 causal clusters", detail: "Feed (6 alarms), compression (14), synthesis (18) — 32 consequential.", value: "38 → 3", signal: "supports" }], [{ text: "Upstream feed pressure dip is the initiating event; most alarms are consequential.", weight: "primary" }], 85, { start: 1300, dur: 2600 }, ["Analysing alarm sequence…", L.historian], ["FG-PI-101", "COMP-PI-101D", "SYN-P-101"]),
        asset: work("Check machine protection status", ["C-101 / C-201 protection"], ["Machinery protection"], [{ source: "asset-health", title: "No machine trips", detail: "C-101 anti-surge acted as designed; protection systems healthy.", value: "Healthy", signal: "neutral" }], [{ text: "Anti-surge protection acted correctly.", weight: "context" }], 90, { start: 2000, dur: 1800 }, ["Reading machinery protection status…"]),
        hse: work("Confirm safety system status", ["SIS status", "Safety-critical alarms"], ["SCE register"], [{ source: "alarms", title: "No SIS demand", detail: "No safety instrumented function activated. Safety-critical alarms remain with operators.", value: "No demand", signal: "neutral" }], [{ text: "AI does not acknowledge, shelve or close any alarm; it only prioritises for the operator.", weight: "context" }], 98, { start: 2600, dur: 1600 }, [L.envelope]),
        engineering: work("Retrieve alarm response guidance", ["Alarm response manual"], ["Document management"], [{ source: "procedures", title: "ARM C201-03", detail: "Suction pressure LO response steps.", value: "ARM", signal: "supports" }], [{ text: "Response steps prepared for the 3 parent alarms.", weight: "context" }], 90, { start: 3400, dur: 1600, awaitFrom: 1300, awaitOn: "sequence reconstruction" }, [L.docs]),
        production: work("Estimate transient impact", ["Lost production"], ["Production plan"], [], [{ text: "Transient cost ~70 t if stabilised within 1 h.", weight: "context" }], 84, { start: 5400, dur: 1200 }, [L.impact]),
        shift: shiftLog(8200),
      },
      consolidation: consolidation(6200),
      conclusion: { likelyCause: "Upstream feed gas pressure dip → C-101 anti-surge recycle → synthesis loop pressure transient", confidence: 85, contributing: ["First-out alarm: feed pressure LO", "Anti-surge acted as designed", "32 of 38 alarms consequential", "No SIS demand"] },
      impact: { lossTpd: 170, recoverable: [150, 170], note: "Transient — recoverable once feed pressure restored. Illustrative." },
      correlations: ["Alarm timestamps follow pressure propagation path feed → C-101 → loop."],
      contradictions: ["Feed pressure recovered partially at −2 min — upstream cause still to confirm."],
      verification: ["Confirm with gas supplier / pipeline dispatcher.", "Operator to work the 3 parent alarms first."],
      recommendations: [
        { title: "Present 3 parent alarms to console operator", detail: "Prioritised list with response steps; operators acknowledge alarms, not AI.", owner: "Console operator", kind: "review" },
        { title: "Contact gas supplier", detail: "Confirm upstream pressure event.", owner: "Shift supervisor", kind: "verify" },
        { title: "Post-event alarm rationalisation review", detail: "Engineering review of consequential alarms.", owner: "Alarm management engineer", kind: "review" },
      ],
      timeline: [
        { offset: -10, title: "Feed gas pressure LO (first-out)", kind: "signal", tagId: "FG-PI-101" },
        { offset: -8, title: "C-101 anti-surge valve opens", kind: "signal", tagId: "COMP-C-101" },
        { offset: -6, title: "Loop pressure LO alarms", kind: "deviation", tagId: "SYN-P-101" },
        { offset: -1, title: "Alarm rate 38 / 10 min", kind: "deviation" },
      ],
      extraAnalysis: [{ agentId: "operations", text: "Alarm rate now falling: 4 alarms in the last 2 minutes." }],
    },
  },
];

export const scenarioById = (id: ScenarioId) => SCENARIOS.find((s) => s.id === id)!;

export const packImpact = (pack: InvestigationPack) => {
  if (pack.impact.metrics) return { metrics: pack.impact.metrics, exposureAedM: null as [number, number] | null, note: pack.impact.note };
  const loss = pack.impact.lossTpd ?? 0;
  const rec = pack.impact.recoverable ?? [0, 0];
  const band = exposureBand(loss);
  return {
    metrics: [
      { label: "Current production loss", value: `~${loss} t/day`, tone: "alert" as const },
      { label: "Potential recoverable production", value: `~${rec[0]}–${rec[1]} t/day`, tone: "ok" as const },
      { label: "Estimated economic exposure", value: `AED ${band[0].toFixed(1)}M–${band[1].toFixed(1)}M`, sub: "per day · illustrative", tone: "warn" as const },
    ],
    exposureAedM: band,
    note: pack.impact.note,
  };
};
