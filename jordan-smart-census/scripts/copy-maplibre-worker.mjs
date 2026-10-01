// MapLibre v6 resolves its worker from import.meta.url, which breaks once bundled.
// Serve the worker (and its shared chunk) as static files instead; see JordanMap → setWorkerUrl.
import fs from "node:fs";
const src = "node_modules/maplibre-gl/dist";
const dst = "public/maplibre";
fs.mkdirSync(dst, { recursive: true });
for (const f of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) fs.copyFileSync(`${src}/${f}`, `${dst}/${f}`);
console.log("maplibre worker copied to", dst);
