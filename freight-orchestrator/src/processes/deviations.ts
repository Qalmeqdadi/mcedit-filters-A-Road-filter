// Everything in this file differs from, or adds to, the process document.
// Each entry says what changed and why, so a reviewer can accept or revert it.

import type { ArchitectureEntry } from "./architecture.data";

export interface Deviation {
  /** Process address (or state machine name) affected. */
  ref: string;
  kind: "added-process" | "changed-process" | "added-state" | "added-machine";
  summary: string;
  why: string;
}

/**
 * Level-2 and level-3 addresses added to the document. No new level-1 process
 * is introduced. 1.5 holds the shipper document pack that the direct-to-shipper
 * flow depends on; 6.2 reuses it instead of collecting the same papers again.
 */
export const ADDED_PROCESSES: readonly ArchitectureEntry[] = [
  { id: "1.5", title: "Shipper document pack" },
  { id: "1.5.1", title: "Determine the required documents from mode, cargo, Incoterm and route" },
  { id: "1.5.2", title: "Collect uploads from the shipper against the checklist" },
  { id: "1.5.3", title: "Extract document fields and cross-check them against the request" },
  { id: "1.5.4", title: "Chase missing or rejected documents" },
  { id: "1.5.5", title: "Release a redacted pack for RFQs and the full pack on booking" },
  { id: "4.4.8", title: "Document fit: the pack supports the cargo (for example a DG declaration for DG cargo)" },
];

export const DEVIATIONS: readonly Deviation[] = [
  {
    ref: "1.5",
    kind: "added-process",
    summary: "Shipper prepares and uploads the full document pack with the request.",
    why: "The shipper already holds these papers. Reading them at intake removes re-keying and lets 6.2 validate instead of collect.",
  },
  {
    ref: "4.4.8",
    kind: "added-process",
    summary: "Feasibility also checks that the document pack fits the cargo.",
    why: "With documents collected up front, a missing DG declaration can kill an option before the shipper sees it.",
  },
  {
    ref: "4.7",
    kind: "changed-process",
    summary:
      "Options are published straight to the shipper workspace at an all-in price (carrier cost plus desk margin applied by rule). The desk approves only exceptions.",
    why: "Removes the forwarder relay (carrier → desk → shipper) without exposing carrier cost or desk margin to the shipper.",
  },
  {
    ref: "4.8.2",
    kind: "changed-process",
    summary: "Internal approval happens before publication, not after acceptance.",
    why: "In the direct flow the shipper accepts a binding price, so the desk must approve exceptions before the shipper can see the quote.",
  },
  {
    ref: "4.8.1",
    kind: "changed-process",
    summary: "Shipper acceptance hands the accepted option and the full document pack to the desk for booking (5.1).",
    why: "The forwarder steps back in for execution only: booking, filing, pickup and handover.",
  },
  {
    ref: "4.1.2",
    kind: "changed-process",
    summary: "Carriers receive a redacted pack (no party names, no cargo value) until a booking is confirmed.",
    why: "The commercial invoice names the shipper; sending it with the RFQ would let carriers bypass the desk.",
  },
  { ref: "request", kind: "added-state", summary: "Added awaiting_info and cancelled.", why: "1.1.5 tracks the wait for missing data; requests can be withdrawn." },
  { ref: "quote", kind: "added-state", summary: "Added pending_approval.", why: "4.8.2 internal approval needs a state the shipper cannot see." },
  { ref: "shipment", kind: "added-state", summary: "Added cancelled.", why: "A planned shipment can be cancelled before it moves." },
  { ref: "charge", kind: "added-state", summary: "Added written_off; invoiced can settle without a dispute; expected can be invoiced directly.", why: "8.5.4 write-offs; most charges are never disputed." },
  { ref: "bid", kind: "added-machine", summary: "New machine: invited → chased → replied → superseded, or declined / no_reply.", why: "4.1.5 chasing and 4.2.3 revisions need explicit states." },
  { ref: "document", kind: "added-machine", summary: "New machine: requested → uploaded → extracted → validated or rejected.", why: "1.5 and 6.2 need to know where each document stands." },
  { ref: "capacity_hold", kind: "added-machine", summary: "New machine: held → converted, released or expired.", why: "2.4.1 and 2.4.2 soft holds against live quotes." },
];

/** Decisions on the open commercial questions, taken by the build team and open to review. */
export const DECISIONS = [
  { id: "A", question: "What does the shipper see per option?", decision: "One all-in price: carrier cost plus desk margin applied by rule. Carrier cost and margin are never shown to the shipper." },
  { id: "B", question: "Who contracts for the freight?", decision: "The shipper contracts with the forwarder desk; the desk buys from the carrier." },
  { id: "C", question: "What does the carrier see before booking?", decision: "A redacted pack: cargo detail yes, party names and cargo value no." },
  { id: "D", question: "Whose user is the shipper?", decision: "The desk's. The desk invites shippers, and its carrier panel and rules apply." },
  { id: "E1", question: "Does the platform ever contract as a carrier?", decision: "No. Software only." },
  { id: "E2", question: "Do we hold customer money?", decision: "No. Route only in the MVP; escrow stays a Phase 5 option." },
  { id: "F", question: "Where does the code live?", decision: "freight-orchestrator/ beside the existing demo in this repo." },
  { id: "G", question: "Hosting", decision: "Local Postgres 16 for now. Tests run on in-process Postgres (PGlite)." },
  { id: "H", question: "Language and currency", decision: "English, layout ready for Arabic (RTL). USD base, AED shown alongside." },
  { id: "I", question: "Live model", decision: "Claude behind the extraction interface when a key is set; the deterministic mock otherwise and always in tests." },
] as const;
