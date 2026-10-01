// End-to-end interaction checks for the major views. Exits non-zero on failure.
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
const external = [];
page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && errors.push(`${m.type()}: ${m.text()}`));
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('request', (r) => { if (!r.url().startsWith('http://127.0.0.1') && !r.url().startsWith('data:')) external.push(r.url()); });
await page.goto((process.env.BASE ?? 'http://127.0.0.1:5173/'), { waitUntil: 'networkidle' });
const results = [];
const check = (name, ok, info = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? `  (${info})` : ''}`);
const drawer = () => page.locator('aside[role="dialog"]');
const pathCount = (sel) => page.locator(`${sel} svg path.connector-animated`).count();

// --- Architecture: layer selection
const arch = page.locator('#architecture');
await arch.scrollIntoViewIfNeeded();
await arch.getByRole('button', { name: /What clients buy/ }).click();
await page.waitForTimeout(600);
check('arch: layer click opens drawer', await drawer().isVisible());
const layerText = (await drawer().innerText()).toUpperCase();
check('arch: drawer shows upstream/downstream', layerText.includes('SERVES (UPSTREAM)') && layerText.includes('RELIES ON (DOWNSTREAM)'));
check('arch: layer connections drawn', (await pathCount('#architecture')) >= 2, `${await pathCount('#architecture')} paths`);
const dimmed = await arch.locator('[style*="opacity: 0.38"]').count();
check('arch: unrelated layers dim', dimmed >= 3, `${dimmed} dimmed`);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
check('arch: Escape closes drawer', !(await drawer().isVisible()));

// --- Architecture: element selection
await arch.locator('[data-node="svc:s03"]').click();
await page.waitForTimeout(600);
const s03Paths = await pathCount('#architecture');
check('arch: element click draws connections', s03Paths >= 5, `${s03Paths} paths`);
check('arch: element drawer lists connections', (await drawer().innerText()).toUpperCase().includes('CONNECTED ACROSS THE ARCHITECTURE'));
check('arch: related accelerator highlighted', (await arch.locator('[data-node="acc:radius"]').getAttribute('class')).includes('shadow-card'));
// navigate via drawer connection
await drawer().getByRole('button', { name: 'Radius' }).click();
await page.waitForTimeout(500);
check('arch: drawer connection navigates', (await drawer().locator('h3').innerText()) === 'Radius');
await page.keyboard.press('Escape');

// --- Show connections toggle
await arch.getByRole('button', { name: 'Connections on' }).click();
await arch.locator('[data-node="grp:control"]').click();
await page.waitForTimeout(500);
check('arch: connections can be hidden', (await pathCount('#architecture')) === 0);
await page.keyboard.press('Escape');

// --- Simplify + Reset
await arch.getByRole('button', { name: 'Simplify view' }).click();
await page.waitForTimeout(500);
check('arch: simplify hides elements', (await arch.locator('[data-node^="svc:"]').count()) === 0);
await arch.getByRole('button', { name: 'Reset' }).click();
await page.waitForTimeout(500);
check('arch: reset restores full view', (await arch.locator('[data-node^="svc:"]').count()) === 6);
check('arch: reset restores connections', (await arch.getByRole('button', { name: 'Connections on' }).count()) === 1);

// --- Services drawer
await page.locator('#services').getByRole('button', { name: /AI Control, Governance & Assurance/ }).click();
await page.waitForTimeout(500);
const svcText = await drawer().innerText();
check('services: drawer has scope, outputs, accelerators', ['Scope', 'Client outputs', 'Accelerators / IP', 'Capabilities consumed'].every((t) => svcText.toUpperCase().includes(t.toUpperCase())));
await drawer().getByRole('button', { name: 'Close details' }).click();
await page.waitForTimeout(300);

// --- OS layer expand
await page.locator('#operating-system').getByRole('button', { name: /Decision & Intelligence/ }).click();
await page.waitForTimeout(400);
check('os: layer expands with services', (await page.locator('#operating-system').innerText()).toUpperCase().includes('SHAPED BY SERVICES'));

// --- Control domain expand
const ctl = page.locator('#ai-control');
await ctl.getByRole('button', { name: /Intervention & Recovery/ }).click();
await page.waitForTimeout(400);
const ctlText = (await ctl.innerText()).toUpperCase();
check('control: domain shows 4 blocks', ['PURPOSE', 'EXAMPLE CONTROLS', 'EVIDENCE PRODUCED', 'HUMAN ACCOUNTABILITY'].every((t) => ctlText.includes(t)));
check('control: 4 runtime states', ['GO', 'CONDITIONAL GO', 'REMEDIATE', 'STOP'].every((t) => ctlText.includes(t)));

// --- Capabilities → services
const caps = page.locator('#capabilities');
await caps.locator('[data-node="cap:agent-authority"]').click();
await page.waitForTimeout(500);
const lit = await caps.locator('[data-node^="svcr:"].border-magenta').count();
check('capabilities: click lights consuming services', lit === 3, `${lit} lit (expected 3: S02, S03, S04)`);
check('capabilities: connection paths drawn', (await pathCount('#capabilities')) === 3);
await caps.getByRole('button', { name: /Data & Platform/ }).first().click();
await page.waitForTimeout(400);
check('capabilities: group selection', (await caps.innerText()).includes('capabilities are drawn on by'));

// --- Accelerator filters + drawer
const acc = page.locator('#accelerators');
await acc.getByRole('button', { name: /^ADOPT/ }).click();
await page.waitForTimeout(600);
const visible = await acc.locator('button[aria-haspopup="dialog"]').count();
check('accelerators: filter ADOPT', visible === 1, `${visible} visible`);
await acc.getByRole('button', { name: /^All/ }).click();
await page.waitForTimeout(600);
await acc.locator('button[aria-haspopup="dialog"]', { hasText: 'TokenScope' }).click();
await page.waitForTimeout(500);
const accText = (await drawer().innerText()).toUpperCase();
check('accelerators: drawer 4 required blocks', ['WHAT IT DOES', 'LIFECYCLE POSITION', 'SUPPORTED SERVICE', 'SUPPORTED CAPABILITY'].every((t) => accText.includes(t)));
await page.keyboard.press('Escape');

// --- Plays
const plays = page.locator('#plays');
await plays.getByRole('tab', { name: /AI Control/ }).click();
await page.waitForTimeout(500);
check('plays: switch to Play 03', (await plays.innerText()).includes('AI Control / Radius Assessment'));

// --- Sectors reuse the same architecture
const sec = page.locator('#sectors');
const layersBefore = await sec.locator('text=Human + AI Workforce').count();
await sec.getByRole('tab', { name: 'Energy' }).click();
await page.waitForTimeout(500);
check('sectors: overlay switches', (await sec.innerText()).includes('Agentic maintenance'));
check('sectors: same layers retained', (await sec.locator('text=Human + AI Workforce').count()) === layersBefore && layersBefore === 1);
await sec.getByRole('tab', { name: 'Healthcare' }).click();
await page.waitForTimeout(400);

// --- Landscape
const land = page.locator('#landscape');
await land.getByRole('button', { name: /^Kyndryl/ }).click();
await page.waitForTimeout(300);
check('landscape: selection note', (await land.innerText()).includes('Kyndryl also operates more broadly'));

// --- Journey
const jr = page.locator('#journey');
await jr.getByRole('button', { name: /Industrialise/ }).click();
await page.waitForTimeout(400);
check('journey: stage panel updates', (await jr.innerText()).includes('STAGE 06'));
await jr.getByRole('button', { name: /Next stage/ }).click();
await page.waitForTimeout(400);
check('journey: next stage', (await jr.innerText()).includes('STAGE 07'));

// --- Outcomes lens
const out = page.locator('#outcomes');
await out.getByRole('button', { name: 'CIO & CTO' }).click();
check('outcomes: lens filter pressed', (await out.getByRole('button', { name: 'CIO & CTO' }).getAttribute('aria-pressed')) === 'true');

// --- Detail level
await page.getByRole('radio', { name: 'Detail' }).click();
await page.waitForTimeout(400);
check('detail: coverage matrix appears', await page.locator('text=Practitioner view: capability consumption by service').isVisible());
check('detail: qualifying questions appear', (await plays.innerText()).toUpperCase().includes('QUALIFYING QUESTIONS'));
await page.getByRole('radio', { name: 'Executive' }).click();

// --- Tooltip
await page.locator('#services').getByText('Entry offer', { exact: true }).first().hover();
await page.waitForTimeout(200);
check('tooltip: glossary definition', await page.locator('[role="tooltip"]').isVisible());

// --- Nav scroll-spy
await page.locator('nav[aria-label="Sections"]').getByRole('button', { name: /Landscape/ }).click();
await page.waitForTimeout(1200);
check('nav: scroll-spy marks Landscape', (await page.locator('[data-nav="landscape"]').getAttribute('aria-current')) === 'true');

// --- Keyboard reachability
await page.goto((process.env.BASE ?? 'http://127.0.0.1:5173/'), { waitUntil: 'networkidle' });
let focusedNodes = 0;
for (let i = 0; i < 40; i++) {
  await page.keyboard.press('Tab');
  const tag = await page.evaluate(() => document.activeElement?.tagName);
  if (tag && tag !== 'BODY') focusedNodes++;
}
check('keyboard: Tab moves through controls', focusedNodes === 40);

// --- Dead-button sweep (explore mode)
await page.goto((process.env.BASE ?? 'http://127.0.0.1:5173/'), { waitUntil: 'networkidle' });
const dead = await page.evaluate(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // Already-selected tabs/stages legitimately do nothing when clicked again.
  const buttons = [...document.querySelectorAll('button')].filter(
    (b) => b.offsetParent && !b.disabled && b.getAttribute('aria-pressed') !== 'true' && b.getAttribute('aria-selected') !== 'true' && b.getAttribute('aria-checked') !== 'true' && b.textContent.trim() !== 'Present' && !/Present this/.test(b.textContent),
  );
  const deadList = [];
  for (const b of buttons) {
    if (!b.isConnected) continue;
    let mutations = 0;
    const mo = new MutationObserver((m) => (mutations += m.length));
    mo.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
    const y = window.scrollY;
    b.click();
    await sleep(120);
    mo.disconnect();
    if (!mutations && window.scrollY === y) deadList.push((b.getAttribute('aria-label') || b.textContent).trim().slice(0, 40));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await sleep(60);
  }
  return { total: buttons.length, dead: deadList };
});
check('buttons: none dead', dead.dead.length === 0, `${dead.total} buttons clicked${dead.dead.length ? '; dead: ' + dead.dead.join(' | ') : ''}`);

check('no external network requests', external.length === 0, external.slice(0, 3).join(', '));
console.log(results.join('\n'));
console.log(errors.length ? errors.join('\n') : 'no console errors');
await browser.close();
process.exit(results.some((r) => r.startsWith('FAIL')) || errors.length ? 1 : 0);
