// The API end to end: mailbox in, policy-filtered reads out, review corrections audited.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { createApi, type ApiRequest } from "@/api/app";
import { serve } from "@/api/server";
import { Workspace } from "@/api/workspace";
import type { Parse } from "@/ai/claude";
import { InMemoryConfigStore } from "@/config/store";

const fixtures = join(import.meta.dirname, "../fixtures");
const SARA = readFileSync(join(fixtures, "email/alnoor-request.eml"), "utf8");
const SECRET = "s3cret-inbound";
const NOW = () => new Date("2026-09-16T10:30:00Z");

const carrierEmail = (from: string, file: string, to = "rates@gulfway.example") =>
  [`From: Pricing <${from}>`, `To: ${to}`, "Subject: RE: RFQ SHA-JEA 1x40HC", "Date: Wed, 16 Sep 2026 14:30:00 +0400", "", readFileSync(join(fixtures, "replies", file), "utf8")].join("\r\n");

let ws: Workspace;
let api: ReturnType<typeof createApi>;
const call = (method: string, path: string, opts: { actor?: string; body?: unknown; type?: string; headers?: Record<string, string> } = {}) => {
  const [p, q = ""] = path.split("?");
  const req: ApiRequest = {
    method,
    path: p!,
    query: new URLSearchParams(q),
    headers: { "content-type": opts.type ?? (typeof opts.body === "string" ? "text/plain" : "application/json"), ...(opts.actor ? { "x-actor": opts.actor } : {}), ...opts.headers },
    body: opts.body === undefined ? "" : typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body),
  };
  return api(req);
};
const inbound = (raw: string, secret = SECRET) => call("POST", "/api/inbound/email", { body: raw, headers: { "x-inbound-secret": secret } });

beforeEach(async () => {
  ws = await Workspace.create({ config: InMemoryConfigStore.withDefaults(), now: NOW });
  api = createApi(ws, { inboundSecret: SECRET });
});

describe("1.1.1 inbound email webhook", () => {
  it("rejects a wrong secret and takes in a right one", async () => {
    expect((await inbound(SARA, "nope")).status).toBe(401);
    const r = await inbound(SARA);
    expect(r).toEqual({ status: 200, body: { kind: "request", id: "REQ-0001", status: "validated" } });
  });

  it("accepts JSON and provider form bodies", async () => {
    expect((await call("POST", "/api/inbound/email", { body: { raw: SARA }, headers: { "x-inbound-secret": SECRET } })).body).toMatchObject({ kind: "request" });
    const form = new URLSearchParams({ "body-mime": SARA }).toString();
    expect((await call("POST", "/api/inbound/email", { body: form, type: "application/x-www-form-urlencoded", headers: { "x-inbound-secret": SECRET } })).body).toMatchObject({ kind: "request" });
  });

  it("is off unless a secret is configured", async () => {
    const off = createApi(ws, {});
    expect((await off({ method: "POST", path: "/api/inbound/email", query: new URLSearchParams(), headers: {}, body: SARA })).status).toBe(404);
  });

  it("puts an incomplete request in awaiting_info with the reply drafted", async () => {
    const raw = "From: Omar <omar@unknown-trader.example>\r\nTo: quotes@gulfway.example\r\nSubject: price\r\n\r\nneed a price to fly 3 cartons of phone parts from Shenzhen to Riyadh, 45 kg. Ready 5 Oct";
    expect((await inbound(raw)).body).toMatchObject({ kind: "request", status: "awaiting_info" });
    const [req] = (await call("GET", "/api/requests", { actor: "gulfwayAgent" })).body as any[];
    expect(req.shipperOrgId).toBeNull();
    expect(req.infoReply).toMatch(/dimensions/);
  });

  it("routes carrier email to reply extraction and refuses mail for no desk", async () => {
    expect((await inbound(carrierEmail("rates@oceanlink.example", "oceanlink-email.txt"))).body).toMatchObject({ kind: "reply", id: "RPL-0001", status: "replied" });
    expect((await inbound(carrierEmail("rates@oceanlink.example", "oceanlink-email.txt", "someone@else.example"))).body).toMatchObject({ kind: "unroutable" });
  });
});

