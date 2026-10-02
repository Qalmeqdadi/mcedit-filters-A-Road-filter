// Screenshot helper: node scripts/shot.mjs <path> <out.png> [width] [height] [clickSelector...]
import { chromium } from "playwright-core";
const [path, out, w = "1500", h = "1000", ...clicks] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, isMobile: +w < 600, hasTouch: +w < 600 });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 300)); });
page.on("pageerror", (e) => errors.push("pageerror " + e.message));
await page.goto(`http://localhost:3100${path}`, { waitUntil: "networkidle", timeout: 180000 });
await page.waitForSelector("main h1", { timeout: 120000 });
await page.waitForTimeout(2500);
for (const c of clicks) { await page.click(c); await page.waitForTimeout(2000); }
await page.screenshot({ path: out, fullPage: true });
console.log("errors:", errors.length ? errors : "none", "scrollW", await page.evaluate(() => document.documentElement.scrollWidth));
await browser.close();
