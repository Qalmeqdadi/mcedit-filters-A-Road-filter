import { create } from "zustand";
import { CARRIERS, FIELDS, FORM_FIELDS, PRESETS, RFQS, rank, type Carrier, type Weights } from "./data";

export type View =
  | "dash" | "flow" | "carriers" | "analytics" | "setup"
  | "ship" | "multi" | "opt" | "trust" | "net"
  | "c_home" | "c_cap" | "c_perf" | "p_jobs" | "sh_home" | "sh_docs";
export type Persona = "shp" | "fwd" | "car" | "par";

export const personaOf = (v: View): Persona =>
  v.startsWith("c_") ? "car" : v.startsWith("p_") ? "par" : v.startsWith("sh_") ? "shp" : "fwd";

export const PERSONAS: Record<Persona, { label: string; who: [string, string, string, string]; home: View; role: string }> = {
  shp: { label: "Shipper", who: ["SH", "Sara Haddad", "Al Noor Home Appliances", "#13837A"], home: "sh_home", role: "Shipper portal" },
  fwd: { label: "Forwarder", who: ["JA", "Jebel Ali desk", "Gulfway Logistics", "#1F4A5A"], home: "dash", role: "Forwarder workspace" },
  car: { label: "Carrier", who: ["LW", "Lin Wei", "Oceanlink Lines", "#1F5F8B"], home: "c_home", role: "Carrier portal" },
  par: { label: "Partner", who: ["AS", "Amal Saeed", "Al Safa Customs Brokers", "#6B4A8A"], home: "p_jobs", role: "Partner portal" },
};

export const ROAD_VIEWS: View[] = ["ship", "multi", "opt", "trust", "net"];
export const SUPPLY_VIEWS: View[] = ["c_home", "c_cap", "c_perf", "p_jobs"];
export const TOUR: string[] = ["dash", "flow-1", "flow-2", "flow-3", "flow-4", "flow-5", "flow-6", "sh_home", "analytics", "setup", "ship", "multi", "opt", "trust", "net", "c_home", "c_cap", "c_perf", "p_jobs"];
export const VALID: View[] = ["dash", "carriers", "analytics", "setup", "ship", "multi", "opt", "trust", "net", "c_home", "c_cap", "c_perf", "p_jobs", "sh_home", "sh_docs"];

export interface Edit { label: string; from: string; to: string; when: string }

interface Data {
  view: View;
  step: number;
  // step 1
  filled: boolean;
  filling: boolean;
  fillCount: number;
  // step 2
  rfqRunning: boolean;
  rfqGot: string[];
  rfqMin: number;
  // step 3
  src: string;
  resolved: Record<string, "ask" | "ok">;
  edits: Record<string, Edit>;
  editing: string | null;
  // step 4
  preset: string;
  w: Weights;
  selected: string | null;
  carriers: Carrier[];
  // step 5
  margin: number;
  sent: boolean;
  approved: boolean;
  // roadmap
  shipTab: "track" | "docs" | "int";
  alerts: Record<string, boolean>;
  doc: number;
  blIssued: boolean;
  mode: string;
  mmSel: string;
  split: boolean;
  aiPlan: boolean;
  consol: boolean;
  esc: number;
  inv: null | "accepted" | "disputed";
  autopilot: boolean;
  apps: Record<string, boolean>;
  // carrier
  rfqSel: string;
  cPrice: number;
  cSailing: string;
  cSent: Record<string, "sent" | "won">;
  cap: Record<string, number>;
  shared: Record<string, boolean>;
  rateSheet: boolean;
  // partner and shipper
  jobs: Record<string, boolean>;
  shNew: boolean;
  shReq: [string, string, string, string, "idle", string][];
  shPaid: boolean;
  // setup
  invited: boolean;
  rulesSet: boolean;
  // presenter
  auto: boolean;
  tour: number;
  toast: { msg: string; n: number } | null;
  viewNonce: number;
}

