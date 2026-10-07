// The world as one equirectangular canvas, drawn from Natural Earth (public domain) via world-atlas:
// 1:50m land for coastlines and 1:50m countries for borders. The same texture wraps the globe and
// lies flat on the map, so the two views always agree.
import type { Feature, GeometryObject, MultiLineString, MultiPolygon, Polygon, Position } from "geojson";
import { feature, mesh } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import countries50 from "world-atlas/countries-50m.json";
import land50 from "world-atlas/land-50m.json";
import type { Theme } from "../scene/palette";

export interface GlobeColors {
  sea: string;
  seaGrid: string;
  land: string;
  pilot: string;
  coast: string;
  border: string;
}

export const GLOBE_COLORS: Record<Theme, GlobeColors> = {
  light: { sea: "#c4d9d8", seaGrid: "rgba(18,35,44,0.07)", land: "#f7f4eb", pilot: "#fbeec4", coast: "#9db5ae", border: "rgba(18,35,44,0.22)" },
  dark: { sea: "#0d1f27", seaGrid: "rgba(228,237,235,0.06)", land: "#22343b", pilot: "#3a3a25", coast: "#3b5a66", border: "rgba(228,237,235,0.2)" },
};

/** The pilot region, tinted on the map: GCC to Asia and GCC to Europe start here. */
export const PILOT_COUNTRIES = ["Saudi Arabia", "United Arab Emirates", "Oman", "Qatar", "Kuwait", "Bahrain"];

const landTopo = land50 as unknown as Topology<{ land: GeometryCollection }>;
const countryTopo = countries50 as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;

let cachedLand: Position[][] | null = null;
function landRings(): Position[][] {
  if (cachedLand) return cachedLand;
  const f = feature(landTopo, landTopo.objects.land) as unknown as { features: Feature<Polygon | MultiPolygon>[] };
  return (cachedLand = f.features.flatMap((x) => rings(x.geometry)));
}

function rings(g: GeometryObject | Polygon | MultiPolygon): Position[][] {
  if (g.type === "Polygon") return (g as Polygon).coordinates;
  if (g.type === "MultiPolygon") return (g as MultiPolygon).coordinates.flat();
  return [];
}

/** Makes longitudes continuous across the antimeridian so each ring can be drawn in one piece. */
function unwrap(r: Position[]): Position[] {
  const out: Position[] = [];
  let shift = 0;
  for (let i = 0; i < r.length; i++) {
    const [lon, lat] = r[i] as [number, number];
    if (i) {
      const prev = (r[i - 1]![0] as number) + shift;
      const d = lon + shift - prev;
      if (d > 180) shift -= 360;
      else if (d < -180) shift += 360;
    }
    out.push([lon + shift, lat]);
  }
  return out;
}

/** Longitude and latitude bounds of a texture: [west, south, east, north]. */
export type BBox = [number, number, number, number];
export const WHOLE_WORLD: BBox = [-180, -90, 180, 90];
/** The pilot region, drawn again at high resolution for close-ups: Red Sea to India, Kuwait to Aden. */
export const PILOT_BOX: BBox = [30, 5, 80, 42];

/** Draws the world, or one box of it, as an equirectangular canvas W pixels wide. */
export function drawWorld(theme: Theme, W = 4096, box: BBox = WHOLE_WORLD): HTMLCanvasElement {
  const c = GLOBE_COLORS[theme];
  const [w0, s0, e0, n0] = box;
  const H = Math.round((W * (n0 - s0)) / (e0 - w0));
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const X = (lon: number) => ((lon - w0) / (e0 - w0)) * W;
  const Y = (lat: number) => ((n0 - lat) / (n0 - s0)) * H;
  const px = Math.min(1.8, W / (e0 - w0) / 11.4); // about one texel at world scale, a little more in close-ups

  ctx.fillStyle = c.sea;
  ctx.fillRect(0, 0, W, H);

  // graticule every 15 degrees
  ctx.strokeStyle = c.seaGrid;
  ctx.lineWidth = Math.max(1, px);
  ctx.beginPath();
  for (let lon = -180; lon <= 180; lon += 15) {
    ctx.moveTo(X(lon), 0);
    ctx.lineTo(X(lon), H);
  }
  for (let lat = -75; lat <= 75; lat += 15) {
    ctx.moveTo(0, Y(lat));
    ctx.lineTo(W, Y(lat));
  }
  ctx.stroke();

  const ringPath = (list: Position[][]) => {
    const p = new Path2D();
    for (const raw of list) {
      const r = unwrap(raw);
      for (const off of [-360, 0, 360]) {
        r.forEach(([lon, lat], i) => (i ? p.lineTo(X(lon! + off), Y(lat!)) : p.moveTo(X(lon! + off), Y(lat!))));
        p.closePath();
      }
    }
    return p;
  };

  const land = ringPath(landRings());
  ctx.fillStyle = c.land;
  ctx.fill(land, "evenodd");

  // pilot region, clipped to the detailed coastline so the coarse country shapes never spill into the sea
  const countries = feature(countryTopo, countryTopo.objects.countries) as unknown as { features: Feature<Polygon | MultiPolygon, { name: string }>[] };
  const pilot = ringPath(countries.features.filter((f) => PILOT_COUNTRIES.includes(f.properties.name)).flatMap((f) => rings(f.geometry)));
  ctx.save();
  ctx.clip(land, "evenodd");
  ctx.fillStyle = c.pilot;
  ctx.fill(pilot);
  ctx.restore();

  // borders between countries
  const borders = mesh(countryTopo, countryTopo.objects.countries, (a, b) => a !== b) as unknown as MultiLineString;
  ctx.strokeStyle = c.border;
  ctx.lineWidth = Math.max(1, px * 1.35);
  ctx.beginPath();
  for (const line of borders.coordinates) {
    const r = unwrap(line);
    r.forEach(([lon, lat], i) => (i ? ctx.lineTo(X(lon!), Y(lat!)) : ctx.moveTo(X(lon!), Y(lat!))));
  }
  ctx.stroke();

  ctx.strokeStyle = c.coast;
  ctx.lineWidth = Math.max(1, px * 1.6);
  ctx.stroke(land);
  return canvas;
}
