// Where lanes are drawn. Ships follow a sea graph through the real chokepoints (Hormuz, Bab el-Mandeb,
// Suez, Gibraltar, Malacca), trains follow their corridors, trucks run hub to hub over land, and
// aircraft fly great circles. Shapes are for the map, not for navigation or distance billing.
import { hub, type Hub } from "@fo/network/hubs";
import { FAMILY, type Mode, type ModeFamily } from "@fo/network/modes";

/** [lat, lon] in degrees. */
export type LL = [number, number];

const D = Math.PI / 180;

const vec = ([lat, lon]: LL): [number, number, number] => [Math.cos(lat * D) * Math.cos(lon * D), Math.cos(lat * D) * Math.sin(lon * D), Math.sin(lat * D)];
const ll = ([x, y, z]: [number, number, number]): LL => [Math.atan2(z, Math.hypot(x, y)) / D, Math.atan2(y, x) / D];

/** Central angle between two points, in radians. */
export function arc(a: LL, b: LL): number {
  const [x1, y1, z1] = vec(a), [x2, y2, z2] = vec(b);
  return Math.acos(Math.max(-1, Math.min(1, x1 * x2 + y1 * y2 + z1 * z2)));
}

/** Points along the great circle from a to b, about one per degree. */
export function greatCircle(a: LL, b: LL, perDegree = 1): LL[] {
  const w = arc(a, b);
  const n = Math.max(2, Math.ceil((w / D) * perDegree));
  if (w < 1e-6) return [a, b];
  const va = vec(a), vb = vec(b);
  const out: LL[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const k1 = Math.sin((1 - t) * w) / Math.sin(w), k2 = Math.sin(t * w) / Math.sin(w);
    out.push(ll([va[0] * k1 + vb[0] * k2, va[1] * k1 + vb[1] * k2, va[2] * k1 + vb[2] * k2]));
  }
  return out;
}

// ── Sea graph ────────────────────────────────────────────────────────────────

const WP: Record<string, LL> = {
  // Gulf and Gulf of Oman
  KW_OFF: [29.2, 48.4], GULF_NW: [28.3, 49.6], GULF_N: [27.2, 50.9], GULF_MID: [26.6, 52.3], AE_OFF: [25.5, 54.7],
  HORMUZ: [26.6, 56.4], HORMUZ_E: [25.8, 57.1], OMAN_GULF: [24.3, 58.9], RAS_HADD: [22.6, 60.2],
  // Arabian Sea and India
  ARAB_N: [22.8, 64.5], ARAB_SEA: [18.5, 62.5], IN_W: [16.5, 71.0], IN_SW: [10.0, 74.8], LAK: [7.0, 77.2],
  SRI_SW: [6.2, 79.7], SRI_S: [5.6, 80.4], SRI_E: [7.5, 82.5], BAY_W: [12.5, 81.0],
  // Malacca and the South China Sea
  ACEH: [6.3, 94.6], MAL_N: [5.6, 98.3], MAL_C: [3.2, 100.6], MAL_S: [1.6, 102.9], SG_STR: [1.18, 103.75], SG_E: [1.3, 104.4],
  SCS_S: [4.0, 106.0], SCS_MID: [10.5, 110.5], SCS_N: [18.0, 114.0], HK_OFF: [22.0, 114.5], TW_STR: [24.3, 119.6],
  ECS_S: [27.0, 121.5], ECS_N: [30.4, 123.0], JEJU_S: [32.8, 126.6], KR_S: [34.8, 128.95],
  KYUSHU_S: [30.8, 131.0], SHIKOKU_S: [32.5, 134.0], KII: [33.2, 136.5], TOKYO_OFF: [34.6, 139.9], TOKYO_BAY: [35.15, 139.73],
  // Pacific
  PAC_W: [36.5, 150.0], PAC_N: [45.0, -175.0], PAC_E: [40.0, -140.0], LA_OFF: [33.6, -118.25],
  // Aden, Red Sea and Suez
  ADEN_E: [13.0, 50.5], ADEN: [12.3, 46.0], DJ_OFF: [11.8, 43.6], BAB: [12.6, 43.35], RED_S: [15.0, 41.8], RED_C: [20.0, 38.6],
  RED_N: [25.5, 35.5], GUBAL: [27.8, 33.75], SUEZ_S: [29.9, 32.55], PSD_OFF: [31.6, 32.3],
  // Mediterranean
  MED_E: [33.8, 27.0], CRETE_S: [34.6, 24.5], CRETE_SW: [35.0, 23.0], KYTHIRA: [35.95, 23.2], MYRTOAN: [36.6, 23.6], PIR_OFF: [37.5, 23.9],
  MED_C: [36.2, 16.5], SICILY: [37.3, 11.6], MED_W: [38.0, 5.0], BAL_S: [38.3, 1.0], VLC_OFF: [39.3, 0.2], ALBORAN: [36.2, -2.0], GIB: [35.95, -5.6],
  // Atlantic Europe and the North Sea
  CAPE_SV: [36.6, -9.5], PT_W: [40.0, -10.2], FINIST: [43.5, -9.9], USHANT: [48.6, -6.0], CHANNEL_W: [49.9, -3.0], CHANNEL_E: [50.5, 0.5],
  DOVER: [51.0, 1.55], NS_S: [51.8, 2.6], WSCH: [51.42, 3.6], NS_RTM: [52.0, 3.8], NS_E: [53.4, 4.5], BIGHT: [54.0, 7.5], ELBE: [53.9, 8.6],
  // Atlantic crossings
  ATL_E: [49.0, -12.0], ATL_C: [46.0, -35.0], ATL_W: [41.0, -60.0], NY_OFF: [40.3, -73.4],
  CANARY_W: [28.0, -19.5], CV: [15.0, -26.0], BR_NE: [-5.0, -33.0], BR_E: [-12.0, -36.0], BR_SE: [-23.5, -40.0], SSZ_OFF: [-24.4, -46.0],
  // East Africa
  GUARDAFUI: [12.0, 52.3], SOMALIA_E: [5.0, 50.5], MOGADISHU: [1.5, 46.5], KENYA_OFF: [-3.0, 41.5], COMOROS: [-12.0, 42.0], MOZ_CH: [-20.0, 40.5], MOZ_S: [-27.0, 34.5], DUR_OFF: [-29.9, 31.4],
};

