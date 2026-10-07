// What the map draws for the current lens: the network view the real policy returns for that
// person, turned into paths. Nothing is filtered here for privacy; that already happened in networkFor.
import { hub, type Hub, type HubKind } from "@fo/network/hubs";
import { MODE_PROFILES, type ModeFamily } from "@fo/network/modes";
import { LANES, party } from "@fo/network/scenario";
import type { NetworkView, VisibleLane, VisibleShipment } from "@fo/network/view";
import { useMemo } from "react";
import { viewFor } from "../live/engine";
import type { Theme } from "../scene/palette";
import { useStore, type Family } from "../store";
import { along, pathFor, type LL, type Path } from "./routes";

export const FAMILY_COLORS: Record<Theme, Record<ModeFamily, string>> = {
  light: { sea: "#1f5f8b", air: "#7a4fa3", rail: "#13837a", road: "#c98a00" },
  dark: { sea: "#6aa7d8", air: "#b393dc", rail: "#4db9ae", road: "#f5c12e" },
};
export const KIND_FAMILY: Record<HubKind, ModeFamily> = { port: "sea", airport: "air", rail: "rail", truck: "road" };
export const FAMILY_LABEL: Record<Family, string> = { sea: "Sea", air: "Air", rail: "Rail", road: "Road" };

export interface DrawLane {
  lane: VisibleLane;
  family: ModeFamily;
  path: Path;
}

export interface DrawShipment {
  s: VisibleShipment;
  /** Paths of the legs this person may see (or the main lane for a carrier). */
  paths: Path[];
  at: LL;
  alt: number;
  family: ModeFamily;
  /** Which leg is moving, for the label. */
  legLabel: string;
}

export interface MapModel {
  view: NetworkView;
  lanes: DrawLane[];
  shipments: DrawShipment[];
  hubs: Hub[];
  /** Lanes hidden by the mode filter, so the panel can say so. */
  filteredOut: number;
}

const laneById = new Map(LANES.map((l) => [l.id, l]));

function shipmentPaths(s: VisibleShipment, visible: Map<string, VisibleLane>): Pick<DrawShipment, "paths" | "at" | "alt" | "family" | "legLabel"> {
  if (s.legs.length) {
    const paths = s.legs.map((g) => {
      // Leg geometry: the lane's calls when the person may see that lane, otherwise straight from hub to hub.
      const lane = g.laneId ? visible.get(g.laneId) : undefined;
      return pathFor(g.mode, lane ? [lane.from, ...lane.via, lane.to] : [g.from, g.to]);
    });
    const i = Math.max(0, s.legs.findIndex((g) => g.progress < 1));
    const g = s.legs[i]!;
    const p = along(paths[i]!, g.progress);
    return { paths, at: p.at, alt: p.alt, family: paths[i]!.family, legLabel: `${MODE_PROFILES[g.mode].label} ${hub(g.from).city} → ${hub(g.to).city}` };
  }
  const lane = s.main.laneId ? visible.get(s.main.laneId) ?? laneById.get(s.main.laneId) : undefined;
  if (!lane) return { paths: [], at: [0, 0], alt: 0, family: "sea", legLabel: "" };
  const path = pathFor(lane.mode, [lane.from, ...lane.via, lane.to]);
  const p = along(path, s.main.progress);
  return { paths: [path], at: p.at, alt: p.alt, family: path.family, legLabel: `${MODE_PROFILES[lane.mode].label} ${hub(lane.from).city} → ${hub(lane.to).city}` };
}

export function useMapModel(): MapModel {
  const lens = useStore((s) => s.lens);
  const modes = useStore((s) => s.modes);
  return useMemo(() => {
    const view = viewFor(lens);
    const visible = new Map(view.lanes.map((l) => [l.id, l]));
    const all = view.lanes.map((lane) => ({ lane, path: pathFor(lane.mode, [lane.from, ...lane.via, lane.to]) }));
    const lanes = all.filter((x) => modes[x.path.family]).map((x) => ({ ...x, family: x.path.family }));
    const shipments = view.shipments.map((s) => ({ s, ...shipmentPaths(s, visible) })).filter((x) => x.paths.length);
    const codes = new Set<string>();
    for (const l of lanes) [l.lane.from, ...l.lane.via, l.lane.to].forEach((c) => codes.add(c));
    for (const s of view.shipments) s.legs.forEach((g) => [g.from, g.to].forEach((c) => codes.add(c)));
    for (const j of view.jobs) codes.add(j.hub);
    for (const p of view.parties) for (const site of p.sites) codes.add(site.hub);
    return { view, lanes, shipments, hubs: [...codes].map(hub), filteredOut: all.length - lanes.length };
  }, [lens, modes]);
}

export const orgName = (id: string) => party(id).name;
export const orgShort = (id: string) => party(id).short;
