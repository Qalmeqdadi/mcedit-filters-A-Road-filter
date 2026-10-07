# Freight Orchestrator · Carrier module

The carrier's side of Freight Orchestrator, built from *Freight Orchestrator — process architecture, levels 0 to 3*.
It is a capacity console for a road linehaul carrier, drawn as an isometric depot you can run like a strategy game.

> **All data is synthetic.** Sahm Overland, the forwarder desks, people, rates and loads are fictional.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check, then one self-contained dist/index.html (+ dist/artifact.html for hosting)
```

## What you see

- **The depot.** Six dock doors, each with a 13.6 m trailer drawn as a cut-away. The 33 euro-pallet positions are the capacity:
  blue is booked, pulsing amber is a soft hold, green stripes preview the request you are answering, and empty floor is free.
  When a departure leaves, the truck drives out through the gate. Tomorrow's trailer for that lane then drives in and backs onto the dock.
- **Shift clock.** One minute of shift time per second. You can pause it or run it at 4× or 15×.
- **Departures strip.** Every departure in the next 36 hours, with its capacity bar, cut-off status and free slots.
- **Work panel.** RFQs, Holds, Supply (feeds, thin lanes, restrictions) and a Log. Every log entry carries its process address.

## Processes covered

| Address | What the carrier does here |
| --- | --- |
| 2.2.1 · 2.2.2 · 2.2.3 | Departure schedule, cut-offs (DG docs −120 min, docs −60, gate-in −45), reporting a delay |
| 2.3.1 · 2.3.3 · 2.3.4 | Free slots and payload per departure, allotment call-offs from desks, lane restrictions |
| 2.4.1 · 2.4.2 · 2.4.3 | Soft hold on reply, convert on acceptance or release on expiry or cut-off, stop-sell |
| 2.5.1 · 2.5.2 · 2.5.3 | Feed freshness, portal fallback when a feed goes stale, thin-lane warnings |
| 4.1.2 · 4.1.4 · 4.1.5 | Shipper identity withheld, reply deadline tied to cut-off, dropped when you miss it |
| 4.2.1 · 4.4.1–4.4.5 | Reply with a departure and rate; feasibility rules for fit, payload, DG segregation, temperature and timing |
| 4.8.1 · 4.8.4 | Win or loss recorded with the reason |
| 5.2.1 · 5.3.1 · 7.1.1 · 7.5.2 | Trailer positioned, gate-in closed, gated out, proactive delay warnings to desks |

The pattern from the map holds: the platform drafts a rate (Suggested), the rules decide what is allowed (feasibility), and the carrier sets the price.

## Code

```
src/sim/      types.ts (shared objects), data.ts (seed), engine.ts (rules + tick), store.ts (zustand, sim clock)
src/scene/    Scene.tsx (camera, lights, traffic), Depot.tsx, Rig.tsx (tractor, cut-away trailer, instanced pallets),
              layout.ts (yard geometry and drive paths), DockTags.tsx + anchors.ts (DOM labels that follow rigs)
src/ui/       TopBar, Overview (KPIs, departures strip), Panel (lists, RFQ reply, departure detail)
```

Both colour schemes follow the system setting. On phones the map comes first and the panels follow it in the page.
