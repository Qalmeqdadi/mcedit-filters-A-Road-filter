// Model-based extraction for 1.1.3 (shipper requests) and 4.3.1 (carrier replies), server side only.
// Claude returns each field with a confidence and the exact text it read it from; offsets are then
// located in the source so the reviewer sees the span (4.3.3). The rule extractors stay in the loop:
// they are the fallback when the model is unavailable, and a second opinion when it is not.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { locate, type ExtractedField, type Fields } from "../extract/types";
import { findHub } from "../network/hubs";
import { extractRequest, type RequestDraft } from "../p1/intake";
import type { RawLine } from "../p3/charges";
import { extractReplyRules, REPLY_FIELDS, type CarrierReply, type Extractor } from "../p4/replies";

export const CLAUDE_MODEL = "claude-opus-5-5";
export const PROMPTS = { reply: "reply-v1", request: "request-v1" } as const;

// ── Output schemas ───────────────────────────────────────────────────────────

const value = z.union([z.string(), z.number(), z.boolean(), z.null()]);

const fieldOut = <E extends [string, ...string[]]>(names: E) =>
  z.object({
    field: z.enum(names),
    value,
    confidence: z.number().describe("0 to 1: how sure you are that value is exactly what the sender meant"),
    quote: z.string().nullable().describe("The exact text in the message the value was read from, copied character for character; null if not stated"),
    note: z.string().nullable().describe("Why you are unsure, if you are"),
  });

const ReplyOut = z.object({
  fields: z.array(fieldOut(REPLY_FIELDS.filter((f) => f !== "lines" && f !== "conditions") as unknown as [string, ...string[]])),
  conditions: z.array(z.string()).describe("Conditions and exclusions stated, e.g. 'subject to space', 'excl. DTHC'"),
  lines: z.array(
    z.object({
      name: z.string().describe("Charge name exactly as the carrier wrote it"),
      amount: z.number(),
      currency: z.string().nullable(),
      per: z.enum(["container", "bl", "shipment", "kg", "cbm", "wm", "truck", "pallet"]).nullable(),
      quote: z.string().nullable(),
    }),
  ),
});

const REQUEST_FIELDS = ["customer", "commodity", "origin", "destination", "mode", "grossKg", "cbm", "readyDate", "deliverBy", "incoterm", "dangerousGoods", "unNumber", "dgClass", "stackable"] as const;
const RequestOut = z.object({
  fields: z.array(fieldOut(REQUEST_FIELDS as unknown as [string, ...string[]])),
  packages: z.object({ count: z.number(), type: z.string() }).nullable(),
  dimsCm: z.object({ l: z.number(), w: z.number(), h: z.number() }).nullable(),
});

// ── Prompts (versioned: changing one means bumping PROMPTS) ──────────────────

const REPLY_SYSTEM = `You read carrier replies to freight requests for quotation and return what they state, field by field.

Fields: rate (the all-in price as a number, no currency), currency (ISO code), equipment (ISO-style code such as 40HC or 20GP), transitDays (number), routing ("direct" or "via <port>"), cutoff (yyyy-mm-dd), validity (the date the offer is valid until, yyyy-mm-dd).

Rules:
- Report only what the message states. If a field is not stated, return it with value null and confidence 0. Never infer a validity date or a breakdown that is not written.
- quote must be copied exactly from the message so it can be found again.
- Confidence reflects ambiguity in the source: an explicit "all in USD 2,180" is near 1; a number in a chat with the currency implied, a date spoken in a voice note, or a day/month order that could read either way is lower.
- Dates without a year belong to the year of the received date unless that would put them in the past.
- Itemise every charge in lines with the carrier's own names. Do not map them to codes.`;

const REQUEST_SYSTEM = `You read shipper emails asking a freight forwarder for a quote and return the shipment details they state.

Fields: customer (the sender's company if stated, else the sender), commodity, origin and destination (the place names as written), mode (ocean_fcl, ocean_lcl, air, road or rail, only if stated or unmistakable), grossKg (total gross weight in kg), cbm (total volume in cubic metres, only if stated), readyDate and deliverBy (yyyy-mm-dd), incoterm, dangerousGoods (true/false only if stated), unNumber, dgClass, stackable (true/false only if stated).

Rules:
- Report only what is stated. Unstated fields get value null and confidence 0.
- quote must be copied exactly from the email.
- Convert tons to kg and pounds to kg. Keep dates relative to the email date.`;

// ── Client seam (tests inject a fake) ────────────────────────────────────────

/** The one SDK call this module makes, so tests can replace it. */
export type Parse = (params: Parameters<Anthropic["beta"]["messages"]["parse"]>[0]) => Promise<{ parsed_output: unknown; stop_reason: string | null; model: string }>;

export class ExtractionUnavailableError extends Error {}

function defaultParse(): Parse {
  const client = new Anthropic();
  return (p) => client.beta.messages.parse(p) as never;
}

