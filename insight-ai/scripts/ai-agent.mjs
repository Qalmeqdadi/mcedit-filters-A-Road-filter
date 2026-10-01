// AI use-case agent, tested against a mocked Anthropic API (no key or network needed).
import { chromium } from 'playwright-core';
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
const results = [];
const check = (n, ok, info = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${n}${info ? `  (${info})` : ''}`);

const calls = [];
let mode = 'ok';
const msg = (content, stop_reason) => ({
  id: `msg_${calls.length}`, type: 'message', role: 'assistant', model: 'claude-opus-5-5', content, stop_reason, stop_sequence: null,
  usage: { input_tokens: 1200, output_tokens: 400 },
});
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST, OPTIONS' };
await page.route('https://api.anthropic.com/v1/messages**', async (route) => {
  const req = route.request();
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  const body = JSON.parse(req.postData());
  const headers = req.headers();
  calls.push({ body, headers });
  if (mode === 'unauthorized') {
    return route.fulfill({ status: 401, headers: cors, contentType: 'application/json', body: JSON.stringify({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }) });
  }
  const isResearch = body.tools.some((t) => t.type === 'web_search_20260209');
  let out;
  if (isResearch) {
    out = body.messages.length === 1
      ? msg([
          { type: 'server_tool_use', id: 'srvtoolu_1', name: 'web_search', input: { query: 'Gulf National Bank strategy 2026 digital AI' } },
          { type: 'web_search_tool_result', tool_use_id: 'srvtoolu_1', content: [{ type: 'web_search_result', url: 'https://example.com/gnb-annual-report', title: 'GNB Annual Report 2025', encrypted_content: 'x', page_age: null }] },
        ], 'pause_turn')
      : msg([{ type: 'text', text: '## Business\n- Regional bank focused on retail and corporate banking.\n## Strategy\n- Digital-first strategy announced in 2025.' }], 'end_turn');
  } else {
    const ids = [...JSON.stringify(body.messages[0].content).matchAll(/\\"id\\": ?\\"(\w+)\\"/g)].map((m) => m[1]);
    const first = body.messages.length === 1;
    if (first && calls.filter((c) => !c.body.tools.some((t) => t.type === 'web_search_20260209')).length === 1) {
      out = msg([{ type: 'text', text: 'I have reviewed the use cases.' }], 'end_turn'); // no tool call: app should nudge
    } else {
      const assessments = ids.map((id, i) => ({
        id, value: 5 - (i % 3), readiness: 2 + (i % 3), risk: i % 4 === 0 ? 'High' : 'Medium', confidence: 'Medium',
        value_rationale: `Supports the digital-first strategy (case ${i + 1}).`,
        readiness_rationale: 'Data exists in core systems; integration effort moderate.',
        risk_rationale: i % 4 === 0 ? 'Customer-facing decisions on personal data.' : 'Internal use with human review.',
        key_risks: ['Data quality', 'Model drift'],
      }));
      assessments.push({ ...assessments[0], id: 'not_a_real_id' }); // must be dropped by validation
      out = msg([{ type: 'tool_use', id: 'toolu_1', name: 'submit_assessments', input: { assessments } }], 'tool_use');
    }
  }
  return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify(out) });
});

await page.goto(BASE + '#prioritiser', { waitUntil: 'networkidle' });
await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
await page.reload({ waitUntil: 'networkidle' });
// Client + use cases
await page.locator('aside [data-testid="client-panel"]').click();
await page.getByLabel('Client name', { exact: true }).fill('Gulf National Bank');
await page.getByLabel('Sector', { exact: true }).selectOption('financial');
await page.getByRole('button', { name: 'Apply' }).click();
await page.locator('[data-testid="usecase-file"]').setInputFiles(new URL('./fixtures/client_usecases.xlsx', import.meta.url).pathname);
await page.getByRole('dialog').getByRole('button', { name: 'Import', exact: true }).click();
await page.getByRole('dialog').waitFor({ state: 'detached' });
for (const n of ['Branch staffing forecast', 'Mortgage document check']) {
  await page.getByLabel('New use case').fill(n);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
}
const total = await page.locator('#prioritiser tbody tr').count();

// Open agent
await page.getByRole('button', { name: /Assess with AI agent/ }).click();
const dlg = page.getByRole('dialog');
const runBtn = dlg.getByRole('button', { name: /Run assessment/ });
check('agent: run disabled until key + data consent', await runBtn.isDisabled());
await dlg.getByLabel('Anthropic API key').fill('sk-ant-test-0000000000000000000000');
check('agent: still disabled without consent', await runBtn.isDisabled());
await dlg.getByLabel('I confirm data may be sent').check();
await dlg.locator('textarea').fill('Priority: retail customer experience.');
await runBtn.click();
try {
  await dlg.getByText(/Review \d+ proposed assessments/).waitFor({ timeout: 15000 });
} catch (e) {
  console.log('DIALOG:', (await dlg.innerText()).slice(0, 600));
  console.log('CALLS:', calls.length, calls.map((c) => c.body.tools.map((t) => t.name).join(',')).join(' | '));
  throw e;
}
const reviewText = await dlg.innerText();
await page.screenshot({ path: 'qa-screens/ai-review.png' });

const research = calls.filter((c) => c.body.tools.some((t) => t.type === 'web_search_20260209'));
const assess = calls.filter((c) => !c.body.tools.some((t) => t.type === 'web_search_20260209'));
const h = calls[0].headers;
check('request: Opus 5.5 model', calls.every((c) => c.body.model === 'claude-opus-5-5'));
check('request: API key header', h['x-api-key'] === 'sk-ant-test-0000000000000000000000');
check('request: direct browser access header', h['anthropic-dangerous-direct-browser-access'] === 'true');
check('request: refusal fallbacks enabled', calls.every((c) => c.body.fallbacks === 'default' && (c.headers['anthropic-beta'] ?? '').includes('server-side-fallback-2026-07-01')));
check('request: high effort', calls.every((c) => c.body.output_config?.effort === 'high'));
check('research: web search tool + pause_turn resumed', research.length === 2 && research[1].body.messages.length === 2 && research[1].body.messages[1].role === 'assistant');
check('research: consultant context passed as data', JSON.stringify(research[0].body.messages[0].content).includes('<consultant_context>'));
check('assess: strict submit tool, auto tool choice', assess.every((c) => c.body.tools[0].strict === true && c.body.tool_choice.type === 'auto'));
check('assess: system prompt cached', assess.every((c) => c.body.system[0].cache_control?.type === 'ephemeral'));
check('assess: batches of 10', assess.length === 3, `${assess.length} assessment calls for ${total} use cases (1 nudge)`);
check('assess: nudges when no tool call', assess[1].body.messages.length === 3 && assess[1].body.messages[2].role === 'user');
check('assess: client profile + extra columns sent', JSON.stringify(assess[0].body.messages[0].content).includes('<client_profile>') && JSON.stringify(assess[0].body.messages[0].content).includes('Notes'));
check('review: proposals for every use case, invalid id dropped', reviewText.includes(`Review ${total} proposed assessments`));
check('review: rationale + confidence shown', reviewText.includes('Supports the digital-first strategy') && reviewText.includes('Medium'));
check('review: research profile + source', reviewText.includes('Client research used: Gulf National Bank · 1 sources'));
const beforeVal = await page.getByLabel('KYC document review value').inputValue();
check('review: nothing applied before approval', beforeVal === '4');
// Untick one and apply the rest
await dlg.getByLabel('Accept HR policy assistant').uncheck();
await dlg.getByRole('button', { name: new RegExp(`Apply ${total - 1} selected`) }).click();
await dlg.waitFor({ state: 'detached' });
check('apply: accepted rows updated', (await page.locator('[data-testid="ai-badge"]').count()) === total - 1);
check('apply: unticked row unchanged', (await page.locator('#prioritiser tbody tr', { hasText: 'HR policy assistant' }).locator('[data-testid="ai-badge"]').count()) === 0);
check('apply: needs-scoring flag cleared', !(await page.locator('#prioritiser tbody tr', { hasText: 'Regulatory change tracking' }).innerText()).includes('needs scoring'));
await page.locator('[data-testid="ai-badge"]').first().hover();
check('table: rationale tooltip', (await page.locator('[role="tooltip"]').innerText()).includes('accepted by consultant'));
await page.screenshot({ path: 'qa-screens/ai-applied.png', fullPage: true });

// Reuse research; scope = only not yet assessed
calls.length = 0;
await page.getByRole('button', { name: /Assess with AI agent/ }).click();
check('rerun: key remembered for this tab', (await dlg.getByLabel('Anthropic API key').inputValue()).startsWith('sk-ant-test'));
check('rerun: offers to reuse research', (await dlg.innerText()).includes('Reuse the client research'));
await dlg.getByLabel('Scope').selectOption('unscored');
await dlg.getByLabel('I confirm data may be sent').check();
await dlg.getByRole('button', { name: /Run assessment/ }).click();
await dlg.getByText(/Review \d+ proposed assessments/).waitFor({ timeout: 15000 });
check('rerun: no new research, only unassessed scope', !calls.some((c) => c.body.tools.some((t) => t.type === 'web_search_20260209')) && (await dlg.innerText()).includes('Review 1 proposed assessments'));
await dlg.getByRole('button', { name: 'Discard' }).click();

// Error path
mode = 'unauthorized';
await page.getByRole('button', { name: /Assess with AI agent/ }).click();
await dlg.getByLabel('I confirm data may be sent').check();
await dlg.getByRole('button', { name: /Run assessment/ }).click();
await dlg.getByText('The API key was rejected').waitFor({ timeout: 15000 });
check('error: bad key explained, nothing changed', (await dlg.innerText()).includes('Nothing was changed.'));
await dlg.getByRole('button', { name: 'Back' }).click();
await page.screenshot({ path: 'qa-screens/ai-setup.png' });

console.log(results.join('\n'));
console.log(errors.length ? errors.join('\n') : 'no page errors');
await browser.close();
process.exit(results.some((r) => r.startsWith('FAIL')) || errors.length ? 1 : 0);
