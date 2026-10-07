// Every (state, event) pair of every machine is checked against the table below,
// which is written out independently from the definitions in src/state/machines.
import { describe, expect, it } from "vitest";
import { transition } from "@/state/machine";
import { ADDED_MACHINES, DOCUMENT_MACHINES, MACHINES, type MachineName } from "@/state/machines";
import { isKnownAddress } from "@/processes/registry";

/** event: [from states] → to. Guards are satisfied by GOOD_CTX. */
const SPEC: Record<MachineName, Record<string, [string[], string]>> = {
  request: {
    request_info: [["draft"], "awaiting_info"],
    info_received: [["awaiting_info"], "draft"],
    validate: [["draft"], "validated"],
    dispatch: [["validated"], "out_to_carriers"],
    options_built: [["out_to_carriers"], "options_ready"],
    quote_published: [["options_ready"], "quoted"],
    win: [["quoted"], "won"],
    lose: [["options_ready", "quoted"], "lost"],
    expire: [["out_to_carriers", "options_ready", "quoted"], "expired"],
    cancel: [["draft", "awaiting_info", "validated", "out_to_carriers", "options_ready", "quoted"], "cancelled"],
  },
  quote: {
    submit_for_approval: [["issued"], "pending_approval"],
    approve: [["pending_approval"], "sent"],
    decline_approval: [["pending_approval"], "superseded"],
    publish: [["issued"], "sent"],
    accept: [["sent"], "accepted"],
    reject: [["sent"], "rejected"],
    counter: [["sent"], "countered"],
    expire: [["issued", "pending_approval", "sent", "countered"], "expired"],
    supersede: [["issued", "pending_approval", "sent", "countered"], "superseded"],
  },
  booking: {
    confirm: [["requested"], "confirmed"],
    amend: [["confirmed", "amended"], "amended"],
    cancel: [["requested", "confirmed", "amended"], "cancelled"],
    roll: [["confirmed", "amended"], "rolled"],
  },
  shipment: {
    depart: [["planned"], "in_transit"],
    arrive: [["in_transit"], "at_destination"],
    deliver: [["at_destination"], "delivered"],
    close: [["delivered"], "closed"],
    cancel: [["planned"], "cancelled"],
  },
  charge: {
    incur: [["expected"], "incurred"],
    invoice: [["expected", "incurred"], "invoiced"],
    dispute: [["invoiced"], "disputed"],
    settle: [["invoiced", "disputed"], "settled"],
    write_off: [["disputed"], "written_off"],
  },
  exception: {
    assign: [["detected", "owned"], "owned"],
    start: [["owned"], "in_progress"],
    resolve: [["in_progress"], "resolved"],
    review: [["resolved"], "reviewed"],
  },
  bid: {
    chase: [["invited", "chased"], "chased"],
    reply: [["invited", "chased"], "replied"],
    supersede: [["replied"], "superseded"],
    decline: [["invited", "chased"], "declined"],
    time_out: [["invited", "chased"], "no_reply"],
  },
  document: {
    upload: [["requested", "rejected"], "uploaded"],
    extract: [["uploaded"], "extracted"],
    validate: [["extracted"], "validated"],
    reject: [["uploaded", "extracted"], "rejected"],
  },
  capacity_hold: {
    convert: [["held"], "converted"],
    release: [["held"], "released"],
    expire: [["held"], "expired"],
  },
};

const GOOD_CTX = {
  completeness: { ok: true, missing: [] },
  carriersInvited: 3,
  feasibleOptions: 2,
  approvalRequired: false,
  now: new Date("2026-10-01T00:00:00Z"),
  validUntil: new Date("2026-10-10T00:00:00Z"),
  expiresAt: new Date("2026-10-10T00:00:00Z"),
  reason: "documented reason",
  ownerId: "user-1",
  resolution: { cause: "port congestion" },
};

describe("state machines match the specification exactly", () => {
  for (const [name, m] of Object.entries(MACHINES) as [MachineName, (typeof MACHINES)[MachineName]][]) {
    describe(name, () => {
      it("has exactly the specified events", () => {
        expect(Object.keys(m.events).sort()).toEqual(Object.keys(SPEC[name]).sort());
      });
      for (const state of m.states) {
        for (const event of Object.keys(SPEC[name])) {
          const [from, to] = SPEC[name][event]!;
          const allowed = from.includes(state);
          it(`${state} --${event}--> ${allowed ? to : "refused"}`, () => {
            const r = transition(m as never, state as never, event as never, GOOD_CTX as never) as { ok: boolean; to?: string; code?: string };
            expect(r.ok).toBe(allowed);
            if (allowed) expect(r.to).toBe(to);
            else expect(r.code).toBe("illegal_from");
          });
        }
      }
      it("every transition names a process address from the document or deviations", () => {
        for (const t of Object.values(m.events) as { process: string }[]) expect(isKnownAddress(t.process), t.process).toBe(true);
      });
      it("terminal states have no way out", () => {
        for (const s of m.terminal) {
          for (const e of Object.keys(m.events)) {
            expect((transition(m as never, s as never, e as never, GOOD_CTX as never) as { ok: boolean }).ok).toBe(false);
          }
        }
      });
    });
  }

  it("the six document machines keep the document's states", () => {
    expect(DOCUMENT_MACHINES.request.states).toEqual(expect.arrayContaining(["draft", "validated", "out_to_carriers", "options_ready", "quoted", "won", "lost", "expired"]));
    expect(DOCUMENT_MACHINES.quote.states).toEqual(expect.arrayContaining(["issued", "sent", "accepted", "rejected", "countered", "expired", "superseded"]));
    expect(DOCUMENT_MACHINES.booking.states).toEqual(expect.arrayContaining(["requested", "confirmed", "amended", "cancelled", "rolled"]));
    expect(DOCUMENT_MACHINES.shipment.states).toEqual(expect.arrayContaining(["planned", "in_transit", "at_destination", "delivered", "closed"]));
    expect(DOCUMENT_MACHINES.charge.states).toEqual(expect.arrayContaining(["expected", "incurred", "invoiced", "disputed", "settled"]));
    expect(DOCUMENT_MACHINES.exception.states).toEqual(["detected", "owned", "in_progress", "resolved", "reviewed"]);
    expect(Object.keys(ADDED_MACHINES)).toEqual(["bid", "document", "capacity_hold"]);
  });
});

