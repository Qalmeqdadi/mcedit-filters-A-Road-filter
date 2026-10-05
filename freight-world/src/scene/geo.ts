// The world board in scene units. x runs west to east, z runs north to south.
// It is a stylised map, not a projection: distances are squeezed so every place fits one table.
import * as THREE from "three";

type P = [number, number];

export const LAND: { id: string; pts: P[]; tone: "sand" | "green" }[] = [
  {
    id: "arabia", tone: "sand",
    pts: [[-200, -110], [-74, -110], [-66, -60], [-70, -50], [-62, -44], [-66, -34], [-58, -26], [-54, -18], [-50, -8], [-46, 0], [-50, 10], [-62, 22], [-80, 30], [-120, 36], [-200, 44]],
  },
  {
    id: "india", tone: "green",
    pts: [[-38, -110], [22, -110], [20, -50], [14, -30], [8, -12], [2, 4], [-4, 16], [-10, 10], [-18, -4], [-24, -14], [-30, -28], [-36, -44], [-40, -60]],
  },
  {
    id: "indochina", tone: "green",
    pts: [[46, -110], [96, -110], [96, -40], [84, -34], [76, -26], [70, -16], [72, -4], [66, 6], [62, 18], [66, 30], [63, 35], [56, 26], [52, 12], [48, -4], [44, -24], [42, -50]],
  },
  {
    id: "china", tone: "green",
    pts: [[94, -110], [210, -110], [210, -34], [98, -34], [94, -40]],
  },
  { id: "srilanka", tone: "green", pts: ellipse(3, 26, 4.5, 6, 14) },
  { id: "sumatra", tone: "green", pts: [[34, 48], [52, 43], [62, 47], [66, 54], [50, 60], [32, 56]] },
];

function ellipse(cx: number, cz: number, rx: number, rz: number, n: number): P[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [cx + Math.cos(a) * rx, cz + Math.sin(a) * rz];
  });
}

export const PLACES = {
  SHA: { n: "Shanghai", p: [116, -38] as P },
  JEA: { n: "Jebel Ali", p: [-56, -17] as P },
  NSA: { n: "Nhava Sheva", p: [-27, -18] as P },
  MAA: { n: "Chennai", p: [9, -8] as P },
  CMB: { n: "Colombo", p: [-2, 27] as P },
  PKG: { n: "Port Klang", p: [55, 23] as P },
  SIN: { n: "Singapore", p: [64, 35] as P },
  DMM: { n: "Dammam", p: [-66, -46] as P },
  RUH: { n: "Riyadh", p: [-112, -6] as P },
};

/** Buildings that stand for each party on the network. */
export const SITES = {
  desk: { n: "Gulfway Logistics", sub: "Jebel Ali desk", p: [-70, -8] as P },
  noor: { n: "Al Noor warehouse", sub: "Dubai", p: [-80, -24] as P },
  customs: { n: "Al Safa Customs", sub: "Jebel Ali", p: [-63, -30] as P },
  bank: { n: "Bank", sub: "Escrow", p: [-76, 4] as P },
  olTerm: { n: "Oceanlink terminal", sub: "Shanghai", p: [158, -41] as P },
  fitBay: { n: "Load planning", sub: "Container fit", p: [-92, -56] as P },
};

/** Six carrier berths on the Shanghai quay for the RFQ, one per carrier. */
export const BERTHS: Record<string, P> = {
  OL: [98, -26], MC: [105.5, -26], PC: [113, -26], GF: [120.5, -26], BH: [128, -26], SS: [135.5, -26],
};
/** Oceanlink's own vessels for the carrier portal. */
export const OL_BERTHS: Record<string, P> = { AUR: [150, -26], BOR: [157.5, -26], CAS: [165, -26] };
export const JEA_BERTH: P = [-46, -17];

const SHA_OUT: P[] = [[117, -18], [112, -10], [96, 2], [80, 18], [72, 32], [64, 41], [52, 36]];
const TO_GULF: P[] = [[-12, 26], [-30, 10], [-42, -4], [-48, -14], [-52, -17]];
export const ROUTES: Record<string, P[]> = {
  direct: [[116, -26], ...SHA_OUT, [30, 35], [8, 35], ...TO_GULF],
  colombo: [[116, -26], ...SHA_OUT, [30, 35], [10, 33], [-1, 31], ...TO_GULF],
  klang: [[116, -26], [117, -18], [112, -10], [96, 2], [80, 18], [72, 32], [64, 41], [57, 30], [54, 24], [48, 32], [30, 35], [8, 35], ...TO_GULF],
  nsa: [[-27, -14], [-34, -10], [-42, -10], [-48, -14], [-52, -17]],
  maa: [[10, -6], [14, 6], [12, 20], [9, 33], [-4, 33], ...TO_GULF],
  dmm: [[-48, -14], [-50, -24], [-56, -34], [-62, -42], [-64, -46]],
};
export const routeFor = (via: string) => (via === "Colombo" ? "colombo" : via === "Port Klang" ? "klang" : "direct");

export const ROADS: Record<string, P[]> = {
  noor: [[-58, -18], [-66, -18], [-72, -22], [-78, -24]],
  ruh: [[-58, -16], [-72, -14], [-90, -10], [-112, -6]],
};
export const RAIL: P[] = [[-64, -46], [-80, -38], [-96, -22], [-112, -6]];

const curves = new Map<string, THREE.CatmullRomCurve3>();
export function curve(pts: P[], y = 0, key?: string) {
  if (key && curves.has(key)) return curves.get(key)!;
  const c = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, y, z)), false, "centripetal");
  if (key) curves.set(key, c);
  return c;
}
export const routeCurve = (r: string) => curve(ROUTES[r], 0, `route:${r}`);

/** Where the camera looks for each screen, and how many units of world must fit across. */
export interface Focus { c: P; w: number }
export const FOCUS: Record<string, Focus> = {
  world: { c: [26, -4], w: 222 },
  wide: { c: [8, -6], w: 270 },
  dubai: { c: [-70, -16], w: 64 },
  shanghai: { c: [117, -30], w: 64 },
  olTerm: { c: [157, -32], w: 46 },
  fitBay: { c: [-92, -56], w: 40 },
  customs: { c: [-62, -24], w: 40 },
  noor: { c: [-74, -20], w: 46 },
  arabia: { c: [-76, -20], w: 110 },
};
