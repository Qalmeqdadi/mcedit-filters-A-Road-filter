// Screenshot every explore section as its own image. Usage: node scripts/sections.mjs [width] [level]
import { chromium } from 'playwright-core';
const [, , w = '1440', level = 'executive'] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: +w, height: 900 } });
const errors = [];
page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && errors.push(`${m.type()}: ${m.text()}`));
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
await page.goto((process.env.BASE ?? 'http://127.0.0.1:5173/'), { waitUntil: 'networkidle' });
if (level === 'detail') await page.getByRole('radio', { name: 'Detail' }).click();
await page.addStyleTag({ content: 'header.sticky { position: static !important; }' });
await page.waitForTimeout(400);
const ids = await page.$$eval('main > section', (els) => els.map((e) => e.id));
for (const id of ids) {
  const el = await page.$(`#${id}`);
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  await el.screenshot({ path: `qa-screens/${w}-${level}-${id}.png` });
}
// Horizontal overflow check
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
console.log('sections:', ids.join(', '));
console.log('horizontal overflow px:', overflow);
console.log(errors.length ? errors.join('\n') : 'no console errors');
await browser.close();
