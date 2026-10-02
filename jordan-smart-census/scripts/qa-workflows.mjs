// End-to-end workflow checks in a real browser. Prints PASS/FAIL per check.
// Usage: node scripts/qa-workflows.mjs [baseUrl] [screenshotDir]
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const base = process.argv[2] ?? "http://localhost:3000";
const shots = process.argv[3] ?? "qa-screens";
mkdirSync(process.argv[3] ?? "qa-screens", { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium", args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 300)); });
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
let pass = 0;
let fail = 0;
const check = (name, ok, info = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${info ? "  — " + info : ""}`);
  if (ok) pass++;
  else fail++;
};
const step = async (name, fn) => {
  try {
    await fn();
  } catch (e) {
    check(name, false, `exception: ${String(e.message ?? e).split("\n")[0]}`);
  }
};
const day = async () => Number((await page.locator("header").first().textContent()).match(/(?:Census day|يوم التعداد)\s*(\d+)/)[1]);
const nav = async (href) => {
  await page.click(`aside a[href="${href}"]`);
  await page.waitForURL((u) => u.pathname === href);
  await page.waitForTimeout(900);
};
const headerBtn = (label) => page.locator("header").first().locator(`button:has-text("${label}")`).first();

await page.goto(base + "/", { waitUntil: "networkidle", timeout: 120000 });
await page.waitForSelector("[data-testid=pillar]", { timeout: 60000 });
check("UFUQ home shows five pillars", (await page.locator("[data-testid=pillar]").count()) === 5);
await page.goto(base + "/census", { waitUntil: "networkidle", timeout: 120000 });
await page.waitForSelector("main h1", { timeout: 60000 });
await page.waitForTimeout(1500);

await step("map", async () => {
  check("map renders (canvas present)", (await page.locator(".maplibregl-canvas").count()) > 0);
  check("12 governorate labels on map", (await page.locator(".map-label").count()) === 12);
});

await step("simulation", async () => {
  await headerBtn("5×").click();
  await page.click("[data-demo=sim-start]");
  await page.waitForTimeout(4000);
  const d1 = await day();
  check("simulation starts and advances", d1 >= 1, `day ${d1}`);
  await headerBtn("Pause").click();
  const dp = await day();
  await page.waitForTimeout(2000);
  check("simulation pauses", (await day()) === dp, `day ${dp}`);
  await headerBtn("10×").click();
  await headerBtn("Resume").click();
  await page.waitForTimeout(3000);
  const d2 = await day();
  check("speed change + resume", d2 > dp, `day ${dp} → ${d2}`);
  await headerBtn("Pause").click();
  check("dashboard updates live", !(await page.textContent("main")).includes("Census not started"));
});

await step("scope", async () => {
  await nav("/population");
  await page.selectOption("main select >> nth=0", "IRB");
  await page.waitForTimeout(800);
  check("governorate selection updates scope", (await page.locator("header").first().textContent()).includes("Irbid"));
  await page.selectOption("main select >> nth=1", { index: 1 });
  await page.waitForTimeout(800);
  const crumbs = await page.locator("header").first().textContent();
  check("district drill-down", /Irbid.+\S/.test(crumbs), crumbs.slice(crumbs.indexOf("Irbid"), crumbs.indexOf("Irbid") + 40));
  await page.selectOption("main select >> nth=0", "");
  await page.waitForTimeout(500);
});

await step("enumerators", async () => {
  await nav("/enumerators");
  await page.fill("main input[placeholder^='Search']", "AMM-E0037");
  await page.waitForTimeout(800);
  await page.click("main tbody tr >> nth=0");
  await page.waitForTimeout(1500);
  check("enumerator detail opens", (await page.locator("[role=dialog]").textContent()).includes("AMM-E0037"));
  await page.screenshot({ path: `${shots}/wf-enumerator-detail.png` });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
});

await step("anomalies", async () => {
  await nav("/anomalies");
  const n = await page.locator("main ul li button").count();
  check("anomalies generated", n > 0, `${n} listed`);
  await page.screenshot({ path: `${shots}/wf-anomalies.png` });
  await page.click("button:has-text('Confirm — schedule verification revisits')");
  await page.fill("[role=dialog] input", "QA verification");
  await page.click("[role=dialog] button:has-text('Confirm')");
  await page.waitForTimeout(800);
  check("anomaly human decision recorded", (await page.textContent("main")).includes("QA verification"));
});

await step("quality", async () => {
  await nav("/quality");
  const register = page.locator("main section", { hasText: "Quality issue register" });
  const rows = await register.locator("tbody tr").count();
  check("quality flags generated", rows > 1, `${rows} rows on page`);
  await register.locator("tbody tr").first().locator("button:has-text('Resolve')").click();
  await page.waitForTimeout(500);
  await register.locator("tbody tr").first().locator("button:has-text('Dismiss')").click();
  await page.fill("[role=dialog] input", "Verified on revisit — age correct");
  await page.click("[role=dialog] button:has-text('Confirm')");
  await page.waitForTimeout(600);
  await page.selectOption("main select >> nth=1", "ALL");
  await page.waitForTimeout(600);
  check("quality resolve + dismiss-with-reason", (await page.textContent("main")).includes("Verified on revisit"));
});

await step("finish+pes", async () => {
  await headerBtn("20×").click();
  await headerBtn("Resume").click();
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(1000);
    if ((await page.locator("header").first().textContent()).includes("Fieldwork closed")) break;
  }
  check("fieldwork completes", (await page.locator("header").first().textContent()).includes("Fieldwork closed"));
  await nav("/pes");
  await page.click("button:has-text('Draw PES sample')");
  await page.waitForTimeout(600);
  await page.click("button:has-text('Run PES & match')");
  await page.waitForTimeout(900);
  check("PES runs", (await page.textContent("main")).includes("Match rate"));
  await page.screenshot({ path: `${shots}/wf-pes.png` });
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 10000 }), page.click("main button:has-text('Export CSV')")]);
  check("PES CSV export downloads", dl.suggestedFilename() === "pes-results.csv");
});

await step("scenarios", async () => {
  await nav("/scenarios");
  const kpi = () => page.locator("main .text-\\[20px\\]").nth(3).textContent();
  const before = await kpi();
  await page.click("main button:has-text('Youth pressure')");
  await page.waitForTimeout(1200);
  const after = await kpi();
  check("scenario preset changes outputs", before !== after, `${before} → ${after}`);
  await page.locator("main input[type=range]").first().evaluate((el) => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    set.call(el, "0.8");
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.waitForTimeout(1200);
  check("scenario slider recalculates", (await kpi()) !== after);
  await page.click("main button:has-text('Save scenario')");
  await page.click("[role=dialog] button:has-text('Save')");
  await page.waitForTimeout(500);
  await page.click("main button:has-text('Migration shock')");
  await page.waitForTimeout(800);
  await page.locator("main li input[type=checkbox]").first().check();
  await page.waitForTimeout(1000);
  check("scenario save + compare", (await page.locator("main table thead th").count()) >= 4);
  await page.screenshot({ path: `${shots}/wf-scenarios.png` });
});

await step("projections", async () => {
  await nav("/projections");
  const k = () => page.locator("main [data-kpi-value]").first().textContent();
  const p1 = await k();
  await page.click("main button:has-text('2050')");
  await page.waitForTimeout(800);
  const p2 = await k();
  check("projection year changes KPIs/charts", p1 !== p2, `${p1} → ${p2}`);
});

await step("decision", async () => {
  await nav("/decision");
  check("decision statements render", (await page.locator("main article").count()) >= 6);
  await page.locator("main article").first().locator("button").click();
  await page.waitForTimeout(400);
  check("statement assumptions expand", (await page.locator("main article").first().textContent()).includes("classrooms ="));
  await page.screenshot({ path: `${shots}/wf-decision.png` });
});

await step("exports", async () => {
  await nav("/reports");
  for (const name of ["governorate-summary.csv", "enumerator-performance.csv", "quality-issues.csv", "anomalies.csv", "scenario-results.csv", "pes-results.csv", "area-action-plans.csv", "planning-lab-indicators.csv"]) {
    const [d] = await Promise.all([page.waitForEvent("download", { timeout: 15000 }), page.locator("main div.rounded-lg", { hasText: name }).locator("button").click()]);
    check(`export ${name}`, d.suggestedFilename() === name);
  }
});

await step("questionnaire", async () => {
  await nav("/questionnaire");
  await page.selectOption("main select >> nth=0", "MAD");
  await page.selectOption("main select >> nth=1", { index: 1 });
  await page.selectOption("main select >> nth=2", { index: 1 });
  await page.fill("main input >> nth=0", "17");
  await page.selectOption("main select >> nth=3", "VACANT");
  await page.click("main button:has-text('Review & submit')");
  await page.click("main button:has-text('Submit questionnaire')");
  await page.waitForTimeout(700);
  check("questionnaire submission (vacant dwelling)", (await page.textContent("main")).includes("submitted"));
});

await step("arabic", async () => {
  await headerBtn("عربي").click();
  await page.waitForTimeout(900);
  const dir = await page.evaluate(() => document.documentElement.dir);
  check("Arabic mode + RTL", dir === "rtl" && /[؀-ۿ]/.test(await page.textContent("main h1")), `dir=${dir}`);
  await page.click('aside a[href="/"]');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${shots}/wf-ar-overview.png` });
  await headerBtn("EN").click();
  await page.waitForTimeout(600);
});