const CHAINS: string[][] = [
  ["KW_OFF", "GULF_NW", "GULF_N", "GULF_MID", "AE_OFF", "HORMUZ", "HORMUZ_E", "OMAN_GULF", "RAS_HADD", "ARAB_SEA", "IN_W", "IN_SW", "LAK", "SRI_S", "SRI_E", "BAY_W"],
  ["RAS_HADD", "ARAB_N", "IN_W"], ["ARAB_N", "ARAB_SEA"], ["SRI_SW", "SRI_S"], ["LAK", "SRI_SW"],
  ["SRI_S", "ACEH", "MAL_N", "MAL_C", "MAL_S", "SG_STR", "SG_E", "SCS_S", "SCS_MID", "SCS_N", "HK_OFF"],
  ["SCS_N", "TW_STR", "ECS_S", "ECS_N", "JEJU_S", "KR_S", "KYUSHU_S", "SHIKOKU_S", "KII", "TOKYO_OFF", "TOKYO_BAY"],
  ["TOKYO_OFF", "PAC_W", "PAC_N", "PAC_E", "LA_OFF"],
  ["ARAB_SEA", "ADEN_E", "ADEN", "BAB", "RED_S", "RED_C", "RED_N", "GUBAL", "SUEZ_S"], ["ADEN", "DJ_OFF", "BAB"], ["RAS_HADD", "ADEN_E"],
  ["PSD_OFF", "MED_E", "CRETE_S", "CRETE_SW", "MED_C", "SICILY", "MED_W", "ALBORAN", "GIB"], ["CRETE_SW", "KYTHIRA", "MYRTOAN", "PIR_OFF"], ["KYTHIRA", "MED_C"],
  ["MED_W", "BAL_S", "ALBORAN"], ["BAL_S", "VLC_OFF"],
  ["GIB", "CAPE_SV", "PT_W", "FINIST", "USHANT", "CHANNEL_W", "CHANNEL_E", "DOVER", "NS_S", "NS_RTM", "NS_E", "BIGHT", "ELBE"], ["NS_S", "WSCH"],
  ["USHANT", "ATL_E", "ATL_C", "ATL_W", "NY_OFF"],
  ["CAPE_SV", "CANARY_W", "CV", "BR_NE", "BR_E", "BR_SE", "SSZ_OFF"],
  ["ADEN_E", "GUARDAFUI", "SOMALIA_E", "MOGADISHU", "KENYA_OFF", "COMOROS", "MOZ_CH", "MOZ_S", "DUR_OFF"], ["ARAB_SEA", "GUARDAFUI"],
];

