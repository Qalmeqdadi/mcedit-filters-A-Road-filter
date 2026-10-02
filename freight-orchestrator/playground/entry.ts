// Checkpoint 1 playground. Runs the real state machines, permission policy, permission
// matrix and audit log in the browser (bundled by playground/build.mjs). Nothing here
// re-implements a rule: every allow, deny and refusal comes from src/.
import permissionsJson from "../config/rulesets/permissions.json";
import { RULESET_SCHEMAS, type Permissions } from "../src/config/schema";
import type { Ruleset } from "../src/config/store";
import { rule, user, type Actor } from "../src/governance/actor";
import type { AuditRecord } from "../src/governance/audit";
import { Policy } from "../src/governance/policy";
import { describe, type ResourceExtras } from "../src/governance/resources";
import { applyTransition } from "../src/state/apply";
import { eventsFrom } from "../src/state/machine";
import { MACHINES, type MachineName } from "../src/state/machines";
import { InMemoryUnitOfWork } from "../src/state/memory";

// ── Scenario (fictional) ────────────────────────────────────────────────────

const DESK = "desk-gulfline";
const SHIPPER = "shp-sandcastle";
const OTHER_SHIPPER = "shp-palmgrove";
const CAR_A = "car-azure";
const CAR_B = "car-boreal";

interface Persona {
  key: string;
  label: string;
  org: string;
  actor: Actor;
}

const PERSONAS: Persona[] = [
  { key: "desk_admin", label: "Desk admin", org: "Gulfline Forwarding", actor: user("dana.k", "desk_admin", DESK) },
  { key: "desk_agent", label: "Desk agent", org: "Gulfline Forwarding", actor: user("omar.h", "desk_agent", DESK) },
  { key: "shipper", label: "Shipper", org: "Sandcastle Trading", actor: user("sami.r", "shipper_user", SHIPPER) },
  { key: "other_shipper", label: "Another shipper", org: "Palmgrove Foods", actor: user("lina.m", "shipper_user", OTHER_SHIPPER) },
  { key: "carrier_a", label: "Carrier A", org: "Azure Line", actor: user("ops.azure", "carrier_user", CAR_A) },
  { key: "carrier_b", label: "Carrier B", org: "Boreal Shipping", actor: user("ops.boreal", "carrier_user", CAR_B) },
  { key: "engine", label: "Platform engine", org: "Rules and models", actor: rule("platform-engine", "1") },
];

const ORG_NAMES: Record<string, string> = {
  [DESK]: "Gulfline Forwarding",
  [SHIPPER]: "Sandcastle Trading",
  [OTHER_SHIPPER]: "Palmgrove Foods",
  [CAR_A]: "Azure Line",
  [CAR_B]: "Boreal Shipping",
};

type Card = { machine: MachineName | null; type: string; id: string; title: string; step: string; processes: string };

const RFQ = {
  id: "RFQ-0417",
  deskOrgId: DESK,
  lane: "CNSHA Shanghai → AEJEA Jebel Ali",
  equipment: "1 × 40HC",
  commodity: "Ceramic floor tiles, HS 6907.21",
  grossWeightKg: 24800,
  readyDate: "2026-10-20",
  gateInCutoff: "2026-10-24 18:00 local",
  replyBy: "2026-10-09 12:00 UTC",
  shipperName: "Sandcastle Trading LLC",
  cargoValue: 84000,
};

