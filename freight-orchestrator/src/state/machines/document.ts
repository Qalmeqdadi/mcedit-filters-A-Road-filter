// Document (added machine): requested → uploaded → extracted → validated or rejected.
import { defineMachine, fail, pass } from "../machine";

export interface DocumentContext {
  reason?: string;
}

export const documentMachine = defineMachine({
  name: "document",
  states: ["requested", "uploaded", "extracted", "validated", "rejected"],
  initial: "requested",
  terminal: ["validated"],
  events: {
    upload: { from: ["requested", "rejected"], to: "uploaded", process: "1.5.2" },
    extract: { from: ["uploaded"], to: "extracted", process: "1.5.3" },
    validate: { from: ["extracted"], to: "validated", process: "1.5.3" },
    reject: {
      from: ["uploaded", "extracted"],
      to: "rejected",
      process: "1.5.4",
      guard: (c: DocumentContext) => (c.reason?.trim() ? pass : fail("a rejection reason is required")),
    },
  },
});
