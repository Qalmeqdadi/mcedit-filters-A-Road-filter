// Deterministic SYNTHETIC plant simulator. No connection to any real control system.
import tagsJson from "@/data/plant-tags.json";
import areasJson from "@/data/process-areas.json";
import historyJson from "@/data/timeseries-24h.json";
import { DEMO } from "@/config/demo";
import type { AreaId, Health, TagDef, TagLive, TagPoint } from "@/lib/types";

export interface TagMeta extends TagDef {
  baseline: number;
}

export const TAGS: TagMeta[] = (tagsJson.tags as unknown as TagMeta[]).map((t) => ({ ...t, bad: t.bad ?? "both" }));
export const TAG = Object.fromEntries(TAGS.map((t) => [t.id, t])) as Record<string, TagMeta>;

export interface AreaMeta {
  id: AreaId;
  name: string;
  short: string;
  description: string;
  throughputTag: string;
  tempTag: string;
  pressureTag: string | null;
  equipment: string[];
}
export const AREAS = areasJson.areas as AreaMeta[];
export const AREA = Object.fromEntries(AREAS.map((a) => [a.id, a])) as Record<AreaId, AreaMeta>;

const HISTORY = historyJson.series as unknown as Record<string, [number, number][]>;

/** Seeded PRNG — the demo is identical on every run. */
export function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);

export function tagStatus(def: TagDef, v: number): Health {
  const below = v < def.low;
  const above = v > def.high;
  const badLow = def.bad === "low" || def.bad === "both";
  const badHigh = def.bad === "high" || def.bad === "both";
  if ((below && badLow) || (above && badHigh)) {
    const span = def.high - def.low || 1;
    const excess = below ? (def.low - v) / span : (v - def.high) / span;
    return excess > 0.35 ? "critical" : "alert";
  }
  // approaching the band edge on the "bad" side
  if (badHigh && v > def.expected) {
    const f = (v - def.expected) / (def.high - def.expected || 1);
    if (f > 0.6) return "watch";
  }
  if (badLow && v < def.expected) {
    const f = (def.expected - v) / (def.expected - def.low || 1);
    if (f > 0.6) return "watch";
  }
  return "normal";
}

export const deviationPct = (def: TagDef, v: number) => ((v - def.expected) / def.expected) * 100;

export function initialTags(): Record<string, TagLive> {
  const out: Record<string, TagLive> = {};
  for (const def of TAGS) {
    const history: TagPoint[] = (HISTORY[def.id] ?? [[0, def.baseline]]).map(([t, v]) => ({ t, v }));
    const value = def.baseline;
    out[def.id] = { id: def.id, value, target: value, history, status: tagStatus(def, value), deviationPct: deviationPct(def, value) };
  }
  return out;
}

/** Advance every tag one tick toward its target with seeded noise. */
export function tickTags(prev: Record<string, TagLive>, targets: Record<string, number>, tick: number): Record<string, TagLive> {
  const tMin = (tick * DEMO.tickMs) / 60000;
  const next: Record<string, TagLive> = {};
  for (const def of TAGS) {
    const cur = prev[def.id];
    const target = targets[def.id] ?? def.baseline;
    const rnd = mulberry32(hash(def.id) + tick * 7919);
    const glide = cur.value + (target - cur.value) * 0.32;
    const noise = (rnd() - 0.5) * def.noise * 1.2 * target;
    const v = Math.abs(target - glide) < Math.abs(target) * def.noise * 0.2 ? target + noise : glide + noise * 0.5;
    const history = cur.history.length > 330 ? cur.history.slice(cur.history.length - 330) : cur.history.slice();
    history.push({ t: tMin, v });
    next[def.id] = { id: def.id, value: v, target, history, status: tagStatus(def, v), deviationPct: deviationPct(def, v) };
  }
  return next;
}

export function fmtTag(id: string, v: number, withUnit = true) {
  const def = TAG[id];
  if (!def) return String(v);
  const s = v.toLocaleString("en-US", { minimumFractionDigits: def.decimals, maximumFractionDigits: def.decimals });
  return withUnit ? `${s} ${def.unit}` : s;
}

/** Plant clock: minutes relative to simulation start → "HH:MM". */
export function clockLabel(minutesFromStart: number, seconds = false) {
  const total = (((DEMO.simStartMinute + minutesFromStart) % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = Math.floor(total % 60);
  const s = Math.floor((total * 60) % 60);
  const hm = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  return seconds ? `${hm}:${String(s).padStart(2, "0")}` : hm;
}
