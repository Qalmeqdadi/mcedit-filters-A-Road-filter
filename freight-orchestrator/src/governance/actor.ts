// Who or what performed an action (12.1, 12.3).

export type ActorKind = "user" | "rule" | "model" | "system";

export interface Actor {
  kind: ActorKind;
  /** User id, rule id ("4.4.1/container-fit") or model id ("extraction/claude"). */
  id: string;
  /** Role in the permission matrix. Rules and models act as "engine". */
  role: string;
  /** Organisation the actor belongs to; null for the platform engine. */
  orgId: string | null;
  /** Rule or model version, e.g. a code version or "model@prompt-v3". */
  version?: string;
}

export const user = (id: string, role: string, orgId: string): Actor => ({ kind: "user", id, role, orgId });

export const rule = (id: string, version = "1"): Actor => ({ kind: "rule", id, role: "engine", orgId: null, version });

export const model = (id: string, version: string): Actor => ({ kind: "model", id, role: "engine", orgId: null, version });

export const system = (id: string): Actor => ({ kind: "system", id, role: "engine", orgId: null });
