// Quote: issued → sent → accepted, rejected, countered or expired → superseded by version.
// Added: pending_approval (4.8.2, moved before publication in the direct-to-shipper flow).
import { defineMachine, fail, pass } from "../machine";

export interface QuoteContext {
  now?: Date;
  validUntil?: Date;
  /** Set by the 4.7.1 margin and approval rules. Publishing without it is refused. */
  approvalRequired?: boolean;
}

// Fail-safe: missing facts refuse the transition rather than let it through.
const stillValid = (c: QuoteContext) => {
  if (!c.validUntil || !c.now) return fail("validity not supplied");
  return c.now.getTime() <= c.validUntil.getTime() ? pass : fail("quote validity has passed");
};

export const quoteMachine = defineMachine({
  name: "quote",
  states: ["issued", "pending_approval", "sent", "accepted", "rejected", "countered", "expired", "superseded"],
  initial: "issued",
  terminal: ["accepted", "rejected", "expired", "superseded"],
  events: {
    submit_for_approval: { from: ["issued"], to: "pending_approval", process: "4.8.2" },
    approve: { from: ["pending_approval"], to: "sent", process: "4.8.2" },
    decline_approval: { from: ["pending_approval"], to: "superseded", process: "4.8.2" },
    publish: {
      from: ["issued"],
      to: "sent",
      process: "4.7.4",
      guard: (c: QuoteContext) => {
        if (c.approvalRequired === undefined) return fail("approval rules (4.7.1) were not evaluated");
        return c.approvalRequired ? fail("desk approval required before the shipper sees this quote") : pass;
      },
    },
    accept: { from: ["sent"], to: "accepted", process: "4.8.1", guard: stillValid },
    reject: { from: ["sent"], to: "rejected", process: "4.8.1" },
    counter: { from: ["sent"], to: "countered", process: "4.8.1", guard: stillValid },
    expire: { from: ["issued", "pending_approval", "sent", "countered"], to: "expired", process: "4.8.3" },
    supersede: { from: ["issued", "pending_approval", "sent", "countered"], to: "superseded", process: "4.7.5" },
  },
});
