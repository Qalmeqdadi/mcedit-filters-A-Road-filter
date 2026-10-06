// "Click everything" QA on the single-file build (what users open): for every page in the sidebar,
// follow every internal link, click every button, change every select and nudge every slider,
// and report links that do nothing or 404, buttons that throw, and console errors.
// Usage: node scripts/qa-click-all.mjs [en|ar] [onlyRoute,...]   (after npm run build:artifact)
import { chromium } from "playwright-core";
import path from "node:path";

const lang = process.argv[2] ?? "en";
const only = process.argv[3] && process.argv[3] !== "all" ? process.argv[3].split(",") : null;
const [shard, shards] = (process.argv[4] ?? "0/1").split("/").map(Number);
const file = "file://" + path.resolve("artifact/dist/ufuq-jordan.html");
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, acceptDownloads: true });
let current = "";
const errors = [];
page.on("pageerror", (e) => errors.push(`${current}: ${e.message.slice(0, 160)}`));
page.on("console", (m) => { if (m.type() === "error" && !/ERR_CERT|Failed to load resource|net::/.test(m.text())) errors.push(`${current}: ${m.text().slice(0, 160)}`); });
page.on("dialog", (d) => d.dismiss());
const issues = [];
const pushIssue = issues.push.bind(issues);
issues.push = (...xs) => { xs.forEach((x) => console.log("ISSUE " + x)); return pushIssue(...xs); };
const route = () => page.evaluate(() => "/" + location.hash.replace(/^#\/?/, "").split("?")[0]);
const settle = async (ms = 600) => { await page.waitForTimeout(ms); };
const go = async (href) => { await page.evaluate(() => document.fullscreenElement && document.exitFullscreen().catch(() => {})); await page.click(`aside a[data-href='${href}']`, { timeout: 8000 }).catch(async () => { await page.evaluate((h) => { location.hash = h; }, href); }); await page.waitForSelector("main h1"); await settle(1500); };

await page.goto(file);
await page.waitForSelector("main h1", { timeout: 90000 });
if (lang === "ar") { await page.locator("header button:has-text('عربي')").first().click(); await settle(); }
const routes = (await page.locator("aside a[data-href]").evaluateAll((as) => as.map((a) => a.getAttribute("data-href")))).filter((r) => !only || only.includes(r)).filter((_, i) => i % shards === shard);
let nLinks = 0, nButtons = 0, nSelects = 0, nSliders = 0;
for (const r of routes) {
  current = r;
  await go(r);
  const h1 = await page.textContent("main h1");
  // internal links
  const hrefs = [...new Set(await page.locator("main a[data-href]:visible").evaluateAll((as) => as.map((a) => a.getAttribute("data-href"))))];
  for (const href of hrefs) {
    nLinks++;
    await page.locator(`main a[data-href='${href}']:visible`).first().click({ timeout: 3000 }).catch(() => issues.push(`${r}: link ${href} not clickable`));
    await settle(700);
    const now = await route();
    const h = (await page.textContent("main h1").catch(() => "")) ?? "";
    if (href === r) issues.push(`${r}: link to the same page (${href}) does nothing`);
    else if (now === r) issues.push(`${r}: link ${href} did not navigate`);
    else if (/not found|غير موجودة/i.test(h)) issues.push(`${r}: link ${href} → 404`);
    if (now !== r) await go(r);
  }
  // selects
  const selCount = await page.locator("main select").count();
  for (let i = 0; i < selCount; i++) {
    const sel = page.locator("main select").nth(i);
    if (!(await sel.isVisible().catch(() => false))) continue;
    const opts = await sel.locator("option").evaluateAll((os) => os.map((o) => o.value));
    if (opts.length < 2) continue;
    nSelects++;
    const was = await sel.inputValue();
    await sel.selectOption(opts.find((o) => o !== was)).catch(() => issues.push(`${r}: select ${i} failed`));
    await settle(400);
    if ((await route()) !== r) { issues.push(`${r}: select ${i} navigated away`); await go(r); continue; }
    await page.locator("main select").nth(i).selectOption(was).catch(() => {});
    await settle(300);
  }
  // sliders
  const sl = page.locator("main input[type=range]");
  const nS = await sl.count();
  for (let i = 0; i < nS; i++) {
    nSliders++;
    const s = sl.nth(i);
    await s.focus().catch(() => {});
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowLeft");
  }
  await settle(300);
  // buttons
  const labels = await page.locator("main button").evaluateAll((bs) => bs.map((b) => (b.textContent || b.getAttribute("aria-label") || "").trim().slice(0, 40)));
  for (let i = 0; i < labels.length; i++) {
    const b = page.locator("main button").nth(i);
    if (!(await b.isVisible().catch(() => false)) || (await b.isDisabled().catch(() => true))) continue;
    if (/Clear local|مسح مساحة|Start census|Reset|Full screen|ملء الشاشة/i.test(labels[i])) continue;
    nButtons++;
    const before = errors.length;
    await b.click({ timeout: 2500 }).catch(() => {});
    await settle(250);
    if (errors.length > before) issues.push(`${r}: button "${labels[i]}" raised an error`);
    await page.keyboard.press("Escape");
    await settle(150);
    if ((await route()) !== r) await go(r);
  }
  console.log(`checked ${r.padEnd(20)} links ${hrefs.length} · buttons ${labels.length} · selects ${selCount} · sliders ${nS} — ${(h1 ?? "").slice(0, 40)}`);
}
for (const e of [...new Set(errors)]) issues.push(`console: ${e}`);
console.log(`\n[${lang}] ${routes.length} pages · ${nLinks} links · ${nButtons} buttons clicked · ${nSelects} selects · ${nSliders} sliders`);
console.log(issues.length ? `${issues.length} ISSUES:\n` + [...new Set(issues)].join("\n") : "NO ISSUES");
await browser.close();
