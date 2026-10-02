// Checks the single-file hosted build: every sidebar link opens a real module (no 404), in English and Arabic,
// with no console errors. Usage: node scripts/qa-hosted.mjs   (after npm run build:artifact)
import { chromium } from "playwright-core";
import path from "node:path";

const file = "file://" + path.resolve("artifact/dist/ufuq-jordan.html");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium", args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
let fail = 0;
for (const lang of ["en", "ar"]) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("ERR_CERT") && !m.text().includes("Failed to load resource")) errors.push(m.text().slice(0, 200)); });
  await page.goto(file);
  await page.waitForSelector("main h1", { timeout: 60000 });
  if (lang === "ar") { await page.locator("header button:has-text('عربي')").first().click(); await page.waitForTimeout(500); }
  const hrefs = await page.locator("aside a[data-href]").evaluateAll((as) => as.map((a) => a.getAttribute("data-href")));
  for (const href of hrefs) {
    await page.click(`aside a[data-href='${href}']`);
    await page.waitForTimeout(700);
    const h1 = (await page.textContent("main h1")) ?? "";
    const bad = /Page not found|الصفحة غير موجودة/.test(h1);
    if (bad) fail++;
    console.log(`${bad ? "FAIL" : "PASS"}  [${lang}] ${href.padEnd(16)} ${h1.slice(0, 60)}`);
  }
  if (errors.length) { fail++; console.log(`FAIL  [${lang}] console errors: ${errors.slice(0, 3).join(" | ")}`); }
  console.log(`[${lang}] ${hrefs.length} links checked`);
  await page.close();
}
await browser.close();
console.log(fail ? `\n${fail} failures` : "\nall hosted routes OK");
process.exit(fail ? 1 : 0);
