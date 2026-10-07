// The pilot network: who is on the platform, which lanes carriers run, and what is moving.
// Every company, person and figure is fictional. Coordinates of sites are illustrative.
import { HUBS, KINDS_FOR } from "./hubs";
import { FAMILY, type Mode } from "./modes";

export type PartyType = "desk" | "shipper" | "carrier" | "partner";

export interface Site {
  label: string;
  lat: number;
  lon: number;
  /** Nearest hub, for drill-down. */
  hub: string;
}

export interface NetworkParty {
  id: string;
  name: string;
  short: string;
  type: PartyType;
  color: string;
  country: string;
  modes?: Mode[];
  /** Partner service, e.g. customs brokerage. */
  service?: string;
  sites: Site[];
}

export const PARTIES: readonly NetworkParty[] = [
  // Forwarder desks
  { id: "desk-gulfway", name: "Gulfway Logistics", short: "GW", type: "desk", color: "#F2B705", country: "AE", sites: [{ label: "Jebel Ali desk", lat: 25.03, lon: 55.12, hub: "AEJEA" }, { label: "Riyadh office", lat: 24.71, lon: 46.68, hub: "SARUH" }] },
  { id: "desk-northsea", name: "Northsea Forwarding", short: "NS", type: "desk", color: "#C9A227", country: "NL", sites: [{ label: "Rotterdam desk", lat: 51.92, lon: 4.48, hub: "NLRTM" }] },

  // Shippers
  { id: "shp-alnoor", name: "Al Noor Home Appliances", short: "AN", type: "shipper", color: "#13837A", country: "AE", sites: [{ label: "Dubai warehouse", lat: 25.13, lon: 55.22, hub: "AEJAF" }, { label: "Riyadh warehouse", lat: 24.63, lon: 46.76, hub: "SARUH" }] },
  { id: "shp-desertbloom", name: "Desert Bloom Foods", short: "DB", type: "shipper", color: "#2E9E6A", country: "SA", sites: [{ label: "Riyadh cold store", lat: 24.78, lon: 46.74, hub: "SARUH" }] },
  { id: "shp-kaizen", name: "Kaizen Auto Parts", short: "KA", type: "shipper", color: "#A0662B", country: "AE", sites: [{ label: "Sharjah depot", lat: 25.31, lon: 55.45, hub: "AEJAF" }] },
  { id: "shp-mirage", name: "Mirage Textiles", short: "MT", type: "shipper", color: "#7A4E9A", country: "AE", sites: [{ label: "Dubai showroom", lat: 25.19, lon: 55.28, hub: "AEJAF" }] },
  { id: "shp-nordlicht", name: "Nordlicht Home GmbH", short: "NH", type: "shipper", color: "#2D6FB0", country: "DE", sites: [{ label: "Hamburg DC", lat: 53.55, lon: 10.02, hub: "DEHAM" }] },

  // Carriers, by mode
  { id: "car-oceanlink", name: "Oceanlink Lines", short: "OL", type: "carrier", color: "#1F5F8B", country: "SG", modes: ["ocean_fcl", "ocean_lcl"], sites: [{ label: "Shanghai terminal", lat: 30.62, lon: 122.0, hub: "CNSHA" }] },
  { id: "car-meridian", name: "Meridian Container", short: "MC", type: "carrier", color: "#7A4E9A", country: "CN", modes: ["ocean_fcl"], sites: [{ label: "Ningbo office", lat: 29.87, lon: 121.55, hub: "CNNGB" }] },
  { id: "car-pacific", name: "Pacific Crest Shipping", short: "PC", type: "carrier", color: "#0F7C6E", country: "KR", modes: ["ocean_fcl"], sites: [{ label: "Busan office", lat: 35.1, lon: 129.04, hub: "KRPUS" }] },
  { id: "car-gulfstar", name: "Gulfstar Feeder", short: "GF", type: "carrier", color: "#A0662B", country: "AE", modes: ["ocean_fcl"], sites: [{ label: "Jebel Ali office", lat: 25.0, lon: 55.1, hub: "AEJEA" }] },
  { id: "car-blueharbor", name: "BlueHarbor Marine", short: "BH", type: "carrier", color: "#2D6FB0", country: "IN", modes: ["ocean_fcl"], sites: [{ label: "Mumbai office", lat: 18.95, lon: 72.84, hub: "INNSA" }] },
  { id: "car-saffron", name: "Saffron Sea Lines", short: "SS", type: "carrier", color: "#B04A3A", country: "IN", modes: ["ocean_fcl"], sites: [{ label: "Chennai office", lat: 13.08, lon: 80.27, hub: "INMAA" }] },
  { id: "car-falcon", name: "Falcon Air Cargo", short: "FA", type: "carrier", color: "#0F7C6E", country: "AE", modes: ["air"], sites: [{ label: "DWC cargo terminal", lat: 24.89, lon: 55.17, hub: "DWC" }] },
  { id: "car-desertwing", name: "Desert Wing Cargo", short: "DW", type: "carrier", color: "#C2603A", country: "QA", modes: ["air"], sites: [{ label: "Doha cargo terminal", lat: 25.27, lon: 51.6, hub: "DOH" }] },
  { id: "car-sahm", name: "Sahm Overland", short: "SO", type: "carrier", color: "#2F55D4", country: "AE", modes: ["road"], sites: [{ label: "Jebel Ali linehaul depot", lat: 24.99, lon: 55.09, hub: "AEJAF" }] },
  { id: "car-gulfroad", name: "Gulf Road Network", short: "GR", type: "carrier", color: "#8A6D3B", country: "SA", modes: ["road"], sites: [{ label: "Riyadh truck park", lat: 24.7, lon: 46.86, hub: "SARUH" }] },
  { id: "car-northhaul", name: "Northsea Haulage", short: "NH", type: "carrier", color: "#56708A", country: "NL", modes: ["road"], sites: [{ label: "Venlo depot", lat: 51.37, lon: 6.17, hub: "NLVEN" }] },
  { id: "car-eastrail", name: "Eastern Rail Freight", short: "ER", type: "carrier", color: "#7A4E9A", country: "SA", modes: ["rail"], sites: [{ label: "Dammam rail terminal", lat: 26.4, lon: 50.08, hub: "SADMR" }] },
  { id: "car-silkrail", name: "Silk Corridor Rail", short: "SC", type: "carrier", color: "#9B3F6B", country: "KZ", modes: ["rail"], sites: [{ label: "Xi'an rail port", lat: 34.4, lon: 109.07, hub: "CNXIA" }] },

  // Service partners
  { id: "ptn-alsafa", name: "Al Safa Customs Brokers", short: "AS", type: "partner", color: "#6B4A8A", country: "AE", service: "Customs brokerage", sites: [{ label: "Jebel Ali office", lat: 25.0, lon: 55.04, hub: "AEJEA" }] },
  { id: "ptn-gulfshield", name: "Gulf Shield Insurance", short: "GS", type: "partner", color: "#8A5A9A", country: "AE", service: "Cargo insurance", sites: [{ label: "Dubai office", lat: 25.22, lon: 55.28, hub: "DXB" }] },
  { id: "ptn-atlas", name: "Atlas Warehousing", short: "AW", type: "partner", color: "#5B6F9A", country: "SA", service: "Warehousing", sites: [{ label: "Riyadh warehouse", lat: 24.62, lon: 46.9, hub: "SARUH" }] },
];

