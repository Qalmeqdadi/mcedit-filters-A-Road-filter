// Versioned rule sets. Every automated decision records the id ("margin@3") of the
// rule set it used, so a past decision can be replayed against the rules of its day.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { RULESET_KINDS, RULESET_SCHEMAS, type RulesetBody, type RulesetKind } from "./schema";

export interface Ruleset<K extends RulesetKind = RulesetKind> {
  kind: K;
  version: number;
  /** Stable id written to audit records, e.g. "margin@3" or "margin@3/desk-1". */
  id: string;
  /** null = platform default; otherwise this desk's override. */
  deskOrgId: string | null;
  body: RulesetBody<K>;
  publishedAt: Date;
  publishedBy: string;
}

export class RulesetValidationError extends Error {}

export function parseRuleset<K extends RulesetKind>(kind: K, body: unknown): RulesetBody<K> {
  const r = RULESET_SCHEMAS[kind].safeParse(body);
  if (!r.success) {
    throw new RulesetValidationError(`${kind}: ${r.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
  }
  return r.data as RulesetBody<K>;
}

export const rulesetId = (kind: string, version: number, deskOrgId: string | null) =>
  deskOrgId ? `${kind}@${version}/${deskOrgId}` : `${kind}@${version}`;

const DEFAULT_DIR = fileURLToPath(new URL("../../config/rulesets", import.meta.url));

/** Reads and validates config/rulesets/*.json. Throws on any invalid or missing rule set. */
export function loadDefaultRulesets(dir = DEFAULT_DIR): { [K in RulesetKind]: RulesetBody<K> } {
  const files = new Set(readdirSync(dir).filter((f) => f.endsWith(".json")));
  const out: Partial<Record<RulesetKind, unknown>> = {};
  for (const kind of RULESET_KINDS) {
    const file = `${kind}.json`;
    if (!files.has(file)) throw new RulesetValidationError(`missing rule set ${file}`);
    out[kind] = parseRuleset(kind, JSON.parse(readFileSync(join(dir, file), "utf8")));
    files.delete(file);
  }
  if (files.size) throw new RulesetValidationError(`unknown rule set files: ${[...files].join(", ")}`);
  return out as { [K in RulesetKind]: RulesetBody<K> };
}

export interface ConfigStore {
  /** The desk's override if one exists, otherwise the platform default. */
  active<K extends RulesetKind>(kind: K, deskOrgId?: string | null): Promise<Ruleset<K>>;
  /** Exactly the version given; used to replay old decisions. */
  get<K extends RulesetKind>(kind: K, version: number, deskOrgId?: string | null): Promise<Ruleset<K> | undefined>;
  /** Validates and stores a new version. Callers go through publishRuleset() for permission and audit. */
  put<K extends RulesetKind>(kind: K, body: unknown, publishedBy: string, deskOrgId?: string | null): Promise<Ruleset<K>>;
  history<K extends RulesetKind>(kind: K, deskOrgId?: string | null): Promise<Ruleset<K>[]>;
}

export class InMemoryConfigStore implements ConfigStore {
  private versions: Ruleset[] = [];

  static withDefaults(now = new Date()): InMemoryConfigStore {
    const s = new InMemoryConfigStore();
    const defaults = loadDefaultRulesets();
    for (const kind of RULESET_KINDS) {
      s.versions.push({ kind, version: 1, id: rulesetId(kind, 1, null), deskOrgId: null, body: defaults[kind], publishedAt: now, publishedBy: "system:defaults" });
    }
    return s;
  }

  async active<K extends RulesetKind>(kind: K, deskOrgId: string | null = null): Promise<Ruleset<K>> {
    const pick = (desk: string | null) => this.versions.filter((v) => v.kind === kind && v.deskOrgId === desk).at(-1);
    const r = (deskOrgId && pick(deskOrgId)) || pick(null);
    if (!r) throw new Error(`no active rule set for ${kind}`);
    return r as Ruleset<K>;
  }

  async get<K extends RulesetKind>(kind: K, version: number, deskOrgId: string | null = null) {
    return this.versions.find((v) => v.kind === kind && v.version === version && v.deskOrgId === deskOrgId) as Ruleset<K> | undefined;
  }

  async put<K extends RulesetKind>(kind: K, body: unknown, publishedBy: string, deskOrgId: string | null = null): Promise<Ruleset<K>> {
    const parsed = parseRuleset(kind, body);
    const version = this.versions.filter((v) => v.kind === kind && v.deskOrgId === deskOrgId).length + 1;
    const r: Ruleset<K> = { kind, version, id: rulesetId(kind, version, deskOrgId), deskOrgId, body: parsed, publishedAt: new Date(), publishedBy };
    this.versions.push(r);
    return r;
  }

  async history<K extends RulesetKind>(kind: K, deskOrgId: string | null = null) {
    return this.versions.filter((v) => v.kind === kind && v.deskOrgId === deskOrgId) as Ruleset<K>[];
  }
}