function seed(uow: InMemoryUnitOfWork) {
  uow.store.create("request", {
    id: "R-1001",
    deskOrgId: DESK,
    shipperOrgId: SHIPPER,
    shipperName: "Sandcastle Trading LLC",
    lane: RFQ.lane,
    mode: "Ocean FCL",
    equipment: RFQ.equipment,
    commodity: RFQ.commodity,
    grossWeightKg: RFQ.grossWeightKg,
    incoterm: "FOB Shanghai",
    readyDate: RFQ.readyDate,
    deliveryDeadline: "2026-11-25 (hard)",
    cargoValue: 84000,
    targetPrice: 2300,
  });
  uow.store.create("document", { id: "D-01", deskOrgId: DESK, shipperOrgId: SHIPPER, type: "Commercial invoice", filename: "CI-ST-2291.pdf", storageKey: "docs/R-1001/CI-ST-2291.pdf" });
  uow.store.create("document", { id: "D-02", deskOrgId: DESK, shipperOrgId: SHIPPER, type: "Packing list", filename: "PL-ST-2291.xlsx", storageKey: "docs/R-1001/PL-ST-2291.xlsx" });
  uow.store.create("bid", { id: "BID-A", rfqId: RFQ.id, deskOrgId: DESK, carrierOrgId: CAR_A, carrier: "Azure Line", channel: "email", price: 2150, currency: "USD", transitDays: 22, sailing: "AZL Pearl 044W, ETD 2026-10-26" });
  uow.store.create("bid", { id: "BID-B", rfqId: RFQ.id, deskOrgId: DESK, carrierOrgId: CAR_B, carrier: "Boreal Shipping", channel: "pdf", price: 2090, currency: "USD", transitDays: 27, sailing: "BRS Fjord 112W, ETD 2026-10-28" });
  uow.store.create("quote", {
    id: "Q-1001",
    deskOrgId: DESK,
    shipperOrgId: SHIPPER,
    carrierOrgId: CAR_A,
    carrier: "Azure Line",
    option: "Direct, 22 days, ETD 2026-10-26",
    carrierCost: 2150,
    margin: 130,
    marginPct: 6.0,
    sellPrice: 2280,
    currency: "USD",
    validUntil: "2026-10-12",
    approvalNotes: "Margin 6.0% sits on the floor after rounding to USD 5",
  });
}

const BASE_CARDS: Card[] = [
  { machine: "request", type: "request", id: "R-1001", title: "Shipment request", step: "1", processes: "1.1 · 4.1 · 4.8" },
  { machine: "document", type: "document", id: "D-01", title: "Shipper document: commercial invoice", step: "2", processes: "1.5" },
  { machine: "document", type: "document", id: "D-02", title: "Shipper document: packing list", step: "2", processes: "1.5" },
  { machine: null, type: "rfq", id: RFQ.id, title: "Request for quotes sent to carriers", step: "3", processes: "4.1.2" },
  { machine: "bid", type: "bid", id: "BID-A", title: "Bid from Azure Line", step: "4", processes: "4.2" },
  { machine: "bid", type: "bid", id: "BID-B", title: "Bid from Boreal Shipping", step: "4", processes: "4.2" },
  { machine: "quote", type: "quote", id: "Q-1001", title: "Quote to the shipper", step: "5", processes: "4.7 · 4.8" },
];
const BOOKING_CARD: Card = { machine: "booking", type: "booking", id: "B-1001", title: "Booking with the carrier", step: "6", processes: "5.1 (stub)" };

// ── State ───────────────────────────────────────────────────────────────────

const defaultPermissions = RULESET_SCHEMAS.permissions.parse(permissionsJson);

const state = {
  uow: new InMemoryUnitOfWork(),
  policy: makePolicy(defaultPermissions, 1),
  permissionsVersion: 1,
  persona: PERSONAS[0]!,
  cards: [...BASE_CARDS],
  facts: { complete: true, carriers: 2, feasible: 2, approval: "yes" as "yes" | "no" | "unset", expired: false },
  last: null as null | { cardId: string; ok: boolean; text: string },
  rulesError: "",
  playing: false,
};
seed(state.uow);

function makePolicy(body: Permissions, version: number): Policy {
  const rs: Ruleset<"permissions"> = { kind: "permissions", version, id: `permissions@${version}`, deskOrgId: null, body, publishedAt: new Date(), publishedBy: "playground" };
  return new Policy(rs);
}

function reset() {
  state.uow = new InMemoryUnitOfWork();
  seed(state.uow);
  state.cards = [...BASE_CARDS];
  state.last = null;
  render();
}

// ── Facts the guards and the policy see ─────────────────────────────────────

