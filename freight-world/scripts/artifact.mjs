// Turns the single-file build into a page fragment for hosting as a claude.ai artifact
// (the host supplies <html>, <head> with charset and viewport, and <body>).
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const dist = path.resolve(import.meta.dirname, "..", "dist");
const html = readFileSync(path.join(dist, "index.html"), "utf8");
// the inlined bundle may itself contain tag-like strings, so cut on the outermost markers only
const head = html.slice(html.indexOf("<head>") + 6, html.lastIndexOf("</head>"));
const body = html.slice(html.lastIndexOf("<body>") + 6, html.lastIndexOf("</body>"));
const drop = /^\s*<(meta charset|meta name="viewport"|link rel="preconnect")/;
const keptHead = head.split("\n").filter((line) => !drop.test(line)).join("\n").trim();
const out = `${keptHead}\n${body.trim()}\n`;
writeFileSync(path.join(dist, "artifact.html"), out);
console.log(`artifact.html: ${(out.length / 1024).toFixed(0)} KB`);
