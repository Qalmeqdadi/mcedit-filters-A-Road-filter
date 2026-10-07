// 3.2 Normalise rates. Every carrier names its charges differently; this maps them onto one
// charge-code dictionary (3.2.1), converts currency and unit basis to one per-shipment figure (3.2.2),
// separates freight, surcharges, local charges and inland legs (3.2.3) and records what is included (3.2.4).
// Unknown charge names are never guessed into a code: they go to a person (see "Who performs" in the document).
import { chargeableKg, revenueTons, teu, trucksNeeded } from "../network/modes";

export type ChargeCategory = "freight" | "surcharge" | "origin" | "destination" | "inland" | "customs" | "insurance";
export type ChargeBasis =
  | "per_container" | "per_teu" | "per_bl" | "per_shipment" | "per_kg" | "per_cbm" | "per_wm"
  | "per_truck" | "per_pallet" | "pct_of_freight";

export interface ChargeCode {
  code: string;
  name: string;
  category: ChargeCategory;
  basis: ChargeBasis;
  /** Lower-case names carriers use. Matched as whole phrases. */
  aliases: string[];
}

/** The dictionary. Seeds the charge_code table (src/db/schema.ts). */
export const CHARGE_CODES: readonly ChargeCode[] = [
  // Ocean
  { code: "OFR", name: "Ocean freight", category: "freight", basis: "per_container", aliases: ["o/f", "of", "oft", "ocean freight", "basic ocean freight", "bof", "freight", "sea freight"] },
  { code: "BAF", name: "Bunker adjustment", category: "surcharge", basis: "per_container", aliases: ["baf", "bunker", "bunker adjustment factor", "bunker surcharge", "fuel adjustment"] },
  { code: "LSS", name: "Low-sulphur surcharge", category: "surcharge", basis: "per_container", aliases: ["lss", "low sulphur", "low sulfur surcharge", "imo 2020"] },
  { code: "EBS", name: "Emergency bunker surcharge", category: "surcharge", basis: "per_container", aliases: ["ebs", "emergency bunker"] },
  { code: "PSS", name: "Peak season surcharge", category: "surcharge", basis: "per_container", aliases: ["pss", "peak season", "peak season surcharge"] },
  { code: "GRI", name: "General rate increase", category: "surcharge", basis: "per_container", aliases: ["gri", "general rate increase"] },
  { code: "CAF", name: "Currency adjustment", category: "surcharge", basis: "pct_of_freight", aliases: ["caf", "currency adjustment"] },
  { code: "WRS", name: "War risk surcharge", category: "surcharge", basis: "per_container", aliases: ["wrs", "war risk", "war risk surcharge"] },
  { code: "SUR", name: "Surcharges (not itemised)", category: "surcharge", basis: "per_container", aliases: ["surch", "surcharges", "surcharge", "other surcharges"] },
  { code: "THO", name: "Terminal handling, origin", category: "origin", basis: "per_container", aliases: ["thc origin", "othc", "o thc", "origin thc", "terminal handling origin", "thc pol", "origin terminal handling"] },
  { code: "THD", name: "Terminal handling, destination", category: "destination", basis: "per_container", aliases: ["thc destination", "dthc", "d thc", "destination thc", "thc pod", "terminal handling destination"] },
  { code: "DOC", name: "Documentation and B/L", category: "origin", basis: "per_bl", aliases: ["doc", "docs", "documentation", "doc fee", "b/l fee", "bl fee", "documents and b/l"] },
  { code: "ISP", name: "Port security (ISPS)", category: "origin", basis: "per_container", aliases: ["isps", "port security"] },
  { code: "SEA", name: "Seal fee", category: "origin", basis: "per_container", aliases: ["seal", "seal fee"] },
  { code: "VGM", name: "VGM weighing", category: "origin", basis: "per_container", aliases: ["vgm", "vgm fee", "weighing"] },
  { code: "ENS", name: "Advance filing (ENS, AMS)", category: "origin", basis: "per_bl", aliases: ["ens", "ams", "advance filing", "aci"] },
  { code: "DDF", name: "Delivery order fee", category: "destination", basis: "per_bl", aliases: ["do fee", "delivery order", "d/o fee"] },
  // Air
  { code: "AFR", name: "Air freight", category: "freight", basis: "per_kg", aliases: ["air freight", "a/f", "afr", "airfreight", "net net rate"] },
  { code: "FSC", name: "Fuel surcharge (air)", category: "surcharge", basis: "per_kg", aliases: ["fsc", "fuel surcharge", "myc"] },
  { code: "SSC", name: "Security surcharge (air)", category: "surcharge", basis: "per_kg", aliases: ["ssc", "security surcharge", "xdc"] },
  { code: "SCR", name: "Screening", category: "origin", basis: "per_kg", aliases: ["screening", "x-ray", "xray"] },
  { code: "AWB", name: "Air waybill fee", category: "origin", basis: "per_shipment", aliases: ["awb", "awb fee", "air waybill"] },
  { code: "HDL", name: "Handling", category: "origin", basis: "per_shipment", aliases: ["handling", "handling fee", "terminal handling air"] },
  // Road and rail
  { code: "RFR", name: "Road freight", category: "freight", basis: "per_truck", aliases: ["road freight", "trucking", "linehaul", "ftl", "truck rate", "haulage"] },
  { code: "RFS", name: "Fuel surcharge (road)", category: "surcharge", basis: "pct_of_freight", aliases: ["road fuel surcharge", "diesel surcharge"] },
  { code: "BRD", name: "Border crossing fee", category: "inland", basis: "per_truck", aliases: ["border", "border fee", "border crossing", "transit fee"] },
  { code: "WTG", name: "Waiting time", category: "inland", basis: "per_truck", aliases: ["waiting", "waiting time", "detention truck"] },
  { code: "TRF", name: "Rail freight", category: "freight", basis: "per_container", aliases: ["rail freight", "train freight", "block train"] },
  { code: "INL", name: "Inland haulage", category: "inland", basis: "per_container", aliases: ["inland", "inland haulage", "pre-carriage", "on-carriage", "drayage", "delivery", "pickup", "pick up"] },
  // Customs and insurance
  { code: "CUS", name: "Customs clearance", category: "customs", basis: "per_shipment", aliases: ["customs", "customs clearance", "clearance", "declaration"] },
  { code: "DUT", name: "Duty and VAT (disbursement)", category: "customs", basis: "per_shipment", aliases: ["duty", "vat", "duties and taxes"] },
  { code: "INS", name: "Cargo insurance", category: "insurance", basis: "pct_of_freight", aliases: ["insurance", "cargo insurance"] },
];

