# TA’ZIZ Intelligent Methanol Plant: Agentic AI Operations Platform (Demo)

An executive demonstration by **Insight** for **TA’ZIZ, an ADNOC Group Company**. It shows how specialised AI agents could work *above* the plant control layer of a methanol facility. They observe, investigate, coordinate and recommend, and humans stay accountable for every operational decision.

> **DEMO / SIMULATION MODE.** Every process value, event, piece of equipment, alarm, recommendation and document is synthetic. Nothing connects to or controls a real plant, DCS, SIS, PLC or OT environment. AI agents only investigate and recommend, and every operational action needs explicit human approval. Financial figures are **illustrative** and must be validated with actual TA’ZIZ data.

## Run it

```bash
npm install
npm run dev            # http://localhost:3000
# or, for presenting:
npm run build && npm start
```

No API keys and no network access are needed at runtime.

## The 5-minute executive storyline

Click **Start Executive Demo** in the top bar. Use **Next** / **Prev**, or the arrow keys and a presentation clicker. **Esc** exits.

1. Plant overview
2. The production deviation appears (2,450 vs 2,550 t/day, −4.0%)
3. The Operations Agent detects the issue
4. The Council of Agents activates (live, about 12 s)
5. Evidence is collected
6. A root cause is proposed: *synthesis-loop compressor throughput degradation, 87%*
7. Business impact is calculated: ~102 t/day lost, 80–90 t/day recoverable
8. The recommended investigation plan appears
9. **Human approval required**, and the decision goes to the audit trail
10. Executive value summary (illustrative)

**Reset** in the top bar restores the baseline.

## Pages

| # | Page | What it demonstrates |
|---|------|----------------------|
| 01 | Executive Overview | KPIs, the methanol value chain (clickable), AI Operations Brief, 24 h production trend, active AI alerts |
| 02 | Live Plant | 45 synthetic tags across 7 areas, refreshed every 2.5 s, with 24 h sparklines |
| 03 | Council of Agents | Hero screen: animated multi-agent investigation, live feed, conclusion, impact, approval |
| 04 | Investigation Center | Timeline, evidence by source (clickable), reasoning summary (no hidden chain-of-thought), recommendations, approval |
| 05 | Production Optimization | Current point vs AI-recommended envelope, before/after (advisory) |
| 06 | Asset Health | 7 critical assets, health scores, signals, agent workflow ending in human approval |
| 07 | Energy & Steam | Energy KPIs, energy-flow diagram, opportunities, +0–5% production slider with compressor constraint |
| 08 | Quality Intelligence | Purity prediction, off-spec risk, distillation deviation simulation, contributing variables |
| 09 | Engineering Knowledge | Cited Q&A over a synthetic document library (SOPs, P&ID, OEM manual, MOC, incidents) |
| 10 | Shift Intelligence | AI-drafted shift handover with print/export preview |
| 11 | AI Control | Allowed vs prohibited actions, guardrail tests (blocked and logged), permissions matrix, approval gates, OT/IT boundaries, monitoring, audit trail |
| 12 | Scenario Simulator | 8 scenarios (A–H). Each updates plant state and starts its own council investigation |
| — | Executive Value Summary | Illustrative value metrics |
| — | Ask Methanol AI | Floating assistant that answers from the current simulated state |

## Architecture

```
app/                      Next.js 15 app router (single page, hash-based views)
components/shell.tsx      Brand, navigation, plant clock, assistant, executive demo mode
components/views/         core.tsx (overview, council, investigation, approval), modules.tsx (all other pages)
config/demo.ts            Storyline + economics configuration (single place to re-tune numbers)
data/*.json               Mock datasets: tags, 24 h time series, equipment, alarms, maintenance & work orders,
                          lab results, production, energy, documents, agents
lib/sim/plant.ts          Deterministic plant simulator (seeded PRNG, glide-to-target dynamics)
lib/scenarios.ts          Scenario library + per-scenario investigation knowledge packs
lib/agents/agent.ts       Agent base class: analyze() → collectEvidence() → produceFindings() → recommend()
lib/agents/specialists.ts Operations, Process, Asset, Energy, Quality, HSE, Engineering, Production, Shift agents
lib/agents/orchestrator.ts MethanolOperationsOrchestrator
lib/agents/runtime.ts     Pure function deriving live council state from (investigation, elapsed ms)
lib/governance.ts         Agent registry, permissions, prohibited actions, policy engine
lib/ai/provider.ts        ReasoningProvider abstraction (MockReasoningProvider by default)
lib/knowledge.ts          Document retrieval + cited answers
lib/assistant.ts          Ask Methanol AI (state-aware answers)
lib/store.ts              Zustand store: plant, investigations, approvals, audit, assistant, demo mode
```

### How agent orchestration works

`MethanolOperationsOrchestrator.run()` executes:

`detectEvent → classifyEvent → assignAgents → gatherEvidence → correlateFindings → createReasoningSummary → estimateImpact → generateRecommendation → requestHumanApproval → (human decision) → closeInvestigation`

Each specialist agent compares live (synthetic) tag values with model expectations and combines them with domain evidence from the scenario's knowledge pack. Recommendations pass an HSE/policy filter that keeps them advisory. The result is a fully specified, timed investigation. The UI replays it through `deriveRun(investigation, elapsedMs)`, so the demo is **deterministic**: it never fails randomly and can be fast-forwarded or replayed.

## Customising

- **Numbers and storyline**: `config/demo.ts` (targets, value per tonne, gas price, plant clock) and `lib/scenarios.ts`.
- **Tags**: edit `data/plant-tags.json`, then run `npm run data:generate` to regenerate `data/timeseries-24h.json`.
- **Documents**: `data/documents.json`. **Equipment**: `data/equipment.json`. **Agents**: `data/agents.json`.

## Connecting real systems later

| Mock today | Replace with |
|------------|--------------|
| `data/timeseries-24h.json`, `lib/sim/plant.ts` | Historian read replica (e.g. a DMZ-hosted historian or REST/OPC UA *read-only* gateway) |
| `data/alarms.json` | Alarm & event journal (read-only) |
| `data/maintenance.json`, `equipment.json` | EAM / CMMS APIs and condition-monitoring platform |
| `data/lab-results.json` | LIMS |
| `lib/knowledge.ts` | Document management + hybrid/vector search with access control |
| `data/production.json` | MES, ERP and production planning |
| `lib/ai/provider.ts` | A server-side LLM gateway (implement `ReasoningProvider`; keep keys server-side) |

A DCS interface, if any, must be **read-only** and go through the OT DMZ. Agents must never be given write tools to OT systems.

## Production deployment prerequisites

Any real deployment would require:

- OT cybersecurity assessment (e.g. IEC 62443 zones and conduits)
- Data governance and data-sharing agreements
- HAZOP / safety review where relevant
- Role-based authorisation and identity for every agent
- Human approval workflows integrated with existing systems (PTW, MOC, CMMS)
- AI governance: model risk management, monitoring, evaluation and an audit trail
- Plant-specific validation with actual TA’ZIZ data before any value claim

## Video

`npm run video` (with the app running on port 3000) records a captioned walkthrough to `video/taziz-agentic-methanol-demo.mp4` using the bundled Chromium and ffmpeg.
