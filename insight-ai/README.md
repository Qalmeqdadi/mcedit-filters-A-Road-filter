# Insight AI · AI Transformation. Built to Operate.

An interactive executive web application describing Insight's AI go-to-market and services architecture. It gives
Insight leadership, sales teams and senior clients one coherent view of:

- the six service offerings
- the delivery capabilities
- the accelerators
- the Human + AI Operating System
- AI Control
- the technology foundations
- the GTM plays
- the sector overlays
- the competitive landscape
- the client journey and outcomes

Static React app (Vite, TypeScript, Tailwind CSS, Framer Motion, Lucide). There is no backend and no runtime network
calls: fonts are bundled, so it works offline once dependencies are installed. The one exception is the optional AI
use-case agent, which calls the Anthropic API with a key the consultant enters.

## Single HTML file

`insight-ai.html` at the repository root is the whole app in one self-contained file, with scripts, styles, fonts and
the logo all inlined. Open it in any browser; no install is needed. Rebuild it with:

```bash
cd insight-ai && npx vite build -c vite.single.config.ts && cp dist-single/index.html ../insight-ai.html
```

## Run

```bash
cd insight-ai
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + static build into dist/
npm run preview    # serve the production build
```

**Deploy to Vercel:** import the repository and set the project's root directory to `insight-ai`. Vercel detects
Vite automatically (`vercel.json` pins the build command and the `dist` output).
**Any other static host:** upload `dist/`. The build uses relative paths, so it also works from a sub-folder.

## Two modes, two levels

| | |
|---|---|
| **Explore mode** | A left sidebar with twelve pages, shown one at a time, with previous/next controls at the foot of each page. On small screens the sidebar becomes a slide-in menu. Deep links work, e.g. `#ai-control`. |
| **Present mode** | Press **Present**. It shows 18 scenes on a 16:9 stage that scales to the screen. Use `←` `→` (also PageUp/PageDown, Space, Home/End) to move, `F` for fullscreen and `Esc` to return to Explore. Scenes can be deep-linked, e.g. `#present-6`. |
| **Executive / Detail** | Executive shows major concepts with minimal text. Detail adds scope, outputs, definitions, the capability coverage matrix, sponsors and qualifying questions. |

## Client workshop (v2)

| | |
|---|---|
| **Client mode** | **Set up a client** in the sidebar: name, sector, meeting date and lead play. The Overview, Services, Industries, GTM Plays and Present title slide then open on that client's sector and lead play. |
| **AI maturity self-check** | Step 1: the organisation's AI stage (not started, exploring, piloting, scaling, operating at scale). Step 2: a detailed questionnaire across 13 areas (5 readiness, 8 AI Control). Each practice is scored 1–5 or "don't know", and the questions adapt to the stage: 60 for organisations not yet using AI (control framed as readiness to govern), 64 once AI is in use, 94 distinct in total (`src/data/assessment.ts`). Step 3: results show area scores (averages), a radar against target, the biggest gaps, the weakest individual practices, unknowns, and a recommended starting point (foundations first before AI is in use). |
| **Use-case prioritiser** | Type use cases, add sector examples, or **Import from Excel** (.xlsx or .csv, read in the browser). Columns are matched flexibly (e.g. "Initiative", "Impact", "Feasibility", "Risk level", "Sponsor", "Business unit"). Scores may be 1–5, 1–10 or High / Medium / Low; missing scores default to 3 and are flagged "needs scoring". A preview lets you add to or replace the current list. **Template** downloads a ready-made .xlsx. A value × readiness 2×2 places the use cases, the ranking feeds a Now / Next / Later roadmap, and high-risk items are flagged for an AI Control design gate. |
| **AI use-case agent** | **Assess with AI agent** on the prioritiser. (1) Optionally researches the client on the web (Claude with the web search tool) and writes a short, sourced profile. (2) Assesses the use cases in batches of 10. Each gets value, readiness and risk with a one-line rationale per score, key risks and a confidence level. Inputs are the client profile, the consultant's context notes, the self-check area scores and every column from the imported sheet. (3) A person reviews proposed against current scores and ticks which to apply; nothing changes before that. Accepted rows carry an "AI" badge whose tooltip shows the rationale, and the summary marks them. Runs from the browser with the consultant's own Anthropic API key (session-only unless "remember" is ticked), model `claude-opus-5-5`, with refusal fallbacks enabled. Requires an explicit data-sharing confirmation before every run (`src/utils/aiAssessor.ts`). |
| **Client summary** | A one-page leave-behind with the lead play and entry offer, self-check, prioritised use cases, roadmap, derived next steps and notes. Use **Print / Save as PDF** (fits one A4 page) or **Copy as text**. |

The session is stored only in this browser (`localStorage`) and survives a reload. **Clear session** in the client
dialog wipes it. Nothing leaves the device. All scores come from the client; the app supplies no benchmarks.

## Information architecture

Every object belongs to exactly one category. Each category has its own colour and badge, and categories never mix:

| Category | Meaning | Source |
|---|---|---|
| Service offering | What clients buy | `src/data/services.ts` |
| Capability | How Insight delivers | `src/data/capabilities.ts` |
| Accelerator / IP | Reusable asset that makes delivery faster or better | `src/data/accelerators.ts` |
| Technology / ecosystem | Enabling platform or provider category | `src/data/technology.ts` |
| Reference architecture | What the client's enterprise becomes | `src/data/operatingSystem.ts` |
| GTM play | How Insight lands and expands | `src/data/plays.ts` |
| Industry overlay | Sector application of the same architecture | `src/data/sectors.ts` |

AI Control (`src/data/control.ts`) appears in two places by design. It is a horizontal control layer embedded in every
layer and every service, and it is also sold on its own as Service 03.

All content lives in typed data files under `src/data/`. Relationships are derived from that data
(`src/data/relationships.ts`), not hand-drawn. For example, the services an accelerator supports are read from the
service definitions, so the diagrams cannot drift from the content.

## Structure

```
src/
  data/        strategic content and the relationship graph
  components/  design-system primitives (badges, drawer, tooltip, tags, header)
  diagrams/    master architecture, operating system, AI Control, lifecycle, play flow
  sections/    the twelve explore-mode views
  present/     present-mode stage and scene definitions
  hooks/       app state, scroll-spy, fullscreen, connector measurement
  utils/
scripts/       Playwright QA scripts (interactions, present mode, per-section screenshots)
```

## Editing content

- **Change wording:** edit the relevant file in `src/data/`. The UI updates everywhere.
- **Logo:** the official Insight logo supplied for this asset is `src/assets/insight-logo.png`. It is rendered as-is
  and never redrawn or recoloured. Replace that file to update it.
- **Accelerator descriptions** describe each asset's role in the architecture only. Confirm feature-level detail with
  the asset owner before external use.
- **Competitive landscape** is a neutral view of archetypes based on publicly emphasised themes. It contains no
  rankings, scores or market-share figures.
- **No metrics:** the app contains no performance metrics or client claims. Outcome targets are set against each
  client's own baseline.

## Quality checks

With the dev server running (`npm run dev`):

```bash
npm run qa:interactions   # architecture, drawers, filters, tabs, keyboard, dead-button sweep, network
npm run qa:present        # walks all scenes with the keyboard, checks overflow, Escape back to Explore
npm run qa:sections       # per-page screenshots into qa-screens/
npm run qa:workshop       # v2 client workshop end to end, including print and persistence
npm run qa:ai             # AI agent against a mocked Anthropic API (requests, batching, review, errors)
```

To test a production build, set `BASE=http://127.0.0.1:4173/` and run `npm run preview`.
