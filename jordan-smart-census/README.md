# UFUQ — أفق

**Jordan National Foresight & Planning Platform** · المنصة الوطنية للاستشراف والتخطيط

A working, bilingual (English / Arabic, LTR / RTL) prototype of a national foresight and urban-planning platform for Jordan, built on a census-grade data foundation. It is organised in five pillars:

1. **Data foundation** — census planning, GIS & enumeration areas, field operations, quality, anomaly detection, post-enumeration survey, inter-censal nowcast, provenance.
2. **Jordan today** — population, housing, labour, education, health, migration, infrastructure.
3. **Futures** — probabilistic projections, scenarios, urban growth, housing need, water, mobility, climate, jobs, ageing.
4. **Plan & decide** — area action plans, facility siting, capital investment planner, shock response, decision intelligence, Ask the Data.
5. **Deliver & monitor** — delivery tracking and reports.

UFUQ is a prototype and **not an official government product**.

> **Data integrity rule.** Nothing in this prototype is presented as an official Jordanian statistic. Every KPI, chart, layer and table carries one of four badges — **Official**, **Reference**, **Simulated**, **Synthetic operational** — and an ⓘ provenance button. No official DoS file is bundled; the architecture lets one be imported (see *Replacing simulated data*).

---

## Quick start

```bash
cd jordan-smart-census
npm install
npm run dev            # http://localhost:3000
# or production:
npm run build && npm start
```

Requires Node ≥ 20.9. No API keys, no backend, no network access at runtime (an optional online basemap toggle uses CARTO tiles when available).

| Script | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js (copies the MapLibre worker into `public/maplibre` first) |
| `npm run typecheck` · `npm run lint` | TypeScript (strict) and ESLint (Next + React Compiler rules) |
| `npm run geo` | Rebuilds `src/data/geo/*.json` from `data-raw/geoboundaries` |
| `npm run verify:generator` · `verify:engine` · `verify:projections` | Headless checks of the synthetic world, a full fieldwork run (incl. PES) and the projection/scenario engines |
| `npm run verify:lab` · `verify:early-warning` · `verify:ask` · `verify:actions` | Headless checks of every Planning Lab model, the field early-warning backtest and the question engine |
| `npm run data:open` | Re-fetch the open-data snapshot (World Bank WDI and Our World in Data mirrors) into `src/data/openData.generated.ts` |
| `npm run qa:routes` · `qa:workflows` | Playwright checks against a running server: every route (48, English and Arabic) renders without console errors; 76 end-to-end workflow checks |

## Presenting

Click **Executive demo** (top right). A presenter bar walks through 23 steps, navigating and driving the real engine:

1. UFUQ home · 2. Census command overview · 3. Census planning · 4. Administrative geography · 5. Enumeration areas (Irbid drill-down) · 6. Launch the simulation · 7. Fieldwork progress (fast-forward to day 9) · 8. Predictive field control · 9. Enumerator anomaly (`AMM-E0037`) · 10. Supervisor intervention (human decision recorded) · 11. Coverage completion (fieldwork closed) · 12. Post-Enumeration Survey · 13. Final census results · 14. 2040 projection · 15. National planning simulation (migration-shock scenario) · 16. Area action plans (Mafraq) · 17. Four futures for Jordan (2 × 2) · 18. Robustness test · 19. Equity & SDGs · 20. Delivery tracker · 21. Planning Lab — facility siting · 22. Urban growth to 2050 · 23. Capital investment portfolio → Decision Intelligence.

Other controls: **Start census / Pause / Resume / Reset** and **1× · 5× · 10× · 20×** speed in the top bar (1× = one field shift per second; 4 shifts = 1 day); **عربي / EN** language switch; **alerts bell** (acknowledge / escalate / resolve); **database icon** = global provenance panel; **settings** = seed and acting-officer name.

---

## Single-file hosted build (phones)

