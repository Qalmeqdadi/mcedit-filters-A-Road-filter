// Render page.html frame-by-frame and encode with ffmpeg.
//   node capture.js <workdir> stills            -> one PNG per scene (end of scene) for checking
//   node capture.js <workdir> video [fps] [jobs] -> <workdir>/video.mp4 (with narration.wav)
const { chromium } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const [work, mode = 'video', fpsArg = '30', jobsArg = '4'] = process.argv.slice(2);
const tl = JSON.parse(fs.readFileSync(path.join(work, 'timeline.json')));
const url = 'file://' + path.join(work, 'page.html');

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  return page;
}

async function segment(browser, fps, from, to, out) {
  const page = await openPage(browser);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg',
    '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = from; f < to; f++) {
    await page.evaluate((t) => render(t), f / fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  await page.close();
}

(async () => {
  const browser = await chromium.launch();
  if (mode === 'stills') {
    const page = await openPage(browser);
    for (const [i, s] of tl.scenes.entries()) {
      await page.evaluate((t) => render(t), s.end - 0.05);
      await page.screenshot({ path: path.join(work, `still_${String(i).padStart(2, '0')}.png`) });
    }
  } else {
    const fps = +fpsArg, jobs = +jobsArg;
    const n = Math.ceil(tl.total * fps), per = Math.ceil(n / jobs);
    const parts = [];
    await Promise.all([...Array(jobs).keys()].map((j) => {
      const out = path.join(work, `part${j}.mp4`); parts.push(out);
      return segment(browser, fps, j * per, Math.min(n, (j + 1) * per), out);
    }));
    fs.writeFileSync(path.join(work, 'parts.txt'), parts.sort().map((p) => `file '${p}'`).join('\n'));
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(work, 'parts.txt'),
      '-i', path.join(work, 'narration.wav'), '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000',
      '-shortest', '-movflags', '+faststart', path.join(work, 'video.mp4')], { stdio: 'inherit' });
  }
  await browser.close();
})();