describe("guards", () => {
  const { request, quote, charge, exception, document, capacity_hold } = MACHINES;

  it("1.1.4: an incomplete request cannot be validated, and the missing fields are named", () => {
    const r = transition(request, "draft", "validate", { completeness: { ok: false, missing: ["readyDate", "grossWeightKg"] } });
    expect(r).toMatchObject({ ok: false, code: "guard_failed" });
    expect(!r.ok && r.reason).toContain("readyDate, grossWeightKg");
    expect(transition(request, "draft", "validate", {})).toMatchObject({ ok: false, code: "guard_failed" });
  });

  it("4.1.1: a request cannot go out with no carriers", () => {
    expect(transition(request, "validated", "dispatch", { carriersInvited: 0 })).toMatchObject({ ok: false, code: "guard_failed" });
  });

  it("4.5: options_ready needs at least one feasible option", () => {
    expect(transition(request, "out_to_carriers", "options_built", { feasibleOptions: 0 })).toMatchObject({ ok: false });
    expect(transition(request, "out_to_carriers", "options_built", { feasibleOptions: 1 })).toMatchObject({ ok: true, to: "options_ready" });
  });

  it("4.7.4 / 4.8.2: a quote needing approval cannot be published straight to the shipper", () => {
    expect(transition(quote, "issued", "publish", { approvalRequired: true })).toMatchObject({ ok: false, code: "guard_failed" });
    expect(transition(quote, "issued", "submit_for_approval", {})).toMatchObject({ ok: true, to: "pending_approval" });
    expect(transition(quote, "pending_approval", "approve", {})).toMatchObject({ ok: true, to: "sent" });
  });

  it("guards fail safe when their facts are missing", () => {
    expect(transition(quote, "issued", "publish", {})).toMatchObject({ ok: false, reason: "approval rules (4.7.1) were not evaluated" });
    expect(transition(quote, "sent", "accept", {})).toMatchObject({ ok: false, reason: "validity not supplied" });
    expect(transition(capacity_hold, "held", "convert", {})).toMatchObject({ ok: false, reason: "hold expiry not supplied" });
  });

  it("4.8.1: an expired quote cannot be accepted or countered", () => {
    const late = { now: new Date("2026-10-11T00:00:01Z"), validUntil: new Date("2026-10-11T00:00:00Z") };
    expect(transition(quote, "sent", "accept", late)).toMatchObject({ ok: false, code: "guard_failed" });
    expect(transition(quote, "sent", "counter", late)).toMatchObject({ ok: false, code: "guard_failed" });
    expect(transition(quote, "sent", "accept", { ...late, now: new Date("2026-10-11T00:00:00Z") })).toMatchObject({ ok: true });
  });

  it("8.2.3 / 8.5.4: disputes and write-offs need a reason", () => {
    expect(transition(charge, "invoiced", "dispute", {})).toMatchObject({ ok: false });
    expect(transition(charge, "invoiced", "dispute", { reason: "  " })).toMatchObject({ ok: false });
    expect(transition(charge, "disputed", "write_off", { reason: "uncollectable" })).toMatchObject({ ok: true });
  });

  it("7.4: an exception needs an owner, and a cause before it is resolved", () => {
    expect(transition(exception, "detected", "assign", {})).toMatchObject({ ok: false });
    expect(transition(exception, "in_progress", "resolve", {})).toMatchObject({ ok: false });
  });

  it("1.5.4: a document can only be rejected with a reason, and can be re-uploaded", () => {
    expect(transition(document, "extracted", "reject", {})).toMatchObject({ ok: false });
    expect(transition(document, "rejected", "upload", {})).toMatchObject({ ok: true, to: "uploaded" });
  });

  it("2.4.2: an expired hold cannot be converted", () => {
    expect(transition(capacity_hold, "held", "convert", { now: new Date(2), expiresAt: new Date(1) })).toMatchObject({ ok: false });
  });

  it("refuses unknown events", () => {
    expect(transition(request, "draft", "teleport" as never, {})).toMatchObject({ ok: false, code: "unknown_event" });
  });
});
