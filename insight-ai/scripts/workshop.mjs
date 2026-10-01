// End-to-end check of the v2 client workshop: client mode, self-check, prioritiser, summary.
import { chromium } from 'playwright-core';
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && errors.push(`${m.type()}: ${m.text()}`));
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
const results = [];
const check = (n, ok, info = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${n}${info ? `  (${info})` : ''}`);
const open = async (id) => { await page.evaluate((h) => (location.hash = h), id); await page.locator(`section#${id}`).waitFor(); await page.waitForTimeout(300); };

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });

// Client mode
await page.locator('aside [data-testid="client-panel"]').click();
await page.getByLabel('Client name', { exact: true }).fill('Gulf National Bank');
await page.getByLabel('Sector', { exact: true }).selectOption('financial');
await page.getByRole('button', { name: 'Apply' }).click();
await page.waitForTimeout(300);
check('client: sidebar shows prepared-for', (await page.locator('aside [data-testid="client-panel"]').innerText()).includes('Gulf National Bank'));
await open('overview');
check('client: overview banner', (await page.locator('#overview').innerText()).includes('Gulf National Bank'));
await open('services');
check('client: sector lead services badged', (await page.locator('#services').getByText('Lead for Financial Services').count()) === 3);
await open('sectors');
check('client: sectors open on client sector', (await page.getByRole('tab', { name: 'Financial Services' }).getAttribute('aria-selected')) === 'true');
await open('plays');
check('client: plays open on sector lead play', (await page.getByRole('tab', { selected: true }).innerText()).includes('AI Control') && (await page.locator('#plays').innerText()).includes('CLIENT LEAD'));

// Maturity self-check
await open('maturity');
const score = async (dim, v) => page.getByRole('radiogroup', { name: `${dim}: current score` }).getByRole('radio', { name: String(v), exact: true }).click();
await score('Strategy & value', 3);
await score('Data readiness', 2);
await score('Identity & Access', 1);
await score('Authority & Permissions', 1);
await score('Policy & Guardrails', 2);
await page.getByLabel('Policy & Guardrails: target score').selectOption('5');
await page.waitForTimeout(300);
const mt = await page.locator('#maturity').innerText();
check('maturity: scored count', mt.includes('5 of 12 scored'));
check('maturity: biggest gap is Policy (2→5)', /Policy & Guardrails\s*\n?\s*2 → 5/.test(mt) || mt.includes('2 → 5'));
check('maturity: recommends S03 entry offer', mt.includes('AI Control / Radius Assessment'));
check('maturity: radar plots 5 points', (await page.locator('#maturity svg circle[fill="#d4006f"]').count()) === 5);

// Prioritiser
await open('prioritiser');
await page.getByRole('button', { name: 'Add Financial Services examples' }).click();
await page.getByLabel('New use case').fill('Credit memo drafting');
await page.getByRole('button', { name: 'Add', exact: true }).click();
await page.getByLabel('Credit memo drafting value').selectOption('5');
await page.getByLabel('Credit memo drafting readiness').selectOption('4');
await page.getByLabel('Risk agents risk').selectOption('High');
await page.getByLabel('Compliance intelligence readiness').selectOption('1');
await page.getByLabel('Compliance intelligence value').selectOption('5');
await page.waitForTimeout(300);
const pt = await page.locator('#prioritiser').innerText();
check('prioritiser: 6 use cases', (await page.locator('#prioritiser tbody tr').count()) === 6);
check('prioritiser: top rank is Credit memo drafting', (await page.locator('#prioritiser tbody tr').first().innerText()).includes('Credit memo drafting'));
check('prioritiser: matrix dots', (await page.locator('#prioritiser svg circle[fill="#d4006f"]').count()) === 6);
check('prioritiser: strategic bet placed', pt.includes('Strategic bet'));
check('prioritiser: high-risk control gate flagged', pt.includes('AI Control design gate before PoV'));
await page.getByRole('button', { name: 'Remove Operations agents' }).click();
check('prioritiser: remove works', (await page.locator('#prioritiser tbody tr').count()) === 5);

// Summary
await open('summary');
await page.getByLabel('Meeting notes').fill('CRO sponsors; revisit in two weeks.');
const st = await page.locator('#summary').innerText();
check('summary: client + play', st.includes('Gulf National Bank') && st.includes('AI Control / Radius Assessment'));
check('summary: lighthouse next step', st.includes('“Credit memo drafting” as the Lighthouse PoV'));
check('summary: control gap next step', st.includes('Close the Identity & Access gap (1 → 4)'));
check('summary: high-risk gate step', st.includes('design gate for “Risk agents”'));
await page.getByRole('button', { name: 'Copy as text' }).click();
await page.waitForTimeout(200);
const clip = await page.evaluate(() => navigator.clipboard.readText());
check('summary: copy as text', clip.includes('Prepared for: Gulf National Bank (Financial Services)') && clip.includes('CRO sponsors'));
await page.emulateMedia({ media: 'print' });
await page.waitForTimeout(200);
const printHidden = await page.evaluate(() => getComputedStyle(document.querySelector('aside').parentElement).display === 'none');
check('summary: print hides navigation', printHidden);
await page.screenshot({ path: 'qa-screens/v2-summary-print.png', fullPage: true });
await page.pdf({ path: 'qa-screens/v2-summary.pdf', format: 'A4', printBackground: true });
await page.emulateMedia({ media: 'screen' });
await page.screenshot({ path: 'qa-screens/v2-summary.png', fullPage: true });

// Persistence
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(300);
check('session survives reload', (await page.locator('#summary').innerText()).includes('Credit memo drafting'));

await open('maturity'); await page.screenshot({ path: 'qa-screens/v2-maturity.png', fullPage: true });
await open('prioritiser'); await page.screenshot({ path: 'qa-screens/v2-prioritiser.png', fullPage: true });

// Present mode with session
await page.getByRole('button', { name: 'Present', exact: true }).click();
await page.waitForTimeout(400);
check('present: title shows client', (await page.locator('[aria-roledescription="presentation"]').innerText()).includes('Gulf National Bank'));
await page.screenshot({ path: 'qa-screens/v2-present-title.png' });
const total = await page.evaluate(() => parseInt(document.querySelector('[aria-roledescription="presentation"] .font-mono.tabular-nums').textContent.split('/')[1]));
for (let i = 1; i < total; i++) {
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(500);
  const id = await page.evaluate(() => location.hash);
  if (['#present-18', '#present-19', '#present-20'].includes(id)) await page.screenshot({ path: `qa-screens/v2-present-${id.slice(9)}.png` });
}
check('present: workshop scenes added', total === 21, `${total} scenes`);
await page.keyboard.press('Escape');

// Clear session
await page.locator('aside [data-testid="client-panel"]').click();
await page.getByRole('button', { name: 'Clear session' }).click();
await page.waitForTimeout(300);
check('clear session', (await page.locator('aside [data-testid="client-panel"]').innerText()).includes('Set up a client'));

console.log(results.join('\n'));
console.log(errors.length ? errors.join('\n') : 'no console errors');
await browser.close();
process.exit(results.some((r) => r.startsWith('FAIL')) || errors.length ? 1 : 0);
