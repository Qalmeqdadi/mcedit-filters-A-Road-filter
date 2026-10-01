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

// Maturity self-check: stage-adaptive, detailed questionnaire
await open('maturity');
await page.getByRole('radio', { name: /Scaling/ }).click();
const answer = async (question, v) => page.getByRole('radiogroup', { name: question }).getByRole('radio', { name: v === 'dk' ? 'Don’t know' : new RegExp(`^${v} ·`) }).click();
const areaQ = async () => (await page.locator('#maturity [role="radiogroup"]').count()) - 1; // minus stage picker
check('maturity: scaling asks in-use questions', (await page.locator('#maturity').innerText()).includes('portfolio using consistent criteria'));
const scalingStrategyQs = await areaQ();
await answer('There is a clearly stated business ambition for AI, endorsed by the executive team.', 4);
await answer('AI opportunities are linked to specific business outcomes and KPIs.', 3);
await answer('A named executive sponsor is accountable for AI.', 4);
await answer('There is a funded AI investment plan or roadmap.', 2);
await answer('The benefits of AI solutions are measured against a baseline after deployment.', 'dk');
await page.locator('#maturity [data-area="authority"]').click();
await answer('It is clear which decisions must always remain with people.', 2);
await answer('Each AI solution or agent has a named business owner.', 1);
await answer('What each agent may recommend, decide or execute is documented in an authority matrix.', 1);
await answer('A registry of AI systems and agents exists and is kept current.', 1);
await page.locator('#maturity [data-area="policy"]').click();
await answer('An AI policy or acceptable-use policy is approved and communicated.', 3);
await answer('AI use cases are risk-classified at intake.', 2);
const navText = await page.locator('#maturity nav[aria-label="Assessment areas"]').innerText();
check('maturity: strategy area averages to 3.3', navText.includes('3.3'), 'mean of 4,3,4,2 with one don’t know');
await page.getByRole('tab', { name: /Results/ }).click();
await page.waitForTimeout(300);
const mt = await page.locator('#maturity').innerText();
check('maturity: results list weakest practices', mt.includes('WEAKEST PRACTICES') && mt.includes('authority matrix'));
check('maturity: unknowns reported', mt.includes('1 answer was “don’t know”'));
check('maturity: recommends S03 entry offer', mt.includes('AI Control / Radius Assessment'));
check('maturity: radar plots answered areas', (await page.locator('#maturity svg circle[fill="#d4006f"]').count()) === 3);
// No AI yet: the questionnaire reframes control as readiness to govern.
await page.getByRole('radio', { name: /Not started/ }).click();
await page.getByRole('tab', { name: /Questions/ }).click();
await page.waitForTimeout(200);
const notStartedStrategyQs = await areaQ();
const nt = await page.locator('#maturity').innerText();
check('maturity: not-started stage swaps questions', !nt.includes('portfolio using consistent criteria') && nt.includes('Potential AI use cases have been identified'), `${scalingStrategyQs} → ${notStartedStrategyQs} strategy questions`);
await page.locator('#maturity [data-area="identity"]').click();
check('maturity: control asks readiness-to-govern', (await page.locator('#maturity').innerText()).includes('agreed approach for how AI tools and agents will be given access'));
await page.getByRole('tab', { name: /Results/ }).click();
check('maturity: foundations-first recommendation', (await page.locator('#maturity').innerText()).includes('FOUNDATIONS FIRST'));
await page.getByRole('radio', { name: /Scaling/ }).click();

