# Freight Orchestrator World

Freight Orchestrator as a world you play through like a strategy game. It opens on a **global map**: a globe that unrolls into a flat map, with every port, airport, rail terminal and truck hub, and every sea, air, rail and road lane. Zoom from the globe into a region, then into a site, where the isometric **Jebel Ali board** carries every screen of the original MVP demo.

> **All data is illustrative.** Gulfway Logistics, Al Noor, Oceanlink and every other company, person and figure are fictional.

## Run it

```bash
(cd ../freight-orchestrator && npm install)   # the live screens import the platform's code
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check, then one self-contained dist/index.html (+ dist/artifact.html for hosting)
```

## The global map

- **Globe or flat.** Drag to turn or pan. Scroll or pinch to zoom. The Globe/Flat switch unrolls the same map, and lanes, labels and shipments stay attached while it morphs. Coastlines and borders are Natural Earth 1:50m (public domain, via `world-atlas`), and the pilot region is drawn again at high resolution for close-ups.
- **Every mode.** Ships follow a sea graph through Hormuz, Bab el-Mandeb, Suez, Gibraltar and Malacca. Trains follow their corridors (Xi'an–Khorgos–Moscow–Małaszewicze–Duisburg). Trucks run hub to hub, and aircraft fly great circles. Filter by Sea, Air, Rail or Road.
- **Seen through each person's permissions.** Pick who you are: a forwarder desk, a shipper, an ocean, air, road or rail carrier, or a customs broker. The map shows exactly what `networkFor()` returns for that person, using the backend's real policy and `permissions.json`. The panel counts the records withheld. A carrier sees its own services and rates, a shipper only its shipments, and a partner only its jobs.
- **Drill down.** Region chips fly to the GCC (the pilot), Asia, Europe, Africa or the Americas. Close up, party sites appear, and the Jebel Ali desk, Al Noor, Oceanlink and Al Safa open their boards.

## Live screens (the backend, running in the page)

These screens run the server's own code from `../freight-orchestrator/src`: the API workspace, policy, state machines, extractors and audit. Vite aliases swap the two Node-only pieces for browser stand-ins (`src/live/`). In the page the rule extractors run alone; on the server, Claude reads first and the rules cross-check it.

| Screen | Process | What to try |
| --- | --- | --- |
| **Inbox** | 1.1 | Deliver Sara's email (complete), Omar's air enquiry (size missing, so a reply is drafted), a dangerous-goods request, a revision in the same thread, a carrier reply, or mail for another desk (it never appears). Paste or upload any `.eml`. Hover a field to see the words it was read from. The enquiry is drawn on the globe with matching lanes highlighted. |
| **Reply lab** | 4.3, 3.2 | Read Oceanlink's email, Meridian's PDF table and BlueHarbor's WhatsApp thread. Confirm or correct the shaky fields. Watch the comparable all-in and the per-format accuracy (a format below 80% is flagged for a template). |
| **Audit trail** | 12.3 | Every extraction, state change, review and refusal, with the rule set or model version. Corrections point at the decision they overrode. |

## The Jebel Ali board

A stylised map of the Asia–Gulf trade: Shanghai, the sea lanes past Singapore, Port Klang, Colombo, Nhava Sheva and Chennai, and Jebel Ali.
Each party on the network is a building or a ship:

| On the map | Who it is |
| --- | --- |
| Glass tower with a yellow beacon, Jebel Ali | Gulfway Logistics, the forwarder desk |
| Warehouse with a teal band, Dubai | Al Noor Home Appliances, the shipper |
| Purple-roofed building by the port | Al Safa Customs Brokers, the service partner |
| Six ships on the Shanghai quay | The six carriers in the RFQ |
| Blue terminal and three ships, east Shanghai | Oceanlink Lines' own terminal, for the carrier portal |
| Load-planning yard, inland Arabia | Real container floor plans at 1 unit = 1 m |

## The six-step walkthrough on the map

1. **Request.** Sara's email flies from the warehouse to the desk. Reading it fills the form, and the 18 pallets drop into a 20', a 40' and a 40' HC on the planning yard. Ten pallets are left over beside the 20'.
2. **RFQ.** Requests arc from the desk to the six ships in Shanghai. Each beacon turns teal and shows a price as its reply lands.
3. **Extract.** The three tricky replies (email, PDF, WhatsApp voice note) are flagged on their ships. Hover a field to see where it came from.
4. **Compare.** Ships are ranked on the quay. The winner's beacon rises and gets a ring, and ruled-out ships go grey. Presets and sliders re-rank live.
5. **Quote.** Back in Dubai, the quote flies to Al Noor and Sara approves it on her phone.
6. **Track.** The booked carrier's ship sails the whole route to Jebel Ali, then a truck makes the last mile to the warehouse.

The rest of the board: Insights, Setup and carrier scorecards; roadmap phases 2–6 (exceptions ringing on ships, the plane, train, feeder and trucks to Riyadh, a 3D load plan, the trust ledger over Dubai, and new network lanes); the carrier portal, where free TEU shows as glowing containers on Oceanlink's ships; the partner job queue; and the shipper portal. Presenter mode (Play tour), Copy link and deep links such as `#world`, `#inbox`, `#flow-4` or `#c_cap` all work.

## Code

```
src/globe/           Globe (camera, morph, earth, lanes, hubs, shipments), routes (sea graph, rail corridors, great
                     circles), texture (Natural Earth to canvas), model (what the lens may see), GlobeLabels, state
src/live/            engine (the backend's workspace and policy in the page), browser stand-ins for node:crypto and the SDK
src/ui/views/Global.tsx   World, Inbox, Reply lab and Audit screens
src/data.ts          every figure from the MVP demo
src/store.ts         one zustand store: screens, walkthrough state, roadmap and portal state, tour
src/scene/           World (camera director), geo (map, routes, focus per screen), Terrain, Props (ships, cranes,
                     buildings), Fleet (traffic, berths, voyage, train, plane), Fx (arcs, beacons, ledger), FitBay
src/ui/              Shell (rail, top bar, guide bar), Labels (DOM labels that follow the world), charts, views/
```
