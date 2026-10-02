// 12.3 Audit and traceability: every automated decision and every human override is recorded
// with who or what, when, input, output, and the rule or model version used.
import { beforeEach, describe, expect, it } from "vitest";
import { applyTransition, ConcurrentChangeError, NotFoundError } from "@/state/apply";
import { InMemoryUnitOfWork } from "@/state/memory";
import { IllegalTransitionError } from "@/state/machine";
import { ForbiddenError, type Policy } from "@/governance/policy";
import { InMemoryAuditSink, OverrideWithoutReasonError } from "@/governance/audit";
import { ACTOR, ORG, defaultPolicy } from "../support/fixtures";

let uow: InMemoryUnitOfWork;
let policy: Policy;

beforeEach(async () => {
  policy = (await defaultPolicy()).policy;
  uow = new InMemoryUnitOfWork();
  uow.store.create("quote", { id: "q-1", deskOrgId: ORG.desk, shipperOrgId: ORG.shipper, carrierOrgId: ORG.carrierA });
  uow.store.create("request", { id: "r-1", deskOrgId: ORG.desk, shipperOrgId: ORG.shipper });
});

const deps = () => ({ uow, policy });

describe("applied transitions", () => {
  it("records actor, time, input, output, process and rule versions", async () => {
    const r = await applyTransition(deps(), {
      actor: ACTOR.engine,
      machine: "quote",
      id: "q-1",
      event: "publish",
      ctx: { approvalRequired: false },
      ruleVersions: ["margin@1", "approval@1"],
    });
    expect(r).toMatchObject({ from: "issued", to: "sent", process: "4.7.4" });
    const [rec] = await uow.audit.list({ entityId: "q-1" });
    expect(rec).toMatchObject({
      actor: { kind: "rule", id: "4.4/feasibility", role: "engine", version: "1" },
      action: "quote.publish",
      process: "4.7.4",
      outcome: "applied",
      input: { event: "publish", from: "issued", ctx: { approvalRequired: false } },
      output: { from: "issued", to: "sent" },
      ruleVersions: ["permissions@1", "margin@1", "approval@1"],
      deskOrgId: ORG.desk,
    });
    expect(rec!.at).toBeInstanceOf(Date);
    expect((await uow.store.load("quote", "q-1"))!.status).toBe("sent");
  });

  it("a full direct-to-shipper path is traceable step by step", async () => {
    await applyTransition(deps(), { actor: ACTOR.engine, machine: "quote", id: "q-1", event: "submit_for_approval" });
    await applyTransition(deps(), { actor: ACTOR.deskAdmin, machine: "quote", id: "q-1", event: "approve" });
    await applyTransition(deps(), { actor: ACTOR.shipper, machine: "quote", id: "q-1", event: "accept", ctx: { now: new Date(1), validUntil: new Date(2) } });
    const trail = await uow.audit.list({ entityId: "q-1" });
    expect(trail.map((t) => [t.actor.role, t.action, (t.output as { to: string }).to])).toEqual([
      ["engine", "quote.submit_for_approval", "pending_approval"],
      ["desk_admin", "quote.approve", "sent"],
      ["shipper_user", "quote.accept", "accepted"],
    ]);
  });

  it("model decisions record the model version", async () => {
    uow.store.create("document", { id: "d-1", deskOrgId: ORG.desk, shipperOrgId: ORG.shipper });
    await applyTransition(deps(), { actor: ACTOR.shipper, machine: "document", id: "d-1", event: "upload" });
    await applyTransition(deps(), { actor: ACTOR.extractor, machine: "document", id: "d-1", event: "extract", modelVersion: "mock@prompt-v1" });
    const [, rec] = await uow.audit.list({ entityId: "d-1" });
    expect(rec).toMatchObject({ actor: { kind: "model" }, modelVersion: "mock@prompt-v1", process: "1.5.3" });
  });
});

