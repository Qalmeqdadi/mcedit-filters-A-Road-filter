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
const open = async (id) => { await page.evaluate((h) => (location.hash = h), id); await page.locator(`section#${id}`).waitFor(); await page.waitForTimeout(350); };
const pathCount = (sel) => page.locator(`${sel} svg path.connector-animated`).count();

// --- Architecture: layer selection
const arch = page.locator('#architecture');
await open('architecture');
await arch.getByRole('button', { name: /What clients buy/ }).click();
await page.waitForTimeout(600);
check('arch: layer click opens drawer', await drawer().isVisible());
const layerText = (await drawer().innerText()).toUpperCase();
check('arch: drawer shows upstream/downstream', layerText.includes('SERVES (UPSTREAM)') && layerText.includes('RELIES ON (DOWNSTREAM)'));
check('arch: layer connections drawn', (await pathCount('#architecture')) >= 2, `${await pathCount('#architecture')} paths`);
const dimmed = await arch.locator('[style*="opacity: 0.38"]').count();
check('arch: unrelated layers dim', dimmed >= 3, `${dimmed} dimmed`);
await page.keyboard.press('Escape');
const closed = await drawer().waitFor({ state: 'hidden', timeout: 3000 }).then(() => true, () => false);
check('arch: Escape closes drawer', closed);

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
await open('services');
await page.locator('#services').getByRole('button', { name: /AI Control, Governance & Assurance/ }).click();
await page.waitForTimeout(500);
const svcText = await drawer().innerText();
check('services: drawer has scope, outputs, accelerators', ['Scope', 'Client outputs', 'Accelerators / IP', 'Capabilities consumed'].every((t) => svcText.toUpperCase().includes(t.toUpperCase())));
await drawer().getByRole('button', { name: 'Close details' }).click();
await page.waitForTimeout(300);

// --- OS layer expand
await open('operating-system');
await page.locator('#operating-system').getByRole('button', { name: /Decision & Intelligence/ }).click();
await page.waitForTimeout(400);
check('os: layer expands with services', (await page.locator('#operating-system').innerText()).toUpperCase().includes('SHAPED BY SERVICES'));

// --- Control domain expand
await open('ai-control');
const ctl = page.locator('#ai-control');
await ctl.getByRole('button', { name: /Intervention & Recovery/ }).click();
await page.waitForTimeout(400);
const ctlText = (await ctl.innerText()).toUpperCase();
check('control: domain shows 4 blocks', ['PURPOSE', 'EXAMPLE CONTROLS', 'EVIDENCE PRODUCED', 'HUMAN ACCOUNTABILITY'].every((t) => ctlText.includes(t)));
check('control: 4 runtime states', ['GO', 'CONDITIONAL GO', 'REMEDIATE', 'STOP'].every((t) => ctlText.includes(t)));

// --- Capabilities → services
await open('capabilities');
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
await open('accelerators');
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
await open('plays');
const plays = page.locator('#plays');
await plays.getByRole('tab', { name: /AI Control/ }).click();
await page.waitForTimeout(500);
check('plays: switch to Play 03', (await plays.innerText()).includes('AI Control / Radius Assessment'));

// --- Sectors reuse the same architecture
await open('sectors');
const sec = page.locator('#sectors');
const layersBefore = await sec.locator('text=Human + AI Workforce').count();
await sec.getByRole('tab', { name: 'Energy' }).click();
await page.waitForTimeout(500);
check('sectors: overlay switches', (await sec.innerText()).includes('Agentic maintenance'));
check('sectors: same layers retained', (await sec.locator('text=Human + AI Workforce').count()) === layersBefore && layersBefore === 1);
await sec.getByRole('tab', { name: 'Healthcare' }).click();
await page.waitForTimeout(400);

// --- Landscape
await open('landscape');
const land = page.locator('#landscape');
await land.getByRole('button', { name: /^Kyndryl/ }).click();
await page.waitForTimeout(300);
check('landscape: selection note', (await land.innerText()).includes('Kyndryl also operates more broadly'));

// --- Journey
await open('journey');
const jr = page.locator('#journey');
await jr.getByRole('button', { name: /Industrialise/ }).click();
await page.waitForTimeout(400);
check('journey: stage panel updates', (await jr.innerText()).includes('STAGE 06'));
await jr.getByRole('button', { name: /Next stage/ }).click();
await page.waitForTimeout(400);
check('journey: next stage', (await jr.innerText()).includes('STAGE 07'));

