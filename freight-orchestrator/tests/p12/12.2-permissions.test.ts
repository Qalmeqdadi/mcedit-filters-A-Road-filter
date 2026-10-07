// 12.2 Data permissions, driven by config/rulesets/permissions.json.
import { describe, expect, it, beforeAll } from "vitest";
import { getTableColumns } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import type { Policy, ResourceRef } from "@/governance/policy";
import { ForbiddenError } from "@/governance/policy";
import { describe as describeRow } from "@/governance/resources";
import * as schema from "@/db/schema";
import { ACTOR, ORG, defaultPolicy } from "../support/fixtures";

let policy: Policy;
beforeAll(async () => {
  policy = (await defaultPolicy()).policy;
});

const bidRow = (carrierOrgId: string) => ({
  id: `bid-${carrierOrgId}`,
  rfqId: "rfq-1",
  deskOrgId: ORG.desk,
  carrierOrgId,
  status: "replied",
  channel: "email",
  price: 2150,
  currency: "USD",
  costLines: [{ chargeCode: "OFR", amount: 1900 }],
  rawReply: "40HC USD 2150 all in",
  receivedAt: new Date(),
});

const quoteRow = (status: string) => ({
  id: "q-1",
  requestId: "r-1",
  deskOrgId: ORG.desk,
  shipperOrgId: ORG.shipper,
  carrierOrgId: ORG.carrierA,
  status,
  carrierCost: 2150,
  margin: 260,
  marginPct: 10.8,
  sellPrice: 2410,
  currency: "USD",
  validUntil: new Date(),
  approvalNotes: "below floor; approved for strategic lane",
  terms: {},
});

const optionRow = (published: boolean) => ({
  id: "o-1",
  requestId: "r-1",
  deskOrgId: ORG.desk,
  shipperOrgId: ORG.shipper,
  carrierOrgId: ORG.carrierA,
  equipment: "40HC",
  transitDays: 21,
  carrierCost: 2150,
  sellPrice: 2410,
  costLines: [{ chargeCode: "OFR", amount: 1900 }],
  currency: "USD",
  published,
});

describe("a carrier never sees another carrier's bid", () => {
  it("row level: carrier B cannot read carrier A's bid", () => {
    const r = describeRow("bid", bidRow(ORG.carrierA));
    expect(policy.can(ACTOR.carrierA, "read", r).allowed).toBe(true);
    expect(policy.can(ACTOR.carrierB, "read", r)).toMatchObject({ allowed: false });
    expect(policy.readable(ACTOR.carrierB, r, bidRow(ORG.carrierA))).toBeNull();
  });

  it("list reads return only the carrier's own bids", () => {
    const rows = [bidRow(ORG.carrierA), bidRow(ORG.carrierB)].map((b) => ({ resource: describeRow("bid", b), record: b }));
    const seen = policy.readableMany(ACTOR.carrierB, rows);
    expect(seen.map((b) => b.carrierOrgId)).toEqual([ORG.carrierB]);
  });

  it("a carrier cannot reply on another carrier's behalf", () => {
    const r = describeRow("bid", bidRow(ORG.carrierA));
    expect(policy.can(ACTOR.carrierB, "bid.reply", r).allowed).toBe(false);
    expect(policy.can(ACTOR.carrierA, "bid.reply", r).allowed).toBe(true);
  });

  it("shippers cannot read bids at all", () => {
    expect(policy.can(ACTOR.shipper, "read", describeRow("bid", bidRow(ORG.carrierA))).allowed).toBe(false);
  });
});

describe("a shipper never sees carrier cost or desk margin", () => {
  it("quote: sees the all-in sell price, not cost, margin or internal notes", () => {
    const row = quoteRow("sent");
    const seen = policy.readable(ACTOR.shipper, describeRow("quote", row), row)!;
    expect(seen.sellPrice).toBe(2410);
    expect(seen).not.toHaveProperty("carrierCost");
    expect(seen).not.toHaveProperty("margin");
    expect(seen).not.toHaveProperty("marginPct");
    expect(seen).not.toHaveProperty("approvalNotes");
  });

  it("option: sees the published option's sell price, not the cost build-up", () => {
    const row = optionRow(true);
    const seen = policy.readable(ACTOR.shipper, describeRow("option", row), row)!;
    expect(seen.sellPrice).toBe(2410);
    expect(seen.carrierOrgId).toBe(ORG.carrierA);
    expect(seen).not.toHaveProperty("carrierCost");
    expect(seen).not.toHaveProperty("costLines");
  });

  it("option: unpublished options are invisible to the shipper", () => {
    const row = optionRow(false);
    expect(policy.readable(ACTOR.shipper, describeRow("option", row), row)).toBeNull();
  });

  it("quote: the shipper cannot see a quote still waiting for desk approval", () => {
    for (const s of ["issued", "pending_approval", "superseded"]) {
      expect(policy.can(ACTOR.shipper, "read", describeRow("quote", quoteRow(s))).allowed, s).toBe(false);
    }
  });

  it("the desk sees everything on its own quote", () => {
    const row = quoteRow("pending_approval");
    expect(policy.readable(ACTOR.deskAgent, describeRow("quote", row), row)).toEqual(row);
  });

  it("the carrier on the quote sees its own cost but never the margin or sell price", () => {
    const row = quoteRow("sent");
    const r = describeRow("quote", row);
    // Carriers have no quote.read grant at all; the field rule is a second line of defence.
    expect(policy.can(ACTOR.carrierA, "read", r).allowed).toBe(false);
    const fields = policy.redact(ACTOR.carrierA, r, row);
    expect(fields).toHaveProperty("carrierCost");
    expect(fields).not.toHaveProperty("margin");
    expect(fields).not.toHaveProperty("sellPrice");
  });
});

