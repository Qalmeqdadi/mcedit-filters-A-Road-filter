// Records a walkthrough video of the demo (executive demo flow) with captions.
// Usage: start the app (npm run build && npm start), then: node video/record.mjs [url]
import { chromium } from "playwright-core";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";

const url = process.argv[2] ?? "http://localhost:3000";
const out = path.resolve(import.meta.dirname, "tmp");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
// Capture frames via the DevTools screencast (crisp, no Playwright ffmpeg dependency)
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const frames = [];
const cdp = await ctx.newCDPSession(page);
cdp.on("Page.screencastFrame", async (f) => {
  const file = path.join(out, `f${String(frames.length).padStart(6, "0")}.jpg`);
  writeFileSync(file, Buffer.from(f.data, "base64"));
  frames.push({ file, t: f.metadata.timestamp });
  cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
});
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 88, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
const wait = (ms) => page.waitForTimeout(ms);

const caption = async (title, sub = "") =>
  page.evaluate(([t, s]) => {
    let el = document.getElementById("__cap");
    if (!el) {
      el = document.createElement("div");
      el.id = "__cap";
      el.style.cssText = "position:fixed;pointer-events:none;left:50%;top:70px;transform:translateX(-50%);z-index:9999;max-width:1100px;padding:14px 26px;border-radius:14px;background:rgba(2,10,24,.92);border:1px solid rgba(47,214,245,.55);box-shadow:0 0 40px -10px #2FD6F5;font-family:Inter,sans-serif;text-align:center;transition:opacity .4s";
      document.body.appendChild(el);
    }
    el.style.opacity = t ? "1" : "0";
    el.innerHTML = `<div style="font-size:22px;font-weight:700;color:#E7F0FF">${t}</div>${s ? `<div style="font-size:15px;color:#7DE8FF;margin-top:4px">${s}</div>` : ""}`;
  }, [title, sub]);

const card = async (html, ms) => {
  await page.evaluate((h) => {
    let el = document.getElementById("__card");
    if (!el) { el = document.createElement("div"); el.id = "__card"; document.body.appendChild(el); }
    el.style.cssText = "position:fixed;inset:0;z-index:10000;display:grid;place-items:center;background:radial-gradient(ellipse at 50% 120%,#123B78 0%,#04152D 45%,#020A18 80%);font-family:Inter,sans-serif;color:#E7F0FF;text-align:center;transition:opacity .6s;opacity:1";
    el.innerHTML = h;
  }, html);
  await wait(ms);
  await page.evaluate(() => { const el = document.getElementById("__card"); el.style.opacity = "0"; setTimeout(() => el.remove(), 700); });
  await wait(700);
};

const brand = `<div style="display:flex;gap:14px;align-items:center;justify-content:center;font-size:30px;font-weight:800"><span><span style="background:linear-gradient(135deg,#2B7BFF,#2FD6F5);color:#020A18;padding:0 8px;border-radius:6px;margin-right:8px">#</span>Insight</span><span style="opacity:.4">|</span><span>TA’ZIZ<div style="font-size:11px;letter-spacing:3px;font-weight:500;color:#93A9CC">AN ADNOC GROUP COMPANY</div></span></div>`;

await page.goto(url, { waitUntil: "networkidle" });
await card(`<div>${brand}<div style="margin-top:46px;font-size:64px;font-weight:800;line-height:1.05">Agentic AI for the<br><span style="background:linear-gradient(90deg,#2FD6F5,#4C9BFF);-webkit-background-clip:text;color:transparent">Intelligent Methanol Plant</span></div><div style="margin-top:22px;font-size:22px;color:#93A9CC">From plant signals → coordinated AI investigation → human decision</div><div style="margin-top:34px;display:inline-block;padding:6px 14px;border:1px solid #F4B740;color:#F4B740;border-radius:8px;font-size:13px;letter-spacing:2px;font-weight:700">DEMO / SIMULATION · SYNTHETIC DATA</div></div>`, 5200);

await caption("01 · The plant at a glance", "Production 2,450 t/day vs 2,550 target · purity, energy and availability live");
await wait(4500);
await page.mouse.wheel(0, 500); await wait(2500);
await caption("A production deviation appears", "Down 4% in six hours. The decline started at 04:12 in the synthesis loop");
await page.mouse.wheel(0, 500); await wait(4000);
await page.mouse.wheel(0, -1200);
await page.click("#nav-plant"); await caption("02 · Live Plant", "Synthetic tags refresh every 2.5 s. Deviations are flagged quietly, not as an alarm wall"); await wait(5000);

