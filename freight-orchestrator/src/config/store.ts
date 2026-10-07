// Loads the default rule sets from config/rulesets/*.json. The store itself lives in ./memory.ts.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { MemoryConfigStore, parseRuleset, RulesetValidationError } from "./memory";
import { RULESET_KINDS, type RulesetBody, type RulesetKind } from "./schema";

export * from "./memory";

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

export class InMemoryConfigStore extends MemoryConfigStore {
  static withDefaults(now = new Date()): InMemoryConfigStore {
    return InMemoryConfigStore.fromBodies(loadDefaultRulesets(), now);
  }
}
