// Exception: detected → owned → in progress → resolved → reviewed.
import { defineMachine, fail, pass } from "../machine";

export interface ExceptionContext {
  ownerId?: string;
  /** 7.4.4: cause, cost and who absorbed it. */
  resolution?: { cause: string; cost?: number; absorbedBy?: string };
}

export const exceptionMachine = defineMachine({
  name: "exception",
  states: ["detected", "owned", "in_progress", "resolved", "reviewed"],
  initial: "detected",
  terminal: ["reviewed"],
  events: {
    assign: { from: ["detected", "owned"], to: "owned", process: "7.4.1", guard: (c: ExceptionContext) => (c.ownerId ? pass : fail("an owner is required")) },
    start: { from: ["owned"], to: "in_progress", process: "7.4.2" },
    resolve: {
      from: ["in_progress"],
      to: "resolved",
      process: "7.4.4",
      guard: (c: ExceptionContext) => (c.resolution?.cause ? pass : fail("record the cause before resolving")),
    },
    review: { from: ["resolved"], to: "reviewed", process: "7.4.4" },
  },
});
