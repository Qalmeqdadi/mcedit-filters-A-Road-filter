# Freight Orchestrator World

The Freight Orchestrator MVP demo, rebuilt as an isometric world you play through like a strategy game.
Every screen of the original demo is here. Each one flies the camera to the place in the world it is about.

> **All data is illustrative.** Gulfway Logistics, Al Noor, Oceanlink and every other company, person and figure are fictional.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check, then one self-contained dist/index.html (+ dist/artifact.html for hosting)
```

## The world

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

The rest of the demo: Insights, Setup and carrier scorecards; roadmap phases 2–6 (exceptions ringing on ships, the plane, train, feeder and trucks to Riyadh, a 3D load plan, the trust ledger over Dubai, and new network lanes); the carrier portal, where free TEU shows as glowing containers on Oceanlink's ships; the partner job queue; and the shipper portal. Presenter mode (Play tour), Copy link and deep links such as `#flow-4` or `#c_cap` all work as before.

## Code

```
src/data.ts          every figure from the MVP demo
src/store.ts         one zustand store: screens, walkthrough state, roadmap and portal state, tour
src/scene/           World (camera director), geo (map, routes, focus per screen), Terrain, Props (ships, cranes,
                     buildings), Fleet (traffic, berths, voyage, train, plane), Fx (arcs, beacons, ledger), FitBay
src/ui/              Shell (rail, top bar, guide bar), Labels (DOM labels that follow the world), charts, views/
```