const initial = (): Data => ({
  view: "dash", step: 1,
  filled: false, filling: false, fillCount: 0,
  rfqRunning: false, rfqGot: [], rfqMin: 0,
  src: "OL", resolved: {}, edits: {}, editing: null,
  preset: "value", w: { ...PRESETS.value.w }, selected: null, carriers: CARRIERS.map((c) => ({ ...c })),
  margin: 12, sent: false, approved: false,
  shipTab: "track", alerts: {}, doc: 1, blIssued: false, mode: "all", mmSel: "A", split: false, aiPlan: false, consol: false, esc: 1, inv: null, autopilot: true, apps: { ins: true },
  rfqSel: "R1", cPrice: 2180, cSailing: "AUR", cSent: {}, cap: { AUR: 214, BOR: 320, CAS: 410 }, shared: { SHAJEA: true, NSAJEA: true, SHADMM: false }, rateSheet: false,
  jobs: {}, shNew: false, shReq: [], shPaid: false,
  invited: false, rulesSet: false,
  auto: false, tour: 0, toast: null, viewNonce: 0,
});

interface Actions {
  set: (p: Partial<Data>) => void;
  open: (v: View) => void;
  go: (n: number) => void;
  toastMsg: (m: string) => void;
  autofill: () => void;
  runRfq: () => void;
  resolve: (key: string, kind: "ask" | "ok") => void;
  saveEdit: (key: string, label: string, from: string, to: string) => void;
  setPreset: (k: string) => void;
  setWeight: (k: keyof Weights, v: number) => void;
  sendQuote: () => void;
  approve: () => void;
  carrierSend: (id: string) => void;
  goRoute: (r: string) => void;
  startTour: () => void;
  stopTour: () => void;
  restart: () => void;
}

export type Store = Data & Actions;

export const ranked = (s: Pick<Data, "carriers" | "w">) => rank(s.carriers, s.w);
export const selectedCarrier = (s: Pick<Data, "carriers" | "w" | "selected">) =>
  s.carriers.find((c) => c.id === s.selected) ?? ranked(s)[0];
export const maxStep = (s: Pick<Data, "filled" | "rfqGot" | "approved">) =>
  !s.filled ? 1 : s.rfqGot.length < 6 ? 2 : !s.approved ? 5 : 6;
export const routeOf = (s: Pick<Data, "view" | "step">) => (s.view === "flow" ? `flow-${s.step}` : s.view);

let tourTimer: ReturnType<typeof setTimeout> | undefined;
let toastN = 0;
const timers = new Set<ReturnType<typeof setTimeout>>();
const later = (fn: () => void, ms: number) => {
  const t = setTimeout(() => {
    timers.delete(t);
    fn();
  }, ms);
  timers.add(t);
};

