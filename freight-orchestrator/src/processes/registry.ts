// Traceability: every process address → the code, tests and screens that implement it.
// tests/processes/registry.test.ts fails if a listed file is missing, if a built or partial
// entry has no test, or if an address is not in the document (or in deviations.ts).
import { ARCHITECTURE, type ArchitectureEntry } from "./architecture.data";
import { ADDED_PROCESSES } from "./deviations";

export type BuildStatus = "not_started" | "stub" | "partial" | "built";

export interface Implementation {
  id: string;
  status: BuildStatus;
  /** Paths relative to the project root. */
  modules: string[];
  tests: string[];
  screens: string[];
  note?: string;
}

const impl = (id: string, status: BuildStatus, modules: string[], tests: string[], screens: string[] = [], note?: string): Implementation => ({
  id,
  status,
  modules,
  tests,
  screens,
  note,
});

const MACHINE_TESTS = ["tests/state/machine.test.ts", "tests/state/machines.test.ts"];
const INTAKE_TESTS = "tests/p1/1.1-intake.test.ts";
const NETWORK_TESTS = "tests/p2/2.1-network.test.ts";
const NORMALISE_TESTS = "tests/p3/3.2-normalise.test.ts";
const REPLY_TESTS = "tests/p4/4.3-replies.test.ts";
const API_TESTS = "tests/api/api.test.ts";
// Screens live in the sibling app, which runs this code in the page.
const GLOBE = ["../freight-world/src/globe/Globe.tsx", "../freight-world/src/ui/views/Global.tsx"];
const LIVE = ["../freight-world/src/ui/views/Global.tsx"];