/** Where each port meets the sea graph. Port Said also joins the canal to the Mediterranean. */
const PORT_LINKS: Record<string, string[]> = {
  AEJEA: ["AE_OFF"], AEKHL: ["AE_OFF"], SADMM: ["GULF_N"], QAHMD: ["GULF_MID"], KWSWK: ["KW_OFF"], OMSOH: ["HORMUZ_E"], SAJED: ["RED_C"],
  INNSA: ["IN_W"], INMAA: ["BAY_W"], LKCMB: ["SRI_SW", "LAK"], PKKHI: ["ARAB_N"],
  CNSHA: ["ECS_N"], CNNGB: ["ECS_N"], CNYTN: ["HK_OFF"], KRPUS: ["KR_S"], JPTYO: ["TOKYO_BAY"], SGSIN: ["SG_STR"], MYPKG: ["MAL_C"],
  NLRTM: ["NS_RTM"], BEANR: ["WSCH"], DEHAM: ["ELBE"], GBFXT: ["NS_S"], GRPIR: ["PIR_OFF"], ESVLC: ["VLC_OFF"], EGPSD: ["SUEZ_S", "PSD_OFF"],
  DJJIB: ["DJ_OFF"], KEMBA: ["KENYA_OFF"], ZADUR: ["DUR_OFF"], USNYC: ["NY_OFF"], USLAX: ["LA_OFF"], BRSSZ: ["SSZ_OFF"],
};

/** Ports that ships pass through on the way to somewhere else. */
const TRANSIT_PORTS = new Set(["EGPSD"]);

type Graph = Map<string, { to: string; w: number }[]>;

const coord = (id: string): LL => WP[id] ?? [hub(id).lat, hub(id).lon];

let graph: Graph | null = null;
function seaGraph(): Graph {
  if (graph) return graph;
  const g: Graph = new Map();
  const link = (a: string, b: string) => {
    const w = arc(coord(a), coord(b));
    (g.get(a) ?? g.set(a, []).get(a)!).push({ to: b, w });
    (g.get(b) ?? g.set(b, []).get(b)!).push({ to: a, w });
  };
  for (const c of CHAINS) for (let i = 1; i < c.length; i++) link(c[i - 1]!, c[i]!);
  for (const [port, wps] of Object.entries(PORT_LINKS)) for (const w of wps) link(port, w);
  return (graph = g);
}

/** Shortest sea path between two ports, as node ids. */
function seaPath(from: string, to: string): string[] {
  const g = seaGraph();
  if (!g.has(from) || !g.has(to)) return [from, to];
  const dist = new Map<string, number>([[from, 0]]);
  const prev = new Map<string, string>();
  const open = new Set([from]);
  while (open.size) {
    let u = "";
    let best = Infinity;
    for (const n of open) {
      const d = dist.get(n) ?? Infinity;
      if (d < best) {
        best = d;
        u = n;
      }
    }
    open.delete(u);
    if (u === to) break;
    for (const e of g.get(u) ?? []) {
      // Other ports are endpoints, not shortcuts, except the canal.
      if (e.to !== to && PORT_LINKS[e.to] && !TRANSIT_PORTS.has(e.to)) continue;
      const d = best + e.w;
      if (d < (dist.get(e.to) ?? Infinity)) {
        dist.set(e.to, d);
        prev.set(e.to, u);
        open.add(e.to);
      }
    }
  }
  if (!prev.has(to)) return [from, to];
  const path = [to];
  while (path[0] !== from) path.unshift(prev.get(path[0]!)!);
  return path;
}

// ── Rail corridors ───────────────────────────────────────────────────────────