async function bookingStatus(): Promise<string | undefined> {
  return (await state.uow.store.load("booking", "B-1001"))?.status;
}

async function extrasFor(card: Card, viewer: Actor): Promise<ResourceExtras> {
  const b = await bookingStatus();
  const confirmed = b === "confirmed" || b === "amended";
  if (card.type === "document") return { carrierOrgId: CAR_A, bookingConfirmed: confirmed };
  if (card.type === "rfq") {
    const invited = viewer.orgId === CAR_A || viewer.orgId === CAR_B;
    return { carrierOrgId: invited ? viewer.orgId : null, bookingConfirmed: confirmed && viewer.orgId === CAR_A };
  }
  return {};
}

function ctxFor(machine: MachineName): Record<string, unknown> {
  const f = state.facts;
  const day = 864e5;
  switch (machine) {
    case "request":
      return {
        completeness: f.complete ? { ok: true, missing: [] } : { ok: false, missing: ["readyDate", "grossWeightKg"] },
        carriersInvited: f.carriers,
        feasibleOptions: f.feasible,
      };
    case "quote":
      return {
        ...(f.approval === "unset" ? {} : { approvalRequired: f.approval === "yes" }),
        now: new Date(),
        validUntil: new Date(Date.now() + (f.expired ? -day : 7 * day)),
      };
    case "document":
      return { reason: "Scan is illegible; please re-upload" };
    default:
      return {};
  }
}

// ── Actions ─────────────────────────────────────────────────────────────────

async function fire(card: Card, event: string, actor = state.persona.actor) {
  if (!card.machine) return;
  try {
    const r = await applyTransition(
      { uow: state.uow, policy: state.policy },
      { actor, machine: card.machine, id: card.id, event: event as never, ctx: ctxFor(card.machine) as never, extras: await extrasFor(card, actor) },
    );
    state.last = { cardId: card.id, ok: true, text: `${human(event)}: ${human(r.from)} → ${human(r.to)} (process ${r.process})` };
    if (card.machine === "quote" && r.to === "accepted" && !state.cards.includes(BOOKING_CARD)) {
      state.uow.store.create("booking", { id: "B-1001", deskOrgId: DESK, shipperOrgId: SHIPPER, carrierOrgId: CAR_A, carrier: "Azure Line", quoteId: "Q-1001" });
      await state.uow.audit.append({
        actor: rule("4.8.1/hand-off", "1"),
        action: "booking.create",
        process: "4.8.1",
        entityType: "booking",
        entityId: "B-1001",
        outcome: "applied",
        input: { quote: "Q-1001" },
        output: { to: "requested", note: "Accepted option and document pack handed to the desk" },
        ruleVersions: [state.policy.version],
        deskOrgId: DESK,
      });
      state.cards.push(BOOKING_CARD);
    }
  } catch (e) {
    state.last = { cardId: card.id, ok: false, text: reasonOf(e) };
  }
  render();
}

function reasonOf(e: unknown): string {
  const msg = (e as Error).message ?? String(e);
  return plain(msg.includes(": ") ? msg.slice(msg.lastIndexOf(": ") + 2) : msg);
}

/** The policy's reasons, in words a reviewer recognises. The raw reason stays in the audit record. */
function plain(reason: string): string {
  const scope = reason.match(/^outside (\w+) scope$/);
  if (scope) return `the record belongs to another ${scope[1] === "desk" ? "desk" : scope[1]}`;
  const cond = reason.match(/^condition (\w+) not met$/);
  if (cond) return cond[1] === "status" ? "not allowed while the record is in this state" : `the ${human(cond[1]!)} condition is not met yet`;
  const grant = reason.match(/^no grant for (.+)$/);
  if (grant) return `this role has no permission to ${human(grant[1]!.split(".")[1] ?? grant[1]!)} a ${grant[1]!.split(".")[0]}`;
  if (reason.endsWith(" is not allowed from " + reason.split(" ").at(-1))) return `${human(reason)}`;
  return human(reason);
}