// --- Outcomes lens
await open('outcomes');
const out = page.locator('#outcomes');
await out.getByRole('button', { name: 'CIO & CTO' }).click();
check('outcomes: lens filter pressed', (await out.getByRole('button', { name: 'CIO & CTO' }).getAttribute('aria-pressed')) === 'true');

// --- Detail level
await page.getByRole('radio', { name: 'Detail' }).first().click();
await page.waitForTimeout(400);
await open('capabilities');
check('detail: coverage matrix appears', await page.locator('text=Practitioner view: capability consumption by service').isVisible());
await open('plays');
check('detail: qualifying questions appear', (await page.locator('#plays').innerText()).toUpperCase().includes('QUALIFYING QUESTIONS'));
await page.getByRole('radio', { name: 'Executive' }).first().click();

// --- Tooltip
await open('services');
await page.locator('#services').getByText('Entry offer', { exact: true }).first().hover();
await page.waitForTimeout(200);
check('tooltip: glossary definition', await page.locator('[role="tooltip"]').isVisible());

// --- Sidebar navigation: one page at a time
await page.locator('aside [data-nav="landscape"]').click();
await page.waitForTimeout(500);
check('sidebar: opens Landscape page', (await page.locator('main section').count()) === 1 && (await page.locator('section#landscape').count()) === 1);
check('sidebar: marks current page', (await page.locator('aside [data-nav="landscape"]').getAttribute('aria-current')) === 'page');
await page.getByRole('button', { name: /Next · 11/ }).click();
await page.waitForTimeout(500);
check('page nav: next goes to Journey', (await page.locator('section#journey').count()) === 1 && (await page.evaluate(() => location.hash)) === '#journey');
check('logo: official image rendered', await page.locator('aside img[alt="Insight"]').evaluate((i) => i.complete && i.naturalWidth === 1833));

// --- Keyboard reachability
await page.goto((process.env.BASE ?? 'http://127.0.0.1:5173/'), { waitUntil: 'networkidle' });
let focusedNodes = 0;
for (let i = 0; i < 40; i++) {
  await page.keyboard.press('Tab');
  const tag = await page.evaluate(() => document.activeElement?.tagName);
  if (tag && tag !== 'BODY') focusedNodes++;
}
check('keyboard: Tab moves through sidebar and page controls', focusedNodes >= 38, `${focusedNodes}/40 presses landed on a control`);

// --- Dead-button sweep on every page (explore mode)
const ids = ['overview', 'architecture', 'services', 'operating-system', 'ai-control', 'capabilities', 'accelerators', 'plays', 'sectors', 'landscape', 'journey', 'outcomes'];
let total = 0;
const deadAll = [];
for (const id of ids) {
  await page.goto((process.env.BASE ?? 'http://127.0.0.1:5173/') + '#' + id, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  const r = await page.evaluate(async () => {
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
    // Only the page content; sidebar/page navigation change the page and are covered above.
    const buttons = [...document.querySelectorAll('main button')].filter(
      (b) => b.offsetParent && !b.disabled && b.getAttribute('aria-pressed') !== 'true' && b.getAttribute('aria-selected') !== 'true' && b.getAttribute('aria-checked') !== 'true' && !/Present this/.test(b.textContent),
    );
    const dead = [];
    let n = 0;
    for (const b of buttons) {
      if (!b.isConnected || !document.querySelector('main')?.contains(b)) continue;
      n++;
      let mutations = 0;
      const mo = new MutationObserver((m) => (mutations += m.length));
      mo.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
      const h = location.hash;
      b.click();
      await sleep(120);
      mo.disconnect();
      if (!mutations && location.hash === h) dead.push((b.getAttribute('aria-label') || b.textContent).trim().slice(0, 40));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await sleep(60);
    }
    return { n, dead };
  });
  total += r.n;
  deadAll.push(...r.dead.map((d) => `${id}: ${d}`));
}
check('buttons: none dead', deadAll.length === 0, `${total} buttons clicked across 12 pages${deadAll.length ? '; dead: ' + deadAll.join(' | ') : ''}`);

check('no external network requests', external.length === 0, external.slice(0, 3).join(', '));
console.log(results.join('\n'));
console.log(errors.length ? errors.join('\n') : 'no console errors');
await browser.close();
process.exit(results.some((r) => r.startsWith('FAIL')) || errors.length ? 1 : 0);
