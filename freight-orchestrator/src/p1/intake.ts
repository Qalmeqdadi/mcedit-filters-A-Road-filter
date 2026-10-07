// 1.1 Receive the requirement: turn a shipper's email into a structured request draft,
// check it is complete enough to quote (1.1.4), draft the question for anything missing (1.1.5),
// and spot duplicates and revisions (1.1.6). Rule-based and deterministic; a model-based extractor
// (src/ai/claude.ts) returns the same Fields shape and can replace or second-check it.
import { findDates } from "../extract/dates";
import { span, type ExtractedField, type Fields } from "../extract/types";
import { findHub, type Hub, type HubKind } from "../network/hubs";
import { type Mode } from "../network/modes";
import { parseEmail, type ParsedEmail } from "./email";

export const RULES_VERSION = "intake-rules@1";

export interface RequestDraft {
  email: ParsedEmail;
  fields: Fields;
  /** The fields as plain values, for the request row. */
  values: {
    customer?: string;
    commodity?: string;
    origin?: string;
    destination?: string;
    mode?: Mode;
    packages?: { count: number; type: string };
    dimsCm?: { l: number; w: number; h: number };
    grossKg?: number;
    cbm?: number;
    stackable?: boolean;
    readyDate?: string;
    deliverBy?: string;
    hardDeadline?: boolean;
    incoterm?: string;
    dangerousGoods?: boolean;
    unNumber?: string;
    dgClass?: string;
    tempC?: { min: number; max: number };
    cargoValue?: { amount: number; currency: string };
    equipment?: { count: number; type: string };
  };
}

const f = (field: string, value: unknown, confidence: number, src: string, start?: number, end?: number, note?: string): ExtractedField => ({
  field,
  value,
  confidence,
  source: start !== undefined && end !== undefined ? span(src, start, end) : undefined,
  by: RULES_VERSION,
  note,
});

const num = (s: string) => Number(s.replace(/,/g, ""));

function first(re: RegExp, s: string): RegExpExecArray | null {
  re.lastIndex = 0;
  return re.exec(s);
}

/** Phrases that introduce the origin or the destination. */
const ORIGIN_CUES = /\b(?:from|ex|in|at|pick\s*up\s+(?:in|at|from)|origin|pol|loading\s+port|supplier\s+in)\s*[:\-]?\s+/gi;
const DEST_CUES = /\b(?:to|into|going\s+to|deliver(?:ed|y)?\s+(?:to|in|at)|destination|pod|discharge\s+port)\s*[:\-]?\s+/gi;

function placeAfter(text: string, cues: RegExp, kinds: HubKind[] | undefined, skip: Set<string>): { hub: Hub; start: number; end: number; offKind?: boolean } | null {
  // Prefer hubs that suit the mode; fall back to any hub (e.g. a city with a port but no airport in master data).
  const exact = placeAfterKinds(text, cues, kinds, skip);
  if (exact || !kinds) return exact;
  const any = placeAfterKinds(text, cues, undefined, skip);
  return any ? { ...any, offKind: true } : null;
}

function placeAfterKinds(text: string, cues: RegExp, kinds: HubKind[] | undefined, skip: Set<string>) {
  cues.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = cues.exec(text))) {
    const startAt = m.index + m[0].length;
    const window = text.slice(startAt, startAt + 40);
    // Stop at the next place cue, so "from Shenzhen to Riyadh" reads Shenzhen as the origin.
    const phrase = (window.split(/[.,;\n]/)[0] ?? "").split(/\s(?:to|into|via|and|going|deliver\w*|from|ex)\s/i)[0] ?? "";
    const hub = findHub(phrase, kinds);
    if (hub && !skip.has(hub.code)) {
      const names = [hub.code, hub.city, hub.name, ...(hub.aliases ?? [])];
      const lw = window.toLowerCase();
      const hit = names.map((n) => ({ n, i: lw.indexOf(n.toLowerCase()) })).filter((x) => x.i >= 0).sort((a, b) => a.i - b.i)[0];
      const s = startAt + (hit?.i ?? 0);
      return { hub, start: s, end: s + (hit?.n.length ?? 0) };
    }
  }
  return null;
}

