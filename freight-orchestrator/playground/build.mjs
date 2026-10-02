// Bundles playground/entry.ts (and the real src/ code it imports) into one HTML file:
// playground/dist/freight-playground.html. Open it in a browser; no server needed.
import { build } from "esbuild";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

const result = await build({
  entryPoints: [here("./entry.ts")],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2022",
  minify: true,
  write: false,
  alias: { "node:crypto": here("./node-crypto-shim.ts") },
  legalComments: "none",
});

const js = result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const html = readFileSync(here("./template.html"), "utf8").replace("/*__BUNDLE__*/", () => js);
mkdirSync(here("./dist"), { recursive: true });
writeFileSync(here("./dist/freight-playground.html"), html);
console.log(`wrote playground/dist/freight-playground.html (${(html.length / 1024).toFixed(0)} KB)`);
