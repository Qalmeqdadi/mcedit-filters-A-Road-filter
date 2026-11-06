import { chromium } from "playwright-core";
import path from "node:path";
const [html, outDir, ...times] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const page = await b.newPage({ viewport: { width: 1920, height: 1080 } });
page.on("pageerror", (e) => console.log("ERR", e.message));
await page.goto("file://" + path.resolve(html));
await page.evaluate(() => document.fonts.ready);
for (const t of times) { await page.evaluate((x) => window.render(x), +t); await page.screenshot({ path: `${outDir}/t${String(t).padStart(5, "0")}.jpg`, type: "jpeg", quality: 80 }); }
await b.close();