const RAIL_VIA: Record<string, LL[]> = {
  "CNXIA>KZKHG": [[36.06, 103.8], [39.7, 98.5], [42.95, 89.2], [43.8, 87.6]],
  "CNCKG>KZKHG": [[34.3, 108.9], [36.06, 103.8], [39.7, 98.5], [42.95, 89.2], [43.8, 87.6]],
  "KZKHG>PLMAL": [[43.25, 76.9], [51.1, 71.4], [54.9, 69.1], [55.15, 61.4], [54.73, 55.97], [53.2, 50.15], [55.75, 37.6], [54.78, 32.05], [53.9, 27.56], [52.1, 23.7]],
  "PLMAL>DEDUI": [[52.23, 21.0], [52.4, 16.9], [52.52, 13.4], [52.37, 9.73]],
};

function railLeg(a: Hub, b: Hub): LL[] {
  const fwd = RAIL_VIA[`${a.code}>${b.code}`];
  const back = RAIL_VIA[`${b.code}>${a.code}`];
  const via = fwd ?? (back ? [...back].reverse() : []);
  return [[a.lat, a.lon], ...via, [b.lat, b.lon]];
}

// ── Paths by mode ────────────────────────────────────────────────────────────

function densify(points: LL[]): LL[] {
  const out: LL[] = [];
  for (let i = 1; i < points.length; i++) {
    const seg = greatCircle(points[i - 1]!, points[i]!, 1.5);
    out.push(...(i === 1 ? seg : seg.slice(1)));
  }
  return out.length ? out : points;
}

export interface Path {
  family: ModeFamily;
  points: LL[];
  /** Height above the surface at each point, in globe radii (only aircraft leave the ground). */
  alt: number[];
}

const pathCache = new Map<string, Path>();

/** The drawn path for a move from hub to hub, through the given calls or crossings. */
export function pathFor(mode: Mode, stops: string[]): Path {
  const key = `${mode}:${stops.join(">")}`;
  const hit = pathCache.get(key);
  if (hit) return hit;
  const family = FAMILY[mode];
  const hubs = stops.map(hub);
  let points: LL[] = [];
  if (family === "sea") {
    for (let i = 1; i < stops.length; i++) {
      const ids = seaPath(stops[i - 1]!, stops[i]!);
      const seg = densify(ids.map(coord));
      points.push(...(i === 1 ? seg : seg.slice(1)));
    }
  } else if (family === "rail") {
    const raw: LL[] = [];
    for (let i = 1; i < hubs.length; i++) {
      const seg = railLeg(hubs[i - 1]!, hubs[i]!);
      raw.push(...(i === 1 ? seg : seg.slice(1)));
    }
    points = densify(raw);
  } else {
    points = densify(hubs.map((h) => [h.lat, h.lon] as LL));
  }
  let alt = points.map(() => 0);
  if (family === "air") {
    // One arc per flight, higher for longer flights.
    const total = arc(points[0]!, points[points.length - 1]!);
    const peak = Math.min(0.16, 0.03 + total * 0.12);
    alt = points.map((_, i) => peak * Math.sin((Math.PI * i) / Math.max(1, points.length - 1)));
  } else alt = points.map(() => 0.002);
  const p = { family, points, alt };
  pathCache.set(key, p);
  return p;
}

/** The point a fraction of the way along a path, by distance. */
export function along(p: Path, t: number): { at: LL; alt: number } {
  const seg: number[] = [0];
  for (let i = 1; i < p.points.length; i++) seg.push(seg[i - 1]! + arc(p.points[i - 1]!, p.points[i]!));
  const goal = seg[seg.length - 1]! * Math.max(0, Math.min(1, t));
  let i = 1;
  while (i < seg.length - 1 && seg[i]! < goal) i++;
  const span = seg[i]! - seg[i - 1]! || 1;
  const k = (goal - seg[i - 1]!) / span;
  const a = p.points[i - 1]!, b = p.points[i]!;
  const g = greatCircle(a, b, 8);
  const at = g[Math.round(k * (g.length - 1))]!;
  return { at, alt: p.alt[i - 1]! + (p.alt[i]! - p.alt[i - 1]!) * k };
}

/** Centre and angular radius of a set of points, for framing the camera. */
export function frame(points: LL[]): { center: LL; radius: number } {
  let x = 0, y = 0, z = 0;
  for (const p of points) {
    const v = vec(p);
    x += v[0];
    y += v[1];
    z += v[2];
  }
  const center = ll([x, y, z]);
  const radius = Math.max(0.05, ...points.map((p) => arc(center, p)));
  return { center, radius };
}
