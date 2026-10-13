// Generates 24 hours of SYNTHETIC historian data (10-minute resolution) for every demo tag.
// Output: data/timeseries-24h.json  — time is "minutes relative to the simulation start" (0 = now).
// Re-run after editing data/plant-tags.json:  npm run data:generate
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const { tags } = JSON.parse(readFileSync(path.join(root, "data/plant-tags.json"), "utf8"));

// Deterministic PRNG so the demo looks identical every time.
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);

const STEP = 10; // minutes
const START = -1440;
const series = {};

for (const tag of tags) {
  const rnd = mulberry32(hash(tag.id));
  const pts = [];
  let walk = 0;
  for (let t = START; t <= 0; t += STEP) {
    let base;
    const s = tag.story;
    if (!s) {
      base = tag.baseline;
    } else {
      const from = s.from ?? tag.expected;
      if (t < s.start) base = from;
      else {
        const f = Math.min(1, (t - s.start) / Math.max(1, -s.start));
        const k = s.shape === "slow" ? f : f * f * (3 - 2 * f) * 0.35 + f * 0.65; // gentle S-curve
        base = from + (tag.baseline - from) * k;
      }
    }
    // small diurnal component (ambient temperature) + bounded random walk + white noise
    const minuteOfDay = (((418 + t) % 1440) + 1440) % 1440;
    const diurnal = Math.sin(((minuteOfDay - 840) / 1440) * Math.PI * 2) * tag.noise * 0.6;
    walk = walk * 0.85 + (rnd() - 0.5) * tag.noise * 0.9;
    const white = (rnd() - 0.5) * tag.noise * 0.8;
    const v = base * (1 + diurnal + walk + white);
    pts.push([t, Number(v.toFixed(Math.max(tag.decimals, 2)))]);
  }
  pts[pts.length - 1][1] = tag.baseline;
  series[tag.id] = pts;
}

const out = {
  _note: "SYNTHETIC 24h historian extract for demo purposes only. Format: [minutesRelativeToSimStart, value]. Sim start = 06:58 plant time.",
  stepMinutes: STEP,
  series,
};
writeFileSync(path.join(root, "data/timeseries-24h.json"), JSON.stringify(out));
console.log(`timeseries-24h.json: ${Object.keys(series).length} tags x ${series[tags[0].id].length} points`);
