// DOM labels and controls laid over the globe: regions, hubs, shipments, sites, jobs, the picked
// lane, and the globe/flat and mode switches.
import { hub, type Region } from "@fo/network/hubs";
import { MODE_PROFILES } from "@fo/network/modes";
import { Globe2, Map as MapIcon, Plane, Ship, TrainFront, Truck } from "lucide-react";
import type { ReactNode } from "react";
import { useStore, type Family, type View } from "../store";
import { FAMILY_LABEL, orgName, useMapModel } from "./model";
import { along, frame } from "./routes";
import { REGIONS, flyTo, flyToFit, globeLabels } from "./state";

export const FAMILY_ICON: Record<Family, ReactNode> = { sea: <Ship size={13} />, air: <Plane size={13} />, rail: <TrainFront size={13} />, road: <Truck size={13} /> };

/** Sites that open a board in the regional view. */
const SITE_BOARD: Record<string, View> = { "desk-gulfway": "dash", "shp-alnoor": "sh_home", "car-oceanlink": "c_home", "ptn-alsafa": "p_jobs" };

interface Spec {
  id: string;
  lat: number;
  lon: number;
  alt?: number;
  kind?: "place" | "chip" | "alert" | "big";
  tone?: string;
  /** Shown only while the camera is closer than this (globe radii). */
  maxDist?: number;
  minDist?: number;
  /** Higher wins when labels would overlap. */
  prio?: number;
  onClick?: () => void;
  children: ReactNode;
}

function useSpecs(): Spec[] {
  const model = useMapModel();
  const st = useStore();
  const { pick, enquiry } = st;
  const out: Spec[] = [];

  // regions, at globe scale
  const regionCount = new Map<Region, number>();
  for (const h of model.hubs) regionCount.set(h.region, (regionCount.get(h.region) ?? 0) + 1);
  for (const [k, r] of Object.entries(REGIONS) as [Region | "world", (typeof REGIONS)["gcc"]][]) {
    if (k === "world" || !regionCount.get(k)) continue;
    out.push({
      id: `region:${k}`, lat: r.at[0], lon: r.at[1], kind: "place", minDist: 2.6, prio: 20,
      onClick: () => {
        st.set({ pick: { kind: "region", id: k } });
        flyTo(r.at[0], r.at[1], r.dist);
      },
      children: <>{r.label}</>,
    });
  }

  // hubs, when close
  const hot = new Set<string>();
  if (pick?.kind === "hub") hot.add(pick.id);
  if (pick?.kind === "lane") {
    const l = model.lanes.find((x) => x.lane.id === pick.id);
    if (l) [l.lane.from, ...l.lane.via, l.lane.to].forEach((c) => hot.add(c));
  }
  if (enquiry) [enquiry.from, enquiry.to].forEach((c) => hot.add(c));
  for (const h of model.hubs) {
    out.push({
      id: `hub:${h.code}`, lat: h.lat, lon: h.lon, alt: 0.004, kind: "place", maxDist: hot.has(h.code) ? undefined : 1.75, prio: hot.has(h.code) ? 35 : 12,
      onClick: () => st.set({ pick: { kind: "hub", id: h.code } }),
      children: <span className={`hubtag k-${h.kind}`}>{h.code} <i>{h.name}</i></span>,
    });
  }

  // shipments
  for (const s of model.shipments) {
    const sel = pick?.kind === "shipment" && pick.id === s.s.id;
    out.push({
      id: `ship:${s.s.id}`, lat: s.at[0], lon: s.at[1], alt: s.alt + 0.01, kind: s.s.exception ? "alert" : "chip",
      tone: s.s.exception ? (s.s.exception.kind === "delay" ? "signal" : "red") : sel ? "signal" : undefined, maxDist: sel ? undefined : s.s.exception ? 4.4 : 3.2,
      onClick: () => {
        st.set({ pick: { kind: "shipment", id: s.s.id } });
        const f = frame(s.paths.flatMap((p) => p.points));
        flyToFit(f.center, f.radius);
      },
      children: <><b className="row-i">{FAMILY_ICON[s.family]} {s.s.id}</b><span>{s.s.exception ? s.s.exception.text.split(/[,;]/)[0] : `ETA ${s.s.eta}`}</span></>,
    });
  }

  // party sites, close up
  for (const p of model.view.parties) {
    for (const site of p.sites) {
      const board = SITE_BOARD[p.id];
      out.push({
        id: `site:${p.id}:${site.label}`, lat: site.lat, lon: site.lon, alt: 0.006, kind: "chip", maxDist: 1.42, tone: board ? "teal" : undefined,
        onClick: board ? () => st.open(board) : undefined,
        children: <><b>{p.name}</b><span>{site.label}{board ? " · open board" : ""}</span></>,
      });
    }
  }

  // partner jobs, for the partner (desks see them in the shipment)
  for (const j of model.lanes.length ? [] : model.view.jobs) {
    const h = hub(j.hub);
    out.push({ id: `job:${j.id}`, lat: h.lat, lon: h.lon, alt: 0.01, kind: "chip", tone: j.status === "offered" ? "purple" : undefined, children: <><b>{j.service}</b><span>{j.shipmentId} · USD {j.fee}</span></> });
  }

  // the picked lane
  if (pick?.kind === "lane") {
    const l = model.lanes.find((x) => x.lane.id === pick.id);
    if (l) {
      const mid = along(l.path, 0.5);
      const prof = MODE_PROFILES[l.lane.mode];
      out.push({
        id: `lane:${l.lane.id}`, lat: mid.at[0], lon: mid.at[1], alt: mid.alt + 0.01, kind: "big", tone: "signal",
        children: <><b className="row-i">{FAMILY_ICON[l.family]} {orgName(l.lane.carrierOrgId)} · {l.lane.service}</b><span>{l.lane.transitDays} d · {l.lane.perWeek}×/wk · {l.lane.freeUnits.toLocaleString()} {prof.unitLabel} free</span></>,
      });
    }
  }

  if (enquiry) {
    const a = hub(enquiry.from), b = hub(enquiry.to);
    out.push({ id: "enq:from", lat: a.lat, lon: a.lon, alt: 0.02, kind: "alert", tone: "signal", children: <><b>{enquiry.label}</b><span>from {a.city}</span></> });
    out.push({ id: "enq:to", lat: b.lat, lon: b.lon, alt: 0.02, kind: "chip", tone: "signal", children: <><b>to {b.city}</b><span>{b.name}</span></> });
  }
  return out;
}

