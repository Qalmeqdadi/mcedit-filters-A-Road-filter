// 12.2 Data permissions: the single place where who-sees-what is decided.
// Every server read and write goes through can()/assert() for rows and redact() for fields.
// The matrix itself is configuration (config/rulesets/permissions.json).
import type { Ruleset } from "../config/memory";
import type { Permissions, Scope } from "../config/schema";
import type { Actor } from "./actor";

/** What the policy needs to know about a row: who owns it, and the attributes rules may test. */
export interface ResourceRef {
  type: string;
  id?: string;
  deskOrgId: string | null;
  shipperOrgId?: string | null;
  carrierOrgId?: string | null;
  partnerOrgId?: string | null;
  /** Attributes conditions may test, e.g. status, published, bookingConfirmed, counterparty. */
  attrs?: Record<string, unknown>;
}

export type Decision = { allowed: true; via: string } | { allowed: false; reason: string };

export class ForbiddenError extends Error {
  constructor(public readonly actor: Actor, public readonly action: string, public readonly resource: ResourceRef, reason: string) {
    super(`${actor.role}:${actor.id} may not ${action} ${resource.type}${resource.id ? `/${resource.id}` : ""}: ${reason}`);
  }
}

type Condition = { attr: string; in: (string | number | boolean)[] };
type Scoped = { role: string; scope: Scope; when?: Condition[] };

export class Policy {
  readonly body: Permissions;
  readonly version: string;

  constructor(permissions: Ruleset<"permissions">) {
    this.body = permissions.body;
    this.version = permissions.id;
  }

  can(actor: Actor, action: string, r: ResourceRef): Decision {
    if (!this.body.roles[actor.role]) return { allowed: false, reason: `unknown role ${actor.role}` };
    const fullAction = action.includes(".") ? action : `${r.type}.${action}`;
    if (fullAction.split(".")[0] !== r.type) return { allowed: false, reason: `action ${fullAction} does not apply to ${r.type}` };
    let nearMiss: string | undefined;
    for (const g of this.body.grants) {
      if (g.role !== actor.role || !g.actions.some((p) => matchAction(p, fullAction))) continue;
      if (!inScope(actor, g.scope, r)) {
        nearMiss ??= `outside ${g.scope} scope`;
        continue;
      }
      const failed = (g.when ?? []).find((c) => !matches(c, r));
      if (failed) {
        nearMiss ??= `condition ${failed.attr} not met`;
        continue;
      }
      return { allowed: true, via: `${this.version}:${g.role}/${g.scope}` };
    }
    return { allowed: false, reason: nearMiss ?? `no grant for ${fullAction}` };
  }

  assert(actor: Actor, action: string, r: ResourceRef): void {
    const d = this.can(actor, action, r);
    if (!d.allowed) throw new ForbiddenError(actor, action, r, d.reason);
  }

  /** The sensitivity class of a field; unlisted fields are "general". */
  classOf(type: string, field: string): string {
    return this.body.fields[type]?.[field] ?? "general";
  }

  canSeeClass(actor: Actor, cls: string, r: ResourceRef): boolean {
    if (cls === "general") return true;
    const rules: Scoped[] = this.body.visibility[cls] ?? [];
    return rules.some((v) => v.role === actor.role && inScope(actor, v.scope, r) && (v.when ?? []).every((c) => matches(c, r)));
  }

  /**
   * Returns a copy without the fields this actor may not see. Requires read access to the row;
   * call can(actor, "read", r) first, or use readable() which does both.
   */
  redact<T extends Record<string, unknown>>(actor: Actor, r: ResourceRef, record: T): Partial<T> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(record)) {
      if (this.canSeeClass(actor, this.classOf(r.type, k), r)) out[k] = v;
    }
    return out as Partial<T>;
  }

  /** Row check plus field redaction: what an actor gets back from any read. */
  readable<T extends Record<string, unknown>>(actor: Actor, r: ResourceRef, record: T): Partial<T> | null {
    return this.can(actor, "read", r).allowed ? this.redact(actor, r, record) : null;
  }

  /** Filters a list to the rows the actor may read and redacts each one. */
  readableMany<T extends Record<string, unknown>>(actor: Actor, rows: { resource: ResourceRef; record: T }[]): Partial<T>[] {
    return rows.flatMap(({ resource, record }) => {
      const v = this.readable(actor, resource, record);
      return v ? [v] : [];
    });
  }
}

function matchAction(pattern: string, action: string): boolean {
  if (pattern === "*") return true;
  if (pattern.endsWith(".*")) return action.startsWith(pattern.slice(0, -1));
  return pattern === action;
}

function inScope(actor: Actor, scope: Scope, r: ResourceRef): boolean {
  switch (scope) {
    case "any":
      return true;
    case "desk":
      return !!actor.orgId && actor.orgId === r.deskOrgId;
    case "shipper":
      return !!actor.orgId && actor.orgId === r.shipperOrgId;
    case "carrier":
      return !!actor.orgId && actor.orgId === r.carrierOrgId;
    case "partner":
      return !!actor.orgId && actor.orgId === r.partnerOrgId;
    case "self":
      return r.attrs?.userId === actor.id;
  }
}

function matches(c: Condition, r: ResourceRef): boolean {
  const v = r.attrs?.[c.attr];
  return c.in.some((x) => x === v);
}