async function call<T extends z.ZodType>(parse: Parse, schema: T, system: string, content: string, model: string): Promise<{ out: z.infer<T>; model: string }> {
  const res = await parse({
    model,
    max_tokens: 16000,
    // Opt in to server-side refusal fallback, so a false-positive decline is retried on another model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(schema) },
    system,
    messages: [{ role: "user", content }],
  } as never);
  if (res.stop_reason === "refusal") throw new ExtractionUnavailableError("the model declined this message");
  if (res.stop_reason === "max_tokens") throw new ExtractionUnavailableError("the model ran out of output tokens");
  const parsed = schema.safeParse(res.parsed_output);
  if (!parsed.success) throw new ExtractionUnavailableError("the model returned output that does not match the schema");
  return { out: parsed.data, model: res.model };
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function toField(src: string, by: string, f: { field: string; value: unknown; confidence: number; quote: string | null; note: string | null }): ExtractedField {
  const source = locate(src, f.quote);
  // A quote that cannot be found in the source is a hallucination risk: halve the confidence and say so.
  const lost = f.value !== null && f.quote && !source;
  return {
    field: f.field,
    value: f.value,
    confidence: f.value === null ? 0 : clamp01(lost ? f.confidence / 2 : f.confidence),
    source,
    by,
    note: lost ? "Quoted text not found in the message; check it" : f.note ?? undefined,
  };
}

// ── 4.3.1 Carrier replies ────────────────────────────────────────────────────

export class ClaudeReplyExtractor implements Extractor {
  readonly version: string;
  private readonly parse: Parse;

  constructor(opts: { parse?: Parse; model?: string } = {}) {
    this.model = opts.model ?? CLAUDE_MODEL;
    this.version = `${this.model}@${PROMPTS.reply}`;
    this.parse = opts.parse ?? defaultParse();
  }
  private readonly model: string;

  async extractReply(r: CarrierReply): Promise<Fields> {
    const content = `<reply channel="${r.channel}" received="${r.receivedAt.toISOString().slice(0, 10)}">\n${r.text}\n</reply>`;
    const { out, model } = await call(this.parse, ReplyOut, REPLY_SYSTEM, content, this.model);
    const by = `${model}@${PROMPTS.reply}`;
    const fields: Fields = {};
    for (const f of out.fields) fields[f.field] = toField(r.text, by, f);
    for (const name of REPLY_FIELDS) if (!fields[name] && name !== "lines" && name !== "conditions") fields[name] = { field: name, value: null, confidence: 0, by, note: "Not stated in the reply" };
    const perMap = { container: "per_container", bl: "per_bl", shipment: "per_shipment", kg: "per_kg", cbm: "per_cbm", wm: "per_wm", truck: "per_truck", pallet: "per_pallet" } as const;
    const lines: RawLine[] = out.lines.map((l) => ({ name: l.name, amount: l.amount, currency: l.currency ?? undefined, basis: l.per ? perMap[l.per] : undefined, source: l.quote ?? undefined }));
    fields.lines = lines.length ? { field: "lines", value: lines, confidence: 0.93, by } : { field: "lines", value: null, confidence: 0, by, note: "No breakdown stated" };
    fields.conditions = { field: "conditions", value: out.conditions, confidence: 0.85, by };
    return fields;
  }
}

// ── 1.1.3 Shipper requests ───────────────────────────────────────────────────

export async function extractRequestWithClaude(raw: string, opts: { parse?: Parse; model?: string; now?: Date } = {}): Promise<RequestDraft> {
  const base = extractRequest(raw, opts.now);
  const src = [base.email.subject, base.email.text].filter(Boolean).join("\n\n");
  const content = `<email from="${base.email.from}" date="${(base.email.date ?? opts.now ?? new Date()).toISOString().slice(0, 10)}">\n${src}\n</email>`;
  const { out, model } = await call(opts.parse ?? defaultParse(), RequestOut, REQUEST_SYSTEM, content, opts.model ?? CLAUDE_MODEL);
  const by = `${model}@${PROMPTS.request}`;
  const fields: Fields = {};
  const values: RequestDraft["values"] = { ...base.values };
  for (const f of out.fields) {
    const x = toField(src, by, f);
    if ((f.field === "origin" || f.field === "destination") && typeof f.value === "string") {
      const hub = findHub(f.value);
      x.value = hub?.code ?? null;
      if (!hub) x.note = `"${f.value}" is not in master data`;
    }
    fields[f.field] = x;
    if (x.value !== null) (values as Record<string, unknown>)[f.field] = x.value;
  }
  if (out.packages) values.packages = out.packages;
  if (out.dimsCm) values.dimsCm = out.dimsCm;
  return { email: base.email, fields, values };
}

// ── Second opinion and fallback ──────────────────────────────────────────────

/** Where model and rules disagree on a value, keep the model's value but drop confidence below review thresholds. */
export function crossCheck(model: Fields, rules: Fields): Fields {
  const out: Fields = {};
  for (const [k, m] of Object.entries(model)) {
    const r = rules[k];
    const disagree = r && r.value !== null && m.value !== null && JSON.stringify(r.value) !== JSON.stringify(m.value) && k !== "lines" && k !== "conditions";
    out[k] = disagree ? { ...m, confidence: Math.min(m.confidence, 0.6), note: `Rules read ${JSON.stringify(r.value)}; check which is right` } : m;
  }
  return out;
}

/**
 * The extractor the platform runs: Claude with the rules as a second opinion, or the rules alone
 * when no model is configured or the call fails. `used` says which, for the audit record.
 */
export class ReplyPipeline {
  constructor(private readonly model?: Extractor) {}

  async run(r: CarrierReply): Promise<{ fields: Fields; used: string; fallbackReason?: string }> {
    const rules = extractReplyRules(r);
    if (!this.model) return { fields: rules, used: rules.rate?.by ?? "reply-rules@1" };
    try {
      const m = await this.model.extractReply(r);
      return { fields: crossCheck(m, rules), used: this.model.version };
    } catch (e) {
      return { fields: rules, used: rules.rate?.by ?? "reply-rules@1", fallbackReason: e instanceof Error ? e.message : String(e) };
    }
  }
}

/** True when the environment has credentials the SDK can use. */
export const modelConfigured = () => !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_PROFILE);
