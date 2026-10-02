// Charge: expected → incurred → invoiced → disputed → settled. Added: written_off,
// invoiced → settled without a dispute, expected → invoiced when the invoice beats the event.
import { defineMachine, fail, pass } from "../machine";

export interface ChargeContext {
  /** Required to open or write off a dispute; the evidence lives in the audit input. */
  reason?: string;
}

const needsReason = (c: ChargeContext) => (c.reason?.trim() ? pass : fail("a reason is required"));

export const chargeMachine = defineMachine({
  name: "charge",
  states: ["expected", "incurred", "invoiced", "disputed", "settled", "written_off"],
  initial: "expected",
  terminal: ["settled", "written_off"],
  events: {
    incur: { from: ["expected"], to: "incurred", process: "8.1.2" },
    invoice: { from: ["expected", "incurred"], to: "invoiced", process: "8.2.1" },
    dispute: { from: ["invoiced"], to: "disputed", process: "8.2.3", guard: needsReason },
    settle: { from: ["invoiced", "disputed"], to: "settled", process: "8.4.2" },
    write_off: { from: ["disputed"], to: "written_off", process: "8.5.4", guard: needsReason },
  },
});
