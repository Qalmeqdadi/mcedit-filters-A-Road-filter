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

Static React app (Vite, TypeScript, Tailwind CSS, Framer Motion, Lucide). There is no backend, no API keys and no
runtime network calls: fonts are bundled, so it works offline once dependencies are installed.

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
npm run qa:sections       # per-section screenshots into qa-screens/
```

To test a production build, set `BASE=http://127.0.0.1:4173/` and run `npm run preview`.
