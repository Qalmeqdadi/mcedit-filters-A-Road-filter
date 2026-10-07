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

export const IMPLEMENTATIONS: readonly Implementation[] = [
  // Objects and states: the first item in the document's re-engineering order.
  impl("1.1.4", "partial", ["src/state/machines/request.ts"], MACHINE_TESTS, [], "Request validate guard; completeness rules arrive with checkpoint 2."),
  impl("1.1.5", "partial", ["src/state/machines/request.ts"], MACHINE_TESTS, [], "awaiting_info state; chasing arrives with checkpoint 2."),
  impl("1.5", "partial", ["src/state/machines/document.ts", "config/rulesets/document_requirements.json"], MACHINE_TESTS, [], "Document machine and requirement rules; intake arrives with checkpoint 2."),
  impl("2.4", "partial", ["src/state/machines/capacity-hold.ts"], MACHINE_TESTS, [], "Hold machine; holds against live quotes arrive with checkpoint 4."),
  impl("4.2.3", "partial", ["src/state/machines/bid.ts"], MACHINE_TESTS),
  impl("4.8", "partial", ["src/state/machines/quote.ts", "src/state/machines/request.ts"], MACHINE_TESTS),
  impl("5.1", "stub", ["src/state/machines/booking.ts"], MACHINE_TESTS, [], "Machine only (Phase 2)."),
  impl("7.4", "stub", ["src/state/machines/exception.ts"], MACHINE_TESTS, [], "Machine only (Phase 2)."),
  impl("8.1", "stub", ["src/state/machines/charge.ts"], MACHINE_TESTS, [], "Machine only (Phase 2)."),
  impl("7.1", "stub", ["src/state/machines/shipment.ts"], MACHINE_TESTS, [], "Machine only (Phase 2)."),

  // 12 Governance, security and access.
  impl("12.1", "partial", ["src/governance/actor.ts", "config/rulesets/permissions.json"], ["tests/p12/12.2-permissions.test.ts"], [], "Actors and roles; sign-in arrives with the workspaces."),
  impl(
    "12.2",
    "built",
    ["src/governance/policy.ts", "src/governance/resources.ts", "config/rulesets/permissions.json"],
    ["tests/p12/12.2-permissions.test.ts"],
  ),
  impl(
    "12.3",
    "built",
    ["src/governance/audit.ts", "src/state/apply.ts", "src/db/stores.ts", "src/db/migrations/0001_audit_append_only.sql"],
    ["tests/p12/12.3-audit.test.ts", "tests/db/postgres.test.ts"],
  ),

  // 13.4 Change management: configuration versus code.
  impl(
    "13.4",
    "partial",
    ["src/config/schema.ts", "src/config/store.ts", "src/config/publish.ts", "src/db/stores.ts"],
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
