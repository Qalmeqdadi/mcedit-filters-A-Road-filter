// What one actor may see of the network. Nothing here decides visibility itself:
// every lane, rate, shipment, leg and job goes through the 12.2 policy, so the map
// each persona sees is exactly the permission matrix in config/rulesets/permissions.json.
import { user, type Actor } from "../governance/actor";
import type { Policy, ResourceRef } from "../governance/policy";
import { HUBS, type Hub } from "./hubs";
import { JOBS, LANES, PANELS, PARTIES, SHIPMENTS, type Job, type Lane, type Leg, type NetworkParty, type Shipment } from "./scenario";

export interface VisibleLane extends Omit<Lane, "rateDesks"> {
  /** The negotiated rate this actor may see, if any (3.5.1). Carriers see the rates they gave each desk. */
  rates: { deskOrgId: string; amount: number; currency: string }[];
}

export interface VisibleShipment extends Omit<Shipment, "legs"> {
  /** Empty when the actor may read the shipment but not its legs. */
  legs: Leg[];
  /** The main leg's lane and progress, for drawing a shipment without its legs. */
  main: { laneId?: string; progress: number };
}

export interface NetworkView {
  actor: Actor;
  hubs: readonly Hub[];
  lanes: VisibleLane[];
  shipments: VisibleShipment[];
  jobs: Job[];
  parties: NetworkParty[];
  /** Permission decisions behind the view, for the "why can't I see this" panel and the audit trail. */
  checks: { allowed: number; denied: number; policyVersion: string };
}

const laneRef = (actor: Actor, l: Lane): ResourceRef => ({
  type: "schedule",
  id: l.id,
  // A desk sees a lane when the carrier is on its panel; carriers see their own.
  deskOrgId: actor.orgId && PANELS[actor.orgId]?.includes(l.carrierOrgId) ? actor.orgId : null,
  carrierOrgId: l.carrierOrgId,
});

const rateRef = (l: Lane, r: Lane["rateDesks"][number]): ResourceRef => ({
  type: "rate",
  id: `${l.id}:${r.deskOrgId}`,
  deskOrgId: r.deskOrgId,
  carrierOrgId: l.carrierOrgId,
});

const shipmentRef = (s: Shipment): ResourceRef => ({ type: "shipment", id: s.id, deskOrgId: s.deskOrgId, shipperOrgId: s.shipperOrgId, carrierOrgId: s.carrierOrgId, attrs: { status: s.status } });
const legRef = (s: Shipment, g: Leg): ResourceRef => ({ type: "leg", id: `${s.id}/${g.seq}`, deskOrgId: s.deskOrgId, shipperOrgId: s.shipperOrgId, carrierOrgId: g.carrierOrgId });
const jobRef = (j: Job): ResourceRef => ({ type: "job", id: j.id, deskOrgId: j.deskOrgId, partnerOrgId: j.partnerOrgId, attrs: { status: j.status } });

export function networkFor(actor: Actor, policy: Policy): NetworkView {
  let allowed = 0;
  let denied = 0;
  const can = (r: ResourceRef) => {
    const d = policy.can(actor, "read", r);
    if (d.allowed) allowed++;
    else denied++;
    return d.allowed;
  };

  const lanes: VisibleLane[] = [];
  for (const l of LANES) {
    if (!can(laneRef(actor, l))) continue;
    const { rateDesks, ...rest } = l;
    const rates = rateDesks.flatMap((r) => {
      const ref = rateRef(l, r);
      const v = policy.readable(actor, ref, { ...r });
      return v && typeof v.amount === "number" ? [{ deskOrgId: r.deskOrgId, amount: v.amount, currency: r.currency }] : [];
    });
    lanes.push({ ...rest, rates });
  }

  const shipments: VisibleShipment[] = [];
  for (const s of SHIPMENTS) {
    if (!can(shipmentRef(s))) continue;
    const legs = s.legs.filter((g) => can(legRef(s, g)));
    const main = s.legs.find((g) => g.carrierOrgId === s.carrierOrgId) ?? s.legs[0];
    shipments.push({ ...s, legs, main: { laneId: main?.laneId, progress: main?.progress ?? 0 } });
  }

  const jobs = JOBS.filter((j) => can(jobRef(j)));

  const seen = new Set<string>(actor.orgId ? [actor.orgId] : []);
  for (const l of lanes) seen.add(l.carrierOrgId);
  for (const s of shipments) [s.deskOrgId, s.shipperOrgId, s.carrierOrgId, ...s.legs.map((g) => g.carrierOrgId)].forEach((id) => seen.add(id));
  for (const j of jobs) [j.deskOrgId, j.partnerOrgId].forEach((id) => seen.add(id));
  const parties = PARTIES.filter((p) => seen.has(p.id));

  return { actor, hubs: HUBS, lanes, shipments, jobs, parties, checks: { allowed, denied, policyVersion: policy.version } };
}

/** Signed-in personas for the pilot network, one per party that has a workspace. */
export const NETWORK_ACTORS = {
  gulfwayAgent: user("u-gw-omar", "desk_agent", "desk-gulfway"),
  northseaAgent: user("u-ns-eva", "desk_agent", "desk-northsea"),
  alNoor: user("u-an-sara", "shipper_user", "shp-alnoor"),
  nordlicht: user("u-nh-jonas", "shipper_user", "shp-nordlicht"),
  oceanlink: user("u-ol-lin", "carrier_user", "car-oceanlink"),
  falcon: user("u-fa-hana", "carrier_user", "car-falcon"),
  sahm: user("u-so-rania", "carrier_user", "car-sahm"),
  eastrail: user("u-er-faisal", "carrier_user", "car-eastrail"),
  alSafa: user("u-as-amal", "partner_user", "ptn-alsafa"),
} as const;
