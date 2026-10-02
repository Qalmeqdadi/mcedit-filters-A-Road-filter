"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GovId, Locale } from "@/types/census";
import { DEFAULT_CONFIG, type SimConfig } from "@/simulation/generate";
import type { FullScenario } from "@/simulation/scenarios";
import type { ScenarioPreset } from "@/types/census";

export type Speed = 1 | 5 | 10 | 20;

export interface SavedScenario {
  id: string;
  name: string;
  preset: ScenarioPreset;
  params: FullScenario;
  createdAt: string;
}

interface AppState {
  locale: Locale;
  setLocale: (l: Locale) => void;

  /** global geographic scope */
  govId: GovId | null;
  districtId: string | null;
  eaId: string | null;
  selectGov: (g: GovId | null) => void;
  selectDistrict: (d: string | null, g?: GovId) => void;
  selectEA: (e: string | null) => void;

  /** simulation */
  config: SimConfig;
  setConfig: (c: Partial<SimConfig>) => void;
  engineKey: number;
  bumpEngineKey: () => void;
  tick: number;
  bump: () => void;
  running: boolean;
  setRunning: (r: boolean) => void;
  speed: Speed;
  setSpeed: (s: Speed) => void;

  actor: string;
  setActor: (a: string) => void;

  provenanceOpen: boolean;
  provenanceIds: string[] | null;
  openProvenance: (ids?: string[] | null) => void;
  closeProvenance: () => void;

  alertsOpen: boolean;
  setAlertsOpen: (o: boolean) => void;

  demoActive: boolean;
  demoStep: number;
  setDemo: (active: boolean, step?: number) => void;

  /** focus requests from the guided demo or cross-links */
  focusAnomalyId: string | null;
  focusEnumeratorId: string | null;
  setFocusAnomaly: (id: string | null) => void;
  setFocusEnumerator: (id: string | null) => void;

  projectionYear: number;
  setProjectionYear: (y: number) => void;

  scenarios: SavedScenario[];
  saveScenario: (s: SavedScenario) => void;
  deleteScenario: (id: string) => void;
  activeScenario: { preset: ScenarioPreset; params: FullScenario; name: string } | null;
  setActiveScenario: (s: { preset: ScenarioPreset; params: FullScenario; name: string } | null) => void;

  /** scenario driving the Planning Lab: a preset, "SIMULATOR" (Scenario Simulator's current) or a saved scenario id */
  labScenario: string;
  setLabScenario: (id: string) => void;
}

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      locale: "en",
      setLocale: (locale) => set({ locale }),

      govId: null,
      districtId: null,
      eaId: null,
      selectGov: (govId) => set({ govId, districtId: null, eaId: null }),
      selectDistrict: (districtId, g) => set((s) => ({ districtId, govId: g ?? s.govId, eaId: null })),
      selectEA: (eaId) => set({ eaId }),

      config: DEFAULT_CONFIG,
      setConfig: (c) => set((s) => ({ config: { ...s.config, ...c } })),
      engineKey: 0,
      bumpEngineKey: () => set((s) => ({ engineKey: s.engineKey + 1, running: false })),
      tick: 0,
      bump: () => set((s) => ({ tick: s.tick + 1 })),
      running: false,
      setRunning: (running) => set({ running }),
      speed: 10,
      setSpeed: (speed) => set({ speed }),

      actor: "HQ Duty Officer",
      setActor: (actor) => set({ actor }),

      provenanceOpen: false,
      provenanceIds: null,
      openProvenance: (ids = null) => set({ provenanceOpen: true, provenanceIds: ids }),
      closeProvenance: () => set({ provenanceOpen: false }),

      alertsOpen: false,
      setAlertsOpen: (alertsOpen) => set({ alertsOpen }),

      demoActive: false,
      demoStep: 0,
      setDemo: (demoActive, step) => set((s) => ({ demoActive, demoStep: step ?? s.demoStep })),

      focusAnomalyId: null,
      focusEnumeratorId: null,
      setFocusAnomaly: (focusAnomalyId) => set({ focusAnomalyId }),
      setFocusEnumerator: (focusEnumeratorId) => set({ focusEnumeratorId }),

      projectionYear: 2040,
      setProjectionYear: (projectionYear) => set({ projectionYear }),

      scenarios: [],
      saveScenario: (sc) => set((s) => ({ scenarios: [...s.scenarios.filter((x) => x.id !== sc.id), sc] })),
      deleteScenario: (id) => set((s) => ({ scenarios: s.scenarios.filter((x) => x.id !== id) })),
      activeScenario: null,
      setActiveScenario: (activeScenario) => set({ activeScenario }),

      labScenario: "BASELINE",
      setLabScenario: (labScenario) => set({ labScenario }),
    }),
    {
      name: "jsc-app",
      version: 1,
      skipHydration: true,
      partialize: (s) => ({ locale: s.locale, config: s.config, speed: s.speed, actor: s.actor, scenarios: s.scenarios, projectionYear: s.projectionYear, labScenario: s.labScenario }),
    },
  ),
);
