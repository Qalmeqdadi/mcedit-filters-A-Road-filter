// Usage: node scripts/shot.mjs <url-hash> <out.png> [width] [height] [fullPage]
import { chromium } from 'playwright-core';
const [, , hash = '', out = 'qa-screens/shot.png', w = '1440', h = '900', full = '0'] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
const errors = [];
page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && errors.push(`${m.type()}: ${m.text()}`));
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
await page.goto(`${process.env.BASE ?? 'http://127.0.0.1:5173/'}${hash}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.screenshot({ path: out, fullPage: full === '1' });
console.log(errors.length ? errors.join('\n') : 'no console errors');
await browser.close();
