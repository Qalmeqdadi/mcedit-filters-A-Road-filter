// 4.3 Turn replies into data: extract, score per field, route to a person, learn from corrections.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ClaudeReplyExtractor, crossCheck, extractRequestWithClaude, ReplyPipeline, type Parse } from "@/ai/claude";
import { InMemoryConfigStore } from "@/config/store";
import { normaliseQuote } from "@/p3/charges";
import { accuracyByFormat, extractReplyRules, label, REPLY_RULES_VERSION, reviewQueue, type CarrierReply, type ReplyChannel } from "@/p4/replies";

const dir = join(import.meta.dirname, "../fixtures/replies");
const reply = (file: string, channel: ReplyChannel, carrierOrgId = file.split("-")[0]!): CarrierReply => ({
  id: file,
  carrierOrgId,
  channel,
  text: readFileSync(join(dir, file), "utf8"),
  receivedAt: new Date("2026-09-16T10:30:00Z"),
});
const OCEANLINK = reply("oceanlink-email.txt", "email");
const MERIDIAN = reply("meridian-pdf.txt", "pdf");
const BLUEHARBOR = reply("blueharbor-whatsapp.txt", "chat");
const confidence = async () => (await InMemoryConfigStore.withDefaults().active("confidence")).body;
const v = (f: ReturnType<typeof extractReplyRules>) => Object.fromEntries(Object.entries(f).map(([k, x]) => [k, x.value]));

describe("4.3.1 extract every field from three formats", () => {
  it("an email with an itemised breakdown", () => {
    expect(v(extractReplyRules(OCEANLINK))).toMatchObject({ rate: 2180, currency: "USD", equipment: "40HC", transitDays: 18, routing: "direct", cutoff: "2026-09-24", validity: "2026-09-30" });
  });

  it("a PDF quotation table", () => {
    expect(v(extractReplyRules(MERIDIAN))).toMatchObject({ rate: 1940, currency: "USD", equipment: "40HC", transitDays: 24, routing: "via LKCMB", cutoff: "2026-09-25", validity: "2026-10-05" });
  });

  it("a chat thread with a voice-note transcript", () => {
    expect(v(extractReplyRules(BLUEHARBOR))).toMatchObject({ rate: 2050, currency: "USD", equipment: "40HC", transitDays: 20, routing: "via MYPKG", cutoff: "2026-09-24", validity: null });
  });

  it("the breakdown in each reply adds up to the all-in after normalising", () => {
    for (const r of [OCEANLINK, MERIDIAN]) {
      const f = extractReplyRules(r);
      const q = normaliseQuote(f.lines!.value as never, { containers: { "40HC": 1 } }, { defaultCurrency: f.currency!.value as string });
      expect(q.allIn, r.id).toBe(f.rate!.value);
      expect(q.review, r.id).toEqual([]);
    }
  });
});

describe("4.3.2 confidence per field, with the source shown", () => {
  it("scores each field separately and points at the text", () => {
    const f = extractReplyRules(BLUEHARBOR);
    expect(f.equipment!.confidence).toBeGreaterThan(0.9);
    expect(f.cutoff!.confidence).toBeLessThan(0.8);
    expect(f.cutoff!.source?.text).toBe("the twenty fourth");
    const s = f.rate!.source!;
    expect(BLUEHARBOR.text.slice(s.start, s.end)).toBe(s.text);
    expect(f.rate!.by).toBe(REPLY_RULES_VERSION);
  });
});

describe("4.3.3 route low-confidence fields to a person", () => {
  it("clean replies need nobody", async () => {
    const rules = await confidence();
    expect(reviewQueue(OCEANLINK, extractReplyRules(OCEANLINK), rules)).toEqual([]);
    expect(reviewQueue(MERIDIAN, extractReplyRules(MERIDIAN), rules)).toEqual([]);
  });

  it("the chat reply asks for confirmation of shaky values and asks the carrier for missing ones", async () => {
    const q = reviewQueue(BLUEHARBOR, extractReplyRules(BLUEHARBOR), await confidence());
    expect(q.map((i) => `${i.action}:${i.field}`)).toEqual(["confirm:currency", "confirm:rate", "ask:lines", "confirm:cutoff", "ask:validity"]);
    const cutoff = q.find((i) => i.field === "cutoff")!;
    expect(cutoff.source?.text).toBe("the twenty fourth");
    expect(cutoff.threshold).toBe(0.9);
  });
});

describe("4.3.4 corrections become labels and 4.3.5 accuracy per format", () => {
  it("records what was predicted, what was right, and by which extractor", () => {
    const f = extractReplyRules(BLUEHARBOR);
    const l = label(BLUEHARBOR, f.cutoff!, "2026-09-23", "u-desk-agent", new Date("2026-09-16T11:00:00Z"));
    expect(l).toMatchObject({ field: "cutoff", predicted: "2026-09-24", corrected: "2026-09-23", wasCorrect: false, format: "chat", modelVersion: REPLY_RULES_VERSION });
    expect(label(BLUEHARBOR, f.equipment!, "40HC", "u").wasCorrect).toBe(true);
  });

  it("flags a carrier's format for a template once accuracy drops below the rule", async () => {
    const rules = await confidence();
    const labels = [OCEANLINK, BLUEHARBOR].flatMap((r) => {
      const f = extractReplyRules(r);
      return Object.values(f).map((x) => label(r, x, r === BLUEHARBOR && ["cutoff", "validity", "lines"].includes(x.field) ? "corrected" : x.value, "u"));
    });
    const acc = accuracyByFormat(labels, rules);
    expect(acc.find((a) => a.format === "email")).toMatchObject({ accuracy: 1, needsTemplate: false });
    expect(acc.find((a) => a.format === "chat")!.needsTemplate).toBe(true);
  });
});

