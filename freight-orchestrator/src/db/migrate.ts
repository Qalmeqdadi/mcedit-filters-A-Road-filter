// Applies migrations to DATABASE_URL and loads the default rule sets if none exist.
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { RULESET_KINDS } from "../config/schema";
import { loadDefaultRulesets } from "../config/store";
import { connectPg, MIGRATIONS_DIR } from "./client";
import { PgConfigStore } from "./stores";

const db = await connectPg();
await migrate(db as never, { migrationsFolder: MIGRATIONS_DIR });
const config = new PgConfigStore(db);
const defaults = loadDefaultRulesets();
for (const kind of RULESET_KINDS) {
  if ((await config.history(kind)).length === 0) await config.put(kind, defaults[kind], "system:defaults");
}
console.log("migrated; rule sets:", RULESET_KINDS.join(", "));
process.exit(0);