describe("refusals are recorded too", () => {
  it("a permission denial is audited and nothing changes", async () => {
    await expect(applyTransition(deps(), { actor: ACTOR.carrierB, machine: "quote", id: "q-1", event: "publish" })).rejects.toThrow(ForbiddenError);
    const [rec] = await uow.audit.list({ entityId: "q-1" });
    expect(rec).toMatchObject({ outcome: "denied", actor: { id: "u-carrier-b" }, action: "quote.publish" });
    expect((await uow.store.load("quote", "q-1"))!.status).toBe("issued");
  });

  it("an illegal transition is audited with the machine's reason", async () => {
    await expect(applyTransition(deps(), { actor: ACTOR.deskAdmin, machine: "quote", id: "q-1", event: "accept" })).rejects.toThrow(IllegalTransitionError);
    const [rec] = await uow.audit.list({ entityId: "q-1" });
    expect(rec).toMatchObject({ outcome: "refused", output: { code: "illegal_from" } });
  });

  it("a failed guard is audited with its reason", async () => {
    await expect(
      applyTransition(deps(), { actor: ACTOR.engine, machine: "quote", id: "q-1", event: "publish", ctx: { approvalRequired: true } }),
    ).rejects.toThrow(/desk approval required/);
    const [rec] = await uow.audit.list({ entityId: "q-1", outcome: "refused" });
    expect(rec!.output).toMatchObject({ code: "guard_failed" });
  });

  it("missing rows throw NotFoundError", async () => {
    await expect(applyTransition(deps(), { actor: ACTOR.deskAdmin, machine: "quote", id: "nope", event: "publish" })).rejects.toThrow(NotFoundError);
  });

  it("a concurrent change is detected and not audited as applied", async () => {
    const store = uow.store;
    const realLoad = store.load.bind(store);
    store.load = async (m, id) => {
      const row = await realLoad(m, id);
      await store.save(m, id, { status: row!.status, rowVersion: row!.rowVersion }, "superseded"); // someone else wins
      return row;
    };
    await expect(
      applyTransition(deps(), { actor: ACTOR.engine, machine: "quote", id: "q-1", event: "publish", ctx: { approvalRequired: false } }),
    ).rejects.toThrow(ConcurrentChangeError);
    expect(await uow.audit.list({ entityId: "q-1", outcome: "applied" })).toEqual([]);
  });
});

describe("human overrides", () => {
  it("are recorded with the reason and the decision they override", async () => {
    const auto = await uow.audit.append({ actor: ACTOR.engine, action: "option.exclude", process: "4.4.5", entityType: "option", entityId: "o-1", outcome: "applied", output: { feasible: false } });
    await applyTransition(deps(), {
      actor: ACTOR.deskAdmin,
      machine: "request",
      id: "r-1",
      event: "cancel",
      override: { of: auto.id, reason: "Shipper withdrew by phone" },
    });
    const [rec] = await uow.audit.list({ entityId: "r-1" });
    expect(rec!.override).toEqual({ of: auto.id, reason: "Shipper withdrew by phone" });
  });

  it("need a reason", async () => {
    await expect(
      applyTransition(deps(), { actor: ACTOR.deskAdmin, machine: "request", id: "r-1", event: "cancel", override: { reason: " " } }),
    ).rejects.toThrow(OverrideWithoutReasonError);
  });

  it("can only be made by a person", async () => {
    const sink = new InMemoryAuditSink();
    await expect(
      sink.append({ actor: ACTOR.engine, action: "x.y", entityType: "x", entityId: "1", outcome: "applied", override: { reason: "because" } }),
    ).rejects.toThrow(/only a person/);
  });
});

describe("the in-memory log is append-only", () => {
  it("returned records cannot rewrite history", async () => {
    const sink = new InMemoryAuditSink();
    const input = { price: 100 };
    await sink.append({ actor: ACTOR.engine, action: "a.b", entityType: "a", entityId: "1", outcome: "applied", input });
    input.price = 1;
    const [rec] = await sink.list();
    expect(rec!.input).toEqual({ price: 100 });
    expect(() => {
      (rec as { action: string }).action = "tampered";
    }).toThrow();
  });

  it("a model decision without a version is rejected", async () => {
    await expect(
      new InMemoryAuditSink().append({ actor: { ...ACTOR.extractor, version: undefined }, action: "a.b", entityType: "a", entityId: "1", outcome: "applied" }),
    ).rejects.toThrow(/model version/);
  });
});
