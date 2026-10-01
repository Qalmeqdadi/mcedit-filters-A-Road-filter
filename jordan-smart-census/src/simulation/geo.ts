/** Minimal geometry helpers (no runtime dependency on turf). */
export type Ring = number[][];
export type PolygonCoords = Ring[];
export type MultiPolygonCoords = PolygonCoords[];

export interface GeoFeature<P> {
  type: "Feature";
  properties: P;
  geometry: { type: "Polygon"; coordinates: PolygonCoords } | { type: "MultiPolygon"; coordinates: MultiPolygonCoords };
}

export interface GeoCollection<P> {
  type: "FeatureCollection";
  features: GeoFeature<P>[];
}

function inRing(x: number, y: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inPolygon(x: number, y: number, poly: PolygonCoords): boolean {
  if (!inRing(x, y, poly[0])) return false;
  for (let h = 1; h < poly.length; h++) if (inRing(x, y, poly[h])) return false;
  return true;
}

export function pointInFeature(lng: number, lat: number, f: GeoFeature<unknown>): boolean {
  const g = f.geometry;
  if (g.type === "Polygon") return inPolygon(lng, lat, g.coordinates);
  return g.coordinates.some((p) => inPolygon(lng, lat, p));
}

export function bbox(f: GeoFeature<unknown>): [number, number, number, number] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const p of polys)
    for (const [x, y] of p[0]) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  return [minX, minY, maxX, maxY];
}

export function bboxOfCollection(fs: GeoFeature<unknown>[]): [number, number, number, number] {
  return fs.map(bbox).reduce((a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]);
}

/** approximate distance in km between two lng/lat points */
export function kmBetween(a: [number, number], b: [number, number]): number {
  const dx = (a[0] - b[0]) * 111.32 * Math.cos(((a[1] + b[1]) / 2) * (Math.PI / 180));
  const dy = (a[1] - b[1]) * 110.57;
  return Math.sqrt(dx * dx + dy * dy);
}
