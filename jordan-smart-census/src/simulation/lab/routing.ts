/**
 * Enumerator route optimisation (SIMULATED geography).
 *
 * Visiting order through the statistical blocks of an enumerator's assignment:
 *   listed order  — blocks in their listing (ID) order, as a paper itinerary would have them
 *   optimised     — nearest-neighbour construction followed by 2-opt improvement
 *                   (reverse any segment whose reversal shortens the open path; repeat until stable)
 * Distances are straight-line km × 1.3 street-detour factor; walking speed 4.5 km/h.
 */
import { km } from "./common";

export type Pt = [number, number];
export const DETOUR = 1.3;
export const WALK_KMH = 4.5;

export function pathKm(pts: Pt[]): number {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += km(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
  return s * DETOUR;
}

export function nearestNeighbour(start: Pt, stops: Pt[]): Pt[] {
  const left = [...stops];
  const out: Pt[] = [start];
  while (left.length) {
    const cur = out[out.length - 1];
    let bi = 0;
    let bd = Infinity;
    for (let k = 0; k < left.length; k++) {
      const d = km(cur[0], cur[1], left[k][0], left[k][1]);
      if (d < bd) {
        bd = d;
        bi = k;
      }
    }
    out.push(left.splice(bi, 1)[0]);
  }
  return out;
}

/** 2-opt on an open path with a fixed start point. */
export function twoOpt(route: Pt[], maxPasses = 30): Pt[] {
  const r = [...route];
  const d = (a: Pt, b: Pt) => km(a[0], a[1], b[0], b[1]);
  for (let pass = 0; pass < maxPasses; pass++) {
    let improved = false;
    for (let i = 1; i < r.length - 1; i++) {
      for (let k = i + 1; k < r.length; k++) {
        const a = r[i - 1];
        const b = r[i];
        const c = r[k];
        const e = k + 1 < r.length ? r[k + 1] : null;
        const before = d(a, b) + (e ? d(c, e) : 0);
        const after = d(a, c) + (e ? d(b, e) : 0);
        if (after + 1e-9 < before) {
          const seg = r.slice(i, k + 1).reverse();
          r.splice(i, seg.length, ...seg);
          improved = true;
        }
      }
    }
    if (!improved) break;
  }
  return r;
}

export function optimiseRoute(start: Pt, stops: Pt[]) {
  const listed = [start, ...stops];
  const optimised = twoOpt(nearestNeighbour(start, stops));
  const a = pathKm(listed);
  const b = pathKm(optimised);
  return { listed, optimised, listedKm: a, optimisedKm: b, savedKm: a - b, savedPct: a > 0 ? (a - b) / a : 0, savedMinutes: ((a - b) / WALK_KMH) * 60 };
}