describe("reads go through the policy", () => {
  beforeEach(async () => {
    await inbound(SARA);
    await inbound(carrierEmail("rates@oceanlink.example", "oceanlink-email.txt"));
    await call("POST", "/api/replies", { actor: "gulfwayAgent", body: { carrierOrgId: "car-blueharbor", channel: "chat", text: readFileSync(join(fixtures, "replies/blueharbor-whatsapp.txt"), "utf8") } });
  });

  it("needs a signed-in persona", async () => {
    expect((await call("GET", "/api/requests")).status).toBe(401);
  });

  it("the desk sees its requests; the shipper sees its own; another desk sees nothing", async () => {
    expect(((await call("GET", "/api/requests", { actor: "gulfwayAgent" })).body as any[]).map((r) => r.id)).toEqual(["REQ-0001"]);
    const mine = (await call("GET", "/api/requests", { actor: "alNoor" })).body as any[];
    expect(mine.map((r) => [r.id, r.status])).toEqual([["REQ-0001", "validated"]]);
    expect((await call("GET", "/api/requests", { actor: "northseaAgent" })).body).toEqual([]);
    expect((await call("GET", "/api/requests", { actor: "nordlicht" })).body).toEqual([]);
  });

  it("a carrier sees its own reply with its price; nobody else's", async () => {
    const own = (await call("GET", "/api/replies", { actor: "oceanlink" })).body as any[];
    expect(own.map((r) => [r.id, r.price])).toEqual([["RPL-0001", 2180]]);
    expect((await call("GET", "/api/replies", { actor: "falcon" })).body).toEqual([]);
    expect((await call("GET", "/api/replies", { actor: "alNoor" })).body).toEqual([]);
    const desk = (await call("GET", "/api/replies", { actor: "gulfwayAgent" })).body as any[];
    expect(desk.map((r) => r.carrierName)).toEqual(["Oceanlink Lines", "BlueHarbor Marine"]);
    expect(desk[0].costLines.allIn).toBe(2180);
  });

  it("the network view is per persona", async () => {
    const desk = (await call("GET", "/api/network", { actor: "gulfwayAgent" })).body as any;
    const carrier = (await call("GET", "/api/network", { actor: "falcon" })).body as any;
    expect(desk.lanes.length).toBeGreaterThan(carrier.lanes.length);
    expect(carrier.lanes.every((l: any) => l.carrierOrgId === "car-falcon")).toBe(true);
  });
});

describe("4.3.3 review, 4.3.4 corrections and 4.3.5 accuracy over the API", () => {
  beforeEach(async () => {
    await call("POST", "/api/replies", { actor: "gulfwayAgent", body: { carrierOrgId: "car-blueharbor", channel: "chat", text: readFileSync(join(fixtures, "replies/blueharbor-whatsapp.txt"), "utf8") } });
  });

  it("lists open items for the desk only", async () => {
    const open = (await call("GET", "/api/review?open=1", { actor: "gulfwayAgent" })).body as any[];
    expect(open.map((i) => i.id)).toEqual(["RPL-0001:currency", "RPL-0001:rate", "RPL-0001:lines", "RPL-0001:cutoff", "RPL-0001:validity"]);
    expect((await call("GET", "/api/review", { actor: "northseaAgent" })).body).toEqual([]);
  });

  it("a confirmation closes the item; a correction is audited as an override with the extractor named", async () => {
    await call("POST", "/api/review/RPL-0001:currency", { actor: "gulfwayAgent", body: { value: "USD" } });
    const r = await call("POST", "/api/review/RPL-0001:cutoff", { actor: "gulfwayAgent", body: { value: "2026-09-23", reason: "Rahul confirmed by phone: Wednesday" } });
    expect(r.body).toMatchObject({ resolved: { by: "u-gw-omar", wasCorrect: false } });
    expect(((await call("GET", "/api/review?open=1", { actor: "gulfwayAgent" })).body as any[]).length).toBe(3);

    const audit = (await call("GET", "/api/audit", { actor: "gulfwayAgent" })).body as any[];
    const fix = audit.find((a) => a.entityId === "RPL-0001:cutoff");
    expect(fix).toMatchObject({ process: "4.3.4", override: { reason: "Rahul confirmed by phone: Wednesday" }, output: { modelVersion: "reply-rules@1" } });
    expect(fix.override.of).toBe(audit.find((a) => a.action === "bid.reply").id);

    const acc = (await call("GET", "/api/accuracy", { actor: "gulfwayAgent" })).body as any[];
    expect(acc).toEqual([{ carrierOrgId: "car-blueharbor", format: "chat", labels: 2, accuracy: 0.5, needsTemplate: true, deskOrgId: "desk-gulfway" }]);
    expect((await call("GET", "/api/accuracy", { actor: "oceanlink" })).body).toEqual([]);
  });

  it("another desk and a carrier cannot resolve the desk's items, and the attempt is audited", async () => {
    expect((await call("POST", "/api/review/RPL-0001:rate", { actor: "northseaAgent", body: { value: 1 } })).status).toBe(403);
    expect((await call("POST", "/api/review/RPL-0001:rate", { actor: "oceanlink", body: { value: 1 } })).status).toBe(403);
    expect((await ws.uow.audit.list({ outcome: "denied" })).length).toBe(2);
    expect((await call("POST", "/api/review/nope", { actor: "gulfwayAgent", body: { value: 1 } })).status).toBe(404);
  });

  it("a carrier may post its own reply to a desk but not on another carrier's behalf", async () => {
    const r = await call("POST", "/api/replies", { actor: "falcon", body: { deskOrgId: "desk-gulfway", channel: "portal", text: "AED 9.80/kg all in, DXB-FRA daily, valid till 2026-09-30" } });
    expect(r.body).toMatchObject({ kind: "reply" });
    const replies = (await call("GET", "/api/replies", { actor: "falcon" })).body as any[];
    expect(replies.map((x) => x.carrierOrgId)).toEqual(["car-falcon"]);
    expect((await call("POST", "/api/replies", { actor: "alNoor", body: { carrierOrgId: "car-falcon", text: "x" } })).status).toBe(403);
  });
});

