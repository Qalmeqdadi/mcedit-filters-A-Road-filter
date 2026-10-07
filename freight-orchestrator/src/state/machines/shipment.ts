// Shipment: planned → in transit → at destination → delivered → closed. Added: cancelled.
import { defineMachine } from "../machine";

export const shipmentMachine = defineMachine({
  name: "shipment",
  states: ["planned", "in_transit", "at_destination", "delivered", "closed", "cancelled"],
  initial: "planned",
  terminal: ["closed", "cancelled"],
  events: {
    depart: { from: ["planned"], to: "in_transit", process: "7.1.1" },
    arrive: { from: ["in_transit"], to: "at_destination", process: "7.1.1" },
    deliver: { from: ["at_destination"], to: "delivered", process: "7.5.3" },
    close: { from: ["delivered"], to: "closed", process: "8.6.1" },
    cancel: { from: ["planned"], to: "cancelled", process: "5.4.3" },
  },
});
