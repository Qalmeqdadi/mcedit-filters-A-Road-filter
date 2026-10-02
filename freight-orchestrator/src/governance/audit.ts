// 12.3 Audit and traceability. Append-only: who or what, when, input, output,
// and the rule set or model version used. Overrides point at the decision they overrode.
import { randomUUID } from "node:crypto";
import type { Actor } from "./actor";

export type AuditOutcome =
  /** A state change or decision took effect. */
  | "applied"
  /** The policy refused the action. */
  | "denied"
  /** A state machine or rule refused the action. */
  | "refused"
  /** A read or export of sensitive data (3.5.3). */
  | "viewed";

export interface AuditInput {
  actor: Actor;
  /** "<entity>.<verb>", e.g. "quote.accept" or "config.publish". */
  action: string;
  /** Process address, e.g. "4.8.1". */
  process?: string;
  entityType: string;
  entityId: string;
  outcome: AuditOutcome;
  input?: unknown;
  output?: unknown;
  /** Rule set ids used, e.g. ["permissions@1", "margin@3"]. */
  ruleVersions?: string[];
  /** Model and prompt version for AI decisions. */
  modelVersion?: string;
  /** Present when a person overrode an automated decision. */
  override?: { of?: string; reason: string };
  /** The desk whose audit trail this belongs to, for scoping reads. */
  deskOrgId?: string | null;
}

export interface AuditRecord extends AuditInput {
  id: string;
  at: Date;
}

export interface AuditFilter {
  entityType?: string;
  entityId?: string;
  action?: string;
  process?: string;
  outcome?: AuditOutcome;
  deskOrgId?: string;
}

export interface AuditSink {
  append(entry: AuditInput, at?: Date): Promise<AuditRecord>;
  list(filter?: AuditFilter): Promise<AuditRecord[]>;
}

export class OverrideWithoutReasonError extends Error {}

export function validateAudit(entry: AuditInput): void {
  if (entry.override && !entry.override.reason.trim()) throw new OverrideWithoutReasonError("an override needs a reason");
  if (entry.override && entry.actor.kind !== "user") throw new OverrideWithoutReasonError("only a person can override");
  if (entry.actor.kind === "model" && !entry.modelVersion && !entry.actor.version) {
    throw new Error("a model decision must record its model version");
  }
}

export function matchesFilter(r: AuditRecord, f: AuditFilter = {}): boolean {
  return (
    (!f.entityType || r.entityType === f.entityType) &&
    (!f.entityId || r.entityId === f.entityId) &&
    (!f.action || r.action === f.action) &&
    (!f.process || r.process === f.process) &&
    (!f.outcome || r.outcome === f.outcome) &&
    (!f.deskOrgId || r.deskOrgId === f.deskOrgId)
  );
}

export class InMemoryAuditSink implements AuditSink {
  private readonly records: AuditRecord[] = [];

  async append(entry: AuditInput, at = new Date()): Promise<AuditRecord> {
    validateAudit(entry);
    // Deep copy so later mutation of the caller's objects cannot rewrite history.
    const rec: AuditRecord = structuredClone({ ...entry, id: randomUUID(), at });
    this.records.push(Object.freeze(rec) as AuditRecord);
    return rec;
  }

  async list(filter?: AuditFilter): Promise<AuditRecord[]> {
    return this.records.filter((r) => matchesFilter(r, filter));
  }
}