export interface MappedCharge {
  code: ChargeCode | null;
  /** 1 for an exact alias, lower for a partial match, 0 when unknown. */
  confidence: number;
}

const clean = (s: string) => ` ${s.toLowerCase().replace(/[^a-z0-9/ ]+/g, " ").replace(/\s+/g, " ").trim()} `;

/** 3.2.1: maps a carrier's charge name onto the dictionary. */
export function mapCharge(name: string): MappedCharge {
  const n = clean(name);
  let best: { c: ChargeCode; len: number; exact: boolean } | undefined;
  for (const c of CHARGE_CODES) {
    for (const a of [c.code.toLowerCase(), ...c.aliases]) {
      const aa = clean(a);
      const exact = n === aa;
      if ((exact || n.includes(aa)) && (!best || Number(exact) > Number(best.exact) || (exact === best.exact && aa.length > best.len))) best = { c, len: aa.length, exact };
    }
  }
  if (!best) return { code: null, confidence: 0 };
  return { code: best.c, confidence: best.exact ? 0.99 : best.len >= 5 ? 0.88 : 0.75 };
}

// ── 3.2.2 Currency and unit basis ────────────────────────────────────────────

/** USD per unit of each currency. Illustrative; production reads a daily rate source and stores the rate used (3.4.3). */
export const FX_USD: Record<string, number> = { USD: 1, AED: 0.2723, SAR: 0.2667, QAR: 0.2747, OMR: 2.597, KWD: 3.26, EUR: 1.08, GBP: 1.27, CNY: 0.139, INR: 0.012, SGD: 0.74 };

export interface RawLine {
  name: string;
  amount: number;
  currency?: string;
  /** Overrides the dictionary's basis when the carrier states it ("per kg", "per BL"). */
  basis?: ChargeBasis;
  included?: boolean;
  source?: string;
}

export interface Shipment {
  /** Containers by equipment code, e.g. { "40HC": 1 }. */
  containers?: Record<string, number>;
  grossKg?: number;
  cbm?: number;
  pallets?: number;
  stackable?: boolean;
  bls?: number;
}

export interface NormalisedLine {
  raw: RawLine;
  code: string | null;
  name: string;
  category: ChargeCategory | "unknown";
  basis: ChargeBasis;
  units: number;
  currency: string;
  /** Per-shipment amount in the target currency. */
  total: number;
  included: boolean;
  confidence: number;
  /** Set when a person must decide (unknown charge, missing currency). */
  review?: string;
}

export interface NormalisedQuote {
  currency: string;
  lines: NormalisedLine[];
  byCategory: Record<ChargeCategory, number>;
  /** Comparable all-in per shipment: included lines only. */
  allIn: number;
  excluded: NormalisedLine[];
  review: NormalisedLine[];
  fxUsed: Record<string, number>;
}

