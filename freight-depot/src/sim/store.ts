import { create } from "zustand";
import { START_MIN, seedDepartures, seedFeeds, seedRfqs } from "./data";
import * as E from "./engine";
import type { World } from "./engine";
import type { Selection } from "./types";

export type Speed = 0 | 1 | 4 | 15;
export type PanelTab = "rfqs" | "holds" | "feeds" | "log";

export interface Draft {
  rfqId: string;
  departureId: string | null;
  rate: number;
  validityMin: number;
}

function freshWorld(): World {
  const departures = seedDepartures();
  const w: World = {
    now: START_MIN, departures, rfqs: seedRfqs(departures), feeds: seedFeeds(), events: [],
    nextRfqAt: START_MIN + 9, nextAllotmentAt: START_MIN + 14, rngSeed: 20261004,
  };
  E.log(w, "departure", "2.2.1", "Departure schedule loaded: 6 trailers at dock, 6 planned for tomorrow");
  return w;
}

interface State {
  world: World;
  speed: Speed;
  selection: Selection;
  tab: PanelTab;
  draft: Draft | null;
  hover: string | null;
  viewNonce: number; // bump to reset the camera
  setSpeed: (s: Speed) => void;
  select: (s: Selection) => void;
  setTab: (t: PanelTab) => void;
  setDraft: (d: Draft | null) => void;
  setHover: (id: string | null) => void;
  resetView: () => void;
  step: (dt: number) => void;
  act: (fn: (w: World) => void) => void;
  restart: () => void;
}

/** Real-time reference so the 3D scene can interpolate between sim ticks. */
export const simClock = { now: START_MIN, at: performance.now(), speed: 1 as number };

export const useStore = create<State>((set, get) => ({
  world: freshWorld(),
  speed: 1,
  selection: { kind: "rfq", id: "RFQ-4094" },
  tab: "rfqs",
  draft: null,
  hover: null,
  viewNonce: 0,
  setSpeed: (speed) => {
    simClock.now = get().world.now;
    simClock.at = performance.now();
    simClock.speed = speed;
    set({ speed });
  },
  select: (selection) => set({ selection }),
  setTab: (tab) => set({ tab }),
  setDraft: (draft) => set({ draft }),
  setHover: (hover) => set({ hover }),
  resetView: () => set((s) => ({ viewNonce: s.viewNonce + 1 })),
  step: (dt) => {
    const w = structuredClone(get().world);
    E.tick(w, dt);
    simClock.now = w.now;
    simClock.at = performance.now();
    const draft = get().draft;
    const keepDraft = draft && w.rfqs.some((r) => r.id === draft.rfqId && r.state === "new");
    set({ world: w, draft: keepDraft ? draft : null });
  },
  act: (fn) => {
    const w = structuredClone(get().world);
    fn(w);
    set({ world: w });
  },
  restart: () => {
    const w = freshWorld();
    simClock.now = w.now;
    simClock.at = performance.now();
    set({ world: w, selection: null, draft: null, tab: "rfqs" });
  },
}));

const TICK_MS = 250;
let started = false;
export function startClock() {
  if (started) return;
  started = true;
  setInterval(() => {
    const { speed, step } = useStore.getState();
    if (speed > 0) step((speed * TICK_MS) / 1000);
  }, TICK_MS);
}

/** Smooth sim time for animation, read inside the render loop. */
export function smoothNow() {
  const dt = Math.min((performance.now() - simClock.at) / 1000, TICK_MS / 1000) * simClock.speed;
  return simClock.now + dt;
}
