// "No status strings set ad hoc": only the state layer and the Postgres store may write a status.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "../..");
const ALLOWED = new Set(["src/state/apply.ts", "src/state/memory.ts", "src/db/stores.ts", "src/db/schema.ts"]);
const PATTERNS = [
  /\.set\(\s*\{[^}]*\bstatus\s*:/s, // drizzle update().set({ status })
  /\bstatus\s*=\s*['"`]/, // row.status = "sent"
  /\.values\(\s*\{[^}]*\bstatus\s*:/s, // insert with a non-initial status
  /SET\s+status\s*=/i, // raw SQL
];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return f === "node_modules" || f === "migrations" ? [] : files(p);
    return /\.(ts|tsx)$/.test(f) ? [p] : [];
  });
}

describe("status columns are written only through the state machines", () => {
  const candidates = ["src", "scripts", "app"].flatMap((d) => {
    try {
      return files(join(root, d));
    } catch {
      return [];
    }
  });

  it("scans some files", () => expect(candidates.length).toBeGreaterThan(10));

  for (const f of candidates) {
    const rel = relative(root, f);
    if (ALLOWED.has(rel)) continue;
    it(rel, () => {
      const src = readFileSync(f, "utf8");
      for (const p of PATTERNS) expect(p.test(src), `${rel} matches ${p}`).toBe(false);
    });
  }
});
