#!/usr/bin/env node
// Render an atlas page (neuron-atlas.html by default, or --src ../eye/eye-atlas.html) to an MP4, one frame at a time.
//
// The page runs in a deterministic "record" mode (fixed time step, seeded randomness),
// so every frame is rendered completely no matter how slow the machine is. Frames go
// straight into ffmpeg; nothing is written to disk except the finished video.
//
//   node neuron/record.mjs                         # 1920x1080, 30 fps, full tour (~65 s)
//   node neuron/record.mjs --width 1080 --height 1920 --out neuron-vertical.mp4
//   node neuron/record.mjs --stills 4,20,45        # PNG stills instead of a video
//
// Needs: Node 18+, ffmpeg on PATH, and Playwright with Chromium
//   (npm i -D playwright && npx playwright install chromium).
// --offline <node_modules dir> serves three.js and the fonts from a local install
//   (npm i three@0.160.0 @fontsource/saira-condensed @fontsource/saira @fontsource/jetbrains-mono).

import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : 'true']);
  return acc;
}, []));
const W = +(args.width || 1920), Hh = +(args.height || 1080), FPS = +(args.fps || 30);
const OUT = resolve(args.out || 'neuron-atlas.mp4');
const SRC = resolve(args.src || join(here, 'neuron-atlas.html'));
const OFFLINE = args.offline ? resolve(args.offline) : null;
const STILLS = args.stills ? args.stills.split(',').map(Number).sort((a, b) => a - b) : null;

let chromium;
try { ({ chromium } = require('playwright')); }
catch { console.error('Playwright is missing. Run: npm i -D playwright && npx playwright install chromium'); process.exit(1); }

// The page is authored as a fragment; give it a document shell for local rendering.
const dir = mkdtempSync(join(tmpdir(), 'neuron-'));
const page_ = join(dir, 'index.html');
writeFileSync(page_, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>${readFileSync(SRC, 'utf8')}</body></html>`);

const browser = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
const context = await browser.newContext({ viewport: { width: W, height: Hh }, deviceScaleFactor: 1 });
const page = await context.newPage();
page.on('pageerror', e => console.error('[page error]', e.message));
page.on('console', m => { if (m.type() === 'error') console.error('[console]', m.text()); });

if (OFFLINE) {
  const cors = { 'access-control-allow-origin': '*' };
  await page.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**', route => {
    const rel = new URL(route.request().url()).pathname.replace('/npm/three@0.160.0/', '');
    const file = join(OFFLINE, 'three', rel);
    if (!existsSync(file)) return route.fulfill({ status: 404, headers: cors, body: '' });
    route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'text/javascript' }, body: readFileSync(file) });
  });
  const faces = [
    ['Saira Condensed', 'saira-condensed', [500, 600, 700, 800]],
    ['Saira', 'saira', [400, 500]],
    ['JetBrains Mono', 'jetbrains-mono', [400, 500, 600]],
  ];
  const css = faces.flatMap(([fam, pkg, ws]) => ws.map(w =>
    `@font-face{font-family:'${fam}';font-style:normal;font-weight:${w};font-display:swap;src:url(https://fonts.gstatic.com/local/${pkg}/${pkg}-latin-${w}-normal.woff2) format('woff2');}`)).join('\n');
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'text/css' }, body: css }));
  await page.route('https://fonts.gstatic.com/**', route => {
    const [, , pkg, file] = new URL(route.request().url()).pathname.split('/');
    const path = join(OFFLINE, '@fontsource', pkg || '', 'files', file || '');
    if (!existsSync(path)) return route.fulfill({ status: 404, headers: cors, body: '' });
    route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'font/woff2' }, body: readFileSync(path) });
  });
}

await page.goto(pathToFileURL(page_).href + '?record=1');
await page.waitForFunction(() => (window.__atlas||window.__neuron), null, { timeout: 60000 });
await page.evaluate(() => (window.__atlas||window.__neuron).ready);
const duration = +(args.seconds || await page.evaluate(() => (window.__atlas||window.__neuron).duration));
const dt = 1 / FPS;

if (STILLS) {
  let t = 0;
  for (const [i, at] of STILLS.entries()) {
    while (t + dt <= at) { await page.evaluate(d => (window.__atlas||window.__neuron).advance(d), dt); t += dt; }
    await page.evaluate(d => (window.__atlas||window.__neuron).step(d), dt); t += dt;
    const file = OUT.replace(/\.mp4$/i, '') + `-still-${String(i + 1).padStart(2, '0')}.png`;
    await page.screenshot({ path: file });
    console.log(`still ${at}s -> ${file}`);
  }
  await browser.close();
  process.exit(0);
}

const frames = Math.round(duration * FPS);
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT], { stdio: ['pipe', 'inherit', 'inherit'] });
const done = new Promise((ok, fail) => ff.on('close', c => c === 0 ? ok() : fail(new Error('ffmpeg exited with ' + c))));
const t0 = Date.now();
for (let f = 0; f < frames; f++) {
  await page.evaluate(d => (window.__atlas||window.__neuron).step(d), dt);
  const jpg = await page.screenshot({ type: 'jpeg', quality: 93 });
  if (!ff.stdin.write(jpg)) await new Promise(r => ff.stdin.once('drain', r));
  if (f % FPS === 0) {
    const el = (Date.now() - t0) / 1000, eta = el / (f + 1) * (frames - f - 1);
    process.stdout.write(`\rframe ${f + 1}/${frames}  ${(el).toFixed(0)}s elapsed  ~${eta.toFixed(0)}s left   `);
  }
}
ff.stdin.end();
await done;
await browser.close();
console.log(`\nwrote ${OUT} (${frames} frames, ${duration.toFixed(1)} s at ${FPS} fps, ${W}x${Hh})`);
