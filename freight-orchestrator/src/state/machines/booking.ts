// Booking: requested → confirmed → amended → cancelled or rolled. (Phase 2 process 5; machine built now.)
import { defineMachine } from "../machine";

export const bookingMachine = defineMachine({
  name: "booking",
  states: ["requested", "confirmed", "amended", "cancelled", "rolled"],
  initial: "requested",
  terminal: ["cancelled", "rolled"],
  events: {
    confirm: { from: ["requested"], to: "confirmed", process: "5.1.2" },
    amend: { from: ["confirmed", "amended"], to: "amended", process: "5.4.1" },
    cancel: { from: ["requested", "confirmed", "amended"], to: "cancelled", process: "5.4.3" },
    roll: { from: ["confirmed", "amended"], to: "rolled", process: "5.4.2" },
  },
});
