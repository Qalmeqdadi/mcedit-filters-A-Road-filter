// Synthetic seed data. Carrier, desks, people and figures are fictional.
import type { Allocation, Departure, Feed, Hold, Lane, LaneId, Rfq, TrailerType } from "./types";

export const CARRIER = {
  name: "Sahm Overland",
  site: "Jebel Ali Linehaul Depot",
  docks: 6,
  user: { name: "Rania Haddad", role: "Capacity manager", initials: "RH" },
};

/** Sim clock: minutes since 00:00 on Sunday 4 October 2026, Gulf Standard Time. */
export const START_MIN = 6 * 60 + 5;
export const DAY0 = new Date(Date.UTC(2026, 9, 4));

export const LANES: Record<LaneId, Lane> = {
  AUH: { id: "AUH", city: "Abu Dhabi", country: "UAE", via: "E11 domestic", km: 160, transitH: 2.5, benchmark: 95 },
  MCT: {
    id: "MCT", city: "Muscat", country: "Oman", via: "Hatta crossing", km: 470, transitH: 9, benchmark: 265,
    restriction: "Hatta crossing: no DG class 1, 40 t gross limit",
  },
  RUH: {
    id: "RUH", city: "Riyadh", country: "KSA", via: "Al Ghuwaifat · Batha", km: 1010, transitH: 30, benchmark: 520,
    restriction: "Saudi axle limit 13 t per drive axle",
  },
  DMM: { id: "DMM", city: "Dammam", country: "KSA", via: "Al Ghuwaifat · Batha", km: 780, transitH: 22, benchmark: 430 },
  DOH: { id: "DOH", city: "Doha", country: "Qatar", via: "Batha · Salwa", km: 700, transitH: 20, benchmark: 410 },
  KWI: {
    id: "KWI", city: "Kuwait City", country: "Kuwait", via: "Batha · Khafji", km: 1150, transitH: 40, benchmark: 640,
    restriction: "Khafji transit: sealed trailers only",
  },
};

export const LANE_ORDER: LaneId[] = ["AUH", "MCT", "RUH", "DMM", "DOH", "KWI"];

export const DESKS = ["Meridian Forwarding", "Bluefin Logistics", "Oasis Freight Desk", "Tallis Cargo", "Northgate Forwarders"];

export interface Commodity {
  name: string;
  hs: string;
  kgPerPallet: number;
  dgClass?: string;
  un?: string;
  tempRange?: [number, number];
}

export const COMMODITIES: Commodity[] = [
  { name: "Ceramic tiles", hs: "6907.21", kgPerPallet: 950 },
  { name: "Packaged snacks", hs: "1905.90", kgPerPallet: 420 },
  { name: "Auto spare parts", hs: "8708.99", kgPerPallet: 610 },
  { name: "Garments", hs: "6203.42", kgPerPallet: 260 },
  { name: "Laptops and monitors", hs: "8471.30", kgPerPallet: 340 },
  { name: "Paint, flammable", hs: "3208.10", kgPerPallet: 720, dgClass: "3", un: "UN1263" },
  { name: "Lithium-ion batteries", hs: "8507.60", kgPerPallet: 520, dgClass: "9", un: "UN3480" },
  { name: "Cleaning chemicals, corrosive", hs: "3402.50", kgPerPallet: 800, dgClass: "8", un: "UN1760" },
  { name: "Pool chlorine, oxidiser", hs: "2828.10", kgPerPallet: 760, dgClass: "5.1", un: "UN2880" },
  { name: "Fresh dairy", hs: "0403.20", kgPerPallet: 650, tempRange: [2, 8] },
  { name: "Vaccines", hs: "3002.41", kgPerPallet: 280, tempRange: [2, 8] },
  { name: "Frozen poultry", hs: "0207.14", kgPerPallet: 700, tempRange: [-20, -18] },
];

export const commodity = (name: string) => COMMODITIES.find((c) => c.name === name)!;