describe("uploads and errors", () => {
  it("a desk agent uploads an .eml addressed to anyone; it lands on the agent's desk", async () => {
    const raw = SARA.replace("To: quotes@gulfway.example", "To: sara-forwarded@personal.example");
    expect((await call("POST", "/api/inbox/upload", { actor: "northseaAgent", body: raw })).body).toMatchObject({ kind: "request" });
    expect(((await call("GET", "/api/requests", { actor: "northseaAgent" })).body as any[]).length).toBe(1);
    expect((await call("POST", "/api/inbox/upload", { actor: "oceanlink", body: raw })).status).toBe(403);
  });

  it("answers 404, 405 and 400 plainly", async () => {
    expect((await call("GET", "/api/nope")).status).toBe(404);
    expect((await call("DELETE", "/api/requests", { actor: "gulfwayAgent" })).status).toBe(405);
    expect((await call("POST", "/api/replies", { actor: "gulfwayAgent", body: "not json" })).status).toBe(400);
  });
});

describe("with Claude configured", () => {
  it("falls back to the rules when the model declines, and records why", async () => {
    const declined: Parse = async () => ({ parsed_output: null, stop_reason: "refusal", model: "claude-opus-5-5" });
    const w = await Workspace.create({ config: InMemoryConfigStore.withDefaults(), now: NOW, parse: declined });
    const a = createApi(w, { inboundSecret: SECRET });
    expect((await a({ method: "GET", path: "/api/health", query: new URLSearchParams(), headers: {}, body: "" })).body).toMatchObject({ extraction: "claude-opus-5-5 with rules as fallback" });
    await a({ method: "POST", path: "/api/inbound/email", query: new URLSearchParams(), headers: { "x-inbound-secret": SECRET }, body: SARA });
    const [req] = await w.requestsFor((await import("@/network/view")).NETWORK_ACTORS.gulfwayAgent);
    expect(req).toMatchObject({ extractedBy: "intake-rules@1", fallbackReason: "the model declined this message", status: "validated" });
  });
});

describe("node:http server", () => {
  it("serves JSON with CORS headers", async () => {
    const server = serve(ws, { port: 0, inboundSecret: SECRET });
    await new Promise((r) => server.once("listening", r));
    const { port } = server.address() as { port: number };
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/inbound/email`, { method: "POST", headers: { "x-inbound-secret": SECRET, "content-type": "text/plain" }, body: SARA });
      expect(await res.json()).toMatchObject({ kind: "request" });
      const list = await fetch(`http://127.0.0.1:${port}/api/requests`, { headers: { "x-actor": "alNoor" } });
      expect(list.headers.get("access-control-allow-origin")).toBe("*");
      expect(((await list.json()) as any[]).length).toBe(1);
    } finally {
      server.close();
    }
  });
});
