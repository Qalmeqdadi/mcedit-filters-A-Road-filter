// Map geometry for the UAE view. Outlines are simplified (tens of points) and are
// for orientation only; they are not survey-grade borders.

export type LonLat = readonly [number, number];

export const VIEW = { lonMin: 51.4, lonMax: 57.5, latMin: 22.6, latMax: 27.0 } as const;
export const MAP_WIDTH = 1000;

const MID_LAT = (VIEW.latMin + VIEW.latMax) / 2;
const X_SCALE = Math.cos((MID_LAT * Math.PI) / 180);
const UNITS_PER_DEG = MAP_WIDTH / ((VIEW.lonMax - VIEW.lonMin) * X_SCALE);
export const MAP_HEIGHT = Math.round((VIEW.latMax - VIEW.latMin) * UNITS_PER_DEG);

/** Equirectangular projection with a cos(latitude) correction at the view's mid latitude. */
export function project([lon, lat]: LonLat): [number, number] {
  const x = (lon - VIEW.lonMin) * X_SCALE * UNITS_PER_DEG;
  const y = (VIEW.latMax - lat) * UNITS_PER_DEG;
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

export function kmToUnits(km: number): number {
  return (km / 111.32) * UNITS_PER_DEG;
}

export function toPath(points: readonly LonLat[], close = true): string {
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${project(p).join(",")}`).join(" ");
  return close ? `${d} Z` : d;
}

/** Smooth open path through waypoints (quadratic midpoints). */
export function toCurve(points: readonly LonLat[]): string {
  const pts = points.map(project);
  if (pts.length < 3) return toPath(points, false);
  let d = `M${pts[0].join(",")}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i];
    const [nx, ny] = pts[i + 1];
    d += ` Q${x},${y} ${(x + nx) / 2},${(y + ny) / 2}`;
  }
  d += ` L${pts[pts.length - 1].join(",")}`;
  return d;
}

// UAE coastline (west -> east), then the Musandam / Oman border and the southern border.
const UAE_GULF_COAST: LonLat[] = [
  [51.58, 24.26], [51.8, 24.02], [52.05, 23.98], [52.35, 24.12], [52.58, 24.18],
  [52.73, 24.12], [53.1, 24.1], [53.45, 24.12], [53.9, 24.15], [54.2, 24.3],
  [54.37, 24.47], [54.6, 24.7], [54.77, 24.85], [55.03, 25.0], [55.15, 25.12],
  [55.27, 25.22], [55.39, 25.36], [55.55, 25.56], [55.8, 25.7], [55.95, 25.8],
  [56.08, 25.98],
];

const UAE_EAST_AND_BORDERS: LonLat[] = [
  [56.2, 25.75], [56.27, 25.62], [56.35, 25.34], [56.36, 25.12], [56.37, 24.98],
  [56.1, 24.75], [55.95, 24.45], [55.78, 24.22], [55.82, 24.0], [55.55, 23.55],
  [55.2, 22.7], [52.6, 22.94], [51.95, 23.55], [51.6, 24.1],
];

export const UAE_OUTLINE: LonLat[] = [...UAE_GULF_COAST, ...UAE_EAST_AND_BORDERS];

// Surrounding land (Saudi Arabia, Qatar, Oman incl. Musandam) drawn underneath the UAE.
export const REGION_LAND: LonLat[] = [
  [51.3, 22.4], [51.3, 26.1], [51.4, 26.08], [51.55, 25.9], [51.58, 25.6], [51.53, 25.29],
  [51.62, 25.25], [51.6, 24.95], [51.42, 24.62], [51.5, 24.4],
  ...UAE_GULF_COAST,
  [56.12, 26.12], [56.25, 26.2], [56.38, 26.38], [56.47, 26.22], [56.38, 25.95],
  [56.27, 25.62], [56.35, 25.34], [56.36, 25.12], [56.37, 24.98], [56.5, 24.75],
  [56.8, 24.4], [57.2, 23.95], [57.6, 23.75], [57.6, 22.4],
];

export const IRAN_COAST: LonLat[] = [
  [52.6, 27.2], [52.6, 27.1], [53.7, 26.75], [54.5, 26.6], [54.9, 26.55], [55.3, 26.68],
  [55.7, 26.92], [56.1, 27.1], [56.6, 27.12], [56.9, 26.9], [57.1, 26.5], [57.3, 26.1],
  [57.6, 25.85], [57.6, 27.2],
];

export const SEA_LABELS: { text: string; at: LonLat; size?: number }[] = [
  { text: "ARABIAN GULF", at: [53.3, 25.6], size: 15 },
  { text: "GULF OF OMAN", at: [56.75, 24.95], size: 12 },
  { text: "STRAIT OF HORMUZ", at: [56.25, 26.62], size: 10 },
];

/** Final approach lane from the map edge to each UAE port of entry. */
export const APPROACH_LANES: Record<string, LonLat[]> = {
  JEA: [[57.5, 25.4], [56.95, 25.95], [56.6, 26.45], [56.1, 26.42], [55.5, 25.8], [55.1, 25.2],
    [55.061, 25.011]],
  KHL: [[57.5, 25.5], [56.98, 26.02], [56.62, 26.5], [56.0, 26.45], [55.4, 25.9], [54.9, 25.2],
    [54.645, 24.81]],
  MSQ: [[57.5, 25.6], [57.0, 26.1], [56.62, 26.52], [56.2, 26.35], [56.052, 25.985]],
  KFK: [[57.5, 25.15], [56.8, 25.3], [56.36, 25.345]],
  FJR: [[57.5, 24.85], [56.8, 25.02], [56.362, 25.17]],
  GHW: [[51.4, 23.55], [51.5, 23.85], [51.62, 24.12]],
};

export function inView([lon, lat]: LonLat): boolean {
  return lon >= VIEW.lonMin && lon <= VIEW.lonMax && lat >= VIEW.latMin && lat <= VIEW.latMax;
}
