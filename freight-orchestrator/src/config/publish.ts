// 13.4 Change management: a rule change is a new version, permission-checked and audited.
import type { Actor } from "../governance/actor";
import type { AuditSink } from "../governance/audit";
import type { Policy } from "../governance/policy";
import { RulesetValidationError, type ConfigStore, type Ruleset } from "./store";
import type { RulesetKind } from "./schema";

export async function publishRuleset<K extends RulesetKind>(
  deps: { config: ConfigStore; audit: AuditSink; policy: Policy },
  actor: Actor,
  kind: K,
  body: unknown,
  deskOrgId: string | null = null,
): Promise<Ruleset<K>> {
  const resource = { type: "config", id: kind, deskOrgId, attrs: { kind } };
  const decision = deps.policy.can(actor, "config.publish", resource);
  const before = await deps.config.active(kind, deskOrgId).catch(() => undefined);
  const common = { actor, action: "config.publish", process: "13.4", entityType: "config", entityId: kind, deskOrgId, ruleVersions: [deps.policy.version] };
  if (!decision.allowed) {
    await deps.audit.append({ ...common, outcome: "denied", input: { body }, output: { reason: decision.reason } });
    deps.policy.assert(actor, "config.publish", resource);
  }
  try {
    const r = await deps.config.put(kind, body, actor.id, deskOrgId);
    await deps.audit.append({ ...common, outcome: "applied", input: { from: before?.id ?? null, body }, output: { id: r.id } });
    return r;
  } catch (e) {
    if (e instanceof RulesetValidationError) {
      await deps.audit.append({ ...common, outcome: "refused", input: { body }, output: { reason: e.message } });
    }
    throw e;
  }
}
