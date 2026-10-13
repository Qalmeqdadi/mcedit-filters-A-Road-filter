# HAYAT | حياة — Autonomous Resilience Intelligence

HAYAT is an agentic resilience platform for national food and logistics security. This
directory holds **phase 1**: the technical foundation plus one working vertical slice,
the **GLOBAL PULSE** screen. You trigger a maritime disruption, the backend ingests it as an
event, a deterministic agent pipeline recalculates national resilience, and the UI
updates live through an audit event stream.

> All data is **synthetic**. Supplier, warehouse and hospital names are fictional, and
> volumes and populations are plausible orders of magnitude, not official statistics.
> Ports, chokepoints and coordinates are real geography.
>
> **No number is produced by a language model.** Every value on screen comes from
> `hayat_simulation` (deterministic code) applied to the seeded data. Threat descriptions
> are fixed templates filled with those computed values.

## Repository layout

```
hayat/
├── packages/
│   ├── simulation/     hayat_simulation  pure maths: days of cover, depletion, shortage risk,
│   │                                     resilience score/index. No I/O, no DB, no deps.
│   └── agents/         hayat_agents      agent contract (Agent, AgentContext, EventSink) and
│                                         the phase-1 pipeline. Depends only on simulation.
├── apps/
│   ├── api/            hayat_api         FastAPI + SQLAlchemy (PostgreSQL), seed scripts,
│   │                                     audit log and Server-Sent Events stream.
│   └── web/            Next.js + TypeScript: the GLOBAL PULSE screen.
├── docker-compose.yml  PostgreSQL 16
├── pyproject.toml      uv workspace (the three Python packages)
└── Makefile            shortcuts for the commands below
```

Dependencies point one way only: `simulation ← agents ← api`. The web app talks to the API
over HTTP and SSE only.

> The repository root also contains an older, unrelated Next.js procurement demo. HAYAT is
> self-contained in `hayat/` and does not depend on it.

## Prerequisites