function unitsFor(basis: ChargeBasis, s: Shipment): number {
  const containers = Object.values(s.containers ?? {}).reduce((a, b) => a + b, 0);
  switch (basis) {
    case "per_container":
      return Math.max(1, containers);
    case "per_teu":
      return Math.max(1, Object.entries(s.containers ?? {}).reduce((a, [eq, n]) => a + teu(eq) * n, 0));
    case "per_bl":
      return s.bls ?? 1;
    case "per_shipment":
      return 1;
    case "per_kg":
      return chargeableKg(s.grossKg ?? 0, s.cbm ?? 0);
    case "per_cbm":
      return s.cbm ?? 0;
    case "per_wm":
      return revenueTons(s.grossKg ?? 0, s.cbm ?? 0);
    case "per_truck":
      return s.pallets ? trucksNeeded(s.pallets, s.stackable) : 1;
    case "per_pallet":
      return s.pallets ?? 0;
    case "pct_of_freight":
      return 0; // resolved after freight is known
  }
}

/** 3.2.2–3.2.4: one carrier's lines → one comparable per-shipment cost in the target currency. */
export function normaliseQuote(lines: RawLine[], shipment: Shipment, opts: { currency?: string; defaultCurrency?: string; fx?: Record<string, number> } = {}): NormalisedQuote {
  const target = opts.currency ?? "USD";
  const fx = opts.fx ?? FX_USD;
  const fxUsed: Record<string, number> = {};
  const convert = (amount: number, from: string) => {
    const a = fx[from], b = fx[target];
    if (a === undefined || b === undefined) throw new Error(`no exchange rate for ${from}→${target}`);
    fxUsed[from] = a / b;
    return (amount * a) / b;
  };

  const out: NormalisedLine[] = lines.map((raw) => {
    const m = mapCharge(raw.name);
    const basis = raw.basis ?? m.code?.basis ?? "per_shipment";
    const currency = (raw.currency ?? opts.defaultCurrency ?? "").toUpperCase();
    const units = unitsFor(basis, shipment);
    const review = !m.code ? `Unknown charge "${raw.name}": map it to a code` : !currency ? "Currency not stated" : undefined;
    return {
      raw,
      code: m.code?.code ?? null,
      name: m.code?.name ?? raw.name,
      category: m.code?.category ?? "unknown",
      basis,
      units,
      currency: currency || target,
      total: basis === "pct_of_freight" || !currency ? 0 : round2(convert(raw.amount * units, currency)),
      included: raw.included ?? true,
      confidence: m.confidence,
      review,
    };
  });

  const freight = out.filter((l) => l.category === "freight" && l.included).reduce((a, l) => a + l.total, 0);
  for (const l of out) {
    if (l.basis === "pct_of_freight" && l.currency) {
      l.units = l.raw.amount;
      l.total = round2((freight * l.raw.amount) / 100);
    }
  }

  const byCategory = { freight: 0, surcharge: 0, origin: 0, destination: 0, inland: 0, customs: 0, insurance: 0 } as Record<ChargeCategory, number>;
  for (const l of out) if (l.included && l.category !== "unknown") byCategory[l.category] = round2(byCategory[l.category] + l.total);
  const allIn = round2(out.filter((l) => l.included).reduce((a, l) => a + l.total, 0));
  return { currency: target, lines: out, byCategory, allIn, excluded: out.filter((l) => !l.included), review: out.filter((l) => l.review), fxUsed };
}

/** Reads "O/F USD 1,850 + BAF 240 + THC origin 90" or one-per-line breakdowns into raw lines. */
export function parseBreakdown(text: string, defaultCurrency?: string): RawLine[] {
  const out: RawLine[] = [];
  const re = /([A-Za-z][A-Za-z /.'-]{1,30}?)\s*[:=]?\s*(USD|AED|EUR|SAR|CNY|INR|\$|€)?\s?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(USD|AED|EUR|SAR|CNY|INR)?(\s*(?:\/|per)\s*(kg|bl|b\/l|cbm|w\/m|truck|pallet|container|box|shipment))?/g;
  let currency = defaultCurrency;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const name = m[1]!.replace(/^(and|plus|then)\s+/i, "").trim();
    if (/^(all\s*in|total|=|rgds|validity|valid|t\/t|transit|cut\s*off|vsl)/i.test(name)) continue;
    const cur = (m[2] === "$" ? "USD" : m[2] === "€" ? "EUR" : m[2]) ?? m[4];
    if (cur) currency = cur.toUpperCase();
    const per = m[6]?.toLowerCase();
    const basis: ChargeBasis | undefined = per === "kg" ? "per_kg" : per === "bl" || per === "b/l" ? "per_bl" : per === "cbm" ? "per_cbm" : per === "w/m" ? "per_wm" : per === "truck" ? "per_truck" : per === "pallet" ? "per_pallet" : per === "shipment" ? "per_shipment" : per ? "per_container" : undefined;
    if (mapCharge(name).code || /^[A-Z]{2,5}$/.test(name)) out.push({ name, amount: Number(m[3]!.replace(/,/g, "")), currency, basis, source: m[0].trim() });
  }
  return out;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
