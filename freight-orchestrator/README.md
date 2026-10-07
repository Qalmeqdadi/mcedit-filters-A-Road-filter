# Freight Orchestrator

A multi-party freight procurement platform for forwarder desks, shippers, carriers and service partners. The code follows the process document *Freight Orchestrator: process architecture, levels 0 to 3*. Each process address (for example 4.3.2) points to a module, a test and, later, a screen.

All data is fictional. No real carriers or customers are used.

## Status: checkpoint 2 of 7, with parts of 3 and 4

| Checkpoint | Scope | State |
| --- | --- | --- |
| 1 | Domain model, state machines, permission matrix, audit log, tests | **done** |
| 2 | Process 1 and 3: intake, shipper document pack (1.5), rate normalisation, charge-code dictionary | **intake (1.1) and normalisation (3.2) done**; document pack next |
| 3 | Process 4: RFQ, harvesting, extraction with review queue, feasibility, options, ranking, quoting, acceptance | **reply extraction and review (4.3) done**; the rest next |
| 4 | Process 2: schedules and capacity, soft holds against live quotes | multimodal network data and persona views (2.1) done |
| 5 | Desk, shipper, carrier and partner workspaces | |
| 6 | 10 onboarding, 11 scorecards, 12 permission screens | |
| 7 | Stubs for 5 to 9 | |

`docs/PROCESS-MAP.md` lists every address with its status, code and tests. It is generated from `src/processes/registry.ts`, and a test fails if the file is out of date.

## The business flow this builds

1. **The shipper sends a request with its documents attached** (1.1, 1.5): purchase order, commercial invoice, packing list, certificates and, for dangerous goods, the DG declaration and safety data sheet. Fields are extracted from the documents, so nobody re-keys them.
2. **The platform sends the RFQ** to carriers using the desk's carrier list and rules (4.1). Carriers get a **redacted pack**, with no party names and no cargo value.
3. **Replies are read, checked and ranked** (4.2 to 4.6), then **published straight to the shipper's workspace** at an all-in price: carrier cost plus the desk's margin, applied by rule (4.7). The desk is no longer a relay.
4. **The desk steps in only by exception.** If the margin is below the floor, the value is over a threshold, or the cargo is dangerous goods, the quote goes to `pending_approval`, which the shipper cannot see.
5. **The shipper accepts** (4.8.1). The accepted option and the full document pack go to the desk, which books, files, arranges pickup and hands over to the carrier (5 to 7).

Decisions behind this (who contracts, who sees what, whose user the shipper is) are recorded in `src/processes/deviations.ts` as `DECISIONS`, together with every difference from the process document.

## How the rules in the brief are met

| Rule | Where | Proof |
| --- | --- | --- |
| Business rules live in configuration | `config/rulesets/*.json`, validated by `src/config/schema.ts`, versioned by `src/config/store.ts` | `tests/config/rulesets.test.ts` |
| Rule changes are permission-checked and audited | `src/config/publish.ts` | `tests/config/rulesets.test.ts` |
| Six explicit state machines, no ad hoc status strings | `src/state/machines/*`, `src/state/apply.ts`; status columns are Postgres enums built from the machines | `tests/state/*` (every state × event pair), `tests/static/no-adhoc-status.test.ts`, `tests/db/postgres.test.ts` |
| Permissions enforced in one place, server side | `src/governance/policy.ts` (row and field level), matrix in `config/rulesets/permissions.json` | `tests/p12/12.2-permissions.test.ts` |
| A carrier never sees another carrier's bid | grant `bid.read` with `carrier` scope | same |
| A shipper never sees carrier cost or desk margin | field classes `carrier_cost`, `desk_margin`, `desk_internal` | same, plus a test that fails if a new cost, price or value column has no visibility class |
| Every decision and override is audited | `src/governance/audit.ts`, written inside the same transaction as the state change; denials and refusals are audited too | `tests/p12/12.3-audit.test.ts` |
| The audit log cannot be edited | trigger in `src/db/migrations/0001_audit_append_only.sql` | `tests/db/postgres.test.ts` |

## What runs now

**Intake (1.1).** An email arrives by a mail provider's inbound webhook, by IMAP polling, or as an uploaded `.eml`. It is routed to a desk by its inbound address (`src/p1/mailbox.ts`). The sender's domain decides whether it is a shipper's request or a carrier's reply. A request is read into fields (`src/p1/intake.ts`); each field has its own confidence and the exact text it came from. Then the request is checked for completeness (1.1.4) and checked against earlier requests for duplicates and revisions (1.1.6). The request machine moves it to `validated`, or to `awaiting_info` with a drafted reply asking for what is missing (1.1.5).

**Replies (4.3) and normalisation (3.2).** Email, PDF text and chat replies, including voice-note transcripts, are read into the following fields:
- rate, currency, equipment, transit and routing,
- cut-off, validity, conditions and the itemised breakdown.

Fields below the confidence rule set go to a person with the source shown. Confirmations and corrections become training labels, and accuracy is tracked per carrier and format. Below 80%, the format is flagged for a template. The breakdown is mapped onto one charge-code dictionary (`src/p3/charges.ts`), converted to one currency and a per-shipment basis, split into freight, surcharges, local charges and inland, and summed into a comparable all-in.

**Claude extraction.** With `ANTHROPIC_API_KEY` set, Claude reads requests and replies first (`src/ai/claude.ts`). It uses structured output with a quote for every field, and those quotes are located in the source. A quote that cannot be found halves that field's confidence. The rule extractors cross-check every value: where Claude and the rules disagree, the field drops below review thresholds. The rules take over entirely when Claude is unavailable, declines, runs out of tokens or returns output that does not match the schema. The audit record says which extractor ran and why. Requests opt in to the API's server-side fallback for refusals (`fallbacks: "default"`), so a false-positive decline is retried on another model before the rules step in. Without a key, the rules run alone.