export const party = (id: string) => {
  const p = PARTIES.find((x) => x.id === id);
  if (!p) throw new Error(`unknown party ${id}`);
  return p;
};

// ── Lanes: a carrier's service on a route (2.1.4, 2.2.1, 2.3.1) ──────────────

export interface Lane {
  id: string;
  carrierOrgId: string;
  mode: Mode;
  service: string;
  from: string;
  to: string;
  /** Calls or crossings in order, as hub codes. */
  via: string[];
  transitDays: number;
  /** Departures per week. */
  perWeek: number;
  /** Free space on the next departure, and its total, in the mode's unit. */
  freeUnits: number;
  totalUnits: number;
  /** 11.2 anonymised lane index in USD per mode basis (per FEU, per kg, per truck, per wagon, per W/M). */
  benchmark: number;
  /** Desks that hold a negotiated rate on this lane (3.5.1). */
  rateDesks: { deskOrgId: string; amount: number; currency: string }[];
}

const L = (
  id: string, carrierOrgId: string, mode: Mode, service: string, from: string, to: string, via: string[], transitDays: number, perWeek: number,
  freeUnits: number, totalUnits: number, benchmark: number, rateDesks: Lane["rateDesks"] = [],
): Lane => ({ id, carrierOrgId, mode, service, from, to, via, transitDays, perWeek, freeUnits, totalUnits, benchmark, rateDesks });
const gw = (amount: number) => ({ deskOrgId: "desk-gulfway", amount, currency: "USD" });
const ns = (amount: number) => ({ deskOrgId: "desk-northsea", amount, currency: "USD" });

