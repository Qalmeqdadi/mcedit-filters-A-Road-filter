// Postgres implementations of the transition store, audit sink and config store.
import { and, asc, desc, eq, isNull, type SQL } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { parseRuleset, rulesetId, type ConfigStore, type Ruleset } from "../config/store";
import type { RulesetKind } from "../config/schema";
import { validateAudit, type AuditFilter, type AuditInput, type AuditRecord, type AuditSink } from "../governance/audit";
import type { StatefulRow, TransitionStore, UnitOfWork } from "../state/apply";
import type { MachineName } from "../state/machines";
import type { Db } from "./client";
import { auditLog, rulesetVersion, STATEFUL_TABLES } from "./schema";

export class PgTransitionStore implements TransitionStore {
  constructor(private readonly db: Db) {}

  async load(machine: MachineName, id: string): Promise<StatefulRow | undefined> {
    const t = STATEFUL_TABLES[machine];
    const rows = await this.db.select().from(t).where(eq(t.id, id)).for("update");
    return rows[0] as StatefulRow | undefined;
  }

  async save(machine: MachineName, id: string, expected: { status: string; rowVersion: number }, to: string): Promise<boolean> {
    const t = STATEFUL_TABLES[machine];
    const res = await this.db
      .update(t)
      .set({ status: to as never, rowVersion: expected.rowVersion + 1 })
      .where(and(eq(t.id, id), eq(t.status, expected.status as never), eq(t.rowVersion, expected.rowVersion)))
      .returning({ id: t.id });
    return res.length === 1;
  }
}

export class PgAuditSink implements AuditSink {
  constructor(private readonly db: Db) {}

  async append(e: AuditInput, at = new Date()): Promise<AuditRecord> {
    validateAudit(e);
    const id = randomUUID();
    await this.db.insert(auditLog).values({
      id,
      at,
      actorKind: e.actor.kind,
      actorId: e.actor.id,
      actorRole: e.actor.role,
      actorOrgId: e.actor.orgId,
      actorVersion: e.actor.version ?? null,
      action: e.action,
      process: e.process ?? null,
      entityType: e.entityType,
      entityId: e.entityId,
      outcome: e.outcome,
      input: e.input ?? null,
      output: e.output ?? null,
      ruleVersions: e.ruleVersions ?? [],
      modelVersion: e.modelVersion ?? null,
      overrideOf: e.override?.of ?? null,
      overrideReason: e.override?.reason ?? null,
      deskOrgId: e.deskOrgId ?? null,
    });
    return { ...e, id, at };
  }

  async list(f: AuditFilter = {}): Promise<AuditRecord[]> {
    const where: SQL[] = [];
    if (f.entityType) where.push(eq(auditLog.entityType, f.entityType));
    if (f.entityId) where.push(eq(auditLog.entityId, f.entityId));
    if (f.action) where.push(eq(auditLog.action, f.action));
    if (f.process) where.push(eq(auditLog.process, f.process));
    if (f.outcome) where.push(eq(auditLog.outcome, f.outcome));
    if (f.deskOrgId) where.push(eq(auditLog.deskOrgId, f.deskOrgId));
    const rows = await this.db.select().from(auditLog).where(and(...where)).orderBy(asc(auditLog.at));
    return rows.map((r) => ({
      id: r.id,
      at: r.at,
      actor: { kind: r.actorKind as AuditRecord["actor"]["kind"], id: r.actorId, role: r.actorRole, orgId: r.actorOrgId, ...(r.actorVersion ? { version: r.actorVersion } : {}) },
      action: r.action,
      process: r.process ?? undefined,
      entityType: r.entityType,
      entityId: r.entityId,
      outcome: r.outcome as AuditRecord["outcome"],
      input: r.input,
      output: r.output,
      ruleVersions: r.ruleVersions,
      modelVersion: r.modelVersion ?? undefined,
      override: r.overrideReason ? { of: r.overrideOf ?? undefined, reason: r.overrideReason } : undefined,
      deskOrgId: r.deskOrgId,
    }));
  }
}

export class PgUnitOfWork implements UnitOfWork {
  constructor(private readonly db: Db) {}

  run<T>(fn: (tx: { store: TransitionStore; audit: AuditSink }) => Promise<T>): Promise<T> {
    return this.db.transaction((tx) => fn({ store: new PgTransitionStore(tx as unknown as Db), audit: new PgAuditSink(tx as unknown as Db) }));
  }
}

export class PgConfigStore implements ConfigStore {
  constructor(private readonly db: Db) {}

  private toRuleset<K extends RulesetKind>(r: typeof rulesetVersion.$inferSelect): Ruleset<K> {
    return {
      kind: r.kind as K,
      version: r.version,
      id: rulesetId(r.kind, r.version, r.deskOrgId),
      deskOrgId: r.deskOrgId,
      body: parseRuleset(r.kind as K, r.body),
      publishedAt: r.publishedAt,
      publishedBy: r.publishedBy,
    };
  }

  private latest(kind: RulesetKind, deskOrgId: string | null) {
    return this.db
      .select()
      .from(rulesetVersion)
      .where(and(eq(rulesetVersion.kind, kind), deskOrgId ? eq(rulesetVersion.deskOrgId, deskOrgId) : isNull(rulesetVersion.deskOrgId)))
      .orderBy(desc(rulesetVersion.version))
      .limit(1);
  }

  async active<K extends RulesetKind>(kind: K, deskOrgId: string | null = null): Promise<Ruleset<K>> {
    const own = deskOrgId ? (await this.latest(kind, deskOrgId))[0] : undefined;
    const row = own ?? (await this.latest(kind, null))[0];
    if (!row) throw new Error(`no active rule set for ${kind}`);
    return this.toRuleset<K>(row);
  }

  async get<K extends RulesetKind>(kind: K, version: number, deskOrgId: string | null = null) {
    const rows = await this.db
      .select()
      .from(rulesetVersion)
      .where(
        and(
          eq(rulesetVersion.kind, kind),
          eq(rulesetVersion.version, version),
          deskOrgId ? eq(rulesetVersion.deskOrgId, deskOrgId) : isNull(rulesetVersion.deskOrgId),
        ),
      );
    return rows[0] ? this.toRuleset<K>(rows[0]) : undefined;
  }

  async put<K extends RulesetKind>(kind: K, body: unknown, publishedBy: string, deskOrgId: string | null = null): Promise<Ruleset<K>> {
    const parsed = parseRuleset(kind, body);
    const prev = (await this.latest(kind, deskOrgId))[0];
    const [row] = await this.db
      .insert(rulesetVersion)
      .values({ kind, version: (prev?.version ?? 0) + 1, deskOrgId, body: parsed, publishedBy })
      .returning();
    return this.toRuleset<K>(row!);
  }

  async history<K extends RulesetKind>(kind: K, deskOrgId: string | null = null) {
    const rows = await this.db
      .select()
      .from(rulesetVersion)
      .where(and(eq(rulesetVersion.kind, kind), deskOrgId ? eq(rulesetVersion.deskOrgId, deskOrgId) : isNull(rulesetVersion.deskOrgId)))
      .orderBy(asc(rulesetVersion.version));
    return rows.map((r) => this.toRuleset<K>(r));
  }
}