`npm run build:artifact` (which also runs `npm run qa:hosted`, opening every menu item of the built file in English and Arabic) bundles the whole app into one self-contained page, `artifact/dist/index.html` (about 3.8 MB): the CSS, the JS and the MapLibre worker (served as a `blob:` URL) are all inlined, and fonts come from Google Fonts. Next.js routing is replaced by an in-memory router with deep links such as `#gis` or `#scenarios`. Use this build to share or open the platform on a phone without a server. Some behaviour differs because the hosting sandbox blocks downloads and printing:
- CSV/JSON exports are copied to the clipboard (a text box appears if the clipboard is also blocked).
- The Print button and the online basemap toggle are hidden.

The same command also writes `artifact/dist/ufuq-jordan.html`, an offline copy for computers where nothing can be installed. Double-click it to open it in any browser. Downloads and printing work in this copy.

`node scripts/qa-mobile.mjs [base]` checks every route at 390 px for horizontal overflow.

## What is built (47 modules)

| # | Module | Highlights |
| --- | --- | --- |
| 01 | National Overview | 10 live KPIs, interactive Jordan map (5 layers, drill-down), population by governorate, pyramid, age groups, sex, urban/rural, household size, nationality categories (simulation), completion trend vs plan, productivity, quality alerts, high-risk EAs, live feed. Selecting a governorate re-scopes the whole platform. |
| 02 | Census Planning | Zod-validated inputs; enumerators, supervisors, reserves, devices, training cohorts, interviews/day, capacity ratio, completion date (Fridays optional); Lean/Base/Accelerated side by side; **Apply to simulation** regenerates the EA frame for that plan. |
| 03 | GIS & Enumeration Areas | Jordan → governorate → district → EA → statistical block → dwelling; EA status/accessibility/workload layers; EA detail with blocks and sampled dwellings; administrative-unit table; **boundary QA report**. |
| 04 | Field Operations | Simulation control room: day timeline, live counters, EA-status map, governorate progress vs plan, visit outcomes, regional completion curves, supervisor task queue, access-disruption notices, live feed. |
| 05 | Enumerator Command Center | ~10.5k synthetic enumerators: search, filter, sort, pagination, CSV; detail sheet with daily productivity, geography map, animated route through statistical blocks, outcomes, anomalies, revisits and supervisor interventions (retrain / verify sample / suspend & reassign). |
| 06 | Digital Census Questionnaire | Sections A (dwelling), B (roster), C (person) + review; skip logic by occupancy and age; Washington-Group-style functional difficulty; DOB→age; roster add/remove; mother/father line links; Zod + census edit rules live; hard errors vs warnings; save/load draft; submit into the quality pipeline. |
| 07 | Coverage & Completion | S-curve actual vs plan, district completion map, EA status mix, districts sorted by gap, revisit queue. |
| 08 | Data Quality | 17 deterministic rules (age range, child older than parent, parent–child gap, marital/employment/education vs age, duplicate IDs, missing head, large households, short interviews, identical rosters, productivity, refusal concentration, dwelling mismatch, GPS mismatch, coverage gap); assign / investigate / request revisit / resolve / dismiss-with-reason; audit trail. |
| 09 | AI Anomaly Detection | *AI-assisted anomaly simulation* — z-scores vs district peers, IQR fences, heaping, GPS and roster-pattern tests. Each finding shows what happened, evidence, why flagged, method, affected records, severity, recommended action and the **human decision**. No LLM; nothing is auto-corrected. |
| 10 | Predictive Field Control | From census day 2, P(late) for every enumerator workload from a log-normal pace model, with explained drivers (pace, refusals, access, disruption, device, late start); reserve or nearby-helper support proposed and **approved by a supervisor** (engine `assignSupport`, logged as an intervention); backtest (precision, recall, Brier) once fieldwork closes. |
| 11 | Post-Enumeration Survey | Stratified sample of completed EAs, independent re-enumeration, matching, omissions, erroneous inclusions, duplicates, dual-system estimate, match rate, net & gross coverage error with formulas; national and governorate results. Labelled **SIMULATED POST-ENUMERATION SURVEY**. |
| 12–18 | Population · Housing · Labour · Education · Health & functional difficulty · Migration · Infrastructure | Drill-down (Jordan → governorate → district → EA), choropleths, governorate comparison tables; migration arc map, origin–destination matrix and Sankey; infrastructure pressure index. Labour figures are explicitly **not** Jordan's official unemployment rate. |
| 19 | Population Projections | Annual cohort-component model to 2050 with adjustable fertility, life expectancy, migration, household size, urbanisation, employment ratio; pyramid vs base; **probabilistic projection** — 300 Monte-Carlo runs, 80 % / 95 % fan chart, probability above a threshold. |
| 20 | Inter-censal Nowcast | Kalman-filter blend of demographic accounting (registered births / deaths) and an electricity-connection indicator, 60 months by governorate; unexplained-growth flags; error of each method against the synthetic truth. |
| 21 | Scenario Simulator | 6 presets + custom, 16 controls; 11 impact indicators (population, households, housing units, school seats, classrooms, schools, healthcare, water, electricity, jobs, elderly care); save / duplicate / compare / reset; CSV. |
| 22 | National Decision Intelligence | Ministerial statements (education, water, housing, health, employment, energy, infrastructure) generated deterministically from the active scenario, each with its formula and assumptions; regional outlook; pressure map; priority governorates. |
| 23 | Ask the Data | Rule-based English / Arabic question engine (no language model): questions are parsed into topic · operation · geography · year, answered by the platform's own models, with table, chart, formula, provenance and a link to the module. Unmatched questions get suggestions, never invented numbers. |
| **Planning Lab** | | Shared scenario + horizon selector (presets, the Scenario Simulator's current scenario, or saved scenarios) and a small-area (district) projection layer. Every Planning Lab module ends with a **Recommended actions** panel for the selected governorate (or the top national ones). |
| 24 | Area Action Plans | Corrective actions and strategies for every governorate: diagnosis (~20 indicators vs Jordan, graded LOW → CRITICAL), strategy by sector, and sized actions grouped immediate / 1–3 yrs / 3–10 yrs — each with evidence, steps, KPI target, lead agency, indicative cost, people reached and hotspot districts. National view: governorate × sector severity matrix, strategic themes, top priorities, cost by sector. Copy-briefing text and CSV export. |
| 25 | Facility Siting Planner | Schools, primary health centres, hospitals: projected demand vs a synthetic inventory for access (distance standard) and capacity; **greedy maximal-covering optimiser** that explains every pick; manual placement by clicking the map; catchment rings; district gap table; CSV. |
| 26 | Urban Growth Forecast | Constrained cellular automaton (~0.46 km² cells) for Greater Amman, Irbid, Mafraq and Aqaba; compact / trend / dispersed policies, green belt and growth boundary; new land, density, distance to centre, road and pipe km, network cost; policy comparison. |
| 27 | Housing Need Forecast | New households + replacement + overcrowding / tents backlog − vacancy release, vs completions; cumulative shortfall; need per 1,000 households by governorate and district; dwelling mix and land. |
| 28 | Water Security | Municipal requirement vs supply by governorate to 2050 (NRW, decline, desalination, demand management), drought Monte-Carlo, first stress year, and a cheapest-first lever package. |
| 29 | Mobility & Commuting | Gravity model + car / public-transport logit + congested assignment on a schematic district network; rapid-transit corridors with riders, mode shift, car-km, vehicle-hours and CO₂ effects. |
| 30 | Climate Risk | Census vulnerability (65+, under 5, no cooling, outdoor work, disability, tents) × illustrative heat classes and synthetic flood-susceptible EAs; people at risk, cooling centres, priority actions. |
| 31 | Jobs & Labour Entry | Labour force from projected ages × census participation; jobs to hold / reach a target unemployment rate vs jobs created from GDP growth × elasticity; women's participation path; sector strategies. |
| 32 | Ageing & Care | 65+ / 80+, old-age dependency, median age, long-term-care beds, home care, care workforce, functional difficulty. |
| 33 | Capital Investment Planner | Projects generated from all lab models compete for one budget: weighted efficiency (within sector) · equity (deprivation) · urgency, sector priorities, greedy knapsack, budget frontier, "what the next JOD 250M buys", investment per resident. |
| 34 | Shock Response Simulator | Week-by-week inflow (arrival curve, destination pattern, camps) against housing (vacant dwellings from the frame), schools, primary care and water; shock-attributable breaches; proposed actions that can be added to the plan; play-through. |
| F1 | Scenario Futures (2×2) | Strategic-foresight matrix: pick two of six uncertainties (migration, water, economy, climate, fertility, urban development); each pole sets explicit parameters; the four futures re-run projection, small-area, siting, housing, water, jobs, climate, urban-growth and action-plan models; outcome comparison (best / worst), narratives and signposts. |
| F2 | Horizon Scanning | STEEP register of 19 emerging signals, rated by impact × likelihood × time to impact (editable workshop ratings, custom signals, saved in the browser); urgency ranking; promote a signal's uncertainty to a scenario axis. |
| F3 | Robustness Test | Every corrective action generated in each of the four futures and classed no-regret (4/4), robust (3/4) or contingent (1–2/4, with trigger signposts); cost range across futures; filters and CSV. |
| D1 | Delivery Tracker | Corrective actions are **proposed** from any action card, **approved or returned** by an approver with a decision note, then given a responsible unit, milestones, spend and a progress target; health (on track / at risk / off track) is rule-based from overdue milestones and progress vs time elapsed. Board, table, activity feed (full audit trail), per-item discussion, saved **versions** with change comparison, CSV. Local workspace in the app and offline file (demo role switch); on the hosted page a **shared live workspace** (artifact database) where editors approve, members propose and update, viewers read — approvals and versions are write-protected by database rules. Optional demo portfolio, flagged “Demo”. |
| D2 | Briefing Mode | Seven-slide briefing for Jordan or a governorate, built live from the plans and the portfolio: situation, strategy, top priorities, delivery status, decisions needed, next 90 days; keyboard navigation and full screen. |
| L1 | Regional Economy | Governorate output from census employment by sector × illustrative productivity, calibrated to Jordan's GDP (World Bank, open-data connector, at the 0.709 JOD/USD peg); projection with GDP growth; output per resident vs Jordan, diversification (HHI), public-sector dependency, Theil index of spatial inequality; imported official GRP shares replace modelled shares. |
| L2 | Land & Terrain | Districts in three physiographic zones (Jordan Valley / Wadi Araba, western highlands, Badia) with illustrative steep, agricultural, protected and serviceable shares; built-up land, serviceable developable land, land needed for new households and jobs, years of supply, farmland at risk; district land-pressure map. |
| L3 | Energy & Utilities | Household electricity from census (urban/rural, air-conditioning) calibrated to Jordan's observed demand (Our World in Data); appliance and warming growth, peak MW, grid headroom and year exceeded, reinforcement MVA, rooftop solar potential, renewable share vs target, solid waste and landfill life, sewer coverage; imported peak and capacity replace synthetic values. |
| L4 | Municipal Finance | Each governorate's action-plan cost vs fiscal space (central capital budget with equalisation + municipal own-source revenue) to the horizon; funding gap closed by land-value capture, PPP and grants; residual unfunded; imported municipal revenue replaces modelled values. |
| L5 | Equity & SDGs | Opportunity Index (income, work, education, health, housing, basic services, environment) by governorate and district; 16 localised SDG indicators with on-track / moderate / off-track status against illustrative targets; ten districts furthest behind. |
| C1 | Data Connectors | Registry of 18 connectors: embedded reference data, four open-data connectors (World Bank GDP, population and inflation; Our World in Data electricity) fetched by `scripts/fetch-open-data.mjs` with licence, rows and checksum and refreshable from the browser, four CSV imports of official tables (validated with Zod; GRP, peak demand, grid capacity, municipal revenue) applied to the models, and six production connectors defined with what they need. |
| 35 | Reports & Export | Eight CSV exports (governorate summary, enumerator performance, quality issues, anomalies, scenario results, PES results, **area action plans**, **Planning Lab indicators**) + a printable executive report. Every Planning Lab module also exports its own CSV. |
| 36 | Methodology & Data Provenance | Data-nature legend, provenance registry, geography pipeline, reference cross-checks, simulation methodology, synthetic assumptions, limitations, and the **official-data import adapter**. |

Census Planning also includes **non-response & revisit planning** (final response by number of callbacks, follow-up team size, "use live fieldwork rates"), and the enumerator detail sheet shows an **optimised visiting route** (nearest-neighbour + 2-opt) with km and walking time saved vs the listed order.

Global features: command-centre alerts (coverage gap, unusual performance, high refusal, potential duplicate, duration anomaly, district behind schedule, device offline, supervisor review, PES coverage) with severity, owner, timestamp, status, acknowledge / escalate / resolve; provenance popovers on every panel; full Arabic/RTL including charts (axes mirrored in options, not just page direction).

---

## Architecture

```
jordan-smart-census/
├─ data-raw/geoboundaries/      raw geoBoundaries GeoJSON + metadata (licences)
├─ scripts/
│  ├─ build-geo.mjs             boundary reconciliation & label QA → src/data/geo
│  ├─ copy-maplibre-worker.mjs  serves MapLibre's ES-module worker statically
│  ├─ smoke*.ts                 headless engine checks (tsx)
│  └─ qa-*.mjs                  Playwright route & workflow checks
└─ src/
   ├─ app/                      Next.js App Router — one thin route per module
   ├─ components/
   │  ├─ ui/                    shadcn-style primitives (Radix Dialog/Popover, cva), DataTable (TanStack)
   │  ├─ charts/                ECharts wrapper (SVG renderer) + option builders (house style, RTL)
   │  └─ shell/                 sidebar, top bar & simulation controls, alerts, provenance, demo tour, engine gate
   ├─ features/<module>/        one folder per module (gis, planning, fieldwork, enumerators, questionnaire,
   │                            coverage, quality, anomalies, pes, analytics, projections, scenarios,
   │                            decision, reports, methodology, overview)
   ├─ simulation/               pure TypeScript engine (no React):
   │  ├─ rng.ts                 seeded mulberry32 + derived streams
   │  ├─ generate.ts            generateGovernorates/Districts/EnumerationAreas/Enumerators/Households, blocks
   │  ├─ population.ts          household & person generator, planted errors
   │  ├─ engine.ts              CensusEngine: simulateStep/Day, visits, interviews, refusals, revisits,
   │  │                         quality, alerts, tasks, human actions, aggregation
   │  ├─ quality.ts             edit rules (shared with the questionnaire)
   │  ├─ anomalies.ts           explainable statistical detection
   │  ├─ pes.ts                 sample draw + dual-system estimation
   │  ├─ analytics.ts           weighted profiles for any scope
   │  ├─ projection.ts          cohort-component model, Siler life table
   │  ├─ scenarios.ts           presets, infrastructure demand, comparison
   │  └─ planning.ts            planning calculator (Zod schema)
   ├─ data/                     geo JSON, reference baseline, provenance registry
   ├─ store/                    Zustand app store (+ persisted prefs/scenarios), engine holder
   ├─ hooks/ · lib/             i18n (dictionary + labels), formatting, CSV, exports
   └─ types/census.ts           domain model (Governorate … DataSource)
```

**State model.** The engine is a mutable class living outside React (high-frequency state for ~10.5k EAs and enumerators). The Zustand store holds UI state and a `tick` counter; `useEngine()` re-renders subscribers after every advance or human action. The world is generated on the client (never during prerender), so all routes are static.

**Stack.** Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 4 · Radix + shadcn-style components · MapLibre GL 6 · Apache ECharts 6 · TanStack Table · Zustand · Zod 4 · date-fns · IBM Plex Sans / Sans Arabic (self-hosted via Fontsource).

**Map.** MapLibre renders our own GeoJSON layers on a plain background — no tile server or glyph server is needed, so it works offline. Labels are HTML markers so Arabic shapes correctly without the RTL text plugin. Governorate/district choropleths are classified into 7 steps (quantile, or fixed domain for percentages).

---

## Geographic data

| Layer | Source | Vintage / licence | Use |
| --- | --- | --- | --- |
| National boundary (ADM0) | geoBoundaries gbOpen JOR-ADM0 | 2016 · CC BY 4.0 | outer mask: every EA must fall inside |
| Governorates (ADM1, 12) | geoBoundaries gbOpen JOR-ADM1 (via Wikimedia Commons) | 2006 · CC BY 2.5 | governorate layer |
| Districts (ADM2, 52 → 50) | geoBoundaries gbOpen JOR-ADM2 | 2006 · Public domain | district layer after reconciliation |

Download host: the geoBoundaries GitHub LFS mirror (`media.githubusercontent.com/media/wmgeolab/geoBoundaries/...`). Raw files and metadata are committed in `data-raw/geoboundaries/`.

**Boundary QA (`scripts/build-geo.mjs`).** Governorates were validated with point-in-polygon tests of 60 town coordinates (59/60 correct; the miss is a coordinate on the Karak–Tafilah edge). The 2006 ADM2 layer has displaced labels (e.g. the polygon labelled "Irbid" does not contain Irbid city), so the pipeline:

1. nests each ADM2 unit in the governorate it overlaps most and clips it (District ⊂ Governorate holds exactly);
2. merges cross-governorate slivers into the nearest district of the receiving governorate;
3. relabels districts by district-seat evidence (12 governorate-capital districts, 25 single-seat, 2 multi-seat), keeps the published label for 11 units without evidence (flagged "label unverified"), and merges 2 tiny unverified units;
4. writes a QA report shown in module 03 (*Boundary QA report*).

The result is indicative only: it does not match the current DoS structure of 51 liwas. Replace with DoS / OCHA COD-AB boundaries for production.

## Reference statistics

| Dataset | Status |
| --- | --- |
| Governorate population baseline, 2024 | **Reference** — DoS end-2024 estimates as reported in secondary sources (web search results citing DoS). 10 rows confirmed; Amman from a single source; Irbid derived as the residual of the reported ≈11.7 M total. Not ingested from a DoS file — verify before use. |
| World Bank WDI SP.POP.TOTL (2020–2025) | **Reference** — national cross-check (via `github.com/datasets/population`, ODC-PDDL). |
| 2015 census headline totals | **Reference** — context only. |

---

## Simulation methodology

Everything below is deterministic for a seed (default `JORDAN-CENSUS-DEMO-2030`, changeable in Settings): every sub-process draws from an independent stream derived from `(seed, purpose, key)`, and each fieldwork shift from `(seed, step)`, so playback speed never changes results.

**Frame.** District populations allocate the governorate baseline by district-seat weights and area. EAs are delineated to one enumerator workload under the applied plan (urban 95 %, rural 80 % of `interviews/day × efficiency × field days`), ~10.5k EAs, placed by rejection sampling around seats inside the district polygon **and** the national boundary. Each EA has hidden "truth" (actual households, vacant dwellings), including planted occupancy shortfalls (e.g. `IRB-0207`) and frame under-counts.

**Workforce.** Workloads are contiguous and capped at 108 % of plan; supervisors at 1:8. ~1 % of enumerators carry hidden risk profiles (fabrication risk — e.g. `AMM-E0037` —, high refusal, device issues, GPS drift) that the UI never reveals; only their observable behaviour is shown.

**Synthetic population** (~10k households, ~48k persons). Household type drives composition (single, couple, nuclear, single-parent, extended, composite); spouses near the head's age; children born to mothers aged 17–45 with realistic spacing and age-dependent home-leaving; education by cohort, sex, urban/rural and nationality; employment by age, sex, education and enrolment; WG-style difficulty rising with age; migration histories; urban/rural dwelling profiles. Household and person weights calibrate the sample to the frame. ~0.6 % of records carry planted errors so the edit rules have real work.

**Fieldwork.** 4 shifts/day. Visit capacity = planned rate × personal speed × √accessibility × ramp-up × Friday factor × access disruptions (two seeded events) × reserve support. Each visit: vacant (hypergeometric) or occupied → completed / refusal / no-contact (revisit). Revisits succeed 64 %; failures may finalise. From day 7, enumerators projected to overrun receive reserve support; after the planned period, mop-up runs at boosted capacity; fieldwork closes after 4 mop-up days. End of each day: newly enumerated microdata are checked by the edit rules, operational rules run, anomalies are detected, alerts and supervisor tasks are raised, and daily snapshots are stored.

**Quality & anomalies.** See modules 08–09. Human actions (assign, revisit, resolve, dismiss, confirm, escalate, interventions) are recorded with the acting officer and simulated timestamp; none edits a response.

**PES.** Stratified sample of completed EAs; census count includes count imputation for non-responding occupied dwellings; erroneous inclusions and duplicates depend on EA and enumerator profile; independent PES coverage ~96–97 %; matching under independence; `N̂ = CE × P / M` per stratum.

**Projections & scenarios.** Single-year, two-sex, annual cohort-component model from the simulated census base to 2050. Siler mortality calibrated by bisection to the target e₀ (±1.8 years by sex); TFR × standard age pattern (base 2.7 → 2.2 by 2050 in the baseline); net migration with a young-adult profile plus optional one-off shock; households = population ÷ average size. Infrastructure demand = projected segment × adjustable norm. Governorate apportionment uses base shares, synthetic growth differentials and a north-weighted shock share.

## Assumptions

All values below are illustrative defaults and adjustable in the UI:

- Planning: 21 field days, 14 interviews/day, 85 % efficiency, 1 supervisor : 8 enumerators, 10 % reserve, 8 % device reserve, batch of 35, fieldwork start 1 Dec 2026, reference date 30 Nov 2026.
- Governorate profiles (urban share, household size, vacancy, nationality mix, accessibility, growth differential): `src/data/reference.ts → GOV_PROFILES`.
- Planning norms: 110 L/person/day, 1,500 kWh/person/year, 32 pupils/classroom, 640 pupils/school, 3.4 visits/person/year (×1.5 extra for 65+), 12 % care need among 65+, housing formation ratio 1.08, 95 % school enrolment.

## Replacing simulated data

The provenance registry (`src/data/sources.ts`) and the reference baseline (`src/data/reference.ts`) are the only entry points for real figures. Module 22 includes a working **import adapter**:

1. Download the template CSV (`govId,population`, 12 rows).
2. Upload an official DoS file; it is validated with Zod (all 12 governorates, unique, positive integers).
3. Review the diff and **Apply & regenerate** — the frame, workforce, microdata weights and projections rebuild from it, and the provenance record switches to **Official**.

The same pattern extends to boundaries (`npm run geo` with DoS/COD layers in `data-raw`), EA frames and microdata, because every module consumes the domain types in `src/types/census.ts` rather than the generator directly.

## Known limitations

- District geometry is the 2006 nahia layer, reconciled; 11 district labels remain unverified, and it differs from the current 51-liwa structure.
- The governorate baseline was not ingested from an official DoS file.
- All microdata, fieldwork, quality, anomaly, PES, projection and scenario outputs are synthetic.
- EAs are centroids, not polygons; blocks and dwellings are generated on demand.
- Client-side only: no authentication or server-side audit store, and fieldwork state resets on reload. Preferences and saved scenarios persist in `localStorage`.
- Planning Lab hazard layers (heat classes, flood flags), the facility inventory, water supply, unit costs and the schematic transport network are **illustrative stand-ins** — each is labelled and listed in the provenance registry with what should replace it.
- The simulation runs on the main thread; at 20× a full census takes ~5 s and the UI stays responsive on a typical laptop.

## Recommended next phase

1. Load authoritative DoS/OCHA COD-AB boundaries (governorate, liwa, qada) and a real EA frame with EA polygons; switch to vector tiles for national EA layers.
2. A backend (e.g. PostgreSQL/PostGIS + an API) with authentication, role-based access (HQ, governorate coordinator, supervisor, enumerator), an immutable audit log and an offline-first CAPI sync service.
3. Ingest DoS reference tables (population estimates, 2015 census) through the adapter pattern, with versioning and approval workflow.
4. Move the simulation to a Web Worker and add scenario persistence / sharing on the server.
5. Calibrate the synthetic model and projection assumptions against DoS and UN WPP with demographers.
6. Replace Planning Lab stand-ins with ministry data: MoE / MoH facility registers, MWI water balance, the national road network and GTFS, Jordan Meteorological Department climate layers and national flood-hazard maps, and real administrative feeds (civil registry, utilities, school enrolment) for the nowcast.
7. Optional language-model front end for Ask the Data that only translates free text into the existing structured queries, so every number still comes from the models.
8. Accessibility audit (WCAG 2.2 AA), formal Arabic terminology review with DoS, and a security review before any pilot.
