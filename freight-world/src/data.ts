// Every company, person and figure here is fictional, carried over from the Freight Orchestrator MVP demo.

export const S = {
  customer: "Al Noor Home Appliances LLC",
  contact: "Sara Haddad",
  pallets: 18,
  l: 120,
  w: 100,
  h: 160,
  weight: 21400,
  ready: "20 Sep",
  deadline: "20 Oct",
};
export const CBM = +((S.pallets * S.l * S.w * S.h) / 1e6).toFixed(1);

export type Src = "email" | "pdf" | "portal" | "whatsapp";
export interface Carrier {
  id: string;
  name: string;
  color: string;
  eq: string;
  price: number;
  days: number;
  rel: number;
  co2: number;
  cut: string;
  via: "Direct" | "Colombo" | "Port Klang";
  src: Src;
  fit: boolean;
  reason?: string;
  reply: number; // minutes after the RFQ went out
}

export const CARRIERS: Carrier[] = [
  { id: "OL", name: "Oceanlink Lines", color: "#1F5F8B", eq: "40' HC", price: 2180, days: 18, rel: 92, co2: 1.9, cut: "24 Sep", via: "Direct", src: "email", fit: true, reply: 31 },
  { id: "MC", name: "Meridian Container", color: "#7A4E9A", eq: "40' HC", price: 1940, days: 24, rel: 78, co2: 2.3, cut: "25 Sep", via: "Colombo", src: "pdf", fit: true, reply: 44 },
  { id: "PC", name: "Pacific Crest Shipping", color: "#0F7C6E", eq: "40' HC", price: 2450, days: 16, rel: 95, co2: 1.8, cut: "23 Sep", via: "Direct", src: "portal", fit: true, reply: 21 },
  { id: "GF", name: "Gulfstar Feeder", color: "#A0662B", eq: "20' GP", price: 1350, days: 22, rel: 85, co2: 1.2, cut: "24 Sep", via: "Direct", src: "email", fit: false, reason: "Only 8 of 18 pallets fit on a 20' floor", reply: 58 },
  { id: "BH", name: "BlueHarbor Marine", color: "#2D6FB0", eq: "40' HC", price: 2050, days: 20, rel: 88, co2: 2.0, cut: "24 Sep", via: "Port Klang", src: "whatsapp", fit: true, reply: 45 },
  { id: "SS", name: "Saffron Sea Lines", color: "#B04A3A", eq: "40' GP", price: 2010, days: 19, rel: 81, co2: 1.9, cut: "18 Sep", via: "Direct", src: "email", fit: false, reason: "Cut-off 18 Sep is before cargo is ready on 20 Sep", reply: 71 },
];
export const C = (id: string) => CARRIERS.find((c) => c.id === id)!;
export const CHAN: Record<Src, string> = { email: "Email", pdf: "PDF attachment", whatsapp: "WhatsApp", portal: "Carrier portal" };

export type Weights = { price: number; speed: number; rel: number; co2: number };
export const PRESETS: Record<string, { label: string; w: Weights }> = {
  value: { label: "Best value", w: { price: 40, speed: 25, rel: 25, co2: 10 } },
  price: { label: "Cheapest", w: { price: 100, speed: 0, rel: 0, co2: 0 } },
  speed: { label: "Fastest", w: { price: 0, speed: 100, rel: 0, co2: 0 } },
  rel: { label: "Most reliable", w: { price: 0, speed: 0, rel: 100, co2: 0 } },
  co2: { label: "Lowest CO₂", w: { price: 0, speed: 0, rel: 0, co2: 100 } },
  urgent: { label: "Urgent launch", w: { price: 15, speed: 45, rel: 40, co2: 0 } },
};

export interface Scored extends Carrier {
  score: number;
}
export function rank(carriers: Carrier[], W: Weights): Scored[] {
  const el = carriers.filter((c) => c.fit);
  const rng = (k: "price" | "days" | "rel" | "co2") => [Math.min(...el.map((c) => c[k])), Math.max(...el.map((c) => c[k]))];
  const [pa, pb] = rng("price"), [da, db] = rng("days"), [ra, rb] = rng("rel"), [ca, cb] = rng("co2");
  const tot = W.price + W.speed + W.rel + W.co2 || 1;
  const safe = (n: number, d: number) => (d === 0 ? 1 : n / d);
  return el
    .map((c) => {
      const n = { price: safe(pb - c.price, pb - pa), speed: safe(db - c.days, db - da), rel: safe(c.rel - ra, rb - ra), co2: safe(cb - c.co2, cb - ca) };
      return { ...c, score: Math.round(((W.price * n.price + W.speed * n.speed + W.rel * n.rel + W.co2 * n.co2) / tot) * 100) };
    })
    .sort((a, b) => b.score - a.score || a.price - b.price);
}

