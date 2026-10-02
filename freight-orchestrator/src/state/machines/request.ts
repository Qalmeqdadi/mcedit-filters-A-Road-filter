// Request: draft → validated → out to carriers → options ready → quoted → won, lost or expired.
// Added (see deviations): awaiting_info for 1.1.5, cancelled.
import { defineMachine, fail, pass } from "../machine";

export interface RequestContext {
  /** Result of the 1.1.4 completeness check. */
  completeness?: { ok: boolean; missing: string[] };
  /** Carriers chosen by 4.1.1. */
  carriersInvited?: number;
  /** Options that passed 4.4 feasibility. */
  feasibleOptions?: number;
}

export const requestMachine = defineMachine({
  name: "request",
  states: ["draft", "awaiting_info", "validated", "out_to_carriers", "options_ready", "quoted", "won", "lost", "expired", "cancelled"],
  initial: "draft",
  terminal: ["won", "lost", "expired", "cancelled"],
  events: {
    request_info: { from: ["draft"], to: "awaiting_info", process: "1.1.5" },
    info_received: { from: ["awaiting_info"], to: "draft", process: "1.1.5" },
    validate: {
      from: ["draft"],
      to: "validated",
      process: "1.1.4",
      guard: (c: RequestContext) =>
        c.completeness?.ok ? pass : fail(`incomplete: ${c.completeness?.missing.join(", ") || "completeness not checked"}`),
    },
    dispatch: {
      from: ["validated"],
      to: "out_to_carriers",
      process: "4.1.1",
      guard: (c: RequestContext) => ((c.carriersInvited ?? 0) > 0 ? pass : fail("no carriers selected")),
    },
    options_built: {
      from: ["out_to_carriers"],
      to: "options_ready",
      process: "4.5",
      guard: (c: RequestContext) => ((c.feasibleOptions ?? 0) > 0 ? pass : fail("no feasible options")),
    },
    quote_published: { from: ["options_ready"], to: "quoted", process: "4.7.4" },
    win: { from: ["quoted"], to: "won", process: "4.8.1" },
    lose: { from: ["options_ready", "quoted"], to: "lost", process: "4.8.4" },
    expire: { from: ["out_to_carriers", "options_ready", "quoted"], to: "expired", process: "4.8.3" },
    cancel: { from: ["draft", "awaiting_info", "validated", "out_to_carriers", "options_ready", "quoted"], to: "cancelled", process: "1.1" },
  },
});
