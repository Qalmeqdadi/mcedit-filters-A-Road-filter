// Builds the whole app as ONE self-contained HTML page for hosted sharing (opens on a phone, no server).
// Usage: npm run build:artifact  → artifact/dist/index.html
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "artifact", "dist");
mkdirSync(out, { recursive: true });

// 1. Tailwind 4 → plain CSS (includes maplibre-gl.css via the @import in globals.css)
const cssIn = path.join(root, "src/app/globals.css");
const { css } = await postcss([tailwind({ base: root, optimize: { minify: true } })]).process(readFileSync(cssIn, "utf8"), { from: cssIn });

// 2. MapLibre worker → one ESM file, later turned into a blob: URL
const worker = await build({
  entryPoints: [path.join(root, "node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs")],
  bundle: true, minify: true, format: "esm", target: "es2022", write: false, logLevel: "warning",
});
const workerSrc = worker.outputFiles[0].text;

// 3. App bundle with Next.js routing swapped for an in-memory router
const app = await build({
  entryPoints: [path.join(root, "artifact/entry.tsx")],
  bundle: true, minify: true, format: "iife", target: "es2022", jsx: "automatic", write: false, logLevel: "warning",
  alias: { "next/link": "./artifact/next-link.tsx", "next/navigation": "./artifact/next-navigation.ts" },
  define: { "process.env.NODE_ENV": '"production"' },
  loader: { ".css": "empty" },
  absWorkingDir: root,
  tsconfig: path.join(root, "tsconfig.json"),
});
const appSrc = app.outputFiles[0].text;

const safe = (s) => s.replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "<\\!--");
const html = `<title>Jordan Smart Census</title>
<meta name="description" content="National Population, Housing & Decision Intelligence Platform — prototype; operational data simulated.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap">
<style>:root{color-scheme:light}html,body{background:#f6f4ef;color:#141a24}${css}</style>
<div id="root"></div>
<script>window.__JSC_HOSTED__=true;window.__JSC_MAPLIBRE_WORKER__=URL.createObjectURL(new Blob([${safe(JSON.stringify(workerSrc))}],{type:"text/javascript"}));</script>
<script>${safe(appSrc)}</script>
`;
writeFileSync(path.join(out, "index.html"), html);
console.log(`artifact/dist/index.html: ${(html.length / 1024 / 1024).toFixed(2)} MB`);