function Label({ s }: { s: Spec }) {
  const Tag = s.onClick ? "button" : "div";
  return (
    <Tag
      ref={(el: HTMLElement | null) => {
        if (el) globeLabels.set(s.id, el);
        else globeLabels.delete(s.id);
      }}
      type={s.onClick ? "button" : undefined}
      onClick={s.onClick}
      data-lat={s.lat}
      data-lon={s.lon}
      data-alt={s.alt ?? 0}
      data-maxdist={s.maxDist}
      data-mindist={s.minDist}
      data-prio={s.prio ?? { big: 50, alert: 40, chip: 30, place: 10 }[s.kind ?? "chip"]}
      className={`wl wl-${s.kind ?? "chip"}${s.tone ? " t-" + s.tone : ""}`}
      style={{ visibility: "hidden" }}
    >
      {s.children}
    </Tag>
  );
}

export function GlobeLabels() {
  const specs = useSpecs();
  return (
    <div className="wlabels" aria-hidden>
      {specs.map((s) => <Label key={s.id} s={s} />)}
    </div>
  );
}

export function GlobeTools() {
  const flat = useStore((s) => s.flat);
  const modes = useStore((s) => s.modes);
  const set = useStore((s) => s.set);
  const model = useMapModel();
  const counts: Record<Family, number> = { sea: 0, air: 0, rail: 0, road: 0 };
  for (const l of model.view.lanes) counts[({ ocean_fcl: "sea", ocean_lcl: "sea", air: "air", rail: "rail", road: "road" } as const)[l.mode]]++;
  return (
    <div className="gtools" role="group" aria-label="Map options">
      <div className="gseg" role="group" aria-label="Projection">
        <button type="button" aria-pressed={!flat} onClick={() => set({ flat: false })}><Globe2 size={14} /> Globe</button>
        <button type="button" aria-pressed={flat} onClick={() => set({ flat: true })}><MapIcon size={14} /> Flat</button>
      </div>
      <div className="gseg modes" role="group" aria-label="Transport modes">
        {(Object.keys(FAMILY_LABEL) as Family[]).map((f) => (
          <button key={f} type="button" className={`m-${f}`} aria-pressed={modes[f]} disabled={!counts[f]} title={counts[f] ? `${counts[f]} ${FAMILY_LABEL[f].toLowerCase()} lanes` : "None in this view"} onClick={() => set({ modes: { ...modes, [f]: !modes[f] } })}>
            {FAMILY_ICON[f]} {FAMILY_LABEL[f]} <span className="n">{counts[f]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
