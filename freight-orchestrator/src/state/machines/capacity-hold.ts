// Capacity hold (added machine, 2.4): held → converted, released or expired.
import { defineMachine, fail, pass } from "../machine";

export interface CapacityHoldContext {
  now?: Date;
  expiresAt?: Date;
}

export const capacityHoldMachine = defineMachine({
  name: "capacity_hold",
  states: ["held", "converted", "released", "expired"],
  initial: "held",
  terminal: ["converted", "released", "expired"],
  events: {
    convert: {
      from: ["held"],
      to: "converted",
      process: "2.4.2",
      guard: (c: CapacityHoldContext) => {
        if (!c.now || !c.expiresAt) return fail("hold expiry not supplied");
        return c.now.getTime() <= c.expiresAt.getTime() ? pass : fail("hold has expired");
      },
    },
    release: { from: ["held"], to: "released", process: "2.4.2" },
    expire: { from: ["held"], to: "expired", process: "2.4.1" },
  },
});