const HAPPY_PATH: [string, string, string][] = [
  ["shipper", "D-01", "upload"],
  ["shipper", "D-02", "upload"],
  ["engine", "D-01", "extract"],
  ["engine", "D-02", "extract"],
  ["engine", "D-01", "validate"],
  ["engine", "D-02", "validate"],
  ["engine", "R-1001", "validate"],
  ["engine", "R-1001", "dispatch"],
  ["carrier_a", "BID-A", "reply"],
  ["carrier_b", "BID-B", "reply"],
  ["engine", "R-1001", "options_built"],
  ["engine", "Q-1001", "submit_for_approval"],
  ["desk_admin", "Q-1001", "approve"],
  ["engine", "R-1001", "quote_published"],
  ["shipper", "Q-1001", "accept"],
  ["engine", "R-1001", "win"],
  ["carrier_a", "B-1001", "confirm"],
];

async function playHappyPath() {
  if (state.playing) return;
  reset();
  state.facts = { complete: true, carriers: 2, feasible: 2, approval: "yes", expired: false };
  state.playing = true;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  for (const [pk, id, event] of HAPPY_PATH) {
    state.persona = PERSONAS.find((p) => p.key === pk)!;
    const card = state.cards.find((c) => c.id === id) ?? (id === "B-1001" ? BOOKING_CARD : undefined);
    if (card) await fire(card, event);
    if (!reduce) await new Promise((r) => setTimeout(r, 450));
  }
  state.playing = false;
  render();
}

function applyRules(text: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    state.rulesError = `This is not valid JSON: ${(e as Error).message}`;
    return render();
  }
  const r = RULESET_SCHEMAS.permissions.safeParse(parsed);
  if (!r.success) {
    state.rulesError = r.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("\n");
    return render();
  }
  publishPermissions(r.data, "Edited in the playground");
}

function publishPermissions(body: Permissions, note: string) {
  const from = state.policy.version;
  state.permissionsVersion += 1;
  state.policy = makePolicy(body, state.permissionsVersion);
  state.rulesError = "";
  void state.uow.audit
    .append({
      actor: { kind: "user", id: "you", role: "platform_admin", orgId: "platform" },
      action: "config.publish",
      process: "13.4",
      entityType: "config",
      entityId: "permissions",
      outcome: "applied",
      input: { from, note },
      output: { id: state.policy.version },
      ruleVersions: [from],
    })
    .then(render);
}

// ── Rendering ───────────────────────────────────────────────────────────────

const esc = (s: unknown) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const human = (s: string) => s.replace(/_/g, " ");
const HIDE_KEYS = new Set(["id", "deskOrgId", "shipperOrgId", "carrierOrgId", "rowVersion", "status"]);

function fmt(k: string, v: unknown): string {
  if (typeof v === "number") {
    if (/price|cost|margin$|value|amount/i.test(k) && !/pct/i.test(k)) return `USD ${v.toLocaleString("en-US")}`;
    if (/pct/i.test(k)) return `${v.toFixed(1)}%`;
    if (/kg/i.test(k)) return `${v.toLocaleString("en-US")} kg`;
    return v.toLocaleString("en-US");
  }
  return String(v);
}

