// Visit every route, collect console errors and take screenshots.
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";
const base = process.argv[2] ?? "http://localhost:3100";
const out = process.argv[3] ?? "qa-screens";
const locale = process.argv[4] ?? "en";
const routes = ["/", "/planning", "/gis", "/field", "/enumerators", "/questionnaire", "/coverage", "/quality", "/anomalies", "/early-warning", "/pes", "/population", "/housing", "/labour", "/education", "/health", "/migration", "/infrastructure", "/projections", "/nowcast", "/scenarios", "/decision", "/ask", "/action-plans", "/siting", "/urban-growth", "/housing-need", "/water", "/mobility", "/climate", "/jobs", "/ageing", "/capital", "/shock", "/reports", "/methodology"];
mkdirSync(process.argv[3] ?? "qa-screens", { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium", args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.addInitScript((loc) => { try { localStorage.setItem("jsc-app", JSON.stringify({ state: { locale: loc }, version: 1 })); } catch {} }, locale);
const page = await ctx.newPage();
let errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 300)); });
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
// warm the engine on first route
for (const r of routes) {
  errors = [];
  const t = Date.now();
  await page.goto(base + r, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForSelector("main h1", { timeout: 60000 });
  await page.waitForTimeout(1200);
  const name = r === "/" ? "overview" : r.slice(1);
  await page.screenshot({ path: `${out}/${locale}-${name}.png`, fullPage: false });
  const h1 = await page.textContent("main h1");
  console.log(`${r.padEnd(16)} ${String(Date.now() - t).padStart(5)}ms  h1="${h1}"  errors=${errors.length}${errors.length ? "\n   " + errors.join("\n   ") : ""}`);
}
await browser.close();
