/**
 * Commuting & corridor model (SIMULATED) on the schematic district network.
 *
 *   workers_i  = population 15–64 × employment ratio (governorate, census microdata)
 *   jobs_j     ∝ population_j^1.15 × (2.2 if governorate-seat district) — synthetic job geography
 *   trips T_ij = workers_i × jobs_j e^(−β t_ij) / Σ_k jobs_k e^(−β t_ik)     (production-constrained gravity)
 *   mode share = binary logit car / public transport:
 *                U_car = −0.03 t_car − 0.25 cost_car,   U_pt = ASC − 0.03 (t_pt + wait) − 0.25 fare
 *                t_pt = 1.6 × car time in mixed traffic; on rapid-transit corridors 32 km/h + 4 min wait
 *   assignment = car trips ÷ 1.3 occupancy, peak hour = 25 % of daily one-way trips, all-or-nothing on
 *                shortest congested paths, 3 iterations of successive averages with BPR delay
 *                t = t₀ (1 + 0.15 (V/C)⁴)
 * Calibration (base year): ASC so the public-transport share equals the assumed base share; capacities
 * max(type capacity, base peak volume ÷ 0.9). Trip distribution uses free-flow times.
 * All behavioural parameters are illustrative.
 */
import type { L } from "@/types/census";
import type { World } from "../generate";
import { computeProfile } from "../analytics";
import { km, type SmallArea } from "./common";
import { buildNetwork, pathLinks, shortestFrom, type NetLink } from "./network";

export interface Corridor {
  id: string;
  name: L;
  from: string;
  to: string;
}

export const CORRIDORS: Corridor[] = [
  { id: "AMM-ZAR", name: { en: "Amman – Zarqa", ar: "عمّان – الزرقاء" }, from: "AMM-D01", to: "ZAR-D01" },
  { id: "AMM-SALT", name: { en: "Amman – Salt", ar: "عمّان – السلط" }, from: "AMM-D01", to: "BAL-D01" },
  { id: "AMM-MAD", name: { en: "Amman – Madaba", ar: "عمّان – مادبا" }, from: "AMM-D01", to: "MAD-D01" },
  { id: "AMM-SAHAB", name: { en: "Amman – Sahab", ar: "عمّان – سحاب" }, from: "AMM-D01", to: "AMM-D07" },
  { id: "IRB-RAM", name: { en: "Irbid – Ramtha", ar: "إربد – الرمثا" }, from: "IRB-D01", to: "IRB-D03" },
  { id: "AMM-IRB", name: { en: "Amman – Jerash – Irbid express", ar: "خط عمّان – جرش – إربد السريع" }, from: "AMM-D01", to: "IRB-D01" },
];

export interface MobilityParams {
  beta: number;
  baseTransitShare: number;
  fare: number;
  carCostPerKm: number;
  corridors: string[];
}

export const DEFAULT_MOBILITY: MobilityParams = { beta: 0.045, baseTransitShare: 0.2, fare: 0.5, carCostPerKm: 0.12, corridors: [] };

export interface MobilityResult {
  trips: number;
  transitShare: number;
  meanMinutes: number;
  meanKm: number;
  carKmDay: number;
  vehHoursDay: number;
  co2TonsYear: number;
  links: { link: NetLink; volume: number; capacity: number; vc: number; transit: boolean }[];
  topFlows: { from: string; to: string; trips: number; transitShare: number }[];
  corridorTrips: Record<string, number>;
}

const CAP_URBAN = 5200;
const CAP_RURAL = 3600;

function zoneData(world: World, sa: SmallArea) {
  const ids = world.districts.map((d) => d.id);
  const workers: number[] = [];
  const attract: number[] = [];
  for (const d of world.districts) {
    const gp = computeProfile(world, { govId: d.govId });
    const ratio = gp.labour.employed / Math.max(1, gp.groups.a15_64);
    workers.push(sa.district[d.id].a15_64 * ratio);
    attract.push(Math.pow(sa.district[d.id].pop, 1.15) * (d.isCapitalDistrict ? 2.2 : 1));
  }
  const W = workers.reduce((a, b) => a + b, 0);
  const A = attract.reduce((a, b) => a + b, 0);
  const jobs = attract.map((a) => (a / A) * W);
  return { ids, workers, jobs };
}