describe("direct-to-shipper flow (decisions A to D)", () => {
  it("only the shipper on the quote can accept, reject or counter it, and only while sent", () => {
    const sent = describeRow("quote", quoteRow("sent"));
    expect(policy.can(ACTOR.shipper, "quote.accept", sent).allowed).toBe(true);
    expect(policy.can(ACTOR.otherShipper, "quote.accept", sent).allowed).toBe(false);
    expect(policy.can(ACTOR.carrierA, "quote.accept", sent).allowed).toBe(false);
    expect(policy.can(ACTOR.engine, "quote.accept", sent).allowed).toBe(false);
    expect(policy.can(ACTOR.shipper, "quote.accept", describeRow("quote", quoteRow("issued"))).allowed).toBe(false);
  });

  it("the shipper cannot approve its own quote or publish it", () => {
    const pending = describeRow("quote", quoteRow("pending_approval"));
    expect(policy.can(ACTOR.shipper, "quote.approve", pending).allowed).toBe(false);
    expect(policy.can(ACTOR.shipper, "quote.publish", pending).allowed).toBe(false);
    expect(policy.can(ACTOR.deskAdmin, "quote.approve", pending).allowed).toBe(true);
  });

  it("the engine can publish and expire quotes but never approve them", () => {
    const r = describeRow("quote", quoteRow("issued"));
    expect(policy.can(ACTOR.engine, "quote.publish", r).allowed).toBe(true);
    expect(policy.can(ACTOR.engine, "quote.expire", r).allowed).toBe(true);
    expect(policy.can(ACTOR.engine, "quote.approve", r).allowed).toBe(false);
  });

  it("carriers see a redacted RFQ: no shipper name or cargo value until booking is confirmed", () => {
    const rfq = { id: "rfq-1", deskOrgId: ORG.desk, shipperName: "Sandcastle Trading", cargoValue: 84000, origin: "CNSHA", destination: "AEJEA" };
    const before = describeRow("rfq", rfq, { carrierOrgId: ORG.carrierA });
    expect(policy.can(ACTOR.carrierA, "read", before).allowed).toBe(true);
    expect(policy.redact(ACTOR.carrierA, before, rfq)).toEqual({ id: "rfq-1", deskOrgId: ORG.desk, origin: "CNSHA", destination: "AEJEA" });
    const after = describeRow("rfq", rfq, { carrierOrgId: ORG.carrierA, bookingConfirmed: true });
    expect(policy.redact(ACTOR.carrierA, after, rfq)).toHaveProperty("shipperName", "Sandcastle Trading");
  });

  it("carriers get the shipper's documents only once their booking is confirmed", () => {
    const doc = { id: "d-1", deskOrgId: ORG.desk, shipperOrgId: ORG.shipper, type: "commercial_invoice", status: "validated", storageKey: "s3://x" };
    expect(policy.can(ACTOR.carrierA, "read", describeRow("document", doc, { carrierOrgId: ORG.carrierA })).allowed).toBe(false);
    const r = describeRow("document", doc, { carrierOrgId: ORG.carrierA, bookingConfirmed: true });
    expect(policy.readable(ACTOR.carrierA, r, doc)).toHaveProperty("storageKey");
    expect(policy.can(ACTOR.carrierB, "read", describeRow("document", doc, { carrierOrgId: ORG.carrierA, bookingConfirmed: true })).allowed).toBe(false);
  });

  it("partners see documents attached to their job, and nothing else", () => {
    const doc = { id: "d-1", deskOrgId: ORG.desk, shipperOrgId: ORG.shipper, type: "packing_list", status: "validated", storageKey: "s3://x" };
    expect(policy.can(ACTOR.partner, "read", describeRow("document", doc, { partnerOrgId: ORG.partner })).allowed).toBe(false);
    expect(policy.can(ACTOR.partner, "read", describeRow("document", doc, { partnerOrgId: ORG.partner, attachedToPartnerJob: true })).allowed).toBe(true);
  });

  it("the shipper uploads its own document pack but not into another shipper's request", () => {
    const doc = { id: "d-1", deskOrgId: ORG.desk, shipperOrgId: ORG.shipper, status: "requested" };
    expect(policy.can(ACTOR.shipper, "document.upload", describeRow("document", doc)).allowed).toBe(true);
    expect(policy.can(ACTOR.otherShipper, "document.upload", describeRow("document", doc)).allowed).toBe(false);
  });
});

