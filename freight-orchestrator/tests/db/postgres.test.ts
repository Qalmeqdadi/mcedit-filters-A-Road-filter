// The same rules hold in Postgres: migrations, enums from the machines, transitions,
// optimistic locking, the append-only audit log and versioned config.
import { beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { connectPglite, type Db } from "@/db/client";
import * as s from "@/db/schema";
import { PgAuditSink, PgConfigStore, PgTransitionStore, PgUnitOfWork } from "@/db/stores";
import { MACHINES } from "@/state/machines";
import { applyTransition } from "@/state/apply";
import { loadDefaultRulesets } from "@/config/store";
import { RULESET_KINDS } from "@/config/schema";
import { Policy } from "@/governance/policy";
import { ForbiddenError } from "@/governance/policy";
import { ACTOR, ORG } from "../support/fixtures";

let db: Db;
let policy: Policy;
let config: PgConfigStore;

beforeAll(async () => {
  db = await connectPglite();
  config = new PgConfigStore(db);
  const defaults = loadDefaultRulesets();
  for (const k of RULESET_KINDS) await config.put(k, defaults[k], "system:defaults");
  policy = new Policy(await config.active("permissions"));
  await db.insert(s.party).values([
    { id: ORG.desk, name: "Gulfline Forwarding (fictional)", type: "desk" },
    { id: ORG.shipper, name: "Sandcastle Trading (fictional)", type: "shipper" },
    { id: ORG.carrierA, name: "Azure Line (fictional)", type: "carrier" },
  ]);
});

async function newQuote() {
  const [r] = await db
    .insert(s.request)
    .values({ ref: `REQ-${Math.random().toString(36).slice(2, 8)}`, deskOrgId: ORG.desk, shipperOrgId: ORG.shipper, sourceChannel: "email" })
    .returning();
  const [o] = await db
    .insert(s.option)
    .values({ requestId: r!.id, deskOrgId: ORG.desk, shipperOrgId: ORG.shipper, carrierOrgId: ORG.carrierA, equipment: "40HC", carrierCost: 2150, currency: "USD" })
    .returning();
  const [q] = await db
    .insert(s.quote)
    .values({
      requestId: r!.id,
      optionId: o!.id,
      deskOrgId: ORG.desk,
      shipperOrgId: ORG.shipper,
      carrierOrgId: ORG.carrierA,
      carrierCost: 2150,
      margin: 260,
      marginPct: 10.8,
      sellPrice: 2410,
      currency: "USD",
      validUntil: new Date("2026-12-31"),
    })
    .returning();
  return { request: r!, quote: q! };
}

describe("schema", () => {
  it("each status enum has exactly the machine's states", async () => {
    for (const name of Object.keys(s.STATEFUL_TABLES) as (keyof typeof s.STATEFUL_TABLES)[]) {
      const res = await db.execute(sql.raw(`SELECT unnest(enum_range(NULL::${name}_status))::text AS v`));
      expect((res as unknown as { rows: { v: string }[] }).rows.map((r) => r.v), name).toEqual([...MACHINES[name].states]);
    }
  });

  it("new rows start in the machine's initial state", async () => {
    const { request, quote } = await newQuote();
    expect(request.status).toBe(MACHINES.request.initial);
    expect(quote.status).toBe(MACHINES.quote.initial);
  });

  it("the database rejects a status no machine knows", async () => {
    const { quote } = await newQuote();
    expect(await pgError(db.execute(sql`UPDATE quote SET status = 'approved_ish' WHERE id = ${quote.id}`))).toMatch(/invalid input value for enum quote_status/);
  });
});

describe("transitions in Postgres", () => {
  const deps = () => ({ uow: new PgUnitOfWork(db), policy });

  it("applies, bumps the row version and writes the audit row in the same transaction", async () => {
    const { quote } = await newQuote();
    await applyTransition(deps(), { actor: ACTOR.engine, machine: "quote", id: quote.id, event: "publish", ctx: { approvalRequired: false }, ruleVersions: ["margin@1"] });
    const [row] = await db.select().from(s.quote).where(eq(s.quote.id, quote.id));
    expect(row).toMatchObject({ status: "sent", rowVersion: 1 });
    const trail = await new PgAuditSink(db).list({ entityId: quote.id });
    expect(trail).toHaveLength(1);
    expect(trail[0]).toMatchObject({ action: "quote.publish", process: "4.7.4", outcome: "applied", ruleVersions: ["permissions@1", "margin@1"], deskOrgId: ORG.desk });
  });

  it("denials are committed to the audit log even though the transition is not", async () => {
    const { quote } = await newQuote();
    await expect(applyTransition(deps(), { actor: ACTOR.shipper, machine: "quote", id: quote.id, event: "publish" })).rejects.toThrow(ForbiddenError);
    const trail = await new PgAuditSink(db).list({ entityId: quote.id });
    expect(trail.map((t) => t.outcome)).toEqual(["denied"]);
  });

  it("compare-and-set refuses a stale write", async () => {
    const { quote } = await newQuote();
    const store = new PgTransitionStore(db);
    expect(await store.save("quote", quote.id, { status: "issued", rowVersion: 0 }, "sent")).toBe(true);
    expect(await store.save("quote", quote.id, { status: "issued", rowVersion: 0 }, "superseded")).toBe(false);
  });
});

/** Drizzle wraps driver errors; the Postgres message is on `cause`. */
async function pgError(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    return String((e as { cause?: Error }).cause?.message ?? (e as Error).message);
  }
  throw new Error("expected the query to fail");
}

describe("audit log is append-only at the database level", () => {
  it("rejects UPDATE, DELETE and TRUNCATE", async () => {
    const rec = await new PgAuditSink(db).append({ actor: ACTOR.engine, action: "x.y", entityType: "x", entityId: "1", outcome: "applied" });
    expect(await pgError(db.execute(sql`UPDATE audit_log SET action = 'tampered' WHERE id = ${rec.id}`))).toMatch(/append-only \(UPDATE refused\)/);
    expect(await pgError(db.execute(sql`DELETE FROM audit_log WHERE id = ${rec.id}`))).toMatch(/append-only \(DELETE refused\)/);
    expect(await pgError(db.execute(sql`TRUNCATE audit_log`))).toMatch(/append-only \(TRUNCATE refused\)/);
  });
});

describe("config in Postgres", () => {
  it("versions per kind and per desk, with desk overrides", async () => {
    const base = loadDefaultRulesets().margin;
    await config.put("margin", { ...base, floorPct: 7 }, "u-desk-admin", ORG.desk);
    await config.put("margin", { ...base, floorPct: 8 }, "u-desk-admin", ORG.desk);
    expect((await config.active("margin", ORG.desk)).id).toBe(`margin@2/${ORG.desk}`);
    expect((await config.active("margin")).id).toBe("margin@1");
    expect((await config.history("margin", ORG.desk)).map((r) => r.body.floorPct)).toEqual([7, 8]);
  });

  it("refuses invalid bodies", async () => {
    await expect(config.put("ranking_weights", { presets: {}, deskDefault: 3 }, "u")).rejects.toThrow();
  });
});
