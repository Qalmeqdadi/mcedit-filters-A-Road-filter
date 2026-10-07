// Writes docs/PROCESS-MAP.md: every process address, its build status, and where it lives.
// Run with `npm run process-map`. A test keeps the committed file in sync.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderProcessMap } from "../src/processes/render";

const out = fileURLToPath(new URL("../docs/PROCESS-MAP.md", import.meta.url));
writeFileSync(out, renderProcessMap());
console.log(`wrote ${out}`);
