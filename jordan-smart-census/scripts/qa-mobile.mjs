// Phone-width screenshots + horizontal-overflow check for each route.
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";
const base = process.argv[2] ?? "http://localhost:3000";
const out = process.argv[3] ?? "qa-screens";
const only = process.argv[4] ? process.argv[4].split(",") : null;
mkdirSync(out, { recursive: true });
const routes = (only ?? ["/", "/census", "/planning", "/gis", "/field", "/enumerators", "/questionnaire", "/coverage", "/quality", "/anomalies", "/early-warning", "/pes", "/population", "/housing", "/labour", "/education", "/health", "/migration", "/infrastructure", "/projections", "/nowcast", "/futures", "/signals", "/scenarios", "/robustness", "/decision", "/ask", "/action-plans", "/siting", "/urban-growth", "/housing-need", "/water", "/mobility", "/climate", "/jobs", "/ageing", "/capital", "/shock", "/delivery", "/briefing", "/reports", "/methodology"]);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium", args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
for (const r of routes) {
  await page.goto(base + r, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForSelector("main h1", { timeout: 60000 });
  await page.waitForTimeout(1200);
  const o = await page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    const wide = [...document.querySelectorAll("main *")].filter((el) => { const b = el.getBoundingClientRect(); return b.right > w + 1 && getComputedStyle(el).position !== "fixed"; }).filter((el) => !el.closest(".thin-scroll, .overflow-x-auto, [class*='overflow-x']")).slice(0, 3).map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`);
    return { scrollW: document.documentElement.scrollWidth, w, wide };
  });
  const name = r === "/" ? "home" : r.slice(1);
  await page.screenshot({ path: `${out}/m-${name}.png` });
  console.log(`${r.padEnd(16)} scrollW=${o.scrollW} vw=${o.w} ${o.scrollW > o.w ? "OVERFLOW " + o.wide.join(" | ") : "ok"}`);
}
console.log("errors:", errors.length ? errors : "none");
await browser.close();