/** Pairs that may not share a trailer (simplified segregation table, 4.4.3). */
export const DG_INCOMPATIBLE: [string, string][] = [
  ["3", "5.1"],
  ["8", "5.1"],
  ["9", "5.1"],
];

export const TRAILERS: Record<TrailerType, { label: string; slots: number; payloadKg: number }> = {
  curtain: { label: "Curtainsider 13.6 m", slots: 33, payloadKg: 24000 },
  box: { label: "Box trailer 13.6 m, sealable", slots: 33, payloadKg: 23500 },
  reefer: { label: "Reefer 13.6 m", slots: 33, payloadKg: 22000 },
};

let seq = 4100;
export const nextId = (prefix: string) => `${prefix}-${++seq}`;

export function alloc(desk: string, pallets: number, name: string, rate: number, ref?: string): Allocation {
  const c = commodity(name);
  return {
    id: nextId("AL"),
    ref: ref ?? nextId("BKG"),
    desk,
    pallets,
    weightKg: Math.round(pallets * c.kgPerPallet),
    commodity: c.name,
    dgClass: c.dgClass,
    ratePerPallet: rate,
  };
}

function dep(
  lane: LaneId, dock: number | null, trailer: TrailerType, departsAt: number, bookings: Allocation[],
  extra: Partial<Departure> = {},
): Departure {
  const t = TRAILERS[trailer];
  return {
    id: `DEP-${lane}-${String(Math.floor(departsAt / 60) % 24).padStart(2, "0")}${String(departsAt % 60).padStart(2, "0")}-${Math.floor(departsAt / 1440) + 4}`,
    lane, dock, trailer, slots: t.slots, payloadKg: t.payloadKg, departsAt, delayMin: 0,
    dgAllowed: trailer !== "reefer", status: dock ? "open" : "planned", stopSell: false, bookings, holds: [],
    ...extra,
  };
}

const h = (hh: number, mm = 0) => hh * 60 + mm;

function hold(a: Allocation, createdAt: number, expiresAt: number, rfqId?: string): Hold {
  return { ...a, ref: nextId("HLD"), createdAt, expiresAt, state: "live", rfqId };
}

export function seedDepartures(): Departure[] {
  const d1 = dep("AUH", 1, "curtain", h(7, 20), [
    alloc("Tallis Cargo", 9, "Packaged snacks", 92),
    alloc("Meridian Forwarding", 8, "Garments", 98),
    alloc("Northgate Forwarders", 5, "Laptops and monitors", 104),
  ]);
  d1.holds.push(hold(alloc("Oasis Freight Desk", 4, "Auto spare parts", 96), START_MIN - 40, START_MIN + 22));

  const d2 = dep("MCT", 2, "box", h(8, 40), [
    alloc("Bluefin Logistics", 10, "Ceramic tiles", 255),
    alloc("Oasis Freight Desk", 7, "Packaged snacks", 270),
  ]);
  d2.holds.push(hold(alloc("Meridian Forwarding", 6, "Laptops and monitors", 262), START_MIN - 30, START_MIN + 70, "RFQ-4090"));

  const d3 = dep("RUH", 3, "curtain", h(10, 30), [
    alloc("Meridian Forwarding", 12, "Ceramic tiles", 505),
    alloc("Northgate Forwarders", 9, "Auto spare parts", 530),
    alloc("Tallis Cargo", 6, "Garments", 540),
  ]);
  d3.holds.push(hold(alloc("Bluefin Logistics", 3, "Packaged snacks", 525), START_MIN - 15, START_MIN + 55));

  const d4 = dep("DMM", 4, "reefer", h(12, 15), [
    alloc("Bluefin Logistics", 8, "Fresh dairy", 470),
    alloc("Oasis Freight Desk", 4, "Vaccines", 520),
  ], { tempRange: [2, 8] });

  const d5 = dep("DOH", 5, "curtain", h(14, 0), [
    alloc("Tallis Cargo", 5, "Paint, flammable", 440),
    alloc("Meridian Forwarding", 4, "Garments", 405),
  ]);

  const d6 = dep("KWI", 6, "box", h(17, 30), [
    alloc("Northgate Forwarders", 9, "Auto spare parts", 625),
    alloc("Oasis Freight Desk", 6, "Laptops and monitors", 660),
  ], { delayMin: 240, delayReason: "Batha border congestion, queue 9 h" });

  const tomorrow = [
    dep("AUH", null, "curtain", h(24 + 7, 20), [alloc("Tallis Cargo", 6, "Packaged snacks", 92)]),
    dep("MCT", null, "box", h(24 + 8, 40), [alloc("Bluefin Logistics", 8, "Ceramic tiles", 258)]),
    dep("RUH", null, "curtain", h(24 + 10, 30), [alloc("Meridian Forwarding", 10, "Ceramic tiles", 505)]),
    dep("DMM", null, "reefer", h(24 + 12, 15), [alloc("Bluefin Logistics", 6, "Fresh dairy", 470)], { tempRange: [2, 8] }),
    dep("DOH", null, "curtain", h(24 + 14, 0), [alloc("Northgate Forwarders", 4, "Auto spare parts", 415)]),
    dep("KWI", null, "box", h(24 + 17, 30), [alloc("Oasis Freight Desk", 5, "Garments", 650)]),
  ];

  return [d1, d2, d3, d4, d5, d6, ...tomorrow];
}