describe("tenancy and defaults", () => {
  const req = { id: "r-1", deskOrgId: ORG.desk, shipperOrgId: ORG.shipper, status: "draft", cargoValue: 84000, targetPrice: 2300, shipperName: "Sandcastle" };

  it("one desk never sees another desk's requests", () => {
    expect(policy.can(ACTOR.deskAgent, "read", describeRow("request", req)).allowed).toBe(true);
    expect(policy.can(ACTOR.otherDeskAgent, "read", describeRow("request", req)).allowed).toBe(false);
  });

  it("the shipper sees its cargo value but not the desk's target price", () => {
    const seen = policy.readable(ACTOR.shipper, describeRow("request", req), req)!;
    expect(seen.cargoValue).toBe(84000);
    expect(seen).not.toHaveProperty("targetPrice");
  });

  it("unknown roles are denied", () => {
    expect(policy.can({ ...ACTOR.deskAdmin, role: "superuser" }, "read", describeRow("request", req))).toMatchObject({ allowed: false, reason: "unknown role superuser" });
  });

  it("an action must match the resource type", () => {
    expect(policy.can(ACTOR.deskAdmin, "quote.accept", describeRow("request", req)).allowed).toBe(false);
  });

  it("default deny: an action with no grant is refused", () => {
    expect(policy.can(ACTOR.shipper, "request.dispatch", describeRow("request", req))).toMatchObject({ allowed: false });
  });

  it("assert throws ForbiddenError", () => {
    expect(() => policy.assert(ACTOR.carrierA, "read", describeRow("request", req))).toThrow(ForbiddenError);
  });

  it("platform admins manage parties and config but cannot read commercial data", () => {
    expect(policy.can(ACTOR.platformAdmin, "read", describeRow("request", req)).allowed).toBe(false);
    expect(policy.can(ACTOR.platformAdmin, "config.publish", { type: "config", deskOrgId: null }).allowed).toBe(true);
  });

  it("invoices: each counterparty sees only invoices addressed to it", () => {
    const inv = { id: "i-1", deskOrgId: ORG.desk, counterparty: "carrier", partyOrgId: ORG.carrierA, total: 2150 };
    expect(policy.can(ACTOR.carrierA, "read", describeRow("invoice", inv)).allowed).toBe(true);
    expect(policy.can(ACTOR.carrierB, "read", describeRow("invoice", inv)).allowed).toBe(false);
    expect(policy.can(ACTOR.shipper, "read", describeRow("invoice", inv)).allowed).toBe(false);
  });

  it("decisions name the rule set version they came from", () => {
    const d = policy.can(ACTOR.deskAgent, "read", describeRow("request", req));
    expect(d.allowed && d.via).toMatch(/^permissions@1:desk_agent\/desk$/);
  });
});

describe("the matrix covers every sensitive column", () => {
  // A new cost, margin, price or value column cannot ship without a visibility class.
  const SENSITIVE = /(cost|margin|price|amount|value|rawReply|storageKey|shipperName)$/i;
  const NOT_SENSITIVE = new Set(["extracted_field.value", "extracted_field.confidence", "review_item.resolvedValue", "training_label.predicted"]);
  const tables: [string, PgTable][] = [
    ["request", schema.request], ["bid", schema.bid], ["option", schema.option], ["quote", schema.quote],
    ["rate", schema.rate], ["charge", schema.charge], ["document", schema.document], ["rfq", schema.rfq],
  ];

  for (const [type, table] of tables) {
    it(type, () => {
      for (const col of Object.keys(getTableColumns(table))) {
        if (!SENSITIVE.test(col) || NOT_SENSITIVE.has(`${type}.${col}`) || col.endsWith("Currency")) continue;
        expect(policy.classOf(type, col), `${type}.${col} has no visibility class`).not.toBe("general");
      }
    });
  }
});

describe("ResourceRef shape", () => {
  it("bookings expose bookingConfirmed from their own status", () => {
    const r: ResourceRef = describeRow("booking", { id: "b", deskOrgId: ORG.desk, status: "confirmed" });
    expect(r.attrs?.bookingConfirmed).toBe(true);
  });
});