export const LANES: readonly Lane[] = [
  // Ocean: Asia to the Gulf (the pilot)
  L("L-OL-SHAJEA", "car-oceanlink", "ocean_fcl", "AGX1", "CNSHA", "AEJEA", ["SGSIN"], 18, 1, 214, 1800, 2300, [gw(2180)]),
  L("L-MC-SHAJEA", "car-meridian", "ocean_fcl", "Lumen", "CNSHA", "AEJEA", ["SGSIN", "LKCMB"], 24, 1, 6, 1400, 2300, [gw(1940)]),
  L("L-BH-SHAJEA", "car-blueharbor", "ocean_fcl", "BH Gulf", "CNSHA", "AEJEA", ["SGSIN", "MYPKG"], 20, 1, 140, 1200, 2300, [gw(2050)]),
  L("L-PC-NGBJEA", "car-pacific", "ocean_fcl", "PC Express", "CNNGB", "AEJEA", ["SGSIN"], 16, 2, 380, 2400, 2350, [gw(2450)]),
  L("L-OL-SHADMM", "car-oceanlink", "ocean_fcl", "AGX2", "CNSHA", "SADMM", ["SGSIN", "AEJEA"], 20, 1, 410, 2200, 2400, [gw(2390)]),
  L("L-OL-YTNSIN", "car-oceanlink", "ocean_fcl", "SCX", "CNYTN", "SGSIN", [], 5, 3, 520, 2000, 650),
  L("L-PC-PUSJEA", "car-pacific", "ocean_fcl", "PC Gulf", "KRPUS", "AEJEA", ["CNSHA", "SGSIN"], 22, 1, 260, 2400, 2500, [gw(2520)]),
  // Ocean: India to the Gulf
  L("L-GF-NSAJEA", "car-gulfstar", "ocean_fcl", "Gulf Feeder West", "INNSA", "AEJEA", [], 4, 3, 96, 900, 1240, [gw(1180)]),
  L("L-BH-MAAJEA", "car-blueharbor", "ocean_fcl", "BH India East", "INMAA", "AEJEA", ["LKCMB"], 9, 1, 120, 1100, 1500, [gw(1460)]),
  L("L-SS-MAAJEA", "car-saffron", "ocean_fcl", "Saffron Gulf", "INMAA", "AEJEA", ["LKCMB"], 10, 1, 70, 900, 1500, [gw(1420)]),
  L("L-GF-KHIJEA", "car-gulfstar", "ocean_fcl", "Gulf Feeder Pak", "PKKHI", "AEJEA", [], 3, 2, 110, 700, 980, [gw(940)]),
  // Ocean: Gulf coastal and Africa
  L("L-GF-JEADMM", "car-gulfstar", "ocean_fcl", "Gulf Shuttle", "AEJEA", "SADMM", ["QAHMD"], 3, 2, 96, 600, 520, [gw(480)]),
  L("L-GF-JEASWK", "car-gulfstar", "ocean_fcl", "Gulf Shuttle North", "AEJEA", "KWSWK", ["SADMM"], 4, 1, 80, 500, 610, [gw(590)]),
  L("L-SS-JEAMBA", "car-saffron", "ocean_fcl", "East Africa", "AEJEA", "KEMBA", ["DJJIB"], 10, 1, 150, 1000, 1350, [gw(1300)]),
  L("L-SS-JEADUR", "car-saffron", "ocean_fcl", "Southern Africa", "AEJEA", "ZADUR", ["KEMBA"], 16, 1, 210, 1100, 1800, [gw(1760)]),
  // Ocean: Europe and beyond
  L("L-MC-JEARTM", "car-meridian", "ocean_fcl", "Suez Loop", "AEJEA", "NLRTM", ["EGPSD", "GRPIR"], 21, 1, 330, 1600, 1650, [gw(1600), ns(1580)]),
  L("L-OL-RTMJEA", "car-oceanlink", "ocean_fcl", "AEX", "NLRTM", "AEJEA", ["BEANR", "EGPSD"], 22, 1, 280, 1800, 1900, [gw(1880), ns(1850)]),
  L("L-OL-HAMJEA", "car-oceanlink", "ocean_fcl", "AEX North", "DEHAM", "AEJEA", ["NLRTM", "EGPSD"], 24, 1, 190, 1800, 1950, [ns(1920)]),
  L("L-MC-VLCJED", "car-meridian", "ocean_fcl", "Med Red Sea", "ESVLC", "SAJED", ["GRPIR", "EGPSD"], 9, 1, 160, 1200, 1400, [gw(1380)]),
  L("L-PC-PUSLAX", "car-pacific", "ocean_fcl", "Transpacific", "KRPUS", "USLAX", [], 12, 2, 520, 3000, 2100),
  L("L-MC-NYCRTM", "car-meridian", "ocean_fcl", "Atlantic", "USNYC", "NLRTM", [], 9, 1, 300, 1600, 1500, [ns(1460)]),
  L("L-OL-SSZVLC", "car-oceanlink", "ocean_fcl", "Brazil Med", "BRSSZ", "ESVLC", [], 14, 1, 240, 1500, 1700),
  L("L-OL-SHALCL", "car-oceanlink", "ocean_lcl", "AGX1 LCL", "CNSHA", "AEJEA", ["SGSIN"], 21, 1, 38, 76, 62, [gw(58)]),

  // Air
  L("L-FA-PVGDWC", "car-falcon", "air", "FC 881", "PVG", "DWC", [], 1, 7, 9800, 48000, 3.4, [gw(3.1)]),
  L("L-FA-PVGRUH", "car-falcon", "air", "FC 882", "PVG", "RUH", [], 1, 4, 6800, 40000, 3.9, [gw(3.7)]),
  L("L-FA-DWCFRA", "car-falcon", "air", "FC 300", "DWC", "FRA", [], 1, 7, 12500, 52000, 2.6, [gw(2.4), ns(2.5)]),
  L("L-FA-BOMDXB", "car-falcon", "air", "FC 202", "BOM", "DXB", [], 1, 14, 4200, 18000, 1.4, [gw(1.3)]),
  L("L-FA-DXBNBO", "car-falcon", "air", "FC 610", "DXB", "NBO", [], 1, 5, 7400, 22000, 2.2, [gw(2.1)]),
  L("L-DW-HKGDOH", "car-desertwing", "air", "DW 77", "HKG", "DOH", [], 1, 7, 11000, 60000, 3.1, [gw(3.0)]),
  L("L-DW-DOHLHR", "car-desertwing", "air", "DW 12", "DOH", "LHR", [], 1, 7, 8600, 45000, 2.8, [gw(2.7), ns(2.75)]),
  L("L-DW-DOHORD", "car-desertwing", "air", "DW 540", "DOH", "ORD", [], 1, 4, 13200, 70000, 3.6),
  L("L-DW-ICNDOH", "car-desertwing", "air", "DW 81", "ICN", "DOH", [], 1, 5, 9500, 60000, 3.3, [gw(3.2)]),
  L("L-FA-DWCJNB", "car-falcon", "air", "FC 640", "DWC", "JNB", [], 1, 3, 6200, 30000, 2.5),
  L("L-DW-AMSDOH", "car-desertwing", "air", "DW 18", "AMS", "DOH", [], 1, 7, 7100, 40000, 2.3, [ns(2.2)]),

  // Rail
  L("L-ER-DMMRUH", "car-eastrail", "rail", "Block train East", "SADMR", "SARDP", [], 1, 14, 38, 120, 410, [gw(395)]),
  L("L-ER-KHLRUW", "car-eastrail", "rail", "Etihad West", "AEKHR", "AERUW", [], 1, 7, 26, 80, 300, [gw(290)]),
  L("L-SC-XIADUI", "car-silkrail", "rail", "Silk Express", "CNXIA", "DEDUI", ["KZKHG", "PLMAL"], 18, 3, 22, 82, 5200, [ns(5100)]),
  L("L-SC-CKGDUI", "car-silkrail", "rail", "Yuxinou", "CNCKG", "DEDUI", ["KZKHG", "PLMAL"], 19, 2, 14, 82, 5400, [ns(5300)]),

  // Road (prices per full truck)
  L("L-SO-JAFRUH", "car-sahm", "road", "RUH linehaul", "AEJAF", "SARUH", ["AEGHW"], 2, 14, 46, 198, 1650, [gw(1600)]),
  L("L-SO-JAFMCT", "car-sahm", "road", "MCT linehaul", "AEJAF", "OMMCT", ["OMHTA"], 1, 14, 52, 198, 820, [gw(790)]),
  L("L-SO-JAFDOH", "car-sahm", "road", "DOH linehaul", "AEJAF", "QADOH", ["AEGHW"], 1, 7, 61, 165, 1250, [gw(1210)]),
  L("L-GR-JAFKWI", "car-gulfroad", "road", "Kuwait road", "AEJAF", "KWKWI", ["AEGHW", "SARUH"], 3, 5, 40, 132, 2350, [gw(2300)]),
  L("L-GR-RUHAMM", "car-gulfroad", "road", "Levant road", "SARUH", "JOAMM", [], 3, 3, 28, 99, 2600, [gw(2550)]),
  L("L-GR-DMMRUH", "car-gulfroad", "road", "Port shuttle", "SADMM", "SARUH", [], 1, 21, 70, 330, 690, [gw(660)]),
  L("L-NH-RTMDUI", "car-northhaul", "road", "Rhine road", "NLRTM", "DEDUI", ["NLVEN"], 1, 21, 90, 330, 780, [ns(760)]),
  L("L-NH-AMSFRA", "car-northhaul", "road", "Air feeder", "AMS", "FRA", [], 1, 14, 50, 165, 920, [ns(890)]),
];

