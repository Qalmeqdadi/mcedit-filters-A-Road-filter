"use client";

import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, LngLatBoundsLike, MapGeoJSONFeature, MapMouseEvent } from "maplibre-gl";
import { Layers, Maximize2, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { COUNTRY, DISTRICT_GEO, GOVERNORATE_GEO } from "@/data/geo";
import { bbox, bboxOfCollection, type GeoFeature } from "@/simulation/geo";
import type { GovId } from "@/types/census";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import { hostedWorkerUrl, isHosted } from "@/lib/hosted";
import { ProvenanceButton } from "@/components/ui/provenance";

export type Scale = "seq" | "risk" | "pct";

const RAMPS: Record<Scale, string[]> = {
  seq: ["#e3edfa", "#b7d3f6", "#86b6ef", "#5598e7", "#2a78d6", "#1c5cab", "#104281"],
  pct: ["#f3efe6", "#d9e6f5", "#b0cbea", "#7ea9db", "#4f86c6", "#2f62a6", "#1b3f73"],
  risk: ["#f7efe6", "#f4d9c6", "#eeb396", "#e08a66", "#cc6142", "#b5453a", "#7e2a22"],
};

export interface Classification {
  breaks: number[];
  colors: string[];
  colorFor: (v: number | undefined) => string;
}

export function classify(values: number[], scale: Scale, domain?: [number, number]): Classification {
  const colors = RAMPS[scale];
  const k = colors.length;
  const vals = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  let breaks: number[];
  if (domain) {
    breaks = Array.from({ length: k - 1 }, (_, i) => domain[0] + ((domain[1] - domain[0]) * (i + 1)) / k);
  } else if (vals.length >= k) {
    breaks = Array.from({ length: k - 1 }, (_, i) => vals[Math.floor(((i + 1) * vals.length) / k)]);
  } else {
    const mn = vals[0] ?? 0;
    const mx = vals[vals.length - 1] ?? 1;
    breaks = Array.from({ length: k - 1 }, (_, i) => mn + ((mx - mn) * (i + 1)) / k);
  }
  const colorFor = (v: number | undefined) => {
    if (v === undefined || !Number.isFinite(v)) return "#ece7dc";
    let i = 0;
    while (i < breaks.length && v >= breaks[i]) i++;
    return colors[i];
  };
  return { breaks, colors, colorFor };
}

export interface EAPoint {
  id: string;
  lng: number;
  lat: number;
  color: string;
  govId: GovId;
  districtId: string;
  label?: string;
}

export interface MapLine {
  coords: [number, number][];
  width: number;
  color: string;
  label?: string;
}

if (typeof window !== "undefined") maplibregl.setWorkerUrl(hostedWorkerUrl() ?? `${window.location.origin}/maplibre/maplibre-gl-worker.mjs`);

/** leaves room for the toolbar (top) and legend (bottom) overlays */
const FIT_PADDING = { top: 52, bottom: 46, left: 28, right: 28 };

const JORDAN_BOUNDS = bboxOfCollection(COUNTRY.features as GeoFeature<unknown>[]);

interface Props {
  height?: number | string;
  govValues?: Partial<Record<GovId, number>>;
  districtValues?: Record<string, number>;
  scale?: Scale;
  domain?: [number, number];
  format?: (v: number) => string;
  legendTitle?: string;
  layers?: { value: string; label: string }[];
  layer?: string;
  onLayerChange?: (v: string) => void;
  selectedGov?: GovId | null;
  selectedDistrict?: string | null;
  onSelectGov?: (g: GovId | null) => void;
  onSelectDistrict?: (d: string | null) => void;
  onSelectEA?: (id: string) => void;
  eaPoints?: EAPoint[];
  eaLegend?: { color: string; label: string }[];
  lines?: MapLine[];
  routePoints?: [number, number][];
  districtMode?: "drill" | "all";
  tooltipExtra?: (kind: "gov" | "district", id: string) => ReactNode;
  sources?: string[];
  title?: ReactNode;
  className?: string;
  fitTo?: [number, number, number, number] | null;
  showLabelsDefault?: boolean;
}

export function JordanMap(props: Props) {
  const { height = 460, scale = "seq", districtMode = "drill" } = props;
  const { t, ar, tx, L } = useI18n();
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [hover, setHover] = useState<{ x: number; y: number; w: number; kind: "gov" | "district" | "ea"; id: string } | null>(null);
  const [showLabels, setShowLabels] = useState(props.showLabelsDefault ?? true);
  const [basemap, setBasemap] = useState(false);
  const markers = useRef<maplibregl.Marker[]>([]);
  const propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  });

  const govClass = useMemo(() => classify(Object.values(props.govValues ?? {}) as number[], scale, props.domain), [props.govValues, scale, props.domain]);
  const distValuesInScope = useMemo(() => {
    if (!props.districtValues) return [];
    return DISTRICT_GEO.features.filter((f) => districtMode === "all" || f.properties.govId === props.selectedGov).map((f) => props.districtValues![f.properties.id]).filter((v) => v !== undefined);
  }, [props.districtValues, props.selectedGov, districtMode]);
  const distClass = useMemo(() => classify(distValuesInScope, scale, props.domain), [distValuesInScope, scale, props.domain]);
  const showDistricts = districtMode === "all" || !!props.selectedGov;
  const activeClass = showDistricts && props.districtValues ? distClass : govClass;

  // ------------------------------------------------------------ init
  useEffect(() => {
    if (!container.current) return;
    const m = new maplibregl.Map({
      container: container.current,
      style: {
        version: 8,
        sources: {
          carto: { type: "raster", tiles: ["https://basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenStreetMap contributors © CARTO" },
        },
        layers: [
          { id: "bg", type: "background", paint: { "background-color": "#e8e3d7" } },
          { id: "carto", type: "raster", source: "carto", layout: { visibility: "none" }, paint: { "raster-opacity": 0.85 } },
        ],
      },
      bounds: JORDAN_BOUNDS as LngLatBoundsLike,
      fitBoundsOptions: { padding: FIT_PADDING },
      attributionControl: { compact: true, customAttribution: "Boundaries: geoBoundaries (CC BY)" },
      dragRotate: false,
      pitchWithRotate: false,
      maxZoom: 14,
      minZoom: 5,
    });
    m.touchZoomRotate.disableRotation();
    map.current = m;
    if (process.env.NODE_ENV !== "production") (window as unknown as { __jsc_map?: maplibregl.Map }).__jsc_map = m;
    m.on("error", (e) => console.error("map error", e.error?.message ?? e));
    m.on("load", () => {
      m.addSource("country", { type: "geojson", data: COUNTRY as never });
      m.addSource("govs", { type: "geojson", data: GOVERNORATE_GEO as never, promoteId: "id" });
      m.addSource("districts", { type: "geojson", data: DISTRICT_GEO as never, promoteId: "id" });
      m.addSource("eas", { type: "geojson", data: { type: "FeatureCollection", features: [] }, promoteId: "id" });
      m.addSource("lines", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addSource("route", { type: "geojson", data: { type: "FeatureCollection", features: [] } });

      m.addLayer({ id: "country-shadow", type: "line", source: "country", paint: { "line-color": "#0f1c31", "line-width": 6, "line-opacity": 0.06, "line-blur": 4 } });
      m.addLayer({ id: "gov-fill", type: "fill", source: "govs", paint: { "fill-color": ["coalesce", ["get", "__c"], "#f2ecdf"], "fill-opacity": ["case", ["boolean", ["feature-state", "dim"], false], 0.35, 0.92] } });
      m.addLayer({ id: "district-fill", type: "fill", source: "districts", paint: { "fill-color": ["coalesce", ["get", "__c"], "#f2ecdf"], "fill-opacity": 0.92 }, filter: ["==", ["get", "govId"], "__none__"] });
      m.addLayer({ id: "district-line", type: "line", source: "districts", paint: { "line-color": "#ffffff", "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 2.2, 0.8], "line-opacity": 0.95 }, filter: ["==", ["get", "govId"], "__none__"] });
      m.addLayer({ id: "gov-line", type: "line", source: "govs", paint: { "line-color": "#ffffff", "line-width": 1.4 } });
      m.addLayer({ id: "gov-hover", type: "line", source: "govs", paint: { "line-color": "#0f1c31", "line-width": ["case", ["boolean", ["feature-state", "selected"], false], 2.4, ["boolean", ["feature-state", "hover"], false], 1.6, 0], "line-opacity": 0.9 } });
      m.addLayer({ id: "district-hover", type: "line", source: "districts", paint: { "line-color": "#0f1c31", "line-width": ["case", ["boolean", ["feature-state", "selected"], false], 2.2, ["boolean", ["feature-state", "hover"], false], 1.4, 0] } });
      m.addLayer({ id: "country-line", type: "line", source: "country", paint: { "line-color": "#22406b", "line-width": 1.6 } });
      m.addLayer({ id: "lines", type: "line", source: "lines", layout: { "line-cap": "round" }, paint: { "line-color": ["get", "color"], "line-width": ["get", "width"], "line-opacity": 0.72 } });
      m.addLayer({ id: "route-line", type: "line", source: "route", filter: ["==", ["geometry-type"], "LineString"], paint: { "line-color": "#0f1c31", "line-width": 2, "line-dasharray": [2, 1.5] } });
      m.addLayer({ id: "route-pts", type: "circle", source: "route", filter: ["==", ["geometry-type"], "Point"], paint: { "circle-radius": 4, "circle-color": "#d07a1c", "circle-stroke-color": "#fff", "circle-stroke-width": 1.5 } });
      m.addLayer({
        id: "ea-pts", type: "circle", source: "eas",
        paint: {
          "circle-color": ["get", "c"],
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 1.8, 8, 2.8, 10, 4.5, 12, 7],
          "circle-stroke-color": ["case", ["boolean", ["feature-state", "hover"], false], "#0f1c31", "#ffffff"],
          "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 6, 0, 9, 0.6, 12, 1.2],
          "circle-opacity": 0.92,
        },
      });

      const setHoverState = (src: string, id: string | number | undefined, on: boolean) => {
        if (id !== undefined) m.setFeatureState({ source: src, id }, { hover: on });
      };
      let hovered: { src: string; id: string | number } | null = null;
      const clearHover = () => {
        if (hovered) setHoverState(hovered.src, hovered.id, false);
        hovered = null;
      };
      m.on("mousemove", (e: MapMouseEvent) => {
        const layers = ["ea-pts", "district-fill", "gov-fill"].filter((l) => m.getLayer(l));
        const feats: MapGeoJSONFeature[] = m.queryRenderedFeatures(e.point, { layers });
        const f = feats[0];
        clearHover();
        if (!f) {
          setHover(null);
          m.getCanvas().style.cursor = "";
          return;
        }
        const src = f.source;
        hovered = { src, id: f.id as string };
        setHoverState(src, f.id, true);
        m.getCanvas().style.cursor = "pointer";
        setHover({ x: e.point.x, y: e.point.y, w: m.getContainer().clientWidth, kind: src === "eas" ? "ea" : src === "districts" ? "district" : "gov", id: String(f.properties.id ?? f.id) });
      });
      m.on("mouseout", () => {
        clearHover();
        setHover(null);
      });
      m.on("click", (e: MapMouseEvent) => {
        const p = propsRef.current;
        const layers = ["ea-pts", "district-fill", "gov-fill"].filter((l) => m.getLayer(l));
        const f = m.queryRenderedFeatures(e.point, { layers })[0];
        if (!f) return;
        if (f.source === "eas") p.onSelectEA?.(String(f.properties.id));
        else if (f.source === "districts") p.onSelectDistrict?.(String(f.properties.id));
        else if (f.source === "govs") p.onSelectGov?.(f.properties.id as GovId);
      });
      setReady(true);
    });
    return () => {
      markers.current.forEach((mk) => mk.remove());
      m.remove();
      map.current = null;
    };
  }, []);

  // ------------------------------------------------------------ data updates
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    const data = {
      ...GOVERNORATE_GEO,
      features: GOVERNORATE_GEO.features.map((f) => ({ ...f, properties: { ...f.properties, __c: props.govValues ? govClass.colorFor(props.govValues[f.properties.id]) : "#f2ecdf" } })),
    };
    (m.getSource("govs") as GeoJSONSource).setData(data as never);
  }, [ready, props.govValues, govClass]);

  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    const data = {
      ...DISTRICT_GEO,
      features: DISTRICT_GEO.features.map((f) => ({ ...f, properties: { ...f.properties, __c: props.districtValues ? distClass.colorFor(props.districtValues[f.properties.id]) : "#f2ecdf" } })),
    };
    (m.getSource("districts") as GeoJSONSource).setData(data as never);
    const filter = districtMode === "all" ? null : ["==", ["get", "govId"], props.selectedGov ?? "__none__"];
    m.setFilter("district-fill", filter as never);
    m.setFilter("district-line", filter as never);
    m.setFilter("district-hover", filter as never);
    // dim other governorates in drill mode
    for (const g of GOVERNORATE_GEO.features) {
      m.setFeatureState({ source: "govs", id: g.properties.id }, { dim: districtMode === "drill" && !!props.selectedGov && g.properties.id !== props.selectedGov, selected: g.properties.id === props.selectedGov });
    }
    for (const d of DISTRICT_GEO.features) m.setFeatureState({ source: "districts", id: d.properties.id }, { selected: d.properties.id === props.selectedDistrict });
  }, [ready, props.districtValues, distClass, props.selectedGov, props.selectedDistrict, districtMode]);

  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    (m.getSource("eas") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: (props.eaPoints ?? []).map((p) => ({ type: "Feature", id: p.id, properties: { id: p.id, c: p.color }, geometry: { type: "Point", coordinates: [p.lng, p.lat] } })),
    } as never);
  }, [ready, props.eaPoints]);

  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    (m.getSource("lines") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: (props.lines ?? []).map((l) => ({ type: "Feature", properties: { width: l.width, color: l.color }, geometry: { type: "LineString", coordinates: l.coords } })),
    } as never);
  }, [ready, props.lines]);

  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    const pts = props.routePoints ?? [];
    (m.getSource("route") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: [
        ...(pts.length > 1 ? [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: pts } }] : []),
        ...pts.map((p) => ({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: p } })),
      ],
    } as never);
  }, [ready, props.routePoints]);

  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    m.setLayoutProperty("carto", "visibility", basemap ? "visible" : "none");
  }, [ready, basemap]);

  // ------------------------------------------------------------ camera
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    if (props.fitTo) {
      m.fitBounds(props.fitTo as LngLatBoundsLike, { padding: 40, duration: 700, maxZoom: 12.5 });
      return;
    }
    if (props.selectedDistrict && districtMode === "drill") {
      const f = DISTRICT_GEO.features.find((x) => x.properties.id === props.selectedDistrict);
      if (f) m.fitBounds(bbox(f) as LngLatBoundsLike, { padding: 40, duration: 700, maxZoom: 11 });
    } else if (props.selectedGov && districtMode === "drill") {
      const f = GOVERNORATE_GEO.features.find((x) => x.properties.id === props.selectedGov);
      if (f) m.fitBounds(bbox(f) as LngLatBoundsLike, { padding: 36, duration: 700, maxZoom: 10 });
    } else {
      m.fitBounds(JORDAN_BOUNDS as LngLatBoundsLike, { padding: FIT_PADDING, duration: 700 });
    }
  }, [ready, props.selectedGov, props.selectedDistrict, districtMode, props.fitTo]);

  // ------------------------------------------------------------ labels (HTML so Arabic shapes correctly offline)
  const { selectedGov, govValues: labelValues, format: labelFormat, tooltipExtra, districtValues: tipDistrictValues, eaPoints: tipEaPoints } = props;
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    markers.current.forEach((mk) => mk.remove());
    markers.current = [];
    if (!showLabels) return;
    const add = (lng: number, lat: number, html: string, small = false) => {
      const el = document.createElement("div");
      el.className = `map-label${small ? " small" : ""}`;
      el.innerHTML = html;
      markers.current.push(new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(m));
    };
    if (showDistricts && districtMode === "drill" && selectedGov) {
      for (const d of DISTRICT_GEO.features.filter((x) => x.properties.govId === selectedGov)) add(d.properties.labelLng, d.properties.labelLat, ar ? d.properties.nameAr : d.properties.nameEn, true);
    } else {
      for (const g of GOVERNORATE_GEO.features) {
        add(g.properties.labelLng, g.properties.labelLat, ar ? g.properties.nameAr : g.properties.nameEn, g.properties.areaKm2 < 1500);
      }
    }
  }, [ready, showLabels, ar, selectedGov, showDistricts, districtMode]);

  // ------------------------------------------------------------ tooltip content
  const tip = useMemo(() => {
    if (!hover) return null;
    if (hover.kind === "gov") {
      const g = GOVERNORATE_GEO.features.find((x) => x.properties.id === hover.id)?.properties;
      if (!g) return null;
      const v = labelValues?.[g.id];
      return { title: ar ? g.nameAr : g.nameEn, sub: L(`Capital: ${g.capitalEn}`, `المركز: ${g.capitalAr}`), value: v !== undefined && labelFormat ? labelFormat(v) : undefined, extra: tooltipExtra?.("gov", g.id) };
    }
    if (hover.kind === "district") {
      const d = DISTRICT_GEO.features.find((x) => x.properties.id === hover.id)?.properties;
      if (!d) return null;
      const v = tipDistrictValues?.[d.id];
      const gov = GOVERNORATE_GEO.features.find((x) => x.properties.id === d.govId)!.properties;
      return { title: ar ? d.nameAr : d.nameEn, sub: `${ar ? gov.nameAr : gov.nameEn} · ${d.id}`, value: v !== undefined && labelFormat ? labelFormat(v) : undefined, extra: tooltipExtra?.("district", d.id) };
    }
    const p = tipEaPoints?.find((x) => x.id === hover.id);
    return { title: `${t("ea")} ${hover.id}`, sub: p?.label, value: undefined, extra: null };
  }, [hover, labelValues, tipDistrictValues, tipEaPoints, labelFormat, tooltipExtra, ar, L, t]);

  const reset = () => {
    props.onSelectGov?.(null);
    props.onSelectDistrict?.(null);
    map.current?.fitBounds(JORDAN_BOUNDS as LngLatBoundsLike, { padding: FIT_PADDING, duration: 600 });
  };

  const breaksLabels = activeClass.breaks;
  const fmt = props.format ?? ((v: number) => String(Math.round(v)));

  return (
    <div className={cn("relative overflow-hidden rounded-lg border border-line bg-[#e8e3d7]", props.className)} style={{ height: typeof height === "number" ? `min(${height}px, 78vh)` : height }}>
      <div ref={container} style={{ position: "absolute", inset: 0 }} dir="ltr" />
      {/* top bar */}
      <div className="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between gap-2">
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
          {props.title ? <div className="rounded-md bg-card/95 px-2.5 py-1.5 text-[12px] font-semibold text-ink-900 shadow-sm">{props.title}</div> : null}
          {props.layers && props.onLayerChange ? (
            <label className="flex items-center gap-1.5 rounded-md bg-card/95 px-2 py-1 shadow-sm">
              <Layers size={13} className="text-ink-500" />
              <span className="sr-only">{t("mapLayer")}</span>
              <select value={props.layer} onChange={(e) => props.onLayerChange!(e.target.value)} className="bg-transparent text-[12px] font-medium text-ink-900 focus:outline-none">
                {props.layers.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </label>
          ) : null}
        </div>
        <div className="pointer-events-auto flex items-center gap-1">
          <button type="button" onClick={() => setShowLabels((s) => !s)} className={cn("rounded-md px-2 py-1 text-[11.5px] font-medium shadow-sm", showLabels ? "bg-navy-800 text-white" : "bg-card/95 text-ink-700")}>{t("showLabels")}</button>
          {isHosted() ? null : <button type="button" onClick={() => setBasemap((s) => !s)} title={L("Online context basemap (requires internet)", "خريطة أساس سياقية (تتطلب اتصالاً بالإنترنت)")} className={cn("rounded-md px-2 py-1 text-[11.5px] font-medium shadow-sm", basemap ? "bg-navy-800 text-white" : "bg-card/95 text-ink-700")}>{L("Basemap", "خريطة أساس")}</button>}
          <button type="button" onClick={reset} className="flex items-center gap-1 rounded-md bg-card/95 px-2 py-1 text-[11.5px] font-medium text-ink-700 shadow-sm hover:text-ink-900"><RotateCcw size={12} />{t("resetView")}</button>
          {props.sources ? <span className="rounded-md bg-card/95 p-0.5 shadow-sm"><ProvenanceButton ids={props.sources} /></span> : null}
        </div>
      </div>
      {/* legend */}
      {(props.govValues || props.districtValues || props.eaLegend) && (
        <div className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-card/95 px-2.5 py-2 shadow-sm">
          {props.legendTitle && (props.govValues || props.districtValues) ? <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-ink-500">{props.legendTitle}</div> : null}
          {props.govValues || props.districtValues ? (
            <div className="flex items-end gap-0.5" dir="ltr">
              {activeClass.colors.map((c, i) => (
                <div key={c} className="flex flex-col items-center">
                  <div className="h-2.5 w-5 sm:w-7" style={{ background: c, borderRadius: i === 0 ? "3px 0 0 3px" : i === activeClass.colors.length - 1 ? "0 3px 3px 0" : 0 }} />
                </div>
              ))}
            </div>
          ) : null}
          {props.govValues || props.districtValues ? (
            <div className="mt-0.5 flex justify-between gap-2 text-[9.5px] text-ink-500 tabular" dir="ltr">
              <span>{breaksLabels.length ? `< ${fmt(breaksLabels[0])}` : ""}</span>
              <span>{breaksLabels.length ? `≥ ${fmt(breaksLabels[breaksLabels.length - 1])}` : ""}</span>
            </div>
          ) : null}
          {props.eaLegend ? (
            <div className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-1">
              {props.eaLegend.map((l) => (
                <span key={l.label} className="flex items-center gap-1 text-[10.5px] text-ink-700"><span className="h-2 w-2 rounded-full" style={{ background: l.color }} />{l.label}</span>
              ))}
            </div>
          ) : null}
        </div>
      )}
      {!props.selectedGov && props.onSelectGov && districtMode === "drill" ? (
        <div className="pointer-events-none absolute bottom-9 right-2 hidden items-center gap-1 sm:flex rounded-md bg-navy-900/85 px-2 py-1 text-[11px] text-white"><Maximize2 size={11} />{t("clickToDrill")}</div>
      ) : null}
      {/* tooltip */}
      {hover && tip ? (
        <div className="pointer-events-none absolute z-10 max-w-[260px] rounded-md border border-line bg-card px-2.5 py-1.5 shadow-lg" style={{ left: Math.max(4, Math.min(hover.x + 14, hover.w - 264)), top: hover.y + 14 }}>
          <div className="text-[12.5px] font-semibold text-ink-900">{tip.title}</div>
          {tip.sub ? <div className="text-[11px] text-ink-500">{tip.sub}</div> : null}
          {tip.value ? <div className="mt-0.5 text-[12px] font-semibold text-navy-700 tabular">{props.legendTitle}: {tip.value}</div> : null}
          {tip.extra ? <div className="mt-1 border-t border-line pt-1 text-[11.5px] text-ink-700">{tip.extra}</div> : null}
        </div>
      ) : null}
      {/* accessible name for screen readers */}
      <span className="sr-only">{tx({ en: "Interactive map of Jordan", ar: "خريطة تفاعلية للأردن" })}</span>
    </div>
  );
}
