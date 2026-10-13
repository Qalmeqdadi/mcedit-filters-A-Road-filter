// Renders the concept film: real-time DevTools screencast of film.html + voiceover + music.
import { chromium } from "playwright-core";
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const dir = import.meta.dirname;
const durs = JSON.parse(readFileSync(path.join(dir, "durations.json"), "utf8"));
const PAD = { open: 3.4, close: 5.0 };
let t = 0.4;
const TL = durs.map((d) => { const len = +(d.dur + (PAD[d.id] ?? 2.7)).toFixed(2); const s = { id: d.id, start: +t.toFixed(2), len, voice: +(t + 0.55).toFixed(2) }; t += len; return s; });
const TOTAL = +t.toFixed(2);
console.log("total", TOTAL);
const frDir = path.join(dir, "frames"); rmSync(frDir, { recursive: true, force: true }); mkdirSync(frDir, { recursive: true });

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
await ctx.addInitScript((tl) => { window.TL = tl; }, TL);
const page = await ctx.newPage();
await page.goto("file://" + path.join(dir, "film.html"));
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(800);
const frames = [];
const cdp = await ctx.newCDPSession(page);
cdp.on("Page.screencastFrame", (f) => {
  const file = path.join(frDir, `f${String(frames.length).padStart(6, "0")}.jpg`);
  writeFileSync(file, Buffer.from(f.data, "base64"));
  frames.push({ file, t: f.metadata.timestamp });
  cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
});
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1920, maxHeight: 1080 });
await page.waitForTimeout(500);
const go = Date.now() / 1000;
await page.evaluate(() => window.__go());
await page.waitForTimeout((TOTAL + 0.6) * 1000);
await cdp.send("Page.stopScreencast");
await browser.close();

const end = go + TOTAL;
const fr = frames.filter((f) => f.t >= go - 0.05 && f.t <= end);
const pre = frames.filter((f) => f.t < go - 0.05).pop();
if (pre) fr.unshift({ file: pre.file, t: go });
const list = fr.map((f, i) => `file '${f.file}'\nduration ${Math.max(0.01, (fr[i + 1]?.t ?? end) - f.t).toFixed(3)}`).join("\n") + `\nfile '${fr[fr.length - 1].file}'\n`;
writeFileSync(path.join(frDir, "list.txt"), list);
const silent = path.join(dir, "film_silent.mp4");
execSync(`ffmpeg -y -loglevel error -f concat -safe 0 -i "${frDir}/list.txt" -vf "fps=30,format=yuv420p" -t ${TOTAL} -c:v libx264 -preset medium -crf 18 "${silent}"`);

execSync(`python3 "${dir}/make_music.py" ${TOTAL} "${dir}/music.wav"`);
// voice track
const inputs = TL.map((s) => `-i "${dir}/audio/${s.id}.wav"`).join(" ");
const delays = TL.map((s, i) => `[${i}:a]aformat=sample_rates=44100:channel_layouts=stereo,adelay=${Math.round(s.voice * 1000)}|${Math.round(s.voice * 1000)}[v${i}]`).join(";");
const mixv = TL.map((_, i) => `[v${i}]`).join("") + `amix=inputs=${TL.length}:normalize=0,apad=whole_dur=${TOTAL}[vo]`;
execSync(`ffmpeg -y -loglevel error ${inputs} -filter_complex "${delays};${mixv}" -map "[vo]" -t ${TOTAL} "${dir}/voice.wav"`);
const out1 = path.join(dir, "taziz-agentic-ai-concept-film.mp4");
const out2 = path.join(dir, "taziz-agentic-ai-concept-film-music-only.mp4");
execSync(`ffmpeg -y -loglevel error -i "${silent}" -i "${dir}/voice.wav" -i "${dir}/music.wav" -filter_complex "[2:a]volume=0.16[m];[1:a]volume=1.0[v];[v][m]amix=inputs=2:normalize=0,alimiter=limit=0.95[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -movflags +faststart -shortest "${out1}"`);
execSync(`ffmpeg -y -loglevel error -i "${silent}" -i "${dir}/music.wav" -filter_complex "[1:a]volume=0.6[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -movflags +faststart -shortest "${out2}"`);
console.log("done", out1, out2);