export const usd = (n: number) => "USD " + Math.round(n).toLocaleString("en-US");
export const sellPrice = (cost: number, margin: number) => Math.round((cost * (1 + margin / 100)) / 5) * 5 + 150;
export const arrive = (days: number) =>
  new Date(2026, 8, 26 + days).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

// ---------- step 1 ----------
export const FORM_FIELDS: [string, string, string][] = [
  ["cust", "Customer", S.customer],
  ["com", "Commodity", "Household appliances"],
  ["pol", "Origin port", "Shanghai, CN (CNSHA)"],
  ["pod", "Destination port", "Jebel Ali, AE (AEJEA)"],
  ["pkg", "Packages", "18 pallets, not stackable"],
  ["dim", "Pallet size", "120 × 100 × 160 cm"],
  ["wt", "Gross weight", "21,400 kg"],
  ["date", "Cargo ready · deliver by", "20 Sep · 20 Oct"],
];

export interface Box {
  key: string;
  name: string;
  lenM: number;
  cols: number;
  payload: number;
  door: string;
  ok: boolean;
  note: string;
}
export const BOXES: Box[] = [
  { key: "20", name: "20' standard", lenM: 5.9, cols: 4, payload: 28200, door: "2.28", ok: false, note: "OK" },
  { key: "40", name: "40' standard", lenM: 12.03, cols: 10, payload: 26700, door: "2.28", ok: true, note: "OK" },
  { key: "40hc", name: "40' high cube", lenM: 12.03, cols: 10, payload: 26500, door: "2.58", ok: true, note: "OK, more headroom" },
];

// ---------- step 3 ----------
export type Field = [key: string, label: string, value: string, conf: number, action?: "ask" | "confirm"];
export const FIELDS: Record<string, Field[]> = {
  OL: [["eq", "Equipment", "40' High Cube", 99], ["rate", "All-in rate", "USD 2,180", 98], ["brk", "Breakdown", "Freight 1,850 · BAF 240 · THC 90", 95], ["tt", "Transit", "18 days", 97], ["via", "Routing", "Direct", 96], ["cut", "Cut-off", "24 Sep 2026", 94], ["valid", "Valid until", "30 Sep 2026", 96]],
  MC: [["eq", "Equipment", "40' High Cube", 97], ["rate", "All-in rate", "USD 1,940", 99], ["brk", "Breakdown", "Freight 1,640 · surcharges 300", 98], ["tt", "Transit", "24 days", 99], ["via", "Routing", "Transship at Colombo", 97], ["cut", "Cut-off", "25 Sep 2026, 12:00", 99], ["valid", "Valid until", "05 Oct 2026", 99]],
  BH: [["eq", "Equipment", "40' High Cube", 93], ["rate", "All-in rate", "USD 2,050", 88], ["brk", "Breakdown", "Not stated", 0, "ask"], ["tt", "Transit", "About 20 days", 90], ["via", "Routing", "Transship at Port Klang", 91], ["cut", "Cut-off", "24 Sep 2026 (from voice note)", 72, "confirm"], ["valid", "Valid until", "Not stated", 0, "ask"]],
};

// ---------- dashboard ----------
export const RECENT_QUOTES: [string, string, string, string, Tone, string][] = [
  ["Al Noor Home Appliances", "SHA → JEA", "1 × 40' HC", "In progress", "warn", "—"],
  ["Desert Bloom Foods", "NSA → JEA", "2 × 40' RF", "Approved", "ok", "3 min"],
  ["Kaizen Auto Parts", "SHA → JEA", "1 × 20' GP", "Approved", "ok", "6 min"],
  ["Mirage Textiles", "MAA → JEA", "1 × 40' HC", "Sent", "idle", "4 min"],
  ["Horizon Build Supply", "NSA → JEA", "3 × 40' GP", "Lost on price", "bad", "5 min"],
];
export const WEEKS = [52, 58, 49, 55, 9, 4.1, 2.2, 1.4];
export type Tone = "ok" | "warn" | "bad" | "idle";

