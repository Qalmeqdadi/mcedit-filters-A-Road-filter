// Visit every page via the sidebar and screenshot it. Usage: node scripts/sections.mjs [width] [level]
import { chromium } from 'playwright-core';
const [, , w = '1440', level = 'executive'] = process.argv;
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: +w, height: 900 } });
const errors = [];
page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && errors.push(`${m.type()}: ${m.text()}`));
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
await page.goto(BASE, { waitUntil: 'networkidle' });
if (level === 'detail') await page.getByRole('radio', { name: 'Detail' }).first().click({ force: true });
const ids = ['overview', 'architecture', 'services', 'operating-system', 'ai-control', 'capabilities', 'accelerators', 'plays', 'sectors', 'landscape', 'journey', 'outcomes'];
const overflow = [];
for (const id of ids) {
  await page.evaluate((h) => (location.hash = h), id);
  await page.waitForTimeout(450);
  const ok = await page.locator(`main section#${id}`).count();
  if (!ok) errors.push(`page ${id} did not render`);
  const ox = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (ox > 0) overflow.push(`${id}: ${ox}px`);
  await page.screenshot({ path: `qa-screens/page-${w}-${level}-${id}.png`, fullPage: true });
}
console.log('horizontal overflow:', overflow.length ? overflow.join(', ') : 'none');
console.log(errors.length ? errors.join('\n') : 'no console errors');
await browser.close();
