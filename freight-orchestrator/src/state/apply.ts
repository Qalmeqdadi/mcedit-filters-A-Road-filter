// The only way a status changes. In one unit of work it:
//   1. loads the row,
//   2. asks the policy (12.2) whether this actor may fire this event on this row,
//   3. runs the pure state machine,
//   4. saves with a compare-and-set on status and row version,
//   5. writes the audit record (12.3).
// Denials and refusals are audited too, and committed even though nothing changed.
import type { Actor } from "../governance/actor";
import type { AuditRecord, AuditSink } from "../governance/audit";
import { ForbiddenError, type Policy, type ResourceRef } from "../governance/policy";
import { describe, type ResourceExtras } from "../governance/resources";
import { IllegalTransitionError, transition, type ContextOf, type TransitionResult } from "./machine";
import { MACHINES, type MachineName } from "./machines";

export interface StatefulRow {
  id: string;
  status: string;
  rowVersion: number;
  [k: string]: unknown;
}

export interface TransitionStore {
  load(machine: MachineName, id: string): Promise<StatefulRow | undefined>;
  /** Compare-and-set. Returns false if the row moved since it was loaded. */
  save(machine: MachineName, id: string, expected: { status: string; rowVersion: number }, to: string): Promise<boolean>;
}

export interface UnitOfWork {
  run<T>(fn: (tx: { store: TransitionStore; audit: AuditSink }) => Promise<T>): Promise<T>;
}

export class NotFoundError extends Error {}
export class ConcurrentChangeError extends Error {}

type Ctx<N extends MachineName> = ContextOf<(typeof MACHINES)[N]>;

export interface ApplyArgs<N extends MachineName> {
  actor: Actor;
  machine: N;
  id: string;
  event: keyof (typeof MACHINES)[N]["events"] & string;
  /** Facts the guards test. Recorded as audit input. */
  ctx?: Ctx<N>;
  /** Extra input to record (e.g. the evidence behind a decision). */
  input?: Record<string, unknown>;
  /** Rule set ids the caller used to decide (the permissions version is added automatically). */
  ruleVersions?: string[];
  modelVersion?: string;
  /** A person overriding an automated decision. */
  override?: { of?: string; reason: string };
  /** Ownership facts stored on other rows, for the permission check. */
  extras?: ResourceExtras;
}

export interface Applied {
  from: string;
  to: string;
  process: string;
  audit: AuditRecord;
}

export async function applyTransition<N extends MachineName>(deps: { uow: UnitOfWork; policy: Policy }, a: ApplyArgs<N>): Promise<Applied> {
  const m = MACHINES[a.machine];
  const action = `${a.machine}.${a.event}`;
  const ctx = (a.ctx ?? {}) as never;
  const ruleVersions = [deps.policy.version, ...(a.ruleVersions ?? [])];

  type Outcome =
    | { kind: "applied"; value: Applied }
    | { kind: "missing" }
    | { kind: "denied"; resource: ResourceRef; reason: string }
    | { kind: "refused"; result: Extract<TransitionResult<string, string>, { ok: false }> }
    | { kind: "conflict" };

  const outcome: Outcome = await deps.uow.run(async ({ store, audit }): Promise<Outcome> => {
    const row = await store.load(a.machine, a.id);
    if (!row) return { kind: "missing" };
    const resource = describe(a.machine, row, a.extras);
    const common = {
      actor: a.actor,
      action,
      entityType: a.machine,
      entityId: a.id,
      ruleVersions,
      modelVersion: a.modelVersion,
      deskOrgId: resource.deskOrgId,
      input: { event: a.event, from: row.status, ctx: a.ctx ?? {}, ...a.input },
    };

    const decision = deps.policy.can(a.actor, action, resource);
    if (!decision.allowed) {
      await audit.append({ ...common, outcome: "denied", output: { reason: decision.reason } });
      return { kind: "denied", resource, reason: decision.reason };
    }

    const r = transition(m as never, row.status as never, a.event as never, ctx) as TransitionResult<string, string>;
    if (!r.ok) {
      await audit.append({ ...common, outcome: "refused", output: { code: r.code, reason: r.reason } });
      return { kind: "refused", result: r };
    }

    const saved = await store.save(a.machine, a.id, { status: row.status, rowVersion: row.rowVersion }, r.to);
    if (!saved) return { kind: "conflict" };

    const rec = await audit.append({
      ...common,
      process: r.process,
      outcome: "applied",
      output: { from: r.from, to: r.to },
      override: a.override,
    });
    return { kind: "applied", value: { from: r.from, to: r.to, process: r.process, audit: rec } };
  });

  switch (outcome.kind) {
    case "applied":
      return outcome.value;
    case "missing":
      throw new NotFoundError(`${a.machine}/${a.id} not found`);
    case "denied":
      throw new ForbiddenError(a.actor, action, outcome.resource, outcome.reason);
    case "refused":
      throw new IllegalTransitionError(outcome.result);
    case "conflict":
      throw new ConcurrentChangeError(`${a.machine}/${a.id} changed while ${action} was being applied; reload and retry`);
  }
}