export const SCORE_EXTRA: Record<string, [number, number, string]> = {
  OL: [96, 1.2, "2 h"], MC: [81, 3.1, "5 h"], PC: [98, 0.8, "1 h"], GF: [88, 2.0, "3 h"], BH: [90, 1.9, "20 min"], SS: [84, 2.6, "4 h"],
};

// ---------- roadmap ----------
export const PHASES = [
  { n: 1, t: "MVP", m: "3–9", v: "flow" },
  { n: 2, t: "Booking & tracking", m: "9–15", v: "ship" },
  { n: 3, t: "Multimodal", m: "15–24", v: "multi" },
  { n: 4, t: "AI optimization", m: "24–30", v: "opt" },
  { n: 5, t: "Trust layer", m: "30–36", v: "trust" },
  { n: 6, t: "Network scale", m: "36+", v: "net" },
] as const;

export const SHIPMENTS = [
  { id: "SHP-2301", cust: "Al Noor Home Appliances", lane: "SHA → JEA", carrier: "Oceanlink Lines", status: "Sailed", tone: "ok" as Tone, pct: 22, eta: "14 Oct" },
  { id: "SHP-2298", cust: "Desert Bloom Foods", lane: "NSA → JEA", carrier: "BlueHarbor Marine", status: "Loading", tone: "idle" as Tone, pct: 8, eta: "30 Sep" },
  { id: "SHP-2291", cust: "Kaizen Auto Parts", lane: "SHA → JEA", carrier: "BlueHarbor Marine", status: "Delay risk", tone: "warn" as Tone, pct: 46, eta: "9 Oct", alert: "a1" },
  { id: "SHP-2284", cust: "Mirage Textiles", lane: "MAA → JEA", carrier: "Meridian Container", status: "Document missing", tone: "bad" as Tone, pct: 62, eta: "2 Oct", alert: "a2" },
  { id: "SHP-2279", cust: "Horizon Build Supply", lane: "NSA → JEA", carrier: "Pacific Crest Shipping", status: "At destination", tone: "ok" as Tone, pct: 92, eta: "18 Sep" },
  { id: "SHP-2270", cust: "Al Noor Home Appliances", lane: "SHA → JEA", carrier: "Oceanlink Lines", status: "Delivered", tone: "ok" as Tone, pct: 100, eta: "12 Sep" },
];
export const ALERTS = [
  { id: "a1", k: "warn" as Tone, t: "SHP-2291 · Kaizen Auto Parts · likely 2 days late", d: "Yard congestion at Port Klang. The customer's deadline is still met.", a: "Notify customer", done: "Customer notified" },
  { id: "a2", k: "bad" as Tone, t: "SHP-2284 · Mirage Textiles · document missing", d: "Certificate of origin not uploaded. Customs filing is due in 36 hours.", a: "Request from supplier", done: "Request sent to supplier" },
];
export const DOCS = [
  ["Booking confirmation", "Received from carrier system", "Received", "ok"],
  ["Bill of lading", "Built from booking data", "Draft ready", "warn"],
  ["Commercial invoice", "Checked against purchase order", "Matched", "ok"],
  ["Packing list", "Read from supplier upload", "Matched", "ok"],
  ["Certificate of origin", "Uploaded by supplier", "Verified", "ok"],
  ["Customs declaration", "Pre-filled for Dubai customs", "Ready to file", "idle"],
] as [string, string, string, Tone][];
export const INTEGRATIONS = [
  ["Customer ERP", "Purchase orders come in and invoices go back automatically", "Connected", "ok", "Synced 2 min ago"],
  ["Forwarder operations system", "Jobs and bookings created without re-typing", "Connected", "ok", "Live"],
  ["Customs portal", "Declarations pre-filled and filed", "Connected", "ok", "Synced 15 min ago"],
  ["Accounting", "Invoices posted when cargo is delivered", "Connected", "ok", "Synced 1 h ago"],
  ["Carrier booking systems", "3 of 6 carriers accept bookings directly", "Partial", "warn", "Live"],
  ["Warehouse system", "Delivery slots booked at the customer's warehouse", "Planned", "idle", "Next release"],
] as [string, string, string, Tone, string][];

