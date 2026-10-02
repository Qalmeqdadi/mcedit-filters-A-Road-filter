// Bid (added machine): one carrier's answer to one RFQ.
// invited → chased → replied → superseded, or declined / no_reply.
import { defineMachine } from "../machine";

export const bidMachine = defineMachine({
  name: "bid",
  states: ["invited", "chased", "replied", "superseded", "declined", "no_reply"],
  initial: "invited",
  terminal: ["superseded", "declined", "no_reply"],
  events: {
    chase: { from: ["invited", "chased"], to: "chased", process: "4.1.5" },
    reply: { from: ["invited", "chased"], to: "replied", process: "4.2.1" },
    supersede: { from: ["replied"], to: "superseded", process: "4.2.3" },
    decline: { from: ["invited", "chased"], to: "declined", process: "4.2.1" },
    time_out: { from: ["invited", "chased"], to: "no_reply", process: "4.1.5" },
  },
});
