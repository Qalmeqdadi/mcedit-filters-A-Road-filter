// Builds the demo as ONE self-contained HTML file for hosted sharing (no server needed).
import { build } from "esbuild";
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "artifact", "dist");
mkdirSync(out, { recursive: true });

execSync(`npx tailwindcss -c tailwind.config.ts -i app/globals.css -o ${out}/app.css --minify`, { cwd: root, stdio: "inherit" });

await build({
  entryPoints: [path.join(root, "artifact/entry.tsx")],
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2020",
  jsx: "automatic",
  outfile: path.join(out, "app.js"),
  alias: { "next/link": "./artifact/next-link.tsx", "next/navigation": "./artifact/next-navigation.ts" },
  define: { "process.env.NEXT_PUBLIC_AGENT_PROVIDER": '"mock"', "process.env.NODE_ENV": '"production"' },
  loader: { ".css": "empty" },
  logLevel: "warning",
  absWorkingDir: root,
});

const css = readFileSync(path.join(out, "app.css"), "utf8");
const js = readFileSync(path.join(out, "app.js"), "utf8").replace(/<\/script/gi, "<\\/script");
const html = `<title>Agentic Procurement Orchestrator</title>
<meta name="description" content="Illustrative Proof of Value for Etihad Credit Bureau. All data is synthetic.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,500;8..60,600&display=swap">
<style>:root{color-scheme:light}html,body{background:#FBFAF7;color:#0A1A33}${css}</style>
<div id="root"></div>
<script>${js}</script>
`;
writeFileSync(path.join(out, "index.html"), html);
console.log(`index.html: ${(html.length / 1024).toFixed(0)} KB`);
