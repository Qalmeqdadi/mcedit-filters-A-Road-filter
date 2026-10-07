// 4.3 Turn replies into data. A carrier reply (email, PDF text, chat or voice transcript) becomes
// fields, each with its own confidence and source span (4.3.1, 4.3.2). Fields below the confidence
// rule set go to a person with the source shown (4.3.3). Every correction becomes a labelled example
// (4.3.4), and accuracy is tracked per carrier and format, flagging formats that need a template (4.3.5).
import type { RulesetBody } from "../config/schema";
import { findDates } from "../extract/dates";
import { span, type ExtractedField, type Fields } from "../extract/types";
import { findHub } from "../network/hubs";
import { parseBreakdown, type RawLine } from "../p3/charges";

export type ReplyChannel = "email" | "pdf" | "chat" | "portal" | "api" | "edi" | "phone";

export interface CarrierReply {
  id: string;
  carrierOrgId: string;
  channel: ReplyChannel;
  text: string;
  receivedAt: Date;
}

/** The fields 4.3.1 extracts. Names match the confidence rule set's perField keys. */
export const REPLY_FIELDS = ["rate", "currency", "equipment", "transitDays", "routing", "cutoff", "validity", "conditions", "lines"] as const;
export type ReplyField = (typeof REPLY_FIELDS)[number];

/** Fields a quote cannot go out without; a missing one is asked of the carrier, not guessed. */
export const REQUIRED_REPLY_FIELDS: ReplyField[] = ["rate", "currency", "equipment", "transitDays", "cutoff", "validity"];

export interface Extractor {
  /** Recorded on every field and in the audit trail, e.g. "reply-rules@1". */
  readonly version: string;
  extractReply(reply: CarrierReply): Promise<Fields>;
}

export const REPLY_RULES_VERSION = "reply-rules@1";

const fld = (field: string, value: unknown, confidence: number, src: string, start?: number, end?: number, note?: string): ExtractedField => ({
  field,
  value,
  confidence,
  source: start !== undefined && end !== undefined ? span(src, start, end) : undefined,
  by: REPLY_RULES_VERSION,
  note,
});

const missing = (field: string, note = "Not stated in the reply"): ExtractedField => ({ field, value: null, confidence: 0, by: REPLY_RULES_VERSION, note });

const first = (re: RegExp, s: string) => {
  re.lastIndex = 0;
  return re.exec(s);
};
const num = (s: string) => Number(s.replace(/,/g, ""));

/** Deterministic extractor: handles the common shapes of email, PDF-table and chat replies. */
export class RuleReplyExtractor implements Extractor {
  readonly version = REPLY_RULES_VERSION;

  async extractReply(r: CarrierReply): Promise<Fields> {
    return extractReplyRules(r);
  }
}