/** Lanes that break the hub rules are a data bug; tests call this. */
export function laneProblems(l: Lane): string[] {
  const out: string[] = [];
  const kinds = KINDS_FOR[FAMILY[l.mode]];
  for (const code of [l.from, l.to]) {
    const x = HUBS.find((h) => h.code === code);
    if (!x) out.push(`${l.id}: unknown hub ${code}`);
    else if (!kinds.includes(x.kind)) out.push(`${l.id}: ${code} is a ${x.kind}, not usable for ${l.mode}`);
  }
  for (const code of l.via) if (!HUBS.some((h) => h.code === code)) out.push(`${l.id}: unknown via ${code}`);
  const c = PARTIES.find((p) => p.id === l.carrierOrgId);
  if (!c || c.type !== "carrier") out.push(`${l.id}: ${l.carrierOrgId} is not a carrier`);
  else if (!c.modes?.includes(l.mode)) out.push(`${l.id}: ${c.name} does not run ${l.mode}`);
  if (l.freeUnits > l.totalUnits) out.push(`${l.id}: more free space than capacity`);
  return out;
}

/** Desk carrier panels (decision D in deviations.ts: the desk owns its relationships). */
export const PANELS: Record<string, string[]> = {
  "desk-gulfway": PARTIES.filter((p) => p.type === "carrier" && p.id !== "car-northhaul" && p.id !== "car-silkrail").map((p) => p.id),
  "desk-northsea": ["car-oceanlink", "car-meridian", "car-falcon", "car-desertwing", "car-northhaul", "car-silkrail"],
};

