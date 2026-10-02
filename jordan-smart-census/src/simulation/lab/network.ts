/**
 * Schematic inter-district network (SIMULATED, illustrative).
 *
 * Nodes are the 50 district label points. Links are the union of a minimum spanning tree
 * (guarantees connectivity) and each district's 3 nearest neighbours within 70 km.
 * Link length = straight-line km × 1.25 detour factor. This is NOT a road network: it is a
 * transparent stand-in until the national road graph is loaded.
 */
import type { World } from "../generate";
import { km } from "./common";

export interface NetLink {
  id: string;
  a: string;
  b: string;
  km: number;
  /** free-flow speed km/h (higher between large urban districts) */
  speed: number;
}

export interface Network {
  nodes: { id: string; lng: number; lat: number }[];
  links: NetLink[];
  adj: Map<string, { to: string; link: NetLink }[]>;
}

const cache = new WeakMap<World, Network>();
export const DETOUR = 1.25;

export function buildNetwork(world: World): Network {
  const hit = cache.get(world);
  if (hit) return hit;
  const nodes = world.districts.map((d) => ({ id: d.id, lng: d.label[0], lat: d.label[1] }));
  const n = nodes.length;
  const dist = (i: number, j: number) => km(nodes[i].lng, nodes[i].lat, nodes[j].lng, nodes[j].lat);
  const key = (i: number, j: number) => (i < j ? `${i}-${j}` : `${j}-${i}`);
  const pairs = new Set<string>();
  // Prim's MST
  const inTree = new Array(n).fill(false);
  const best = new Array(n).fill(Infinity);
  const parent = new Array(n).fill(-1);
  best[0] = 0;
  for (let it = 0; it < n; it++) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!inTree[i] && (u < 0 || best[i] < best[u])) u = i;
    inTree[u] = true;
    if (parent[u] >= 0) pairs.add(key(u, parent[u]));
    for (let v = 0; v < n; v++) {
      if (inTree[v]) continue;
      const d = dist(u, v);
      if (d < best[v]) {
        best[v] = d;
        parent[v] = u;
      }
    }
  }
  // k nearest neighbours
  for (let i = 0; i < n; i++) {
    const order = nodes.map((_, j) => j).filter((j) => j !== i).sort((a, b) => dist(i, a) - dist(i, b));
    for (const j of order.slice(0, 3)) if (dist(i, j) <= 70) pairs.add(key(i, j));
  }
  const links: NetLink[] = [];
  for (const p of pairs) {
    const [i, j] = p.split("-").map(Number);
    const a = world.districts[i];
    const b = world.districts[j];
    const urban = (a.urbanShare + b.urbanShare) / 2;
    const d = dist(i, j) * DETOUR;
    links.push({ id: `${a.id}~${b.id}`, a: a.id, b: b.id, km: d, speed: d > 40 ? 85 : urban > 0.8 ? 38 : 60 });
  }
  const adj = new Map<string, { to: string; link: NetLink }[]>();
  for (const l of links) {
    (adj.get(l.a) ?? adj.set(l.a, []).get(l.a)!).push({ to: l.b, link: l });
    (adj.get(l.b) ?? adj.set(l.b, []).get(l.b)!).push({ to: l.a, link: l });
  }
  const net = { nodes, links, adj };
  cache.set(world, net);
  return net;
}

/** Dijkstra shortest paths from one node; cost(link) defaults to free-flow minutes. */
export function shortestFrom(net: Network, src: string, cost: (l: NetLink) => number = (l) => (l.km / l.speed) * 60) {
  const dist = new Map<string, number>([[src, 0]]);
  const prev = new Map<string, NetLink>();
  const done = new Set<string>();
  const queue: [number, string][] = [[0, src]];
  while (queue.length) {
    let bi = 0;
    for (let i = 1; i < queue.length; i++) if (queue[i][0] < queue[bi][0]) bi = i;
    const [d, u] = queue.splice(bi, 1)[0];
    if (done.has(u)) continue;
    done.add(u);
    for (const { to, link } of net.adj.get(u) ?? []) {
      const nd = d + cost(link);
      if (nd < (dist.get(to) ?? Infinity)) {
        dist.set(to, nd);
        prev.set(to, link);
        queue.push([nd, to]);
      }
    }
  }
  return { dist, prev };
}

/** Links on the path src → dst, given a predecessor map from shortestFrom(src). */
export function pathLinks(prev: Map<string, NetLink>, src: string, dst: string): NetLink[] {
  const out: NetLink[] = [];
  let cur = dst;
  let guard = 0;
  while (cur !== src && guard++ < 200) {
    const l = prev.get(cur);
    if (!l) return [];
    out.push(l);
    cur = l.a === cur ? l.b : l.a;
  }
  return out;
}