await page.click("#nav-council");
await caption("03 · Operations Agent convenes the Council of Agents", "Process · Asset · Quality · Energy · Engineering · HSE · Production · Shift");
await wait(3000);
await page.click("#run-investigation");
await caption("Agents investigate in parallel, across every data source", "Historian · alarms · condition monitoring · maintenance · LIMS · documents · operating limits");
await wait(14500);
await caption("Root cause: synthesis-loop compressor throughput degradation (87%)", "~102 t/day lost · 80–90 t/day recoverable · exposure illustrative");
await page.evaluate(() => document.getElementById("hl-conclusion")?.scrollIntoView({ behavior: "smooth", block: "start" }));
await wait(6000);
await page.evaluate(() => document.getElementById("hl-approval")?.scrollIntoView({ behavior: "smooth", block: "center" }));
await caption("Human approval required", "AI prepares the plan. Nothing touches the plant without a person deciding");
await wait(4500);

await page.click("#nav-investigation");
await caption("04 · Investigation Center", "Timeline, evidence by source, reasoning summary and a recommended plan");
await wait(2500);
await page.getByText("Historian Trends").click(); await wait(3500);
await page.getByText("Maintenance History").first().click(); await wait(3000);
await page.click("#approve-plan"); await wait(2200);
await caption("The shift supervisor approves the investigation plan", "Decision, identity and timestamp are written to the audit trail");
await page.click("#confirm-approve"); await wait(3500);

await page.click("#nav-assets"); await caption("06 · Asset Health", "C-201 health 71, risk elevated: the agent workflow ends in human approval"); await wait(4500);
await page.click("#nav-quality"); await caption("08 · Quality Intelligence", "Predicts purity 60 minutes ahead"); await wait(2000);
await page.click("#sim-distill"); await wait(4000);
await page.click("#nav-knowledge"); await caption("09 · Engineering Knowledge Agent", "Cited answers from SOPs, P&IDs, OEM manuals and incident history");
await page.getByText("What are the prerequisites before inspecting C-201?").click(); await wait(4500);
await page.click("#nav-shift"); await caption("10 · Shift Intelligence", "An AI-drafted handover in seconds"); await page.click("#gen-shift"); await wait(4500);
await page.click("#nav-control"); await caption("11 · AI Control: governed by design", "Agents read and recommend. They can never write to DCS, SIS or operating limits");
await wait(3000);
await page.getByRole("button", { name: "Test" }).first().click(); await wait(4000);
await page.click("#nav-scenarios"); await caption("12 · Scenario Simulator", "Eight synthetic situations, each triggering its own council investigation"); await wait(3000);
await page.click("#scenario-B"); await caption("Scenario B · Compressor degradation", "The council re-forms automatically with the Asset Agent leading"); await wait(9000);

await page.click("#ask-ai-fab").catch(() => page.click("#ask-ai-top"));
await caption("Ask Methanol AI", "Answers come from the current plant state");
await wait(1200);
await page.getByText("Which asset has the highest risk?").click(); await wait(3800);
await page.keyboard.press("Escape");
await page.evaluate(() => document.querySelector("aside button[class*='rounded p-1']")?.click());
await page.evaluate(() => { location.hash = "#/value"; });
await page.evaluate(() => window.__setView?.("value"));
await page.getByRole("button", { name: "Executive Value Summary" }).click(); await caption("", ""); await wait(5000);

await card(`<div>${brand}<div style="margin-top:40px;font-size:46px;font-weight:800">AI does not replace the operator or the DCS.</div><div style="margin-top:14px;font-size:24px;color:#93A9CC">It adds an intelligent layer above plant systems that</div><div style="margin-top:20px;font-size:26px;font-weight:700;letter-spacing:4px;color:#2FD6F5">OBSERVES · UNDERSTANDS · INVESTIGATES · COORDINATES · RECOMMENDS · ESCALATES · LEARNS</div><div style="margin-top:22px;font-size:20px">while humans remain accountable for operational decisions.</div><div style="margin-top:30px;font-size:13px;color:#F4B740;letter-spacing:2px">ILLUSTRATIVE DEMO · SYNTHETIC DATA · SUBJECT TO VALIDATION WITH TA’ZIZ DATA</div></div>`, 6500);

await cdp.send("Page.stopScreencast").catch(() => {});
const endT = Date.now() / 1000;
await ctx.close();
await browser.close();
const list = frames.map((f, i) => `file '${f.file}'\nduration ${Math.max(0.01, ((frames[i + 1]?.t ?? endT) - f.t)).toFixed(3)}`).join("\n") + `\nfile '${frames[frames.length - 1].file}'\n`;
writeFileSync(path.join(out, "list.txt"), list);
const mp4 = path.resolve(import.meta.dirname, "taziz-agentic-methanol-demo.mp4");
execSync(`ffmpeg -y -loglevel error -f concat -safe 0 -i "${path.join(out, "list.txt")}" -vf "fps=25,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" -c:v libx264 -preset veryfast -crf 21 -pix_fmt yuv420p -movflags +faststart "${mp4}"`);
console.log("video:", mp4);
