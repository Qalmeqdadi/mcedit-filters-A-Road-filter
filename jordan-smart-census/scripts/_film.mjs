import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import path from "node:path";
const [html, outFile, fpsArg, durArg, startArg] = process.argv.slice(2);
const fps = +fpsArg || 30, dur = +durArg || 120, start = +startArg || 0, N = Math.round(fps * (dur - start));
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const page = await b.newPage({ viewport: { width: 1920, height: 1080 } });
page.on("pageerror", (e) => console.log("ERR", e.message));
await page.goto("file://" + path.resolve(html));
await page.evaluate(() => document.fonts.ready);
const ff = spawn("ffmpeg", ["-loglevel", "error", "-y", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", outFile], { stdio: ["pipe", "inherit", "inherit"] });
const t0 = Date.now();
for (let i = 0; i < N; i++) {
  await page.evaluate((x) => window.render(x), start + i / fps);
  const buf = await page.screenshot({ type: "jpeg", quality: 92 });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  if (i % 300 === 0) console.log(`frame ${i}/${N} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
ff.stdin.end();
await new Promise((r) => ff.on("close", r));
await b.close();
console.log("done", ((Date.now() - t0) / 1000).toFixed(0), "s");
