"use client";

import { useApp } from "./app";
import { CensusEngine } from "@/simulation/engine";
import type { SimConfig } from "@/simulation/generate";

/**
 * The engine lives outside React (mutable, high-frequency state). Components
 * subscribe to `tick` in the app store, which is bumped after every advance or
 * human action, and read the engine directly.
 */
let engine: CensusEngine | null = null;
let engineConfigKey = "";

export function configKey(c: SimConfig) {
  return JSON.stringify(c);
}

export function createEngine(config: SimConfig): CensusEngine {
  engine = new CensusEngine(config);
  engineConfigKey = configKey(config);
  return engine;
}

export function getEngine(): CensusEngine | null {
  return engine;
}

export function engineMatches(config: SimConfig) {
  return engine !== null && engineConfigKey === configKey(config);
}

/** Returns the engine and re-renders on every simulation tick. */
export function useEngine(): CensusEngine {
  useApp((s) => s.tick);
  if (!engine) throw new Error("Engine not initialised");
  return engine;
}

export function useTick() {
  return useApp((s) => s.tick);
}