// ── The model extractor, with the SDK call replaced ──────────────────────────

const fakeParse = (parsed_output: unknown, stop_reason = "end_turn", seen: unknown[] = []): Parse =>
  async (p) => {
    seen.push(p);
    return { parsed_output, stop_reason, model: "claude-opus-5-5" };
  };

const modelReply = {
  fields: [
    { field: "rate", value: 2050, confidence: 0.9, quote: "can do 2050 all in", note: null },
    { field: "currency", value: "USD", confidence: 0.85, quote: "usd ofc", note: "Currency given in a later message" },
    { field: "equipment", value: "40HC", confidence: 0.97, quote: "40hc", note: null },
    { field: "transitDays", value: 20, confidence: 0.85, quote: "around 20 days", note: null },
    { field: "routing", value: "via Port Klang", confidence: 0.9, quote: "via klang", note: null },
    { field: "cutoff", value: "2026-09-24", confidence: 0.7, quote: "the twenty fourth", note: "Spoken in a voice note" },
    { field: "validity", value: "2026-09-30", confidence: 0.8, quote: "valid till end of month", note: null },
  ],
  conditions: ["space ok for now"],
  lines: [],
};

describe("Claude reply extractor (4.3.1 with a model)", () => {
  it("sends one structured-output request with refusal fallback enabled", async () => {
    const seen: any[] = [];
    await new ClaudeReplyExtractor({ parse: fakeParse(modelReply, "end_turn", seen) }).extractReply(BLUEHARBOR);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ model: "claude-opus-5-5", fallbacks: "default", betas: ["server-side-fallback-2026-07-01"], output_config: { effort: "medium" } });
    expect(seen[0].output_config.format).toBeTruthy();
    expect(seen[0].messages[0].content).toContain('channel="chat"');
  });

  it("locates each quote in the source and stamps the version", async () => {
    const f = await new ClaudeReplyExtractor({ parse: fakeParse(modelReply) }).extractReply(BLUEHARBOR);
    expect(f.rate).toMatchObject({ value: 2050, confidence: 0.9, by: "claude-opus-5-5@reply-v1" });
    expect(f.rate!.source?.text).toBe("can do 2050 all in");
    expect(f.lines).toMatchObject({ value: null, confidence: 0 });
  });

  it("halves confidence when the quoted text is not in the message", async () => {
    const f = await new ClaudeReplyExtractor({ parse: fakeParse(modelReply) }).extractReply(BLUEHARBOR);
    expect(f.validity!.confidence).toBe(0.4);
    expect(f.validity!.source).toBeUndefined();
    expect(f.validity!.note).toMatch(/not found/);
  });

  it("cross-checks against the rules and pulls disagreements under review thresholds", async () => {
    const m = await new ClaudeReplyExtractor({ parse: fakeParse(modelReply) }).extractReply(BLUEHARBOR);
    const x = crossCheck(m, extractReplyRules(BLUEHARBOR));
    expect(x.routing!.confidence).toBe(0.6);
    expect(x.routing!.note).toMatch(/via MYPKG/);
    expect(x.equipment!.confidence).toBe(0.97);
  });

  it.each([
    ["refusal", "declined"],
    ["max_tokens", "output tokens"],
  ])("falls back to the rules on stop_reason %s and says why", async (stop, why) => {
    const r = await new ReplyPipeline(new ClaudeReplyExtractor({ parse: fakeParse(modelReply, stop) })).run(OCEANLINK);
    expect(r.used).toBe(REPLY_RULES_VERSION);
    expect(r.fallbackReason).toMatch(why);
    expect(r.fields.rate!.value).toBe(2180);
  });

  it("falls back on output that does not match the schema", async () => {
    const r = await new ReplyPipeline(new ClaudeReplyExtractor({ parse: fakeParse({ nope: true }) })).run(OCEANLINK);
    expect(r.fallbackReason).toMatch(/schema/);
  });

  it("runs the rules alone when no model is configured", async () => {
    const r = await new ReplyPipeline().run(MERIDIAN);
    expect(r).toMatchObject({ used: REPLY_RULES_VERSION });
    expect(r.fields.rate!.value).toBe(1940);
  });
});

describe("Claude request extractor (1.1.3 with a model)", () => {
  it("maps place names to master data and keeps rule values the model left out", async () => {
    const eml = readFileSync(join(import.meta.dirname, "../fixtures/email/alnoor-request.eml"), "utf8");
    const d = await extractRequestWithClaude(eml, {
      now: new Date("2026-09-16T08:00:00Z"),
      parse: fakeParse({
        fields: [
          { field: "origin", value: "Shanghai", confidence: 0.95, quote: "Shanghai", note: null },
          { field: "destination", value: "Atlantis", confidence: 0.9, quote: "Jebel Ali", note: null },
          { field: "grossKg", value: 21400, confidence: 0.95, quote: "21.4 tons", note: null },
        ],
        packages: { count: 18, type: "pallet" },
        dimsCm: null,
      }),
    });
    expect(d.values.origin).toBe("CNSHA");
    expect(d.fields.destination).toMatchObject({ value: null, note: '"Atlantis" is not in master data' });
    expect(d.values.destination).toBe("AEJEA");
    expect(d.values.dimsCm).toEqual({ l: 120, w: 100, h: 160 });
    expect(d.fields.grossKg!.by).toBe("claude-opus-5-5@request-v1");
  });
});
