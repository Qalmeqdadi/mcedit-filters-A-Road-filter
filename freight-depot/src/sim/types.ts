// Shared objects for the carrier module. Names follow the process map:
// capacity slot, booking, hold, request (RFQ), event.

export type LaneId = "AUH" | "MCT" | "RUH" | "DMM" | "DOH" | "KWI";

export type TrailerType = "curtain" | "box" | "reefer";

export interface Lane {
  id: LaneId;
  city: string;
  country: string;
  via: string; // border crossing or route
  km: number;
  transitH: number;
  benchmark: number; // anonymised lane index, AED per pallet (3.5.2 / 11.2)
  restriction?: string; // 2.3.4 embargoes, weight limits, commodity restrictions
}

/** A unit of space on a departure: booked (confirmed) or held (soft hold while a quote is live). */
export interface Allocation {
  id: string;
  ref: string; // booking ref or hold ref
  desk: string; // forwarder desk that owns it
  pallets: number;
  weightKg: number;
  commodity: string;
  dgClass?: string;
  ratePerPallet: number;
}

export type HoldState = "live" | "converted" | "released" | "expired";

export interface Hold extends Allocation {
  rfqId?: string;
  createdAt: number;
  expiresAt: number;
  state: HoldState;
}

export type DepartureStatus = "planned" | "inbound" | "open" | "closed" | "departed";

export interface Departure {
  id: string;
  lane: LaneId;
  dock: number | null; // 1..6 once the trailer is positioned
  trailer: TrailerType;
  slots: number; // euro pallet positions, 33 on a 13.6 m trailer
  payloadKg: number;
  departsAt: number; // planned, sim minutes
  delayMin: number; // 2.2.3 service change
  delayReason?: string;
  dgAllowed: boolean;
  tempRange?: [number, number];
  status: DepartureStatus;
  positionedAt?: number; // when the trailer reaches the dock
  departedAt?: number;
  stopSell: boolean;
  bookings: Allocation[];
  holds: Hold[];
}

export type Channel = "API" | "EDI" | "Portal" | "Email";

export type RfqState = "new" | "replied" | "won" | "lost" | "expired" | "declined";

export interface Rfq {
  id: string;
  desk: string;
  channel: Channel;
  lane: LaneId;
  receivedAt: number;
  replyBy: number; // 4.1.4 tied to cut-off, not office hours
  readyAt: number;
  deliverBy: number;
  pallets: number;
  weightKg: number;
  commodity: string;
  hs: string;
  dgClass?: string;
  un?: string;
  tempRange?: [number, number];
  targetRate?: number;
  state: RfqState;
  reply?: { departureId: string; ratePerPallet: number; holdId: string; winChance: number; decisionAt: number };
  outcome?: string; // 4.8.4 win or loss with the reason
}

export type FeedStatus = "fresh" | "lagging" | "stale";

export interface Feed {
  id: string;
  name: string;
  channel: Channel;
  cadenceMin: number;
  lastUpdate: number;
  failing: boolean; // simulated outage
  fallback: boolean; // 2.5.2 fell back to portal or email
}

export type EventKind = "rfq" | "hold" | "booking" | "departure" | "service" | "feed";

export interface LogEvent {
  id: string;
  t: number;
  kind: EventKind;
  address: string; // process address, e.g. 2.4.2
  text: string;
}

export type Selection = { kind: "departure"; id: string } | { kind: "rfq"; id: string } | null;

export interface Check {
  id: string;
  address: string;
  label: string;
  ok: boolean;
  detail: string;
}
