// Camera and morph state the globe layers share every frame. Kept outside React so dragging and
// the globe-to-flat morph never re-render the interface.
import * as THREE from "three";
import type { Region } from "@fo/network/hubs";
import type { LL } from "./routes";

export const R = 1;
const D = Math.PI / 180;

export const G = {
  /** Longitude at the centre of the view, degrees. */
  lon0: 70,
  /** Latitude at the centre of the view, degrees. */
  lat0: 22,
  /** Camera distance from the globe's centre, in radii. */
  dist: 5.4,
  /** 0 = globe, 1 = flat map. */
  t: 0,
  goal: { lon0: 70, lat0: 22, dist: 5.4, active: false },
  /** Last time the person dragged or zoomed, for the idle spin. */
  touched: 0,
  /** Changes whenever lon0 or t changes, so layers know to rebuild positions. */
  stamp: 0,
};

/** Signed longitude difference, wrapped to -180..180. */
export const wrapLon = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;

/** Position in the globe group's space for the current morph and centre longitude. */
export function place(lat: number, lon: number, alt: number, out = new THREE.Vector3()): THREE.Vector3 {
  return placeRel(lat, wrapLon(lon - G.lon0), alt, out);
}

/** As place(), with the longitude already relative to the centre (-180..180, not wrapped). */
export function placeRel(lat: number, relLon: number, alt: number, out = new THREE.Vector3()): THREE.Vector3 {
  const lam = relLon * D;
  const phi = lat * D;
  const r = R * (1 + alt);
  const sx = r * Math.cos(phi) * Math.sin(lam), sy = r * Math.sin(phi), sz = r * Math.cos(phi) * Math.cos(lam);
  const fx = R * lam, fy = R * phi, fz = R + alt * 1.4;
  const t = G.t;
  return out.set(sx + (fx - sx) * t, sy + (fy - sy) * t, sz + (fz - sz) * t);
}

/** True when the point is on the side of the globe facing the camera (always, once flat). */
export function facing(local: THREE.Vector3, group: THREE.Object3D, tmp = new THREE.Vector3()): boolean {
  if (G.t > 0.5) return true;
  tmp.copy(local).applyMatrix4(group.matrixWorld);
  return tmp.z > 0.12;
}

export function flyTo(lat: number, lon: number, dist: number) {
  G.goal = { lon0: lon, lat0: Math.max(-60, Math.min(70, lat)), dist, active: true };
}

/** Frames a set of points: centre on them and back off far enough to see them all. */
export function flyToFit(center: LL, radiusRad: number) {
  // the panel takes the right of the screen, so the open area is roughly square: fit the radius vertically
  const fit = 1 + Math.max(0.3, radiusRad * (G.t > 0.5 ? 4.2 : 4.8));
  flyTo(center[0], center[1], Math.min(7, fit));
}

export const REGIONS: Record<Region | "world", { label: string; at: LL; dist: number }> = {
  world: { label: "World", at: [22, 70], dist: 5.4 },
  gcc: { label: "GCC · pilot", at: [24.5, 51.5], dist: 1.6 },
  middle_east: { label: "Levant", at: [31.5, 36], dist: 1.7 },
  south_asia: { label: "South Asia", at: [16, 76], dist: 1.9 },
  east_asia: { label: "East Asia", at: [32, 118], dist: 2.0 },
  southeast_asia: { label: "Southeast Asia", at: [6, 105], dist: 1.9 },
  europe: { label: "Europe", at: [49, 10], dist: 1.9 },
  africa: { label: "Africa", at: [-2, 32], dist: 2.5 },
  americas: { label: "Americas", at: [33, -90], dist: 2.8 },
};

/** Labels laid over the globe: plain DOM, placed each frame from data-lat, data-lon and data-alt. */
export const globeLabels = new Map<string, HTMLElement>();
