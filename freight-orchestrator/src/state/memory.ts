// In-memory unit of work for fast tests and the demo engine. Same contract as PgUnitOfWork.
import { InMemoryAuditSink, type AuditSink } from "../governance/audit";
import type { StatefulRow, TransitionStore, UnitOfWork } from "./apply";
import { MACHINES, type MachineName } from "./machines";

export class InMemoryTransitionStore implements TransitionStore {
  private readonly rows = new Map<string, StatefulRow>();

  /** Inserts a row in its machine's initial state. Rows never start anywhere else. */
  create(machine: MachineName, row: { id: string } & Record<string, unknown>): StatefulRow {
    const r: StatefulRow = { ...row, status: MACHINES[machine].initial, rowVersion: 0 };
    this.rows.set(`${machine}:${row.id}`, r);
    return r;
  }

  async load(machine: MachineName, id: string) {
    const r = this.rows.get(`${machine}:${id}`);
    return r ? { ...r } : undefined;
  }

  async save(machine: MachineName, id: string, expected: { status: string; rowVersion: number }, to: string) {
    const r = this.rows.get(`${machine}:${id}`);
    if (!r || r.status !== expected.status || r.rowVersion !== expected.rowVersion) return false;
    r.status = to;
    r.rowVersion += 1;
    return true;
  }
}

export class InMemoryUnitOfWork implements UnitOfWork {
  constructor(
    readonly store = new InMemoryTransitionStore(),
    readonly audit: AuditSink = new InMemoryAuditSink(),
  ) {}

  run<T>(fn: (tx: { store: TransitionStore; audit: AuditSink }) => Promise<T>): Promise<T> {
    return fn({ store: this.store, audit: this.audit });
  }
}
