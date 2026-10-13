// Opens every view and reports runtime errors. Usage: node scripts/smoke-test.mjs [url]
import { chromium } from "playwright-core";
const url = process.argv[2] ?? "http://localhost:3000";
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
p.on("pageerror", (e) => errors.push(String(e)));
p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await p.goto(url, { waitUntil: "networkidle" });
for (const v of ["overview", "plant", "council", "investigation", "optimization", "assets", "energy", "quality", "knowledge", "shift", "control", "scenarios"]) {
  await p.click(`#nav-${v}`);
  await p.waitForTimeout(500);
}
await p.click("#nav-council"); await p.click("#run-investigation"); await p.waitForTimeout(13500);
const ok = await p.getByText("Human approval required").count();
console.log("approval panel visible:", ok > 0);
await p.click("#start-demo");
for (let i = 0; i < 9; i++) { await p.click("#demo-next"); await p.waitForTimeout(400); }
console.log(errors.length ? `ERRORS:\n${errors.join("\n")}` : "no runtime errors");
await b.close();