// Prioritiser: Excel import
await open('prioritiser');
const fx = (f) => new URL(`./fixtures/${f}`, import.meta.url).pathname;
await page.locator('[data-testid="usecase-file"]').setInputFiles(fx('client_usecases.xlsx'));
await page.getByRole('dialog').waitFor();
const dlg = await page.getByRole('dialog').innerText();
check('import: xlsx parsed (9 rows, title + blank rows skipped)', dlg.includes('9 use cases ready to import'));
check('import: flexible headers matched', dlg.includes('“Initiative”') && dlg.includes('“Impact”') && dlg.includes('“Feasibility”') && dlg.includes('“Risk level”'));
check('import: missing score flagged', dlg.includes('needs scoring') && dlg.includes('1 use case had a missing score'));
await page.getByRole('dialog').getByRole('button', { name: 'Import', exact: true }).click();
await page.waitForTimeout(300);
const rowsNow = await page.locator('#prioritiser tbody tr').count();
check('import: rows added to prioritiser', rowsNow === 9);
const kyc = await page.locator('#prioritiser tbody tr', { hasText: 'KYC document review' }).innerText();
check('import: words mapped to scores + owner shown', kyc.includes('Compliance · CCO'));
check('import: 10-point scale scaled', (await page.getByLabel('IT service desk agent value').inputValue()) === '4');
await page.getByLabel('Regulatory change tracking readiness').selectOption('2');
check('import: scoring clears flag', !(await page.locator('#prioritiser tbody tr', { hasText: 'Regulatory change tracking' }).innerText()).includes('needs scoring'));
await page.locator('[data-testid="usecase-file"]').setInputFiles(fx('usecases_semicolon.csv'));
check('import: semicolon CSV with quoted field', await page.getByRole('dialog').filter({ hasText: 'Loan servicing; email drafting' }).waitFor({ timeout: 3000 }).then(() => true, () => false));
await page.getByRole('dialog').getByRole('button', { name: /Replace current/ }).click();
await page.waitForTimeout(200);
check('import: replace mode', (await page.locator('#prioritiser tbody tr').count()) === 2);
await page.locator('[data-testid="usecase-file"]').setInputFiles(fx('no_header.xlsx'));
check('import: header-less sheet read by position', await page.getByRole('dialog').filter({ hasText: 'No header row found' }).waitFor({ timeout: 3000 }).then(() => true, () => false));
await page.getByRole('dialog').getByRole('button', { name: /Add to current/ }).click();
await page.getByRole('dialog').waitFor({ state: 'detached' });
await page.locator('[data-testid="usecase-file"]').setInputFiles(fx('old.xls'));
check('import: legacy .xls gives guidance', await page.getByRole('dialog').filter({ hasText: 'Save As' }).waitFor({ timeout: 3000 }).then(() => true, () => false));
await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).last().click();
// Template download → valid workbook that round-trips (example rows are ignored)
const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Template' }).click()]);
const tpl = 'qa-screens/template-downloaded.xlsx';
await dl.saveAs(tpl);
check('template: downloads as .xlsx', dl.suggestedFilename().endsWith('.xlsx'));
// Typed use cases still work
await page.getByLabel('New use case').fill('Credit memo drafting');
await page.getByRole('button', { name: 'Add', exact: true }).click();
await page.getByLabel('Credit memo drafting value').selectOption('5');
await page.getByLabel('Credit memo drafting readiness').selectOption('4');
await page.getByLabel('Mortgage document check risk').selectOption('High');
await page.waitForTimeout(300);
const pt = await page.locator('#prioritiser').innerText();
check('prioritiser: top rank is Credit memo drafting', (await page.locator('#prioritiser tbody tr').first().innerText()).includes('Credit memo drafting'));
check('prioritiser: matrix dots = rows', (await page.locator('#prioritiser svg circle[fill="#d4006f"]').count()) === (await page.locator('#prioritiser tbody tr').count()));
check('prioritiser: high-risk control gate flagged', pt.includes('AI Control design gate before PoV'));

// Summary
await open('summary');
await page.getByLabel('Meeting notes').fill('CRO sponsors; revisit in two weeks.');
const st = await page.locator('#summary').innerText();
check('summary: client + play', st.includes('Gulf National Bank') && st.includes('AI Control / Radius Assessment'));
check('summary: lighthouse next step', st.includes('“Credit memo drafting” as the Lighthouse PoV'));
check('summary: control gap next step', st.includes('Close the Authority & Permissions gap (1.3 → 4)'));
check('summary: high-risk gate step', st.includes('design gate for “Mortgage document check”'));
check('summary: shows AI stage', st.toUpperCase().includes('AI STAGE: SCALING'));
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
check('summary: copy includes weakest practices', clip.includes('Weakest practices'));

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
