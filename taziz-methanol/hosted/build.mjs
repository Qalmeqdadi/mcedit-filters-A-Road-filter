// Builds the demo as ONE self-contained HTML file (open by double-click, no server).
import { build } from "esbuild";
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "hosted", "dist");
mkdirSync(out, { recursive: true });
execSync(`npx tailwindcss -c tailwind.config.ts -i app/globals.css -o ${out}/app.css --minify`, { cwd: root, stdio: "inherit" });
await build({
  entryPoints: [path.join(root, "hosted/entry.tsx")],
  bundle: true, minify: true, format: "iife", target: "es2020", jsx: "automatic",
  outfile: path.join(out, "app.js"),
  define: { "process.env.NODE_ENV": '"production"' },
  loader: { ".css": "empty" }, logLevel: "warning", absWorkingDir: root,
});
const css = readFileSync(path.join(out, "app.css"), "utf8");
const js = readFileSync(path.join(out, "app.js"), "utf8").replace(/<\/script/gi, "<\\/script");
const html = `<!doctype html><html lang="en" class="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>TA’ZIZ Intelligent Methanol Plant – Agentic AI Demo</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap">
<style>${css}</style></head><body class="min-h-screen bg-ink-950 font-sans antialiased"><div id="root"></div><script>${js}</script></body></html>`;
writeFileSync(path.join(out, "taziz-methanol-demo.html"), html);
console.log(`taziz-methanol-demo.html: ${(html.length / 1024).toFixed(0)} KB`);