function label(k: string): string {
  const s = k.replace(/Kg$/, "").replace(/Pct$/, " %").replace(/([A-Z])/g, " $1").replace(/\s+/g, " ").toLowerCase().trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

async function cardHtml(card: Card): Promise<string> {
  const viewer = state.persona.actor;
  const row: Record<string, unknown> & { id: string } = card.machine ? ((await state.uow.store.load(card.machine, card.id)) as never) : RFQ;
  const extras = await extrasFor(card, viewer);
  const resource = describe(card.type, row, extras);
  const read = state.policy.can(viewer, "read", resource);
  const status = card.machine ? String(row.status) : null;

  let body: string;
  if (!read.allowed) {
    body = `<p class="noaccess"><span class="lock" aria-hidden="true"></span><span><strong>${esc(state.persona.label)} cannot see this record:</strong> ${esc(plain(read.reason))}.</span></p>`;
  } else {
    const fields = Object.entries(row).filter(([k]) => !HIDE_KEYS.has(k));
    const rows = fields
      .map(([k, v]) => {
        const cls = state.policy.classOf(card.type, k);
        const ok = state.policy.canSeeClass(viewer, cls, resource);
        return ok
          ? `<div class="f"><dt>${esc(label(k))}</dt><dd>${esc(fmt(k, v))}</dd></div>`
          : `<div class="f hidden-f"><dt>${esc(label(k))}</dt><dd><span class="redacted">hidden</span> <span class="cls">${esc(human(cls))}</span></dd></div>`;
      })
      .join("");
    body = `<dl class="fields">${rows}</dl>`;
  }

  let actions = "";
  if (card.machine && status) {
    const legal = new Set<string>(eventsFrom(MACHINES[card.machine] as never, status as never));
    const evs = Object.entries(MACHINES[card.machine].events) as [string, { process: string }][];
    actions = `<div class="actions" role="group" aria-label="Actions on ${esc(card.id)}">${evs
      .map(
        ([e, t]) =>
          `<button type="button" class="act ${legal.has(e) ? "legal" : "illegal"}" data-card="${esc(card.id)}" data-event="${esc(e)}" ${state.playing ? "disabled" : ""} title="${legal.has(e) ? "Allowed from this state" : "Not allowed from this state: try it to see the refusal"}">${esc(human(e))}<span class="pa">${esc(t.process)}</span></button>`,
      )
      .join("")}</div>`;
  }

  const states = card.machine
    ? `<ol class="states" aria-label="States">${MACHINES[card.machine].states
        .map((s) => `<li class="${s === status ? "cur" : ""} ${MACHINES[card.machine!].terminal.includes(s as never) ? "term" : ""}">${esc(human(s))}</li>`)
        .join("")}</ol>`
    : `<p class="note">No state machine: the RFQ is a message. It records what was revealed to carriers.</p>`;

  const result =
    state.last && state.last.cardId === card.id
      ? `<p class="result ${state.last.ok ? "ok" : "bad"}" role="status">${state.last.ok ? "Done" : "Refused"}: ${esc(state.last.text)}</p>`
      : "";

  return `<article class="card" id="card-${esc(card.id)}">
    <header class="card-h">
      <span class="step" aria-hidden="true">${esc(card.step)}</span>
      <div class="ch-main"><h3>${esc(card.title)}</h3><p class="ref"><span>${esc(card.id)}</span><span>process ${esc(card.processes)}</span></p></div>
      ${status ? `<span class="pill s-${esc(status)}">${esc(human(status))}</span>` : ""}
    </header>
    ${states}
    <div class="view"><p class="view-h">What ${esc(state.persona.label.toLowerCase())} sees</p>${body}</div>
    ${actions}
    ${result}
  </article>`;
}

function auditHtml(records: AuditRecord[]): string {
  if (!records.length) return `<p class="empty">No actions yet. Press any button on a card, or play the happy path.</p>`;
  return `<ol class="audit">${[...records]
    .reverse()
    .map((r) => {
      const out = (r.output ?? {}) as { to?: string; reason?: string; id?: string; note?: string };
      const detail = r.outcome === "applied" ? (out.to ? `→ ${human(out.to)}` : out.id ? `now ${out.id}` : "") : (out.reason ?? "");
      const who = PERSONAS.find((p) => p.actor.id === r.actor.id);
      return `<li class="a-${r.outcome}">
        <div class="a-top"><span class="o">${esc(r.outcome)}</span><code>${esc(r.action)}</code>${r.process ? `<span class="ap">${esc(r.process)}</span>` : ""}<time>${esc(r.at.toISOString().slice(11, 19))}</time></div>
        <div class="a-who">${esc(who ? `${who.label} · ${who.org}` : `${r.actor.kind}: ${r.actor.id}`)} <span class="ak">${esc(r.actor.kind)}</span></div>
        ${detail ? `<div class="a-d">${esc(detail)}</div>` : ""}
        <div class="a-r">${esc(r.entityType)} ${esc(r.entityId)} · rules ${esc((r.ruleVersions ?? []).join(", "))}</div>
      </li>`;
    })
    .join("")}</ol>`;
}

let renderSeq = 0;
async function render() {
  const seq = ++renderSeq;
  const cards = await Promise.all(state.cards.map(cardHtml));
  const audit = await state.uow.audit.list();
  if (seq !== renderSeq) return;
  const app = document.getElementById("app")!;
  const rulesOpen = (document.getElementById("rules") as HTMLDetailsElement | null)?.open ?? false;
  const draft = (document.getElementById("rules-text") as HTMLTextAreaElement | null)?.value;
  const scroll = document.getElementById("audit-scroll")?.scrollTop ?? 0;
  const focusKey = focusSelector(document.activeElement);
  const f = state.facts;

  app.innerHTML = `
  <header class="top">
    <div class="brand">
      <p class="eyebrow">Freight Orchestrator · checkpoint 1</p>
      <h1>Playground</h1>
      <p class="lede">One fictional ocean shipment, <span class="mono">CNSHA → AEJEA</span>, 1 × 40HC, run through the real state machines, permission matrix and audit log. Pick who you are, press buttons, and see what each party is allowed to see and do.</p>
    </div>
    <div class="top-actions">
      <button type="button" class="primary" id="play" ${state.playing ? "disabled" : ""}>${state.playing ? "Playing…" : "Play the happy path"}</button>
      <button type="button" id="reset" ${state.playing ? "disabled" : ""}>Reset shipment</button>
    </div>
  </header>

  <nav class="personas" aria-label="Act as">
    <span class="as">Act as</span>
    <div class="seg" role="radiogroup">
      ${PERSONAS.map(
        (p) =>
          `<button type="button" role="radio" aria-checked="${p.key === state.persona.key}" class="pz ${p.key === state.persona.key ? "on" : ""}" data-persona="${p.key}" ${state.playing ? "disabled" : ""}><span class="pl">${esc(p.label)}</span><span class="po">${esc(p.org)}</span></button>`,
      ).join("")}
    </div>
  </nav>

  <div class="grid">
    <main class="flow" aria-label="Shipment records">${cards.join("")}</main>

    <aside class="side">
      <section class="panel">
        <h2>Facts the rules see</h2>
        <p class="hint">In the full product these come from earlier steps. Change them to test the guards.</p>
        <div class="facts">
          <label class="chk"><input type="checkbox" id="f-complete" ${f.complete ? "checked" : ""}> Request passed the completeness check <span class="pa">1.1.4</span></label>
          <label class="num" for="f-carriers">Carriers invited <span class="pa">4.1.1</span><input type="number" id="f-carriers" min="0" max="6" value="${f.carriers}"></label>
          <label class="num" for="f-feasible">Feasible options <span class="pa">4.4</span><input type="number" id="f-feasible" min="0" max="6" value="${f.feasible}"></label>
          <label class="num" for="f-approval">Margin rules say the quote needs approval <span class="pa">4.7.1</span>
            <select id="f-approval">
              <option value="yes" ${f.approval === "yes" ? "selected" : ""}>Yes, below the floor</option>
              <option value="no" ${f.approval === "no" ? "selected" : ""}>No</option>
              <option value="unset" ${f.approval === "unset" ? "selected" : ""}>Not evaluated</option>
            </select></label>
          <label class="chk"><input type="checkbox" id="f-expired" ${f.expired ? "checked" : ""}> Quote validity has passed <span class="pa">4.8.3</span></label>
        </div>
      </section>

      <section class="panel try">
        <h2>Things to try</h2>
        <ul>
          <li>Act as <b>Carrier B</b>: you see your own bid but not Azure Line's, and the RFQ hides the shipper's name and the cargo value.</li>
          <li>Act as <b>Shipper</b>: the quote is invisible until the desk approves it. After approval you see the sell price but never the carrier cost or margin.</li>
          <li>Act as <b>Platform engine</b> and press <i>publish</i> on the quote while approval is required. It is refused.</li>
          <li>Play the happy path, then act as <b>Carrier A</b>: once the booking is confirmed, the shipper's documents and name become visible to Azure Line only.</li>
          <li>Open <b>Permission rules</b> below, give <code>shipper_user</code> the <code>desk_margin</code> class, apply, and view the quote as Shipper.</li>
        </ul>
      </section>

      <section class="panel audit-panel">
        <div class="ph"><h2>Audit trail</h2><span class="count">${audit.length} record${audit.length === 1 ? "" : "s"}</span></div>
        <p class="hint">Every attempt is recorded, including denied and refused ones, with the rule set version used.</p>
        <div class="audit-scroll" id="audit-scroll" tabindex="0" aria-label="Audit trail, newest first">${auditHtml(audit)}</div>
      </section>

      <details class="panel rules" id="rules" ${rulesOpen ? "open" : ""}>
        <summary><h2>Permission rules</h2><span class="count">${esc(state.policy.version)}</span></summary>
        <p class="hint">This is <code>config/rulesets/permissions.json</code>. Edit it and apply: the change takes effect at once as a new version, and is audited.</p>
        <label for="rules-text" class="sr">Permission matrix JSON</label>
        <textarea id="rules-text" spellcheck="false">${esc(draft ?? JSON.stringify(state.policy.body, null, 2))}</textarea>
        ${state.rulesError ? `<pre class="err" role="alert">${esc(state.rulesError)}</pre>` : ""}
        <div class="rules-actions">
          <button type="button" class="primary" id="rules-apply">Apply rules</button>
          <button type="button" id="rules-reset">Restore defaults</button>
        </div>
      </details>
    </aside>
  </div>

  <footer class="foot">Fictional data. The rules and checks on this page are the project code in <code>freight-orchestrator/src</code>, bundled for the browser.</footer>`;

  const sc = document.getElementById("audit-scroll");
  if (sc) sc.scrollTop = scroll;
  if (focusKey) (app.querySelector(focusKey) as HTMLElement | null)?.focus({ preventScroll: true });
}

/** Re-rendering replaces the DOM; remember which control had focus so keyboard users keep their place. */
function focusSelector(el: Element | null): string | null {
  if (!(el instanceof HTMLElement) || el === document.body) return null;
  if (el.id) return `#${CSS.escape(el.id)}`;
  if (el.dataset.persona) return `[data-persona="${CSS.escape(el.dataset.persona)}"]`;
  if (el.dataset.event) return `[data-card="${CSS.escape(el.dataset.card ?? "")}"][data-event="${CSS.escape(el.dataset.event)}"]`;
  return null;
}

// ── Events (delegated, so re-renders keep working) ──────────────────────────

document.addEventListener("click", (ev) => {
  const t = (ev.target as HTMLElement).closest("button");
  if (!t || t.disabled) return;
  if (t.dataset.persona) {
    state.persona = PERSONAS.find((p) => p.key === t.dataset.persona)!;
    state.last = null;
    void render();
  } else if (t.dataset.event) {
    const card = state.cards.find((c) => c.id === t.dataset.card)!;
    void fire(card, t.dataset.event);
  } else if (t.id === "play") void playHappyPath();
  else if (t.id === "reset") reset();
  else if (t.id === "rules-apply") applyRules((document.getElementById("rules-text") as HTMLTextAreaElement).value);
  else if (t.id === "rules-reset") {
    (document.getElementById("rules-text") as HTMLTextAreaElement).value = JSON.stringify(defaultPermissions, null, 2);
    publishPermissions(defaultPermissions, "Restored defaults");
  }
});

document.addEventListener("change", (ev) => {
  const el = ev.target as HTMLInputElement;
  const f = state.facts;
  if (el.id === "f-complete") f.complete = el.checked;
  else if (el.id === "f-expired") f.expired = el.checked;
  else if (el.id === "f-carriers") f.carriers = Math.max(0, Number(el.value) || 0);
  else if (el.id === "f-feasible") f.feasible = Math.max(0, Number(el.value) || 0);
  else if (el.id === "f-approval") f.approval = el.value as typeof f.approval;
  else return;
  void render();
});

void render();