function detectMode(t: string): { mode: Mode; at: [number, number]; conf: number } | null {
  const rules: [RegExp, Mode][] = [
    [/\b(air\s*freight|by\s+air|fly|flown|airway\s*bill|awb|air\s+cargo)\b/i, "air"],
    [/\b(lcl|consol(?:idation)?|part\s+container)\b/i, "ocean_lcl"],
    [/\b(fcl|\d\s*[x×]\s*(?:20|40|45)\s*'?\s*(?:gp|hc|hq|rf|dv)?|container|by\s+sea|ocean|vessel)\b/i, "ocean_fcl"],
    [/\b(by\s+rail|rail(?:way)?|train|wagon)\b/i, "rail"],
    [/\b(ftl|ltl|truck|trailer|by\s+road|lorry|overland)\b/i, "road"],
  ];
  for (const [re, mode] of rules) {
    const m = first(re, t);
    if (m) return { mode, at: [m.index, m.index + m[0].length], conf: 0.92 };
  }
  return null;
}

export function extractRequest(input: string | ParsedEmail, now = new Date()): RequestDraft {
  const email = typeof input === "string" ? parseEmail(input) : input;
  const attachText = email.attachments.map((a) => a.text ?? "").join("\n");
  const src = [email.subject, email.text, attachText].filter(Boolean).join("\n\n");
  const ref = email.date ?? now;
  const fields: Fields = {};
  const v: RequestDraft["values"] = {};

  // Customer: the sender's organisation from the signature line or the From display name (1.4.1 matches it later).
  const org = first(/\n\s*(?:[A-Z][\w'&.-]+(?:\s+[A-Z][\w'&.-]+){0,4})\s*(?:\n|$)/g, email.text.split(/\n(?:thanks|regards|best|rgds)[,!]?\s*\n/i)[1] ?? "");
  const customer = email.fromName || org?.[0].trim();
  if (customer) {
    v.customer = customer;
    fields.customer = f("customer", customer, email.fromName ? 0.8 : 0.6, src, undefined, undefined, "From the sender; matched to a customer account in 1.4.1");
  }

  // Commodity
  const com = first(/\b(?:\d+\s*(?:pallets?|cartons?|crates?|boxes|packages|pieces|drums)\s+of|order\s+of|shipment\s+of|commodity\s*[:\-]|cargo\s*(?:is|:)|goods\s*[:\-]|consisting\s+of)\s*([a-z][a-z \-/&]{2,60}?)(?=\s+(?:ready|from|in|at|going|to|which|that|,|\.)|[.,\n])/gi, src);
  if (com?.[1]) {
    const s = com.index + com[0].indexOf(com[1]);
    v.commodity = com[1].trim();
    fields.commodity = f("commodity", v.commodity, 0.85, src, s, s + com[1].length);
  }

  // Mode, then origin and destination with hub kinds that suit the mode.
  const mode = detectMode(src);
  const kinds: HubKind[] | undefined = mode?.mode === "air" ? ["airport"] : mode?.mode === "road" ? ["truck", "port"] : mode?.mode === "rail" ? ["rail"] : undefined;
  const lane = first(/\b([A-Z][a-zA-Z' ]{2,24})\s+(?:to|→|->|–|-)\s+([A-Z][a-zA-Z' ]{2,24})\b/g, src);
  let origin = placeAfter(src, ORIGIN_CUES, kinds, new Set());
  let dest = placeAfter(src, DEST_CUES, kinds, new Set(origin ? [origin.hub.code] : []));
  if ((!origin || !dest) && lane) {
    const a = findHub(lane[1]!, kinds), b = findHub(lane[2]!, kinds);
    if (a && !origin) origin = { hub: a, start: lane.index, end: lane.index + lane[1]!.length };
    if (b && !dest) dest = { hub: b, start: lane.index + lane[0].lastIndexOf(lane[2]!), end: lane.index + lane[0].length };
  }
  if (origin) {
    v.origin = origin.hub.code;
    const off = "offKind" in origin && origin.offKind;
    fields.origin = f("origin", origin.hub.code, off ? 0.65 : 0.9, src, origin.start, origin.end, off ? `${origin.hub.name}: no ${mode?.mode ?? ""} hub for this city in master data` : `${origin.hub.name}, ${origin.hub.country}`);
  }
  if (dest) {
    v.destination = dest.hub.code;
    const off = "offKind" in dest && dest.offKind;
    fields.destination = f("destination", dest.hub.code, off ? 0.65 : 0.9, src, dest.start, dest.end, off ? `${dest.hub.name}: no ${mode?.mode ?? ""} hub for this city in master data` : `${dest.hub.name}, ${dest.hub.country}`);
  }
  if (mode) {
    v.mode = mode.mode;
    fields.mode = f("mode", mode.mode, mode.conf, src, mode.at[0], mode.at[1]);
  } else if (origin?.hub.kind === "port" && dest?.hub.kind === "port") {
    v.mode = "ocean_fcl";
    fields.mode = f("mode", "ocean_fcl", 0.6, src, undefined, undefined, "Inferred: both ends are seaports and no mode was named");
  }

  // Equipment, packages, dimensions, weight, volume
  const eq = first(/\b(\d+)\s*[x×]\s*(20|40|45)\s*'?\s*(gp|hc|hq|rf|dv|st)?\b/gi, src);
  if (eq) {
    const type = `${eq[2]}${(eq[3] ?? "GP").toUpperCase().replace("HQ", "HC").replace("DV", "GP").replace("ST", "GP")}`;
    v.equipment = { count: num(eq[1]!), type };
    fields.equipment = f("equipment", v.equipment, 0.95, src, eq.index, eq.index + eq[0].length);
  }
  const pk = first(/\b(\d{1,4})\s*(pallets?|cartons?|crates?|boxes|packages|pieces|pcs|drums|bags|skids)\b/gi, src);
  if (pk) {
    v.packages = { count: num(pk[1]!), type: pk[2]!.toLowerCase().replace(/s$/, "").replace("pc", "piece") };
    fields.packages = f("packages", v.packages, 0.95, src, pk.index, pk.index + pk[0].length);
  }
  const dm = first(/\b(\d{2,4}(?:\.\d+)?)\s*[x×*]\s*(\d{2,4}(?:\.\d+)?)\s*[x×*]\s*(\d{2,4}(?:\.\d+)?)\s*(cm|mm|m|in)?\b/gi, src);
  if (dm) {
    const k = { mm: 0.1, m: 100, in: 2.54, cm: 1 }[(dm[4] ?? "cm").toLowerCase() as "cm"] ?? 1;
    v.dimsCm = { l: num(dm[1]!) * k, w: num(dm[2]!) * k, h: num(dm[3]!) * k };
    fields.dims = f("dims", v.dimsCm, dm[4] ? 0.95 : 0.8, src, dm.index, dm.index + dm[0].length, dm[4] ? undefined : "Unit not stated; read as cm");
  }
  const wt = [...src.matchAll(/\b(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(kgs?|kilos?|tons?|tonnes?|mt|t|lbs?)\b/gi)];
  const total = wt.find((m) => /total|gross|weight|weighs|g\.?w/i.test(src.slice(Math.max(0, m.index! - 24), m.index))) ?? wt[0];
  if (total) {
    const u = total[2]!.toLowerCase();
    const kg = u.startsWith("lb") ? num(total[1]!) * 0.4536 : /^(t|mt|ton|tonne)/.test(u) ? num(total[1]!) * 1000 : num(total[1]!);
    v.grossKg = Math.round(kg);
    fields.grossKg = f("grossKg", v.grossKg, wt.length > 1 && total !== wt[0] ? 0.9 : 0.93, src, total.index!, total.index! + total[0].length);
  }
  const vol = first(/\b(\d+(?:\.\d+)?)\s*(cbm|m3|m³|cubic\s+met(?:re|er)s?)\b/gi, src);
  if (vol) {
    v.cbm = num(vol[1]!);
    fields.cbm = f("cbm", v.cbm, 0.95, src, vol.index, vol.index + vol[0].length);
  } else if (v.dimsCm && v.packages) {
    v.cbm = Math.round(((v.dimsCm.l * v.dimsCm.w * v.dimsCm.h) / 1e6) * v.packages.count * 10) / 10;
    fields.cbm = f("cbm", v.cbm, 0.9, src, undefined, undefined, "Computed from packages × dimensions");
  }
  const nostack = first(/\b(not\s+stackable|non[-\s]?stackable|can'?t\s+be\s+(?:double\s+)?stacked|cannot\s+be\s+(?:double\s+)?stacked|no\s+stacking|do\s+not\s+stack)\b/gi, src);
  const stack = nostack ? null : first(/\b(stackable|can\s+be\s+stacked)\b/gi, src);
  if (nostack || stack) {
    const m = (nostack ?? stack)!;
    v.stackable = !nostack;
    fields.stackable = f("stackable", v.stackable, 0.95, src, m.index, m.index + m[0].length);
  }

  // Dates: ready date and delivery deadline (1.3.1)
  const dates = findDates(src, ref);
  const before = (d: { start: number }, n = 40) => src.slice(Math.max(0, d.start - n), d.start).toLowerCase();
  const ready = dates.find((d) => /ready|from|available|collect|pick\s*up|etd|cargo ready/.test(before(d, 30)));
  const due = dates.find((d) => d !== ready && /\bby\b|latest|deadline|before|no later|needed|need it|eta|deliver|arrive/.test(before(d, 50)));
  if (ready) {
    v.readyDate = ready.date;
    fields.readyDate = f("readyDate", ready.date, ready.confidence, src, ready.start, ready.end);
  }
  if (due) {
    v.deliverBy = due.date;
    const after = src.slice(due.end, due.end + 30).toLowerCase();
    v.hardDeadline = /at the latest|latest|hard|must|no later|strict/.test(before(due, 50) + after);
    fields.deliverBy = f("deliverBy", due.date, due.confidence, src, due.start, due.end, v.hardDeadline ? "Hard deadline" : "Soft deadline");
  }

  // Incoterm (1.2.5)
  const inc = first(/\b(EXW|FCA|FAS|FOB|CFR|CIF|CPT|CIP|DAP|DPU|DDP)\b/g, src);
  if (inc) {
    v.incoterm = inc[1]!;
    fields.incoterm = f("incoterm", v.incoterm, 0.97, src, inc.index, inc.index + inc[0].length);
  }

  // Special handling (1.2.3)
  const un = first(/\bUN\s?(\d{4})\b/g, src);
  const cls = first(/\b(?:class|cl\.?)\s*(\d(?:\.\d)?)\b/gi, src);
  const dgWord = first(/\b(dangerous\s+goods|hazardous|hazmat|imdg|imo\s+class|dg\s+cargo)\b/gi, src);
  const nonHaz = first(/\b(non[-\s]?hazardous|non[-\s]?dg|not\s+dangerous|general\s+cargo)\b/gi, src);
  if (un || dgWord) {
    v.dangerousGoods = true;
    const m = (un ?? dgWord)!;
    fields.dangerousGoods = f("dangerousGoods", true, 0.95, src, m.index, m.index + m[0].length);
    if (un) v.unNumber = `UN${un[1]}`;
    if (cls) v.dgClass = cls[1]!;
    if (un) fields.unNumber = f("unNumber", v.unNumber, 0.97, src, un.index, un.index + un[0].length);
    if (cls) fields.dgClass = f("dgClass", v.dgClass, 0.93, src, cls.index, cls.index + cls[0].length);
  } else if (nonHaz) {
    v.dangerousGoods = false;
    fields.dangerousGoods = f("dangerousGoods", false, 0.95, src, nonHaz.index, nonHaz.index + nonHaz[0].length);
  }
  const temp = first(/(-?\+?\d{1,2})\s*(?:°\s*c|c)?\s*(?:to|-|–|and)\s*(-?\+?\d{1,2})\s*°\s*c\b/gi, src) ?? first(/(-\d{1,2})\s*°\s*c\b/gi, src);
  if (temp) {
    const a = num(temp[1]!), b = temp[2] !== undefined ? num(temp[2]) : a;
    v.tempC = { min: Math.min(a, b), max: Math.max(a, b) };
    fields.tempC = f("tempC", v.tempC, 0.9, src, temp.index, temp.index + temp[0].length);
  }

  // Cargo value (1.3.4)
  const val = first(/\b(?:value|worth|invoice\s+value|cargo\s+value)\b[^.\n]{0,20}?\b(USD|AED|EUR|SAR|GBP|\$|€)\s?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)(k)?/gi, src);
  if (val) {
    const cur = val[1] === "$" ? "USD" : val[1] === "€" ? "EUR" : val[1]!.toUpperCase();
    v.cargoValue = { amount: num(val[2]!) * (val[3] ? 1000 : 1), currency: cur };
    fields.cargoValue = f("cargoValue", v.cargoValue, 0.9, src, val.index, val.index + val[0].length);
  }

  return { email, fields, values: v };
}

// ── 1.1.4 Completeness ───────────────────────────────────────────────────────

export interface Completeness {
  ok: boolean;
  missing: string[];
  /** Fields present but below the confidence a person should check (1.1 note: ambiguous cargo descriptions). */
  unsure: string[];
}

const LABELS: Record<string, string> = {
  origin: "where the cargo is collected (city or port)",
  destination: "where it is delivered",
  commodity: "what the goods are",
  grossKg: "the total gross weight",
  size: "the number of packages and their dimensions, or the total volume",
  readyDate: "the date the cargo is ready",
  unNumber: "the UN number and class of the dangerous goods",
  tempC: "the temperature range",
};

/** The minimum needed to quote. Matches the guard on the request machine's validate event. */
export function checkCompleteness(d: RequestDraft, threshold = 0.7): Completeness {
  const v = d.values;
  const missing: string[] = [];
  if (!v.origin) missing.push("origin");
  if (!v.destination) missing.push("destination");
  if (!v.commodity) missing.push("commodity");
  if (!v.grossKg) missing.push("grossKg");
  const hasSize = !!v.cbm || (!!v.packages && !!v.dimsCm) || (!!v.equipment && v.mode === "ocean_fcl");
  if (!hasSize) missing.push("size");
  if (!v.readyDate) missing.push("readyDate");
  if (v.dangerousGoods && !v.unNumber) missing.push("unNumber");
  if (/reefer|frozen|chilled|refrigerated/i.test(d.email.text) && !v.tempC) missing.push("tempC");
  const unsure = Object.values(d.fields).filter((x) => x.value !== null && x.confidence < threshold).map((x) => x.field);
  return { ok: missing.length === 0, missing, unsure };
}

// ── 1.1.5 Ask for what is missing ────────────────────────────────────────────

export function missingInfoReply(d: RequestDraft, c: Completeness, deskName: string): string {
  const name = (d.values.customer ?? "").split(" ")[0] || "there";
  const lines = c.missing.map((k) => `- ${LABELS[k] ?? k}`);
  const confirm = c.unsure.map((k) => `- ${k}: we read "${String(d.fields[k]?.source?.text ?? d.fields[k]?.value)}", please confirm`);
  return [
    `Hi ${name},`,
    "",
    "Thanks for the request. To send you a firm quote we still need:",
    ...lines,
    ...(confirm.length ? ["", "And please confirm:", ...confirm] : []),
    "",
    "As soon as we have these we will come back with options the same day.",
    "",
    `Best regards,`,
    deskName,
  ].join("\n");
}

// ── 1.1.6 Duplicates and revisions ───────────────────────────────────────────

export interface Known {
  id: string;
  fromDomain: string;
  messageId?: string | null;
  origin?: string;
  destination?: string;
  readyDate?: string;
  grossKg?: number;
}

export type DedupeResult = { kind: "new" } | { kind: "duplicate"; of: string } | { kind: "revision"; of: string; changed: string[] };

const domain = (email: string) => email.split("@")[1] ?? email;

export function dedupe(d: RequestDraft, known: Known[]): DedupeResult {
  const v = d.values;
  const dom = domain(d.email.from);
  const thread = d.email.inReplyTo ? known.find((k) => k.messageId && k.messageId === d.email.inReplyTo) : undefined;
  const sameLane = known.find((k) => k.fromDomain === dom && k.origin === v.origin && k.destination === v.destination);
  const base = thread ?? sameLane;
  if (!base) return { kind: "new" };
  const changed: string[] = [];
  if (base.readyDate !== v.readyDate) changed.push("readyDate");
  if (base.grossKg && v.grossKg && Math.abs(base.grossKg - v.grossKg) / base.grossKg > 0.02) changed.push("grossKg");
  if (base.origin !== v.origin) changed.push("origin");
  if (base.destination !== v.destination) changed.push("destination");
  if (!thread && changed.some((c) => c === "readyDate")) {
    // Same lane, different week: a new shipment, not a revision.
    const days = base.readyDate && v.readyDate ? Math.abs(Date.parse(base.readyDate) - Date.parse(v.readyDate)) / 864e5 : 0;
    if (days > 10) return { kind: "new" };
  }
  return changed.length ? { kind: "revision", of: base.id, changed } : { kind: "duplicate", of: base.id };
}

export const knownFrom = (id: string, d: RequestDraft): Known => ({
  id,
  fromDomain: domain(d.email.from),
  messageId: d.email.messageId,
  origin: d.values.origin,
  destination: d.values.destination,
  readyDate: d.values.readyDate,
  grossKg: d.values.grossKg,
});
