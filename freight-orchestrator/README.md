# Freight Orchestrator

A multi-party freight procurement platform for forwarder desks, shippers, carriers and service partners. The code follows the process document *Freight Orchestrator: process architecture, levels 0 to 3*. Each process address (for example 4.3.2) points to a module, a test and, later, a screen.

All data is fictional. No real carriers or customers are used.

## Status: checkpoint 1 of 7

| Checkpoint | Scope | State |
| --- | --- | --- |
| 1 | Domain model, state machines, permission matrix, audit log, tests | **done, awaiting review** |
| 2 | Process 1 and 3: intake, shipper document pack (1.5), rate normalisation, charge-code dictionary | next |
| 3 | Process 4: RFQ, harvesting, extraction with review queue, feasibility, options, ranking, quoting, acceptance | |
| 4 | Process 2: schedules and capacity, soft holds against live quotes | |
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

## Layout

```
config/rulesets/        every business rule, as data (11 rule sets)
src/
  processes/            the process document as data, deviations and decisions, traceability registry
  state/                machine.ts (engine), machines/ (9 machines), apply.ts (the only way to change a status)
  governance/           actor.ts, policy.ts (12.2), resources.ts, audit.ts (12.3)
  config/               rule set schemas, versioned store, audited publish (13.4)
  db/                   Drizzle schema (the core objects), migrations, Postgres stores
tests/                  grouped by process: p12/, state/, config/, db/, processes/, static/
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