await step("reset", async () => {
  await page.click("header button[aria-label=Reset]");
  await page.click("[role=dialog] button:has-text('Reset')");
  await page.waitForTimeout(4000);
  check("simulation resets to day 0", (await day()) === 0);
});

await step("planning lab", async () => {
  await nav("/siting");
  const access = async () => (await page.locator("main [data-kpi-value]").nth(1).textContent()).trim();
  const a0 = await access();
  await page.click("[data-testid=suggest-sites]");
  await page.waitForTimeout(1500);
  check("siting optimiser proposes sites", (await page.locator("main ol li").count()) >= 5, `access ${a0} → ${await access()}`);
  const [d1] = await Promise.all([page.waitForEvent("download", { timeout: 15000 }), page.click("main button:has-text('Export CSV')")]);
  check("siting CSV export", d1.suggestedFilename().startsWith("facility-siting"));
  await nav("/urban-growth");
  const area = () => page.locator("main [data-kpi-value]").first().textContent();
  const t0 = await area();
  await page.click("main button:has-text('Dispersed growth')");
  await page.waitForTimeout(1200);
  check("urban growth policy changes outcome", (await area()) !== t0, `${t0} → ${await area()}`);
  await nav("/water");
  check("water balance renders", (await page.locator("main [data-kpi-value]").count()) >= 6);
  await nav("/capital");
  const funded = () => page.locator("main [data-kpi-value]").nth(2).textContent();
  const f0 = await funded();
  await page.locator("main input[type=range]").first().evaluate((el) => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    set.call(el, "3000");
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.waitForTimeout(1200);
  check("capital budget changes portfolio", (await funded()) !== f0, `${f0} → ${await funded()}`);
  await nav("/shock");
  await page.click("main button:has-text('Play weeks')");
  await page.waitForTimeout(2500);
  check("shock simulator plays and proposes actions", (await page.locator("main button:has-text('Add to plan')").count()) > 0);
  await nav("/ask");
  await page.fill("[data-testid=ask-input]", "Which governorates will grow fastest by 2040?");
  await page.click("[data-testid=ask-submit]");
  await page.waitForTimeout(800);
  check("ask the data answers from the models", /grows fastest/.test(await page.locator("[data-testid=ask-answer]").first().textContent()));
  await nav("/action-plans");
  await page.waitForSelector("[data-testid=matrix-row]", { timeout: 60000 });
  check("action plans: national matrix", (await page.locator("[data-testid=matrix-row]").count()) === 12);
  await page.locator("[data-testid=matrix-row]").nth(3).click();
  await page.waitForTimeout(1500);
  check("action plans: governorate plan with actions", (await page.locator("[data-testid=action-card]").count()) >= 5);
  const [d2] = await Promise.all([page.waitForEvent("download", { timeout: 15000 }), page.click("main button:has-text('Export CSV')")]);
  check("action plan CSV export", d2.suggestedFilename().startsWith("action-plan-MAF"));
  await page.selectOption("[data-testid=plan-area]", "");
  await nav("/water");
  await page.waitForTimeout(2500);
  check("recommended actions panel in modules", (await page.locator("[data-testid=action-card]").count()) > 0);
  await nav("/ask");
  await page.fill("[data-testid=ask-input]", "What should we do in Mafraq?");
  await page.click("[data-testid=ask-submit]");
  await page.waitForTimeout(2500);
  check("ask: action plan question", /corrective actions/.test(await page.locator("[data-testid=ask-answer]").first().textContent()));
  await nav("/futures");
  await page.waitForSelector("[data-testid=future-card]", { timeout: 90000 });
  check("scenario futures: four futures", (await page.locator("[data-testid=future-card]").count()) === 4);
  await page.selectOption("[data-testid=axis-b]", "ECONOMY");
  await page.waitForSelector("[data-testid=future-card]", { timeout: 90000 });
  check("scenario futures: axis change rebuilds matrix", /Economy|economy|growth/i.test(await page.locator("[data-testid=future-card]").first().textContent()));
  await page.selectOption("[data-testid=axis-b]", "WATER");
  await nav("/robustness");
  await page.waitForSelector("[data-testid=robust-item]", { timeout: 90000 });
  check("robustness test classifies actions", (await page.locator("[data-testid=robust-item]").count()) > 10, `${await page.locator("[data-testid=robust-item]").count()} items`);
  await nav("/signals");
  const s0 = await page.locator("[data-testid=signal-row]").count();
  await page.fill("[data-testid=signal-title]", "QA test signal");
  await page.click("[data-testid=signal-add]");
  await page.waitForTimeout(400);
  check("horizon scanning: add a signal", (await page.locator("[data-testid=signal-row]").count()) === s0 + 1, `${s0} → ${await page.locator("[data-testid=signal-row]").count()}`);
  await page.click("main button:has-text('Restore defaults')");
  await nav("/projections");
  check("probabilistic projection panel", (await page.locator("#uncertainty").count()) === 1);
  for (const r of ["/housing-need", "/jobs", "/ageing", "/nowcast", "/mobility", "/climate"]) {
    await nav(r);
    check(`${r} renders KPIs`, (await page.locator("main [data-kpi-value]").count()) >= 6);
  }
});

await step("demo", async () => {
  await headerBtn("Executive demo").click();
  await page.waitForTimeout(800);
  const total = Number((await page.textContent("body")).match(/Step 1 \/ (\d+)/)[1]);
  for (let i = 0; i < total - 1; i++) {
    await page.waitForTimeout(i === 4 ? 2500 : 1500);
    await page.locator("button", { hasText: /^Next/ }).last().click();
  }
  await page.waitForTimeout(1800);
  check(`executive demo walks ${total} steps`, (await page.textContent("body")).includes(`Step ${total} / ${total}`));
  await page.screenshot({ path: `${shots}/wf-demo-final.png` });
});

check("no console errors during workflows", errors.length === 0, errors.slice(0, 5).join(" | "));
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