**Network (2.1).** Real coordinates for 67 ports, airports, rail terminals and truck hubs, and 46 lanes across ocean, air, rail and road. Free space is counted in each mode's own unit (TEU, kg, pallets, wagons). `networkFor(actor)` returns exactly what the permission matrix lets that person see.

### API server

```bash
npm run api                     # http://localhost:8787/api/health
INBOUND_SECRET=… npm run api    # enables the inbound-email webhook
IMAP_HOST=imap.example.com IMAP_USER=quotes@desk.example IMAP_PASSWORD=… npm run api   # polls a mailbox
```

| Route | Who | What |
| --- | --- | --- |
| `POST /api/inbound/email` | mail provider, with `x-inbound-secret` | raw MIME as text, JSON `{raw}`, or the provider's form field (`body-mime`, `email`) |
| `POST /api/inbox/upload` | desk | an `.eml` or pasted source; it lands on the uploader's desk |
| `POST /api/replies` | desk, or a carrier for itself | a reply that arrived by chat, PDF or phone |
| `GET /api/requests`, `/api/replies`, `/api/review`, `/api/accuracy`, `/api/audit` | any persona | filtered through the policy |
| `POST /api/review/:id` | desk | `{value, reason?}` confirms or corrects a field; corrections are audited as overrides |
| `GET /api/network` | any persona | the network map for that person |

Sign-in is a stand-in: the `x-actor` header names one of the pilot personas (`GET /api/actors`). Every read and write still goes through the policy, so real sessions only replace `actorOf()` in `src/api/app.ts`. The workspace keeps its state in memory for now; the Postgres stores take over with checkpoint 3.

The same workspace code runs in the browser in [`../freight-world`](../freight-world/README.md): its Inbox, Reply lab, Audit trail and global map call this code directly.

## Layout

```
config/rulesets/        every business rule, as data (11 rule sets)
src/
  processes/            the process document as data, deviations and decisions, traceability registry
  state/                machine.ts (engine), machines/ (9 machines), apply.ts (the only way to change a status)
  governance/           actor.ts, policy.ts (12.2), resources.ts, audit.ts (12.3)
  config/               rule set schemas, versioned store (memory.ts runs in the browser too), audited publish (13.4)
  db/                   Drizzle schema (the core objects), migrations, Postgres stores
  network/              hubs, modes and units, the pilot network, per-persona views (2.1, 11.1)
  extract/              shared field type with confidence and source span, date reading
  p1/                   email parsing, mailbox routing, IMAP polling, request intake (1.1)
  p3/                   charge-code dictionary and normalisation (3.2)
  p4/                   reply extraction, review queue, labels, accuracy (4.3)
  ai/                   Claude extractors with the rules as cross-check and fallback
  api/                  the workspace service, HTTP routes, node:http server
tests/                  grouped by process: p1/, p2/, p3/, p4/, p12/, api/, state/, config/, db/, processes/, static/
                        fixtures/: a shipper email and three carrier replies (email, PDF text, WhatsApp)
docs/PROCESS-MAP.md     generated
```

## State machines

The process document defines six machines. Three were added, and each is listed as a deviation.

| Machine | States |
| --- | --- |
| request | draft → (awaiting_info ↔ draft) → validated → out_to_carriers → options_ready → quoted → won / lost / expired; cancelled from any open state |
| quote | issued → (pending_approval →) sent → accepted / rejected / countered / expired; superseded by a new version |
| booking | requested → confirmed → amended → cancelled / rolled |
| shipment | planned → in_transit → at_destination → delivered → closed; cancelled before departure |
| charge | expected → incurred → invoiced → (disputed →) settled; written_off from disputed |
| exception | detected → owned → in_progress → resolved → reviewed |
| bid *(added)* | invited → chased → replied → superseded; or declined / no_reply |
| document *(added)* | requested → uploaded → extracted → validated; rejected → uploaded again |
| capacity_hold *(added)* | held → converted / released / expired |

Each transition names the process address that owns it. That address is written to the audit record.

## Running

You need Node 20 or later. The tests use in-process Postgres (PGlite), so no server is needed.

```bash
npm install
npm run playground  # builds playground/dist/freight-playground.html: open it in any browser
npm run demo        # walkthrough: one quote through the direct-to-shipper flow, per persona, with its audit trail
npm run api         # the API server (see above)
npm test
npm run typecheck
npm run process-map # regenerate docs/PROCESS-MAP.md
```

To use a real database (Postgres 16):

```bash
export DATABASE_URL=postgres://user@localhost:5432/freight
npm run db:migrate  # applies migrations and loads the default rule sets
```

## Personas and roles

| Persona | Roles | Sees |
| --- | --- | --- |
| Forwarder desk | `desk_admin`, `desk_agent` | everything on its own desk; only admins change rules or approve exceptions |
| Shipper | `shipper_user` | its own requests and documents; published options and sent quotes at the sell price; never cost, margin or bids |
| Carrier | `carrier_user` | its own RFQs (redacted), bids, rates, schedules, capacity and bookings; shipper identity and documents only after its booking is confirmed |
| Service partner | `partner_user` | its own jobs and the documents attached to them |
| Platform | `platform_admin` | parties, users and rule sets; no commercial data |
| Engine | `engine` | the automated steps it performs; it can publish and expire quotes, but cannot approve or accept them |