export const IMPLEMENTATIONS: readonly Implementation[] = [
  // Objects and states: the first item in the document's re-engineering order.
  impl("1.5", "partial", ["src/state/machines/document.ts", "config/rulesets/document_requirements.json"], MACHINE_TESTS, [], "Document machine and requirement rules; intake arrives with checkpoint 2."),
  impl("2.4", "partial", ["src/state/machines/capacity-hold.ts"], MACHINE_TESTS, [], "Hold machine; holds against live quotes arrive with checkpoint 4."),
  impl("4.2.3", "partial", ["src/state/machines/bid.ts"], MACHINE_TESTS),
  impl("4.8", "partial", ["src/state/machines/quote.ts", "src/state/machines/request.ts"], MACHINE_TESTS),
  impl("5.1", "stub", ["src/state/machines/booking.ts"], MACHINE_TESTS, [], "Machine only (Phase 2)."),
  impl("7.4", "stub", ["src/state/machines/exception.ts"], MACHINE_TESTS, [], "Machine only (Phase 2)."),
  impl("8.1", "stub", ["src/state/machines/charge.ts"], MACHINE_TESTS, [], "Machine only (Phase 2)."),
  impl("7.1", "stub", ["src/state/machines/shipment.ts"], MACHINE_TESTS, [], "Machine only (Phase 2)."),

  // 1.1 Receive the requirement.
  impl(
    "1.1.1",
    "partial",
    ["src/p1/email.ts", "src/p1/mailbox.ts", "src/p1/imap.ts", "src/api/workspace.ts", "src/api/app.ts", "src/api/server.ts"],
    [INTAKE_TESTS, "tests/p1/1.1-imap.test.ts", API_TESTS],
    LIVE,
    "Email by inbound webhook, IMAP polling or .eml upload; replies by API. WhatsApp and portal forms come later.",
  ),
  impl("1.1.3", "built", ["src/p1/intake.ts", "src/extract/dates.ts", "src/extract/types.ts", "src/network/hubs.ts", "src/ai/claude.ts"], [INTAKE_TESTS, REPLY_TESTS], LIVE, "Rules extractor, plus Claude with the rules as fallback."),
  impl("1.1.4", "built", ["src/p1/intake.ts", "src/state/machines/request.ts"], [INTAKE_TESTS, ...MACHINE_TESTS]),
  impl("1.1.5", "partial", ["src/p1/intake.ts", "src/state/machines/request.ts"], [INTAKE_TESTS, ...MACHINE_TESTS], LIVE, "Drafts the missing-information reply; chasing on a timer comes later."),
  impl("1.1.6", "built", ["src/p1/intake.ts"], [INTAKE_TESTS]),

  // 2.1 Supply base: multimodal hubs, carriers, lanes and persona views.
  impl("2.1.1", "partial", ["src/network/scenario.ts", "src/network/hubs.ts", "src/network/modes.ts"], [NETWORK_TESTS], GLOBE, "Illustrative carriers and lanes for GCC–Asia and GCC–Europe across ocean, air, rail and road."),
  impl("2.1.4", "partial", ["src/network/scenario.ts", "src/network/view.ts"], [NETWORK_TESTS], GLOBE, "Service strings, transit norms and capacity units per mode."),

  // 3.2 Normalise rates.
  impl("3.2.1", "built", ["src/p3/charges.ts"], [NORMALISE_TESTS]),
  impl("3.2.2", "built", ["src/p3/charges.ts", "src/network/modes.ts"], [NORMALISE_TESTS], [], "Exchange rates are illustrative until a daily rate source is connected."),
  impl("3.2.3", "built", ["src/p3/charges.ts"], [NORMALISE_TESTS], LIVE),
  impl("3.2.4", "built", ["src/p3/charges.ts"], [NORMALISE_TESTS]),

  // 4.3 Turn replies into data.
  impl("4.3.1", "built", ["src/p4/replies.ts", "src/ai/claude.ts"], [REPLY_TESTS], LIVE, "Email, PDF text and chat. Claude extractor with rule fallback."),
  impl("4.3.2", "built", ["src/p4/replies.ts", "src/extract/types.ts"], [REPLY_TESTS]),
  impl("4.3.3", "built", ["src/p4/replies.ts", "src/api/workspace.ts", "config/rulesets/confidence.json"], [REPLY_TESTS, API_TESTS], LIVE),
  impl("4.3.4", "built", ["src/p4/replies.ts", "src/api/workspace.ts"], [REPLY_TESTS, API_TESTS]),
  impl("4.3.5", "built", ["src/p4/replies.ts", "config/rulesets/confidence.json"], [REPLY_TESTS], LIVE),

  // 12 Governance, security and access.
  impl("12.1", "partial", ["src/governance/actor.ts", "config/rulesets/permissions.json"], ["tests/p12/12.2-permissions.test.ts"], [], "Actors and roles; sign-in arrives with the workspaces."),
  impl(
    "12.2",
    "built",
    ["src/governance/policy.ts", "src/governance/resources.ts", "config/rulesets/permissions.json"],
    ["tests/p12/12.2-permissions.test.ts", NETWORK_TESTS, API_TESTS],
    GLOBE,
  ),
  impl(
    "12.3",
    "built",
    ["src/governance/audit.ts", "src/state/apply.ts", "src/db/stores.ts", "src/db/migrations/0001_audit_append_only.sql"],
    ["tests/p12/12.3-audit.test.ts", "tests/db/postgres.test.ts", API_TESTS],
    LIVE,
  ),

  // 13.4 Change management: configuration versus code.
  impl(
    "13.4",
    "partial",
    ["src/config/schema.ts", "src/config/memory.ts", "src/config/store.ts", "src/config/publish.ts", "src/db/stores.ts"],
    ["tests/config/rulesets.test.ts", "tests/db/postgres.test.ts"],
    [],
    "Versioned, audited rule sets; release notes and training come later.",
  ),
];

export const ALL_PROCESSES: readonly (ArchitectureEntry & { added?: true })[] = [
  ...ARCHITECTURE,
  ...ADDED_PROCESSES.map((p) => ({ ...p, added: true as const })),
].sort((a, b) => compareAddress(a.id, b.id));

export function compareAddress(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? -1) - (pb[i] ?? -1);
    if (d) return d;
  }
  return 0;
}

export function isKnownAddress(id: string): boolean {
  return ALL_PROCESSES.some((p) => p.id === id);
}