export type Mode = "sea" | "rail" | "road" | "air" | "coastal" | "port";
export const MODE_C: Record<Mode, string> = { sea: "#1F5F8B", rail: "#7A4E9A", road: "#A0662B", air: "#0F7C6E", coastal: "#2E8FB5", port: "#7F9296" };
export const MODE_N: Record<Mode, string> = { sea: "Ocean", rail: "Rail", road: "Road", air: "Air", coastal: "Coastal", port: "Port" };
export const MM_OPTS = [
  { id: "A", name: "Sea and rail via Dammam", legs: [["sea", "Shanghai to Dammam", 20], ["port", "Port and customs", 2], ["rail", "Dammam to Riyadh", 1], ["road", "Final delivery", 1]], price: 2720, co2: 2.2, rel: 86, cap: "6 slots left on MC LUMEN, 27 Sep", src: "API", tags: ["sea", "rail"] },
  { id: "B", name: "Sea and road via Jebel Ali", legs: [["sea", "Shanghai to Jebel Ali", 18], ["port", "Port and customs", 1], ["road", "Jebel Ali to Riyadh", 3]], price: 3380, co2: 3.1, rel: 90, cap: "214 TEU free on OL AURORA, 26 Sep", src: "API", tags: ["sea", "road"] },
  { id: "C", name: "Sea and road via Jeddah", legs: [["sea", "Shanghai to Jeddah", 21], ["port", "Port and customs", 1], ["road", "Jeddah to Riyadh", 1]], price: 3150, co2: 2.9, rel: 84, cap: "Space confirmed by email", src: "Email", tags: ["sea", "road"] },
  { id: "D", name: "Sea, coastal feeder and rail", legs: [["sea", "Shanghai to Jebel Ali", 18], ["coastal", "Jebel Ali to Dammam", 3], ["port", "Port", 1], ["rail", "Dammam to Riyadh", 1], ["road", "Final delivery", 1]], price: 2980, co2: 2.3, rel: 80, cap: "Feeder sails Tuesdays, 96 TEU free", src: "EDI", tags: ["sea", "coastal", "rail"] },
  { id: "E", name: "Air, full shipment", legs: [["road", "Pickup to airport", 1], ["air", "Shanghai to Riyadh", 1], ["road", "Clearance and delivery", 1]], price: 81300, co2: 28.5, rel: 94, cap: "6,800 kg free on FC 882; needs 4 flights", src: "API", tags: ["air", "road"] },
] as { id: string; name: string; legs: [Mode, string, number][]; price: number; co2: number; rel: number; cap: string; src: string; tags: Mode[] }[];
export const MM_CAP: [Mode, string, string, number, string][] = [
  ["sea", "OL AURORA 126E · Shanghai to Jebel Ali", "Sails 26 Sep", 82, "214 TEU free"],
  ["sea", "MC LUMEN 44W · Shanghai to Dammam", "Sails 27 Sep", 94, "6 slots left"],
  ["air", "FC 882 · Shanghai to Riyadh", "Departs 22 Sep", 66, "6,800 kg free"],
  ["rail", "Block train · Dammam to Riyadh", "Daily", 58, "38 wagons free"],
  ["road", "Truck pool · Jebel Ali to Riyadh", "Today", 40, "42 trucks free"],
  ["coastal", "Gulf feeder · Jebel Ali to Dammam", "Sails 30 Sep", 71, "96 TEU free"],
];
export const LCL = [
  { n: "Mirage Textiles", c: "#1F5F8B", cbm: 14.2, cost: 1350, u: 8, h: 1.0, stack: true },
  { n: "Desert Bloom Foods", c: "#13837A", cbm: 18.5, cost: 1760, u: 10, h: 1.2, stack: true },
  { n: "Kaizen Auto Parts", c: "#A0662B", cbm: 9.8, cost: 930, u: 6, h: 1.1, stack: false },
  { n: "Horizon Build Supply", c: "#7A4E9A", cbm: 21.0, cost: 2000, u: 8, h: 1.2, stack: true },
];
export const RATE_PAST = [2050, 2080, 2120, 2100, 2160, 2200, 2240, 2210, 2260, 2300, 2350, 2380];
export const RATE_FUT = [2420, 2510, 2600, 2640, 2590, 2520, 2460, 2430];
export const RATE_BAND = [60, 90, 120, 150, 170, 190, 200, 210];
export const ESC_EVENTS: [string, string, Party, string][] = [
  ["Payment locked in escrow", "Al Noor's bank", "bank", "16 Sep 11:20"],
  ["Container loaded at Shanghai", "Oceanlink terminal scan", "carrier", "22 Sep 08:14"],
  ["Vessel departed", "Oceanlink system", "carrier", "26 Sep 19:02"],
  ["Customs cleared in Dubai", "Dubai customs", "customs", "14 Oct 10:45"],
  ["Delivered and signed", "Al Noor, photo and GPS", "shipper", "16 Oct 15:31"],
  ["Payment released automatically", "Smart contract", "bank", "16 Oct 15:31"],
];
export type Party = "shipper" | "forwarder" | "carrier" | "customs" | "bank";
export function fakeHash(s: string) {
  let a = 2166136261, b = 5381;
  for (const ch of s) {
    a ^= ch.charCodeAt(0);
    a = Math.imul(a, 16777619) >>> 0;
    b = (Math.imul(b, 33) ^ ch.charCodeAt(0)) >>> 0;
  }
  return "0x" + a.toString(16).padStart(8, "0") + b.toString(16).padStart(8, "0");
}
export const REGIONS: [string, number][] = [["Asia to GCC", 42], ["India to GCC", 31], ["Europe to GCC", 22], ["GCC to East Africa", 18], ["GCC to South Asia", 14], ["Road within the GCC", 10], ["China to Europe by rail", 9]];
export const AUTO_RULES = ["Customer is on the approved list", "Top option scores 70 or more", "Price is inside this week's market range", "Cut-off is at least 48 hours away", "Cargo value is under USD 250,000"];
export const AUTO_LOG: [string, string, string, string, Tone, string][] = [
  ["11:42", "Kaizen Auto Parts", "SHA → JEA", "Booked BlueHarbor", "ok", "Score 74, USD 60 under market"],
  ["11:20", "Desert Bloom Foods", "NSA → JEA", "Booked Pacific Crest", "ok", "Reefer cargo, reliability rule"],
  ["10:58", "Horizon Build Supply", "NSA → JEA", "Sent to desk", "warn", "Price 6% above market"],
  ["10:31", "Mirage Textiles", "MAA → JEA", "Consolidated", "ok", "Joined group CON-0914"],
];
export const APPS: [string, string, string][] = [["ins", "Cargo insurance", "Cover every booking in one click"], ["fin", "Trade finance", "Pay suppliers early against the B/L"], ["cus", "Customs brokerage", "Licensed brokers in 12 countries"], ["insp", "Container inspection", "Photo checks at pickup and delivery"]];

