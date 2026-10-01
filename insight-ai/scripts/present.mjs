// Walk every present-mode scene with the keyboard and screenshot it. Usage: node scripts/present.mjs [w] [h]
import { chromium } from 'playwright-core';
const [, , w = '1920', h = '1080', level = 'executive'] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
const errors = [];
page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && errors.push(`${m.type()}: ${m.text()}`));
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
await page.goto((process.env.BASE ?? 'http://127.0.0.1:5173/'), { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Present', exact: true }).click();
await page.waitForTimeout(500);
if (level === 'detail') await page.getByRole('radio', { name: 'Detail' }).click();
const total = await page.evaluate(() => parseInt(document.querySelector('[aria-roledescription="presentation"] .font-mono.tabular-nums').textContent.split('/')[1]));
const overflows = [];
for (let i = 0; i < total; i++) {
  await page.waitForTimeout(550);
  // Detect content spilling past the scene body (above the presenter bar).
  const spill = await page.evaluate(() => {
    const body = document.querySelector('[aria-roledescription="presentation"] .min-h-0.flex-1');
    if (!body) return 0;
    return Math.round(body.scrollHeight - body.clientHeight);
  });
  if (spill > 2) overflows.push(`scene ${i + 1}: +${spill}px`);
  await page.screenshot({ path: `qa-screens/present-${w}-${level}-${String(i + 1).padStart(2, '0')}.png` });
  await page.keyboard.press('ArrowRight');
}
const hashAtEnd = await page.evaluate(() => location.hash);
await page.keyboard.press('ArrowLeft');
await page.keyboard.press('Home');
await page.waitForTimeout(400);
const hashHome = await page.evaluate(() => location.hash);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
const explore = await page.evaluate(() => !document.querySelector('[aria-roledescription="presentation"]') && !!document.querySelector('aside [data-nav]'));
console.log({ total, hashAtEnd, hashHome, backToExplore: explore });
console.log('overflow:', overflows.length ? overflows.join(', ') : 'none');
console.log(errors.length ? errors.join('\n') : 'no console errors');
await browser.close();