export const useStore = create<Store>((set, get) => ({
  ...initial(),
  set: (p) => set(p),
  open: (view) => {
    set({ view, viewNonce: get().viewNonce + 1, editing: null });
    window.scrollTo?.({ top: 0 });
  },
  go: (n) => {
    if (n < 1 || n > 6) return;
    set({ step: n, view: "flow", viewNonce: get().viewNonce + 1, editing: null });
    if (n === 2) get().runRfq();
    window.scrollTo?.({ top: 0 });
  },
  toastMsg: (msg) => set({ toast: { msg, n: ++toastN } }),

  autofill: () => {
    const s = get();
    if (s.filling || s.filled) return;
    set({ filling: true, fillCount: 0 });
    const tick = (i: number) => {
      if (i > FORM_FIELDS.length) {
        set({ filling: false, filled: true });
        get().toastMsg("Request ready · container fit checked");
        return;
      }
      set({ fillCount: i });
      later(() => tick(i + 1), 380);
    };
    later(() => tick(1), 250);
  },

  runRfq: () => {
    const s = get();
    if (s.rfqRunning || s.rfqGot.length === 6) return;
    set({ rfqRunning: true, rfqGot: [], rfqMin: 0 });
    const order = [...s.carriers].sort((a, b) => a.reply - b.reply);
    const speed = 16; // sim minutes per real second
    const t0 = performance.now();
    const clock = setInterval(() => {
      const m = Math.min(71, Math.floor(((performance.now() - t0) / 1000) * speed));
      set({ rfqMin: m });
      if (m >= 71) clearInterval(clock);
    }, 80);
    order.forEach((c) =>
      later(() => {
        const got = [...get().rfqGot, c.id];
        set({ rfqGot: got });
        if (got.length === 6) {
          set({ rfqRunning: false, rfqMin: 71 });
          get().toastMsg("All 6 carriers replied in 71 minutes");
        }
      }, (c.reply / speed) * 1000),
    );
  },

  resolve: (key, kind) => {
    set({ resolved: { ...get().resolved, [key]: kind } });
    get().toastMsg(kind === "ask" ? "Follow-up sent to BlueHarbor on WhatsApp" : "Cut-off confirmed");
  },

  saveEdit: (key, label, from, to) => {
    const s = get();
    set({ editing: null });
    if (!to || to === from) return;
    const edits = { ...s.edits, [key]: { label, from, to, when: `11:0${Object.keys(s.edits).length + 2}` } };
    let carriers = s.carriers;
    if (/rate/i.test(label)) {
      const id = key.slice(0, 2);
      const n = parseInt(to.replace(/[^0-9]/g, ""), 10);
      if (n > 200 && n < 100000) carriers = s.carriers.map((c) => (c.id === id ? { ...c, price: n } : c));
    }
    set({ edits, carriers });
    get().toastMsg(carriers !== s.carriers ? "Correction saved · ranking updated" : "Correction saved and logged");
  },

  setPreset: (k) => {
    const w = { ...PRESETS[k].w };
    set({ preset: k, w, selected: rank(get().carriers, w)[0].id });
  },
  setWeight: (k, v) => {
    const w = { ...get().w, [k]: v };
    const preset = Object.keys(PRESETS).find((p) => (["price", "speed", "rel", "co2"] as const).every((x) => PRESETS[p].w[x] === w[x])) ?? "custom";
    set({ w, preset, selected: rank(get().carriers, w)[0].id });
  },

  sendQuote: () => {
    if (get().sent) return;
    set({ sent: true });
    get().toastMsg("Quote sent to Sara");
  },
  approve: () => {
    const s = get();
    set({ approved: true, selected: selectedCarrier(s).id });
    get().toastMsg(`Sara approved · booking sent to ${selectedCarrier(s).name}`);
  },

  carrierSend: (id) => {
    set({ cSent: { ...get().cSent, [id]: "sent" } });
    get().toastMsg("Quote sent in one click");
    later(() => {
      const s = get();
      if (s.cSent[id] !== "sent") return;
      const cap = { ...s.cap };
      if (cap[s.cSailing]) cap[s.cSailing]--;
      set({ cSent: { ...s.cSent, [id]: "won" }, cap });
      get().toastMsg(`You won the booking from ${RFQS.find((r) => r.id === id)!.from}`);
    }, 2200);
  },

  goRoute: (r) => {
    if (!r) return;
    const s = get();
    if (r.startsWith("flow-")) {
      const n = Math.min(6, Math.max(1, +r.split("-")[1] || 1));
      const sel = s.selected ?? ranked(s)[0].id;
      // deep links land on a step with everything before it already done
      set({ filled: true, fillCount: FORM_FIELDS.length, rfqGot: CARRIERS.map((c) => c.id), rfqMin: 71, selected: sel, sent: s.sent || n >= 5, approved: s.approved || n >= 6 });
      get().go(n);
    } else if ((VALID as string[]).includes(r)) {
      if (!s.selected) set({ selected: ranked(s)[0].id });
      get().open(r as View);
    }
  },

  startTour: () => {
    const s = get();
    set({ filled: true, fillCount: FORM_FIELDS.length, rfqGot: CARRIERS.map((c) => c.id), rfqMin: 71, sent: true, approved: true, esc: 6, aiPlan: true, selected: s.selected ?? ranked(s)[0].id, auto: true, tour: 0 });
    get().toastMsg("Presenter mode: advancing every 9 seconds");
    const step = () => {
      const st = get();
      if (!st.auto) return;
      st.goRoute(TOUR[st.tour]);
      tourTimer = setTimeout(() => {
        const n = get().tour + 1;
        if (n >= TOUR.length) get().stopTour();
        else {
          set({ tour: n });
          step();
        }
      }, 9000);
    };
    step();
  },
  stopTour: () => {
    clearTimeout(tourTimer);
    set({ auto: false });
    get().toastMsg("Presenter mode stopped");
  },
  restart: () => {
    clearTimeout(tourTimer);
    timers.forEach(clearTimeout);
    timers.clear();
    set({ ...initial(), viewNonce: get().viewNonce + 1 });
  },
}));

/** Fields that still need a person in step 3. */
export const pendingFields = (s: Pick<Data, "resolved">, id?: string) =>
  Object.entries(FIELDS)
    .filter(([k]) => !id || k === id)
    .reduce((a, [k, fs]) => a + fs.filter((f) => f[4] && !s.resolved[k + f[0]]).length, 0);