// ---------- carrier portal ----------
export const RFQS = [
  { id: "R1", from: "Gulfway Logistics", lane: "SHA → JEA", eq: "1 × 40' HC", cargo: "18 pallets · 21,400 kg · non-hazardous", ready: "20 Sep", due: "2 h", lo: 2300, hi: 2650 },
  { id: "R2", from: "Horizon Freight", lane: "SHA → JEA", eq: "3 × 40' GP", cargo: "Building supplies · 62,000 kg", ready: "24 Sep", due: "5 h", lo: 2150, hi: 2500 },
  { id: "R3", from: "Gulfway Logistics", lane: "NSA → JEA", eq: "2 × 40' RF", cargo: "Frozen food · reefer −18°C", ready: "22 Sep", due: "1 day", lo: 3100, hi: 3600 },
  { id: "R4", from: "Crescent Cargo", lane: "SHA → DMM", eq: "1 × 20' GP", cargo: "Auto parts · 14,800 kg", ready: "27 Sep", due: "1 day", lo: 1500, hi: 1800 },
];
export const SAILINGS = [
  { k: "AUR", v: "OL AURORA 126E", lane: "SHA → JEA", date: "26 Sep", cut: "24 Sep", total: 1800 },
  { k: "BOR", v: "OL BOREAS 127E", lane: "SHA → JEA", date: "3 Oct", cut: "1 Oct", total: 1800 },
  { k: "CAS", v: "OL CASPIAN 88W", lane: "SHA → DMM", date: "5 Oct", cut: "3 Oct", total: 2200 },
];
export const carrierWin = (p: number, lo: number, hi: number) => Math.round(Math.max(5, Math.min(92, 88 - ((p - lo * 0.92) / (hi - lo * 0.92)) * 70)));
export const RATE_LANES: [string, string, string, string][] = [["SHAJEA", "Shanghai → Jebel Ali", "USD 2,180", "9 forwarders"], ["NSAJEA", "Nhava Sheva → Jebel Ali", "USD 1,240", "6 forwarders"], ["SHADMM", "Shanghai → Dammam", "USD 2,390", "Hidden"]];
export const DEMAND = [18, 22, 27, 31, 38, 44, 41, 36];
export const PAYS: [string, string, string, string, Tone, string][] = [["SHP-2301", "Al Noor via Gulfway", "USD 2,180", "In escrow", "idle", "Releases on delivery, ~16 Oct"], ["SHP-2270", "Al Noor via Gulfway", "USD 2,140", "Paid", "ok", "Paid on delivery, 0 days"], ["SHP-2255", "Kaizen via Gulfway", "USD 1,420", "Paid", "ok", "Paid on delivery, 0 days"], ["SHP-2248", "Mirage via Horizon", "USD 2,310", "Disputed", "warn", "USD 75 surcharge under review"]];
export const SCORECARD: [string, string, string, number][] = [["On-time arrival", "92%", "#2 of 6 on SHA → JEA", 92], ["Quote accuracy", "96%", "Invoices matching quotes", 96], ["Reply speed", "12 min", "Fastest 20% of carriers", 88], ["Claims", "1.2 per 100 boxes", "Better than lane average", 80]];

