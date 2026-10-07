# Agentic Supplier & Procurement Lifecycle Orchestrator

> **Also in this repository: Freight Orchestrator**, a separate project in three folders:
> - [`freight-orchestrator/`](freight-orchestrator/README.md): the platform. It has the process model, state machines, permissions, audit, intake, reply extraction, rate normalisation, the API server and mailbox ingestion.
> - [`freight-world/`](freight-world/README.md): the game-like app. It has the global map, the live Inbox, Reply lab and Audit screens running the platform's code, and the isometric Jebel Ali board with the MVP demo.
> - [`freight-depot/`](freight-depot/README.md): the road-carrier depot console.
>
> Each folder is its own app (`cd <folder> && npm install`).

An illustrative Proof of Value (PoV) prepared for **Etihad Credit Bureau**, with Insight. It is a clickable enterprise demo: seven specialist AI agents orchestrate a procurement lifecycle end to end, and humans stay accountable for every material decision.

> **All data is synthetic.** The suppliers, people, figures, contracts and events are fictional. No ECB systems or credit data are connected. External / credit-risk information is only shown as an example of use *where legally permitted and authorised*. Value figures are illustrative hypotheses to be validated during the PoV.

## Hosted version (no install)

`node artifact/build.mjs` bundles the whole app into one self-contained file, `artifact/dist/index.html`, which is published as a hosted page. It works like the full app, except that routing happens inside the page and the audit export copies CSV to the clipboard.

## Quick start

```bash
npm install
npm run build && npm start      # production mode, http://localhost:3000 (recommended for presenting)
# or: npm run dev
```

You need Node 18.18 or later. No API keys or network access are needed at runtime.

## Presenting (5–7 minutes)

1. Open the **Command Center** (`/`).
2. Click **Launch Demo Journey** (or **Start Guided Demo** in the top bar) and choose **Start from a fresh case**.
3. A presenter panel at the bottom walks through 9 steps. The main button always shows the next action. **Agent** actions use gold and **human** decisions use magenta, and the matching button on the page pulses.
   1. New demand received
   2. Agent qualifies the request, then a human approves the route
   3. RFx generated, compared to policy and sent for review
   4. Suppliers assessed, then a human confirms the shortlist
   5. Bids evaluated: scores, deviations, commercial anomalies and the committee brief
   6. **HUMAN DECISION REQUIRED**: the committee awards the contract
   7. Approvals routed, with reminders and simulated approvers
   8. Contract analysed and validated by Legal
   9. Monitoring activated: the 12-day delay event is detected and assessed, then a human approves escalation
4. Finish on **Value Realisation**, **AI Control & Agent Activity** or the **Audit Trail**.

Controls: `→` / `PageDown` runs the next action (this works with a presentation clicker), and `←` goes back. You can minimise or exit the panel at any time.

**Other tools for the presenter**

- **Fast-forward here** (shown on any stage page) completes all earlier stages with the recommended choices, so you can jump straight to one stage.
- **Reset demo** is in the user menu (top right). Demo state is saved in `localStorage` and survives a page reload.
- **Governance story:** open **AI Control** (top bar) → pause an agent, or go to **Governance & Controls** → revoke a permission. Then try to run that agent: the action is blocked and the block is logged in the audit trail.

## What's included

| Area | Route |
| --- | --- |
| Procurement Intelligence Command Center | `/` |
| Case overview and human decision record | `/case` |
| 01 Demand Intake (Demand & Policy Agent) | `/case/intake` |
| 02 RFx Preparation (editable sections, policy check, version history) | `/case/rfx` |
| 03 Supplier Intelligence (Supplier 360, comparison, shortlist) | `/case/suppliers` |
| 04 Bid Evaluation (weighted and risk-adjusted matrix, findings, committee brief, award) | `/case/evaluation` |
| 05 Approval Orchestration (DoA thresholds, approve / return / clarify, reminders, escalation) | `/case/approvals` |
| 06 Contract Intelligence (obligations register, milestones, Q&A with citations, owners, reminders) | `/case/contract` |
| 07 Continuous Monitoring (SLA, risk, delay event response) | `/case/monitoring` |
| AI Control & Agent Activity (agent cards, live feed) | `/agents` |
| Governance & Controls (pause, revoke, human-approval gates, RBAC, thresholds) | `/governance` |
| Audit Trail (filter, CSV export) | `/audit` |
| Value Realisation (baseline vs PoV target, measurement method) | `/value` |

A persistent **AI Control** sheet is available from every screen.

Agents never expose chain-of-thought. Each agent result carries an explainable summary instead: the **evidence considered**, the **rules applied**, the **recommendation**, a **confidence** level and the **human decision required**.

## Architecture

```
app/          Next.js App Router pages (+ /api/agents/run LLM bridge)
components/   ui/ (shadcn-style primitives), common/, shell/, governance/, suppliers/, charts/
agents/       mock-responses.ts (deterministic outputs), task-steps.ts (progress labels)
services/     agent-service.ts + providers/ (mock, openai-compatible), workflow.ts (state machine), audit.ts
lib/          store.ts (Zustand + localStorage), actions.ts (all business actions), agent-runner.ts (policy enforcement), guided.ts
data/         synthetic case, suppliers, bids, contract, monitoring, governance, value
types/        domain types
config/       brand.ts (logo slots)
```

- **Provider abstraction.** Every agent call goes through `runAgent()`, which uses the `AgentProvider` interface. The default provider is the deterministic mock, so the demo always behaves the same. To use a real LLM, set `NEXT_PUBLIC_AGENT_PROVIDER=openai-compatible` and the `LLM_*` variables (see `.env.example`). This works with OpenAI, Azure OpenAI or any compatible gateway. Keys stay on the server in `/api/agents/run`. If that route fails, the client falls back to the mock automatically.
- **Workflow state machine.** `services/workflow.ts` maps events to stage-status transitions: `INTAKE_APPROVED`, `AWARD_DECIDED` and so on.
- **Guarded execution.** `lib/agent-runner.ts` checks whether an agent is paused or has had a permission revoked before any run. It also updates the agent's runtime state and writes audit events.
- **RBAC-ready.** Roles, service identities and permission scopes are modelled (`data/governance.ts`, `data/agents.ts`). Authentication is switched off for the demo.

**Logos.** Official logos are not bundled and must not be recreated. Put the supplied files in `public/brand/` and set their paths in `config/brand.ts`. Until then, plain-text attribution is shown.

## Quality checks

```bash
npm run typecheck
npm run lint
npm run build
```