export function seedRfqs(departures: Departure[]): Rfq[] {
  const mct = departures.find((d) => d.lane === "MCT" && d.dock === 2)!;
  const replied: Rfq = {
    id: "RFQ-4090", desk: "Meridian Forwarding", channel: "Email", lane: "MCT",
    receivedAt: START_MIN - 48, replyBy: START_MIN - 20, readyAt: h(7, 30), deliverBy: h(20), pallets: 6, weightKg: 2040,
    commodity: "Laptops and monitors", hs: "8471.30", state: "replied",
    reply: { departureId: mct.id, ratePerPallet: 262, holdId: mct.holds[0].id, winChance: 0.74, decisionAt: START_MIN + 9 },
  };
  return [
    {
      id: "RFQ-4093", desk: "Meridian Forwarding", channel: "Email", lane: "RUH",
      receivedAt: START_MIN - 6, replyBy: START_MIN + 38, readyAt: h(9, 0), deliverBy: h(48 + 23), pallets: 8,
      weightKg: 7600, commodity: "Ceramic tiles", hs: "6907.21", targetRate: 500, state: "new",
    },
    {
      id: "RFQ-4094", desk: "Bluefin Logistics", channel: "API", lane: "DMM",
      receivedAt: START_MIN - 3, replyBy: START_MIN + 52, readyAt: h(10, 0), deliverBy: h(24 + 14), pallets: 6,
      weightKg: 3900, commodity: "Fresh dairy", hs: "0403.20", tempRange: [2, 8], state: "new",
    },
    {
      id: "RFQ-4095", desk: "Oasis Freight Desk", channel: "Portal", lane: "DOH",
      receivedAt: START_MIN - 1, replyBy: START_MIN + 75, readyAt: h(11, 0), deliverBy: h(24 + 18), pallets: 4,
      weightKg: 3040, commodity: "Pool chlorine, oxidiser", hs: "2828.10", dgClass: "5.1", un: "UN2880", state: "new",
    },
    replied,
  ];
}

export function seedFeeds(): Feed[] {
  return [
    { id: "F1", name: "Departure schedule", channel: "API", cadenceMin: 15, lastUpdate: START_MIN - 4, failing: false, fallback: false },
    { id: "F2", name: "Capacity and allotments", channel: "EDI", cadenceMin: 20, lastUpdate: START_MIN - 12, failing: false, fallback: false },
    { id: "F3", name: "Booking inbox", channel: "Email", cadenceMin: 10, lastUpdate: START_MIN - 2, failing: false, fallback: false },
    { id: "F4", name: "Rate card", channel: "Portal", cadenceMin: 720, lastUpdate: START_MIN - 300, failing: false, fallback: false },
  ];
}