// ---------- partner ----------
export const JOBS = [
  { id: "J1", ref: "SHP-2301", who: "Al Noor Home Appliances", what: "Import declaration, Jebel Ali", eta: "14 Oct", fee: 85, docs: ["Bill of lading", "Commercial invoice", "Packing list", "Certificate of origin"], hs: "8418.10, 8450.11", duty: "5% of CIF · est. USD 3,120" },
  { id: "J2", ref: "SHP-2298", who: "Desert Bloom Foods", what: "Import declaration, reefer", eta: "30 Sep", fee: 110, docs: ["Bill of lading", "Commercial invoice", "Health certificate", "Packing list"], hs: "0303.89", duty: "0% (food staple)" },
  { id: "J3", ref: "SHP-2284", who: "Mirage Textiles", what: "Import declaration", eta: "2 Oct", fee: 85, docs: ["Bill of lading", "Commercial invoice", "Packing list"], hs: "5208.52", duty: "5% of CIF · est. USD 1,480", missing: "Certificate of origin" },
];
export const PARTNER_TYPES: [string, string, string][] = [["Customs brokers", "Declarations with documents already attached", "Live in pilot"], ["Cargo insurers", "Quote and cover each booking automatically", "Phase 6"], ["Warehouses", "Delivery slots and storage booked on arrival", "Phase 2"], ["Truckers", "Last-mile jobs offered by lane", "Phase 3"]];

// ---------- insights ----------
export const WIN_LOSS: [string, string, number, number][] = [["Oceanlink Lines", "OL", 38, 9], ["Pacific Crest", "PC", 21, 14], ["BlueHarbor Marine", "BH", 17, 12], ["Meridian Container", "MC", 11, 22], ["Saffron Sea Lines", "SS", 6, 18]];
export const LOSS_REASONS: [string, number][] = [["Price above the winner", 46], ["Transit time too long", 21], ["Cut-off missed", 14], ["We replied too late", 11], ["Other", 8]];
export const LOSSES: [string, string, string, string, string][] = [["Horizon Build Supply", "NSA → JEA", "USD 1,940", "+6%", "Price"], ["Mirage Textiles", "MAA → JEA", "USD 2,310", "+4%", "Price"], ["Kaizen Auto Parts", "SHA → JEA", "USD 2,480", "—", "Cut-off missed"], ["Desert Bloom Foods", "NSA → JEA", "USD 3,420", "+2%", "Transit time"]];

// ---------- setup ----------
export const VISIBILITY: [string, string, string, string, string][] = [
  ["Cargo details and dates", "Own request", "Everything", "Only their own RFQ", "Only their own job"],
  ["Carrier rates", "Never", "Everything", "Own rate only", "Never"],
  ["Other carriers' bids", "Never", "Everything", "Never", "Never"],
  ["Your margin", "Never", "Everything", "Never", "Never"],
  ["Shipment milestones", "Own shipments", "Everything", "Own leg", "Own leg"],
];