export interface MobilityCalibration {
  asc: number;
  capacity: Map<string, number>;
}

/**
 * Base-year calibration: ASC is solved so the public-transport share equals the assumed base share, and
 * link capacities are set to max(type capacity, base peak volume ÷ 0.9) so no link starts above V/C 0.9.
 */
export function calibrateMobility(world: World, sa0: SmallArea, p: MobilityParams): MobilityCalibration {
  const net = buildNetwork(world);
  const typeCap = new Map(net.links.map((l) => [l.id, l.speed > 70 ? CAP_RURAL : CAP_URBAN]));
  const first = simulateMobility(world, sa0, { ...p, corridors: [] }, undefined, typeCap);
  const capacity = new Map(first.links.map((l) => [l.link.id, Math.max(typeCap.get(l.link.id)!, l.volume / 0.9)]));
  let run = simulateMobility(world, sa0, { ...p, corridors: [] }, undefined, capacity);
  for (let k = 0; k < 3; k++) {
    for (const l of run.links) capacity.set(l.link.id, Math.max(capacity.get(l.link.id)!, l.volume / 0.9));
    run = simulateMobility(world, sa0, { ...p, corridors: [] }, undefined, capacity);
  }
  return { asc: run.asc, capacity };
}

export function simulateMobility(world: World, sa: SmallArea, p: MobilityParams, ascOverride?: number, capacity?: Map<string, number>): MobilityResult & { asc: number } {
  const net = buildNetwork(world);
  const { ids, workers, jobs } = zoneData(world, sa);
  const n = ids.length;
  const transitLinks = new Set<string>();
  for (const cid of p.corridors) {
    const c = CORRIDORS.find((x) => x.id === cid);
    if (!c) continue;
    const { prev } = shortestFrom(net, c.from, (l) => l.km);
    for (const l of pathLinks(prev, c.from, c.to)) transitLinks.add(l.id);
  }
  const intrazonal = world.districts.map((d) => (0.5 * Math.sqrt(d.areaKm2 / Math.PI)) / 30 * 60 + 6);
  const intraKm = world.districts.map((d) => 0.5 * Math.sqrt(d.areaKm2 / Math.PI) + 2);
  const cap = capacity ?? new Map(net.links.map((l) => [l.id, l.speed > 70 ? CAP_RURAL : CAP_URBAN]));
  // trip distribution uses free-flow times so the trip table is stable across mode / corridor scenarios
  const freeFlow = ids.map((src) => shortestFrom(net, src).dist);
  let volume = new Map(net.links.map((l) => [l.id, 0]));
  const linkTime = (l: NetLink) => (l.km / l.speed) * 60 * (1 + 0.15 * Math.pow((volume.get(l.id) ?? 0) / (cap.get(l.id) ?? CAP_URBAN), 4));
  let asc = ascOverride ?? -1.2;
  let result: MobilityResult | null = null;
  for (let iter = 0; iter < 3; iter++) {
    // shortest paths under current congestion
    const paths = ids.map((src) => shortestFrom(net, src, linkTime));
    const T: { i: number; j: number; trips: number; tCar: number; kmCar: number; links: NetLink[]; pt: number }[] = [];
    const attempt = (ascTry: number) => {
      T.length = 0;
      let trips = 0;
      let ptTrips = 0;
      for (let i = 0; i < n; i++) {
        const { dist, prev } = paths[i];
        const imp: number[] = [];
        let denom = 0;
        for (let j = 0; j < n; j++) {
          const t = i === j ? intrazonal[i] : (freeFlow[i].get(ids[j]) ?? 999) + 6;
          const v = jobs[j] * Math.exp(-p.beta * t);
          imp.push(v);
          denom += v;
        }
        for (let j = 0; j < n; j++) {
          const tij = workers[i] * (imp[j] / Math.max(1e-12, denom));
          if (tij < 1) continue;
          const links = i === j ? [] : pathLinks(prev, ids[i], ids[j]);
          const kmCar = i === j ? intraKm[i] : links.reduce((s, l) => s + l.km, 0) + 2;
          const tCar = i === j ? intrazonal[i] : (dist.get(ids[j]) ?? 999) + 6;
          let tPt = 0;
          let wait = 10;
          for (const l of links) {
            if (transitLinks.has(l.id)) {
              tPt += (l.km / 32) * 60;
              wait = 4;
            } else tPt += linkTime(l) * 1.6;
          }
          if (i === j) tPt = tCar * 1.6;
          tPt += 8;
          const uCar = -0.03 * tCar - 0.25 * kmCar * p.carCostPerKm;
          const uPt = ascTry - 0.03 * (tPt + wait) - 0.25 * p.fare;
          const pt = 1 / (1 + Math.exp(uCar - uPt));
          T.push({ i, j, trips: tij, tCar, kmCar, links, pt });
          trips += tij;
          ptTrips += tij * pt;
        }
      }
      return ptTrips / Math.max(1, trips);
    };
    if (ascOverride === undefined && p.corridors.length === 0) {
      // calibrate ASC by bisection to the base transit share
      let lo = -6;
      let hi = 4;
      for (let k = 0; k < 30; k++) {
        const mid = (lo + hi) / 2;
        if (attempt(mid) < p.baseTransitShare) lo = mid;
        else hi = mid;
      }
      asc = (lo + hi) / 2;
    }
    attempt(asc);
    // assign car vehicles (peak hour)
    const v = new Map(net.links.map((l) => [l.id, 0]));
    for (const t of T) {
      const veh = (t.trips * (1 - t.pt)) / 1.3 * 0.25;
      for (const l of t.links) v.set(l.id, (v.get(l.id) ?? 0) + veh);
    }
    const lambda = 1 / (iter + 1);
    volume = new Map(net.links.map((l) => [l.id, (1 - lambda) * (volume.get(l.id) ?? 0) + lambda * (v.get(l.id) ?? 0)]));
    // metrics
    let trips = 0;
    let pt = 0;
    let mins = 0;
    let kms = 0;
    let carKm = 0;
    let vehH = 0;
    const flows = new Map<string, { from: string; to: string; trips: number; pt: number }>();
    const corridorTrips: Record<string, number> = {};
    for (const t of T) {
      trips += t.trips;
      pt += t.trips * t.pt;
      mins += t.trips * t.tCar;
      kms += t.trips * t.kmCar;
      carKm += (t.trips * (1 - t.pt) * t.kmCar) / 1.3;
      vehH += ((t.trips * (1 - t.pt)) / 1.3) * (t.tCar / 60);
      if (t.i !== t.j) {
        const a = ids[Math.min(t.i, t.j)];
        const b = ids[Math.max(t.i, t.j)];
        const key = `${a}|${b}`;
        const f = flows.get(key) ?? { from: a, to: b, trips: 0, pt: 0 };
        f.trips += t.trips;
        f.pt += t.trips * t.pt;
        flows.set(key, f);
      }
      if (t.links.some((l) => transitLinks.has(l.id))) {
        corridorTrips.all = (corridorTrips.all ?? 0) + t.trips * t.pt;
        corridorTrips.allTrips = (corridorTrips.allTrips ?? 0) + t.trips;
      }
    }
    result = {
      trips,
      transitShare: pt / Math.max(1, trips),
      meanMinutes: mins / Math.max(1, trips),
      meanKm: kms / Math.max(1, trips),
      carKmDay: carKm * 2,
      vehHoursDay: vehH * 2,
      co2TonsYear: (carKm * 2 * 0.18 * 250) / 1000,
      links: net.links.map((l) => ({ link: l, volume: volume.get(l.id) ?? 0, capacity: cap.get(l.id) ?? CAP_URBAN, vc: (volume.get(l.id) ?? 0) / (cap.get(l.id) ?? CAP_URBAN), transit: transitLinks.has(l.id) })),
      topFlows: [...flows.values()].sort((a, b) => b.trips - a.trips).slice(0, 25).map((f) => ({ from: f.from, to: f.to, trips: f.trips, transitShare: f.pt / Math.max(1, f.trips) })),
      corridorTrips,
    };
  }
  return { ...result!, asc };
}

/** Line coordinates for a network link. */
export function linkCoords(world: World, l: NetLink): [number, number][] {
  const a = world.district[l.a];
  const b = world.district[l.b];
  return [a.label, b.label];
}

export const linkKm = (world: World, l: NetLink) => km(world.district[l.a].label[0], world.district[l.a].label[1], world.district[l.b].label[0], world.district[l.b].label[1]);