export function extractReplyRules(r: CarrierReply): Fields {
  const t = r.text;
  const out: Fields = {};
  const isChat = r.channel === "chat" || r.channel === "phone";

  // Currency: stated, implied in chat ("usd ofc"), or unknown.
  const cur = first(/\b(USD|US\$|AED|EUR|SAR|CNY|INR)\b|\$/gi, t);
  if (cur) {
    const c = cur[0].toUpperCase().replace("US$", "USD").replace("$", "USD");
    out.currency = fld("currency", c, isChat ? 0.9 : 0.98, t, cur.index, cur.index + cur[0].length);
  } else out.currency = missing("currency");

  // Rate: an explicit all-in figure, a table total, or the sum of a breakdown.
  const allIn =
    first(/\ball[\s-]*in\b[^\d\n]{0,12}?(?:USD|AED|EUR|\$)?\s?(\d{1,3}(?:,\d{3})+|\d{3,6})/gi, t) ??
    first(/(?:USD|\$)?\s?(\d{1,3}(?:,\d{3})+|\d{3,6})\s*(?:usd)?\s*all[\s-]*in\b/gi, t);
  const table = first(/\bTOTAL\b[\s\S]{0,200}?\n[^\n]*?(\d{1,3}(?:,\d{3})+|\d{3,6})\s*$/m, t);
  const lines = parseBreakdown(t.replace(/=\s*all[\s-]*in[^\n]*/gi, ""), (out.currency.value as string) ?? undefined).filter((l) => l.amount > 0);
  if (allIn?.[1]) {
    const s = allIn.index + allIn[0].lastIndexOf(allIn[1]);
    out.rate = fld("rate", num(allIn[1]), isChat ? 0.88 : 0.98, t, allIn.index, s + allIn[1].length);
  } else if (table?.[1]) {
    const s = table.index + table[0].lastIndexOf(table[1]);
    out.rate = fld("rate", num(table[1]), 0.97, t, s, s + table[1].length, "Read from the TOTAL column");
  } else if (lines.length) {
    out.rate = fld("rate", lines.reduce((a, l) => a + l.amount, 0), 0.8, t, undefined, undefined, "Sum of the breakdown; no all-in figure stated");
  } else out.rate = missing("rate");

  // Breakdown (3.2.1 maps these onto charge codes)
  const tableLines = pdfTableLines(t);
  const breakdown = tableLines.length ? tableLines : lines;
  out.lines = breakdown.length ? fld("lines", breakdown, tableLines.length ? 0.95 : 0.93, t) : missing("lines");

  // Equipment
  const eq = first(/\b(?:\d\s*[x×]\s*)?(20|40|45)\s*'?\s*(hc|hq|gp|dv|rf|ot|fr|st)\b/gi, t);
  if (eq) {
    const code = `${eq[1]}${eq[2]!.toUpperCase().replace("HQ", "HC").replace("DV", "GP").replace("ST", "GP")}`;
    out.equipment = fld("equipment", code, 0.97, t, eq.index, eq.index + eq[0].length);
  } else out.equipment = missing("equipment");

  // Transit time
  const tt = first(/\b(?:t\/t|transit(?:\s+time)?|tt)\b[^\d\n]{0,12}?(\d{1,2})\s*(?:days?|d)\b|\b(?:abt\.?|about|around|approx\.?|~)?\s*(\d{1,2})\s*days?\b/gi, t);
  if (tt) {
    const days = num(tt[1] ?? tt[2]!);
    const approx = /abt|about|around|approx|~/i.test(tt[0]);
    out.transitDays = fld("transitDays", days, approx ? 0.9 : 0.97, t, tt.index, tt.index + tt[0].length, approx ? "Approximate" : undefined);
  } else out.transitDays = missing("transitDays");

  // Routing: direct or via a transshipment port
  const via = first(/\b(?:via|t\/s|transship(?:ment)?\s+(?:at|in|via)?|tranship\s+at)\s+([a-z][a-z ]{2,20})/gi, t);
  const direct = first(/\bdirect(?:\s+service|\s+call|\s+sailing)?\b/gi, t);
  if (via?.[1]) {
    const hub = findHub(via[1], ["port"]);
    out.routing = fld("routing", hub ? `via ${hub.code}` : `via ${via[1].trim()}`, hub ? 0.92 : 0.7, t, via.index, via.index + via[0].length, hub ? hub.name : "Transshipment port not recognised");
  } else if (direct) out.routing = fld("routing", "direct", 0.96, t, direct.index, direct.index + direct[0].length);
  else out.routing = missing("routing");

  // Dates: cut-off and validity
  const dates = findDates(t, r.receivedAt);
  const ctx = (d: { start: number }) => t.slice(Math.max(0, d.start - 30), d.start).toLowerCase();
  const cut = dates.find((d) => /cut\s*-?\s*off|closing|cy\s+cut|gate\s*-?\s*in|cutoff/.test(ctx(d)));
  const val = dates.find((d) => d !== cut && /valid|validity|until|till/.test(ctx(d)));
  out.cutoff = cut ? fld("cutoff", cut.date, cut.confidence, t, cut.start, cut.end, cut.confidence < 0.8 ? "Read from a spelled-out date (voice note)" : undefined) : missing("cutoff");
  out.validity = val ? fld("validity", val.date, val.confidence, t, val.start, val.end) : missing("validity");

  // Conditions (3.2.4 and 4.4 read these)
  const conds = [...t.matchAll(/\b(subject\s+to\s+[a-z &]+|space\s+(?:tight|limited|ok[^.\n]*)|excl(?:uding|\.)?\s+[a-z ]+|free\s+time[^.\n]*|\d+\s+days\s+free\s+time[^.\n]*)/gi)];
  out.conditions = conds.length
    ? fld("conditions", conds.map((m) => m[0].trim()), 0.85, t, conds[0]!.index!, conds[0]!.index! + conds[0]![0].length)
    : fld("conditions", [], 0.8, t, undefined, undefined, "No conditions stated");

  return out;
}

/** Column-style quotations (PDF text): a header row naming charge columns and a data row of numbers. */
function pdfTableLines(t: string): RawLine[] {
  const rows = t.split("\n");
  for (let i = 0; i < rows.length - 1; i++) {
    // A header row names columns and carries no figures; "O/F USD 1,850 + BAF 240" is a breakdown, not a header.
    if (/\d/.test(rows[i]!)) continue;
    const head = rows[i]!.trim().split(/\s{2,}|\t|\s(?=[A-Z]{3,}\b)/).map((s) => s.trim()).filter(Boolean);
    if (!head.some((h) => /^(OFT|O\/F|OFR|FREIGHT)$/i.test(h))) continue;
    const vals = rows[i + 1]!.trim().split(/\s+/);
    if (vals.length < head.length) continue;
    const offset = vals.length - head.length;
    const out: RawLine[] = [];
    head.forEach((h, k) => {
      const v = vals[k + offset]!;
      if (/^\d[\d,]*(\.\d+)?$/.test(v) && !/^(TOTAL|ALL\s*IN)$/i.test(h)) out.push({ name: h, amount: num(v), source: `${h} ${v}` });
    });
    if (out.length) return out;
  }
  return [];
}

// ── 4.3.3 Route low-confidence fields to a person ────────────────────────────

export interface ReviewItem {
  replyId: string;
  carrierOrgId: string;
  field: string;
  value: unknown;
  confidence: number;
  threshold: number;
  /** "confirm" a shaky value, or "ask" the carrier for a missing one. */
  action: "confirm" | "ask";
  source?: ExtractedField["source"];
  note?: string;
}

export function reviewQueue(reply: CarrierReply, fields: Fields, rules: RulesetBody<"confidence">): ReviewItem[] {
  const out: ReviewItem[] = [];
  for (const f of Object.values(fields)) {
    const threshold = rules.perField[f.field] ?? rules.defaultThreshold;
    const required = (REQUIRED_REPLY_FIELDS as string[]).includes(f.field);
    if (f.value === null || (Array.isArray(f.value) && f.value.length === 0 && f.field === "lines")) {
      if (required || f.field === "lines") out.push({ replyId: reply.id, carrierOrgId: reply.carrierOrgId, field: f.field, value: null, confidence: 0, threshold, action: "ask", note: f.note });
    } else if (f.confidence < threshold) {
      out.push({ replyId: reply.id, carrierOrgId: reply.carrierOrgId, field: f.field, value: f.value, confidence: f.confidence, threshold, action: "confirm", source: f.source, note: f.note });
    }
  }
  return out;
}

// ── 4.3.4 Corrections become labelled training data ──────────────────────────

export interface TrainingLabel {
  replyId: string;
  carrierOrgId: string;
  format: ReplyChannel;
  field: string;
  predicted: unknown;
  corrected: unknown;
  wasCorrect: boolean;
  labelledBy: string;
  modelVersion: string;
  at: Date;
}

/** A person confirmed or corrected a field. Confirmations are labels too: they measure accuracy. */
export function label(reply: CarrierReply, f: ExtractedField, corrected: unknown, labelledBy: string, at = new Date()): TrainingLabel {
  return {
    replyId: reply.id,
    carrierOrgId: reply.carrierOrgId,
    format: reply.channel,
    field: f.field,
    predicted: f.value,
    corrected,
    wasCorrect: JSON.stringify(f.value) === JSON.stringify(corrected),
    labelledBy,
    modelVersion: f.by,
    at,
  };
}

// ── 4.3.5 Accuracy per carrier and format ────────────────────────────────────

export interface FormatAccuracy {
  carrierOrgId: string;
  format: ReplyChannel;
  labels: number;
  accuracy: number;
  needsTemplate: boolean;
}

export function accuracyByFormat(labels: TrainingLabel[], rules: RulesetBody<"confidence">): FormatAccuracy[] {
  const groups = new Map<string, TrainingLabel[]>();
  for (const l of labels) {
    const k = `${l.carrierOrgId}|${l.format}`;
    groups.set(k, [...(groups.get(k) ?? []), l]);
  }
  return [...groups.entries()].map(([k, ls]) => {
    const [carrierOrgId, format] = k.split("|") as [string, ReplyChannel];
    const accuracy = ls.filter((l) => l.wasCorrect).length / ls.length;
    return { carrierOrgId, format, labels: ls.length, accuracy: Math.round(accuracy * 1000) / 1000, needsTemplate: accuracy < rules.templateFlagAccuracy };
  });
}