// ── What is moving (7.1) ─────────────────────────────────────────────────────

export interface Leg {
  seq: number;
  mode: Mode;
  carrierOrgId: string;
  laneId?: string;
  from: string;
  to: string;
  /** 0 = not started, 1 = done. */
  progress: number;
}

export interface Shipment {
  id: string;
  deskOrgId: string;
  shipperOrgId: string;
  /** Main-leg carrier, used by the permission check. */
  carrierOrgId: string;
  status: "planned" | "in_transit" | "at_destination" | "delivered";
  cargo: string;
  eta: string;
  legs: Leg[];
  exception?: { kind: "delay" | "document" | "temperature"; text: string };
}

const leg = (seq: number, mode: Mode, carrierOrgId: string, from: string, to: string, progress: number, laneId?: string): Leg => ({ seq, mode, carrierOrgId, from, to, progress, laneId });

export const SHIPMENTS: readonly Shipment[] = [
  { id: "SHP-2301", deskOrgId: "desk-gulfway", shipperOrgId: "shp-alnoor", carrierOrgId: "car-oceanlink", status: "in_transit", cargo: "18 pallets household appliances, 1 × 40' HC", eta: "14 Oct",
    legs: [leg(1, "ocean_fcl", "car-oceanlink", "CNSHA", "AEJEA", 0.22, "L-OL-SHAJEA"), leg(2, "road", "car-sahm", "AEJEA", "AEJAF", 0)] },
  { id: "SHP-2291", deskOrgId: "desk-gulfway", shipperOrgId: "shp-kaizen", carrierOrgId: "car-blueharbor", status: "in_transit", cargo: "Auto parts, 1 × 20' GP", eta: "9 Oct",
    legs: [leg(1, "ocean_fcl", "car-blueharbor", "CNSHA", "AEJEA", 0.46, "L-BH-SHAJEA")], exception: { kind: "delay", text: "Yard congestion at Port Klang, likely 2 days late" } },
  { id: "SHP-2284", deskOrgId: "desk-gulfway", shipperOrgId: "shp-mirage", carrierOrgId: "car-saffron", status: "in_transit", cargo: "Cotton fabric, 1 × 40' HC", eta: "2 Oct",
    legs: [leg(1, "ocean_fcl", "car-saffron", "INMAA", "AEJEA", 0.62, "L-SS-MAAJEA")], exception: { kind: "document", text: "Certificate of origin missing; customs filing due in 36 h" } },
  { id: "SHP-2298", deskOrgId: "desk-gulfway", shipperOrgId: "shp-desertbloom", carrierOrgId: "car-gulfstar", status: "in_transit", cargo: "Frozen food, 2 × 40' RF at −18 °C", eta: "30 Sep",
    legs: [leg(1, "ocean_fcl", "car-gulfstar", "INNSA", "AEJEA", 0.8, "L-GF-NSAJEA"), leg(2, "road", "car-sahm", "AEJAF", "SARUH", 0, "L-SO-JAFRUH")] },
  { id: "SHP-2310", deskOrgId: "desk-gulfway", shipperOrgId: "shp-alnoor", carrierOrgId: "car-falcon", status: "in_transit", cargo: "2 pallets best-sellers, 640 kg chargeable", eta: "23 Sep",
    legs: [leg(1, "air", "car-falcon", "PVG", "RUH", 0.55, "L-FA-PVGRUH"), leg(2, "road", "car-gulfroad", "RUH", "SARUH", 0)] },
  { id: "SHP-2312", deskOrgId: "desk-gulfway", shipperOrgId: "shp-alnoor", carrierOrgId: "car-oceanlink", status: "in_transit", cargo: "16 pallets appliances, sea and rail", eta: "17 Oct",
    legs: [leg(1, "ocean_fcl", "car-oceanlink", "CNSHA", "SADMM", 0.3, "L-OL-SHADMM"), leg(2, "rail", "car-eastrail", "SADMR", "SARDP", 0, "L-ER-DMMRUH")] },
  { id: "SHP-2318", deskOrgId: "desk-gulfway", shipperOrgId: "shp-kaizen", carrierOrgId: "car-sahm", status: "in_transit", cargo: "Brake assemblies, 14 pallets", eta: "Today",
    legs: [leg(1, "road", "car-sahm", "AEJAF", "OMMCT", 0.6, "L-SO-JAFMCT")] },
  { id: "SHP-2320", deskOrgId: "desk-northsea", shipperOrgId: "shp-nordlicht", carrierOrgId: "car-oceanlink", status: "in_transit", cargo: "Kitchen furniture, 2 × 40' HC", eta: "21 Oct",
    legs: [leg(1, "road", "car-northhaul", "NLVEN", "NLRTM", 1), leg(2, "ocean_fcl", "car-oceanlink", "NLRTM", "AEJEA", 0.35, "L-OL-RTMJEA")] },
  { id: "SHP-2325", deskOrgId: "desk-northsea", shipperOrgId: "shp-nordlicht", carrierOrgId: "car-silkrail", status: "in_transit", cargo: "Lighting components, 1 × 40' HC by rail", eta: "12 Oct",
    legs: [leg(1, "rail", "car-silkrail", "CNXIA", "DEDUI", 0.5, "L-SC-XIADUI"), leg(2, "road", "car-northhaul", "DEDUI", "DEHAM", 0)] },
];

