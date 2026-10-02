// Checkpoint 1 walkthrough: one quote through the direct-to-shipper flow, printed step by step.
// Shows what each persona is allowed to see and do, and the audit trail it leaves.
// Run with `npm run demo`. Uses in-memory storage; nothing is written to a database.
import { InMemoryConfigStore } from "../src/config/store";
import { rule, user } from "../src/governance/actor";
import { Policy } from "../src/governance/policy";
import { describe } from "../src/governance/resources";
import { applyTransition, type ApplyArgs } from "../src/state/apply";
import { InMemoryUnitOfWork } from "../src/state/memory";
import type { MachineName } from "../src/state/machines";

const DESK = "desk-gulfline";
const SHIPPER = "shp-sandcastle";
const CARRIER_A = "car-azure";
const CARRIER_B = "car-boreal";

const desk = user("dana@gulfline (desk admin)", "desk_admin", DESK);
const shipper = user("sami@sandcastle (shipper)", "shipper_user", SHIPPER);
const carrierA = user("ops@azure-line (carrier A)", "carrier_user", CARRIER_A);
const carrierB = user("ops@boreal-shipping (carrier B)", "carrier_user", CARRIER_B);
const engine = rule("4.7.1/margin-and-approval", "1");

const policy = new Policy(await InMemoryConfigStore.withDefaults().active("permissions"));
const uow = new InMemoryUnitOfWork();

const quote = {
  id: "Q-1001",
  deskOrgId: DESK,
  shipperOrgId: SHIPPER,
  carrierOrgId: CARRIER_A,
  lane: "CNSHA → AEJEA, 1 × 40HC",
  carrierCost: 2150,
  margin: 130,
  marginPct: 6.0,
  sellPrice: 2280,
  currency: "USD",
  approvalNotes: "Margin below the 6% floor after rounding",
};
const bids = [
  { id: "BID-A", rfqId: "RFQ-1", deskOrgId: DESK, carrierOrgId: CARRIER_A, status: "replied", price: 2150, currency: "USD" },
  { id: "BID-B", rfqId: "RFQ-1", deskOrgId: DESK, carrierOrgId: CARRIER_B, status: "replied", price: 2090, currency: "USD" },
];
uow.store.create("quote", quote);

const h = (s: string) => console.log(`\n\x1b[1m${s}\x1b[0m`);
const ok = (s: string) => console.log(`  \x1b[32m✔\x1b[0m ${s}`);
const no = (s: string) => console.log(`  \x1b[31m✘\x1b[0m ${s}`);

async function quoteAs(who: typeof desk) {
  const row = { ...quote, ...(await uow.store.load("quote", quote.id)) };
  const seen = policy.readable(who, describe("quote", row), row);
  return seen ? Object.keys(seen).filter((k) => !["deskOrgId", "shipperOrgId", "carrierOrgId", "rowVersion"].includes(k)).map((k) => `${k}=${String(seen[k as keyof typeof seen])}`).join(", ") : "(cannot see this quote)";
}

async function attempt<N extends MachineName>(label: string, args: ApplyArgs<N>) {
  try {
    const r = await applyTransition({ uow, policy }, args);
    ok(`${label}: ${r.from} → ${r.to}  [process ${r.process}]`);
  } catch (e) {
    no(`${label}: refused (${(e as Error).message.split(": ").slice(-1)[0]})`);
  }
}

h("1. The engine built the quote at the all-in price. It is below the margin floor, so the desk must approve it.");
console.log(`  Shipper sees: ${await quoteAs(shipper)}`);
await attempt("Engine publishes it straight to the shipper", { actor: engine, machine: "quote", id: quote.id, event: "publish", ctx: { approvalRequired: true } });
await attempt("Engine sends it to the desk for approval", { actor: engine, machine: "quote", id: quote.id, event: "submit_for_approval" });
console.log(`  Shipper sees: ${await quoteAs(shipper)}`);

h("2. Only the desk can approve. Approval publishes the quote to the shipper.");
await attempt("Shipper approves its own quote", { actor: shipper, machine: "quote", id: quote.id, event: "approve" });
await attempt("Engine approves", { actor: engine, machine: "quote", id: quote.id, event: "approve" });
await attempt("Desk admin approves", { actor: desk, machine: "quote", id: quote.id, event: "approve" });

h("3. What each party sees now");
console.log(`  Desk:      ${await quoteAs(desk)}`);
console.log(`  Shipper:   ${await quoteAs(shipper)}`);
console.log(`  Carrier A: ${await quoteAs(carrierA)}`);
for (const who of [carrierA, carrierB]) {
  const visible = policy.readableMany(who, bids.map((b) => ({ resource: describe("bid", b), record: b })));
  console.log(`  ${who.id} sees bids: ${visible.map((b) => `${b.id} ${b.price} ${b.currency}`).join(", ")}`);
}

h("4. Only the shipper on the quote can accept it, and only while it is valid");
await attempt("Carrier A accepts", { actor: carrierA, machine: "quote", id: quote.id, event: "accept", ctx: { now: new Date(), validUntil: new Date(Date.now() + 864e5) } });
await attempt("Shipper accepts after validity", { actor: shipper, machine: "quote", id: quote.id, event: "accept", ctx: { now: new Date(), validUntil: new Date(Date.now() - 1000) } });
await attempt("Shipper accepts", { actor: shipper, machine: "quote", id: quote.id, event: "accept", ctx: { now: new Date(), validUntil: new Date(Date.now() + 864e5) } });
await attempt("Shipper accepts again", { actor: shipper, machine: "quote", id: quote.id, event: "accept", ctx: { now: new Date(), validUntil: new Date(Date.now() + 864e5) } });

h("5. Audit trail for Q-1001 (every attempt, allowed or not)");
for (const r of await uow.audit.list({ entityId: quote.id })) {
  const out = r.output as { to?: string; reason?: string; code?: string };
  const result = r.outcome === "applied" ? `→ ${out.to}` : `${r.outcome}: ${out.reason}`;
  console.log(`  ${r.at.toISOString().slice(11, 23)}  ${r.actor.kind.padEnd(5)} ${r.actor.id.padEnd(32)} ${r.action.padEnd(26)} ${(r.process ?? "").padEnd(6)} ${result}   rules: ${r.ruleVersions?.join(", ")}`);
}
console.log();