- Python 3.12 and [uv](https://docs.astral.sh/uv/) 0.5 or later
- Node.js 20 or later (with npm)
- PostgreSQL 16: Docker (`docker compose`) is easiest, or a local install

## Run it locally

All commands start from the `hayat/` directory.

**1. Start PostgreSQL**

```bash
docker compose up -d --wait db
```

<details>
<summary>No Docker? Use a local PostgreSQL instead</summary>

```bash
psql -U postgres -c "CREATE USER hayat WITH PASSWORD 'hayat' CREATEDB;"
psql -U postgres -c "CREATE DATABASE hayat OWNER hayat;"
```

If you only want to try the app without PostgreSQL, SQLite also works. Run
`export HAYAT_DATABASE_URL=sqlite:///./hayat.db` in **both** terminals before steps 3 and 4.
</details>

**2. Install the Python workspace**

```bash
uv sync
```

**3. Seed the synthetic UAE dataset**

```bash
uv run hayat-seed
```

This drops and recreates all tables, loads the data and computes the baseline resilience
state. It prints the row counts and `Baseline resilience index: 82.9`. Re-run it at any time
to start from a clean slate.

**4. Start the API** (terminal 1)

```bash
uv run uvicorn hayat_api.main:app --reload --port 8000
```

Check it: `curl localhost:8000/api/health` should return `{"status":"ok","database":"postgresql","seeded":true}`.
Interactive API docs are at http://localhost:8000/docs.

**5. Start the web app** (terminal 2)

```bash
cd apps/web
npm install
npm run dev
```

**6. Open http://localhost:3000** and click **Trigger Demo Disruption**.

The audit stream shows `event.received` → `disruption.detected` →
`impact.calculation.started` → `impact.calculation.completed` → `resilience.recalculated`.
The KPIs, map, threat cards, depletion chart and commodity table then update to the
recalculated state. **Reset to baseline** resolves the signal and recalculates.

If the web app should call the API somewhere other than `http://localhost:8000`, set
`NEXT_PUBLIC_HAYAT_API_URL` (see `apps/web/.env.example`). If you serve the UI from another
origin, add it to `HAYAT_CORS_ORIGINS` (see `.env.example`).

For a production build of the UI: `npm run build && npm start`.

## Tests and checks

```bash
uv run pytest                    # simulation, agents and API tests (API tests use SQLite)
HAYAT_TEST_DATABASE_URL=postgresql+psycopg://hayat:hayat@localhost:5432/hayat_test \
  uv run pytest apps             # API tests against PostgreSQL (database must exist)
uv run ruff check . && uv run ruff format --check .
cd apps/web && npm test && npm run typecheck && npm run build
```

## The demo disruption

`POST /api/demo/disruption` ingests this event:

| field | value |
| --- | --- |
| kind | `maritime_disruption` |
| chokepoint | `BAB_EL_MANDEB` (Red Sea corridor) |
| delay_days | `11` (rerouting via the Cape of Good Hope) |
| severity | `major` |

Nothing is hard-coded about which commodities it affects. The detection agent finds the
sea routes whose chokepoints include Bab el-Mandeb (9 of the 20 routes: Black Sea,
Mediterranean, European and US Gulf origins). The affected commodities follow from which
suppliers ship over those routes: **wheat, rice, cooking oil and infant formula**. Sugar,
poultry, lentils and dates come via the Cape, Malacca, the Arabian Sea, overland from Saudi
Arabia, or from domestic production, so they are unaffected.

With the seeded data, the engine produces the following (the API tests cover the key outcomes):

| | baseline | after disruption |
| --- | --- | --- |
| Resilience Index | 82.9 | 61.2 |
| Active Signals | 0 | 1 |
| Material Threats | 0 | 2: infant formula (CRITICAL), cooking oil (HIGH) |
| Protected Value | AED 1.11B | AED 970.4M (AED 138.7M at risk) |

The infant-formula threat is the sharpest. Of its inflow, 90% arrives via the Red Sea, so
cover falls from 14.5 to 4.6 days by day 18 and breaches the 10-day safety target on day 11.

## How the numbers are calculated

All in `packages/simulation/src/hayat_simulation/`. Parameters are in `config.py`.

- **Days of cover** = national stock ÷ daily consumption.
- **Inventory depletion** is a daily projection over a 30-day horizon. Each day,
  `available = stock + arrivals`, demand is served up to `available`, any remainder is
  shortfall, and what is left is the next day's stock. Baseline arrivals equal each
  supplier's steady volume.
- **Disruption model** (`scenarios.py`): vessels already past the chokepoint arrive as
  planned. Every vessel behind it arrives `delay_days` late, so each affected route
  delivers nothing during `[transit time from chokepoint to UAE port, + delay_days)`.
  After the gap, arrivals resume at the normal rate, and lost volume is not recovered
  without action (a later-phase decision).
- **Shortage risk** ∈ [0, 1] is linear in the lowest projected days of cover: 0 at 2× the
  safety target or above, 0.5 at the target, 1 at zero cover. Any projected shortfall
  scores 1. The bands are LOW < 0.30 ≤ ELEVATED < 0.50 ≤ HIGH < 0.75 ≤ CRITICAL, so HIGH
  means "below safety target" and CRITICAL means "below half of it, or a stock-out".
- **Material threat** = a commodity at HIGH or CRITICAL.
- **Resilience score** (per commodity, 0–100) = `100 × (0.75 × (1 − shortage risk) + 0.25 ×
  supply continuity)`, where supply continuity is the share of baseline inflow not on a
  disrupted route.
- **Resilience Index** = criticality-weighted mean of the commodity scores.
- **Protected Value** = AED value of the 30-day demand that is served while the safety
  buffer stays intact (the day's demand is fully met and closing stock ≥ safety target).
  **Value at risk** = total 30-day demand value − protected value.
- **Exposure** (on the threat cards) is the sum of population-zone populations. For infant
  formula it is population × the 0–24-month share, plus the hospitals with a neonatal ICU.

## Synthetic data

`apps/api/src/hayat_api/seed/synthetic_uae.py` holds every input as an explicit,
commented table:

| entity | rows | notes |
| --- | --- | --- |
| commodities | 8 | consumption, safety target, criticality, price, starting days of cover |
| ports | 6 | Jebel Ali, Khalifa, Khor Fakkan, Fujairah, Saqr, Ghuwaifat (land) |
| shipping routes | 20 | origin, destination port, corridor, chokepoints, transit days per chokepoint |
| suppliers | 24 | fictional; each ships one commodity over one route at a share of national inflow |
| warehouses | 9 | fictional; capacity, cold chain |
| inventory levels | 29 | derived: national stock = consumption × starting days of cover, split by warehouse weight |
| population zones | 10 | synthetic populations and infant shares |
| hospitals | 13 | fictional; beds, neonatal ICU flag |

Supplier volumes and inventory tonnages are derived by code from those assumptions, never
typed in by hand.

## API

| method | path | purpose |
| --- | --- | --- |
| GET | `/api/health` | liveness, database dialect, whether the DB is seeded |
| GET | `/api/pulse` | latest resilience state + geographic reference network |
| POST | `/api/signals` | ingest an external event (`maritime_disruption`) and run the pipeline |
| POST | `/api/demo/disruption` | ingest the demo event above |
| POST | `/api/demo/reset` | resolve all active signals and recalculate the baseline |
| GET | `/api/events?after_id=&limit=` | audit log |
| GET | `/api/events/stream?after_id=` | Server-Sent Events: one `audit` event per new audit record |

The SSE stream polls the `audit_events` table, so it works with several API processes.
Browsers resume it automatically through `Last-Event-ID`.

## Agents and the road ahead

An agent implements `hayat_agents.Agent.run(ctx, state)`. It reads and writes the shared
`PipelineState` and reports through `ctx.emit(...)`, which becomes an audit record. The
phase-1 pipeline (`pipeline.py`) runs four deterministic agents:

| agent | emits | role |
| --- | --- | --- |
| `signal-intake` | `event.received` | validate and normalise the incoming event |
| `disruption-detection` | `disruption.detected` / `disruption.no_exposure` | match the signal to routes, ports, suppliers and commodities |
| `impact-assessment` | `impact.calculation.started` / `.completed` | run baseline and disrupted projections |
| `resilience` | `resilience.recalculated` | aggregate index, threats, exposure and map status |

Later phases (SENTINEL, NEXUS, ORACLE, MIRROR, STRATEGIST, GUARDIAN, EXECUTOR, WATCHTOWER)
add agents to this pipeline under the same contract. None of them exists yet, and the UI
does not pretend they do.

Out of scope for phase 1, on purpose: authentication, billing, admin, mobile apps,
migrations tooling (the seed script creates the schema).