// ── Partner jobs (9.2) ───────────────────────────────────────────────────────

export interface Job {
  id: string;
  deskOrgId: string;
  partnerOrgId: string;
  shipmentId: string;
  hub: string;
  service: string;
  fee: number;
  status: "offered" | "accepted";
}

export const JOBS: readonly Job[] = [
  { id: "J-1", deskOrgId: "desk-gulfway", partnerOrgId: "ptn-alsafa", shipmentId: "SHP-2301", hub: "AEJEA", service: "Import declaration", fee: 85, status: "offered" },
  { id: "J-2", deskOrgId: "desk-gulfway", partnerOrgId: "ptn-alsafa", shipmentId: "SHP-2298", hub: "AEJEA", service: "Import declaration, reefer", fee: 110, status: "offered" },
  { id: "J-3", deskOrgId: "desk-gulfway", partnerOrgId: "ptn-alsafa", shipmentId: "SHP-2284", hub: "AEJEA", service: "Import declaration", fee: 85, status: "offered" },
  { id: "J-4", deskOrgId: "desk-gulfway", partnerOrgId: "ptn-gulfshield", shipmentId: "SHP-2310", hub: "PVG", service: "All-risk cargo cover", fee: 64, status: "accepted" },
  { id: "J-5", deskOrgId: "desk-gulfway", partnerOrgId: "ptn-atlas", shipmentId: "SHP-2312", hub: "SARDP", service: "Delivery slot and 5 days storage", fee: 240, status: "offered" },
];

