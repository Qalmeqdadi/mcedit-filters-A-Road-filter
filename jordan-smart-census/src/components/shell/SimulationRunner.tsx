"use client";

import { useEffect, useRef } from "react";
import { useApp } from "@/store/app";
import { getEngine } from "@/store/engine";

const TICK_MS = 250;

/** Advances the simulation: speed N = N shifts per second (4 shifts = 1 field day). */
export function SimulationRunner() {
  const running = useApp((s) => s.running);
  const speed = useApp((s) => s.speed);
  const bump = useApp((s) => s.bump);
  const setRunning = useApp((s) => s.setRunning);
  const acc = useRef(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const engine = getEngine();
      if (!engine) return;
      acc.current += (speed * TICK_MS) / 1000;
      const n = Math.floor(acc.current);
      if (n <= 0) return;
      acc.current -= n;
      const done = engine.advance(n);
      bump();
      if (done) setRunning(false);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [running, speed, bump, setRunning]);
  return null;
}

export function DirectionSync() {
  const locale = useApp((s) => s.locale);
  useEffect(() => {
    void useApp.persist.rehydrate();
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);
  return null;
}
