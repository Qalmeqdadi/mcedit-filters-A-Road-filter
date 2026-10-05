import { Anchor, Plane, Ship, TrainFront, Truck } from "lucide-react";
import type { ReactNode } from "react";
import {
  ALERTS, APPS, AUTO_LOG, AUTO_RULES, DOCS, ESC_EVENTS, INTEGRATIONS, LCL, MM_CAP, MM_OPTS, MODE_C, MODE_N, PHASES, REGIONS, SHIPMENTS,
  fakeHash, sellPrice, usd, type Mode, type Tone,
} from "../../data";
import { selectedCarrier, useStore } from "../../store";
import { Card, Check, HBar, Head, Pill, Stat, Toggle } from "../bits";
import { RateChart } from "../charts";

export const MODE_I: Record<Mode, ReactNode> = {
  sea: <Ship size={14} />, coastal: <Ship size={14} />, rail: <TrainFront size={14} />, road: <Truck size={14} />, air: <Plane size={14} />, port: <Anchor size={14} />,
};

function PhaseRail({ n, title, desc }: { n: number; title: string; desc: string }) {
  const st = useStore();
  return (
    <div className="card rm">
      <div className="rm-h">
        <div className="row"><Pill tone="warn">Roadmap preview</Pill><span className="muted sm">Phase {n} · months {PHASES[n - 1].m}</span></div>
        <h1>{title}</h1>
        <p className="ink2">{desc}</p>
      </div>
      <div className="rail">
        {PHASES.map((p) => (
          <button key={p.n} type="button" className={`${p.n === n ? "on" : ""}${p.n === 1 ? " live" : ""}`} onClick={() => (p.v === "flow" ? st.go(1) : st.open(p.v))}>
            <span className="sm">P{p.n} · {p.m} mo</span><b>{p.t}</b>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- phase 2

export function ShipView() {
  const st = useStore();
  const tabs: [typeof st.shipTab, string][] = [["track", "Tracking"], ["docs", "Documents"], ["int", "Integrations"]];
  return (
    <>
      <PhaseRail n={2} title="Booking, documents and tracking" desc="Once a quote is approved, the booking, paperwork and tracking all run on the same data. The desk only steps in for exceptions, which ring on the map." />
      <div className="tabs2" role="tablist">
        {tabs.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={st.shipTab === k} onClick={() => st.set({ shipTab: k })}>{l}</button>)}
      </div>
      {st.shipTab === "track" && <ShipTrack />}
      {st.shipTab === "docs" && <ShipDocs />}
      {st.shipTab === "int" && (
        <div className="stack">
          {INTEGRATIONS.map((x) => (
            <div key={x[0]} className="card tile"><div className="row between"><h3>{x[0]}</h3><Pill tone={x[3]}>{x[2]}</Pill></div><p className="muted">{x[1]}</p><span className="sm muted">{x[4]}</span></div>
          ))}
        </div>
      )}
    </>
  );
}

function ShipTrack() {
  const st = useStore();
  return (
    <>
      <div className="stats4">
        <Stat label="Active shipments" value="84" delta="all tracked automatically" />
        <Stat label="On time" value="93%" delta="last 30 days" />
        <Stat label="Documents made automatically" value="96%" delta="B/L, invoices, customs" />
        <Stat label="Open exceptions" value={2 - Object.keys(st.alerts).length} delta="need a person today" />
      </div>
      {ALERTS.map((a) => (
        <div key={a.id} className="card alert sp">
          <span className="edge" style={{ background: a.k === "bad" ? "var(--red)" : "var(--signal)" }} />
          <div><b>{a.t}</b><div className="muted sm">{a.d}</div></div>
          {st.alerts[a.id] ? <Pill tone="ok">{a.done}</Pill> : <button type="button" className="btn ghost sm" onClick={() => { st.set({ alerts: { ...st.alerts, [a.id]: true } }); st.toastMsg(a.done); }}>{a.a}</button>}
        </div>
      ))}
      <Card className="sp">
        {SHIPMENTS.map((r) => {
          const fixed = r.alert && st.alerts[r.alert];
          const status = fixed ? (r.alert === "a1" ? "Delay, customer told" : "Document requested") : r.status;
          const tone: Tone = fixed ? "warn" : r.tone;
          return (
            <div key={r.id} className="lrow static">
              <div className="min0"><b>{r.id}</b> <span className="muted sm">· {r.cust}</span><div className="muted sm">{r.lane} · {r.carrier} · ETA {r.eta}</div><div className="prog"><i style={{ width: `${r.pct}%` }} /></div></div>
              <Pill tone={tone}>{status}</Pill>
            </div>
          );
        })}
      </Card>
    </>
  );
}

function ShipDocs() {
  const st = useStore();
  const docs = DOCS.map((d, i) => (i === 1 ? ([d[0], d[1], st.blIssued ? "Issued" : "Draft ready", st.blIssued ? "ok" : "warn"] as typeof d) : d));
  const f = (l: string, v: string, wide = false) => <div className={wide ? "wide" : ""}><small>{l}</small><b>{v}</b></div>;
  return (
    <>
      <Card title="SHP-2301 · Al Noor" sub="6 documents, 0 typed by hand">
        <div className="doclist">
          {docs.map((d, i) => (
            <button key={d[0]} type="button" aria-pressed={i === st.doc} onClick={() => st.set({ doc: i })}>
              <div className="min0"><b>{d[0]}</b><div className="muted sm">{d[1]}</div></div><Pill tone={d[3]}>{d[2]}</Pill>
            </button>
          ))}
        </div>
      </Card>
      <Card className="sp" title={docs[st.doc][0]} sub="Every field below came from data already in the system"
        right={st.doc === 1 ? (st.blIssued ? <Pill tone="ok">Issued as electronic B/L</Pill> : <button type="button" className="btn primary sm" onClick={() => { st.set({ blIssued: true }); st.toastMsg("Electronic B/L issued to Al Noor and the carrier"); }}>Issue B/L</button>) : <Pill tone={docs[st.doc][3]}>{docs[st.doc][2]}</Pill>}>
        <div className="bl">
          <div className="bl-top"><b>BILL OF LADING</b><span className="hash">No. OL-SHA-4471902</span></div>
          <div className="bl-grid">
            {f("Shipper", "Hangzhou Bright Appliance Co., Ltd.")}{f("Consignee", "Al Noor Home Appliances LLC, Dubai")}
            {f("Notify party", "Same as consignee")}{f("Carrier", "Oceanlink Lines")}
            {f("Vessel and voyage", "OL AURORA · 126E")}{f("Container and seal", "OLXU 482193-7 · SL0045821")}
            {f("Port of loading", "Shanghai, China")}{f("Port of discharge", "Jebel Ali, UAE")}
            {f("Description of goods", "18 pallets of household appliances, not stackable. HS 8418, 8450. Non-hazardous.", true)}
            {f("Gross weight", "21,400 kg")}{f("Measurement", "34.6 m³")}
            {f("Freight", "Prepaid")}{f("Status", st.blIssued ? "Issued 16 Sep 2026" : "Draft, awaiting release")}
          </div>
        </div>
      </Card>
    </>
  );
}

// ---------------------------------------------------------------- phase 3

export function MultiView() {
  const st = useStore();
  const list = MM_OPTS.filter((o) => st.mode === "all" || o.tags.includes(st.mode as Mode));
  const days = (o: (typeof MM_OPTS)[number]) => o.legs.reduce((a, l) => a + l[2], 0);
  const best = (fn: (o: (typeof MM_OPTS)[number]) => number) => MM_OPTS.reduce((a, b) => (fn(b) < fn(a) ? b : a));
  const modes: [string, string][] = [["all", "All modes"], ["sea", "Ocean"], ["air", "Air"], ["rail", "Rail"], ["road", "Road"], ["coastal", "Coastal"]];
  const tagC: Record<string, Tone> = { API: "ok", EDI: "ok", Portal: "idle", Email: "idle", WhatsApp: "warn" };
  const conns: [string, string, string][] = [["Oceanlink Lines", "API", "Live"], ["Pacific Crest Shipping", "API", "Live"], ["Falcon Air Cargo", "API", "Live"], ["Gulf Road Network", "API", "Live"], ["Meridian Container", "EDI", "Every 15 min"], ["Eastern Rail Freight", "Portal", "Hourly"], ["BlueHarbor Marine", "WhatsApp", "When they reply"]];
  return (
    <>
      <PhaseRail n={3} title="Every mode, with live capacity" desc="Ocean, air, rail, road and coastal options on one timeline. On the map: the plane to Riyadh, the Dammam block train, the Gulf feeder and the truck pool." />
      <Head title="Shanghai to Riyadh" sub="Al Noor's second order: 18 pallets, 21,400 kg, needed in the Riyadh warehouse by 25 Oct." />
      <div className="fchips">
        {modes.map(([k, l]) => <button key={k} type="button" aria-pressed={st.mode === k} onClick={() => st.set({ mode: k })}>{k !== "all" && MODE_I[k as Mode]}{l}</button>)}
      </div>
      <div className="stats4 sp">
        <Stat label="Cheapest" value={usd(best((o) => o.price).price)} delta={best((o) => o.price).name} />
        <Stat label="Fastest" value={`${days(best(days))} days`} delta={best(days).name} />
        <Stat label="Lowest CO₂" value={`${best((o) => o.co2).co2} t`} delta={best((o) => o.co2).name} />
        <Stat label="Routes checked" value="23" delta="5 shown, 18 ruled out" />
      </div>
      <Card className="sp" title="Door-to-door options" right={<span className="row wrap-legend">{(["sea", "coastal", "rail", "road", "air", "port"] as Mode[]).map((m) => <span key={m} className="mleg"><i style={{ background: MODE_C[m] }} />{MODE_N[m]}</span>)}</span>}>
        {list.map((o) => (
          <div key={o.id} className={`journey${st.mmSel === o.id ? " sel" : ""}`}>
            <div className="row between"><b>{o.name}</b><button type="button" className={`btn sm${st.mmSel === o.id ? "" : " ghost"}`} onClick={() => st.set({ mmSel: o.id })}>{st.mmSel === o.id ? "Selected" : "Select"}</button></div>
            <div className="muted sm">{usd(o.price)} · {o.co2} t CO₂ · {o.rel}% on time · {days(o)} days</div>
            <div style={{ width: `${(days(o) / 26) * 100}%` }}>
              <div className="jbar">{o.legs.map((l, i) => <span key={i} style={{ flex: l[2], background: MODE_C[l[0]] }} title={`${l[1]}, ${l[2]} day${l[2] > 1 ? "s" : ""}`}>{MODE_I[l[0]]}</span>)}</div>
            </div>
            <div className="row between sm"><span>{o.cap}</span><Pill tone={tagC[o.src]}>via {o.src}</Pill></div>
          </div>
        ))}
      </Card>
      <div className="card pick sp">
        <div><span className="muted sm">AI suggestion</span><h2 style={{ margin: "4px 0 6px" }}>Split the shipment</h2>
          <p className="ink2">Fly the 2 pallets of best-selling models so they're on shelves in 3 days, and send the other 16 by sea and rail. The Eid promotion starts on time for about a seventh of the full air cost.</p></div>
        <div className="num"><div className="big">USD 11,760</div><span className="muted sm">vs. USD 81,300 all by air</span>
          <div style={{ marginTop: 10 }}>{st.split ? <Pill tone="ok">Split plan booked</Pill> : <button type="button" className="btn primary" onClick={() => { st.set({ split: true }); st.toastMsg("Split plan booked: 2 pallets air, 16 sea and rail"); }}>Use split plan</button>}</div></div>
      </div>
      <Card className="sp" title="Capacity hub" sub="Space on upcoming departures, updated live" right={<Pill tone="ok" dot>Live</Pill>}>
        {MM_CAP.map((c) => (
          <div key={c[1]} className="caprow three">
            <span className="ico" style={{ background: MODE_C[c[0]] }}>{MODE_I[c[0]]}</span>
            <div className="min0"><b>{c[1]}</b><div className="muted sm">{c[2]}</div></div>
            <div className="w150"><div className="row between sm"><span>{c[3]}% booked</span><b>{c[4]}</b></div><div className={`capbar${c[3] > 90 ? " hot" : ""}`}><i style={{ width: `${c[3]}%` }} /></div></div>
          </div>
        ))}
      </Card>
      <Card className="sp" title="Carrier connections" sub="Moving from email to direct system links">
        {conns.map((c) => <div key={c[0]} className="lrow static"><b>{c[0]}</b><Pill tone={tagC[c[1]]}>{c[1]}</Pill><span className="muted sm">{c[2]}</span></div>)}
      </Card>
    </>
  );
}

// ---------------------------------------------------------------- phase 4

export function OptView() {
  const st = useStore();
  const totalCbm = LCL.reduce((a, c) => a + c.cbm, 0), lclCost = LCL.reduce((a, c) => a + c.cost, 0), fclCost = 2180 + 480 + 350;
  const risks: [Tone, string, string, string][] = [
    ["warn", "Port Klang yard congestion", "Average wait 2.1 days. 3 of your shipments pass through.", "Reroute ready"],
    ["warn", "Typhoon season, East China Sea", "Sailings around 29 Sep may slip by 1 to 2 days.", "Watching"],
    ["ok", "Jebel Ali", "Normal berthing, no delays expected.", "No action"],
  ];
  return (
    <>
      <PhaseRail n={4} title="AI that plans ahead" desc="With enough quotes and shipments on the platform, the system forecasts rates, spots disruptions early, groups small shipments and plans how cargo is loaded. The load plan is built on the yard behind this panel." />
      <Card title="3D load planning · pilot" sub="The same 32 pallets, packed with stacking and weight rules"
        right={<div className="fchips"><button type="button" aria-pressed={!st.aiPlan} onClick={() => st.set({ aiPlan: false })}>Standard</button><button type="button" aria-pressed={st.aiPlan} onClick={() => st.set({ aiPlan: true })}>AI plan</button></div>}>
        <div className="pad stack">
          {st.aiPlan ? <Pill tone="ok">All 32 pallets fit in one container</Pill> : <Pill tone="bad">12 pallets don't fit, second container needed</Pill>}
          <div className="kvs">
            <span className="muted">Containers needed</span><b>{st.aiPlan ? 1 : 2}</b>
            <span className="muted">Pallets stacked</span><b>{st.aiPlan ? "24 of 32" : "0 of 32"}</b>
            <span className="muted">Heavy cargo placement</span><b>{st.aiPlan ? "Centre, floor only" : "End of container"}</b>
            <span className="muted">Centre of gravity</span><b>{st.aiPlan ? "0.1 m from middle" : "2.4 m off centre"}</b>
            <span className="muted">Cost for this load</span><b>{st.aiPlan ? "USD 2,180" : "USD 4,360"}</b>
          </div>
          <p className="muted sm">{st.aiPlan ? "Kaizen's engine parts are heavy and can't carry weight, so they stay on the floor near the middle. Textiles, food and building supplies stack two high." : "Every pallet sits on the floor in the order it arrived. The heavy engine parts end up at the door, and a third of the cargo is left behind."}</p>
        </div>
      </Card>
      <Card className="sp" title="Rate forecast · SHA to JEA, 40' HC" sub="Built from 12,400 quotes on this lane" right={<span className="mleg"><i style={{ background: "var(--signal)" }} />Forecast range</span>} pad>
        <RateChart />
      </Card>
      <div className="card pick sp"><div><span className="muted sm">Recommendation · 78% confidence</span><h2 style={{ margin: "4px 0 6px" }}>Book this week</h2>
        <p className="ink2">Rates are likely to rise about 11% by mid-October as pre-holiday demand peaks. Booking now saves about USD 420 per container.</p></div></div>
      <Card className="sp" title="Disruption watch" sub="The typhoon and the Port Klang queue are marked on the map">
        {risks.map((r) => <div key={r[1]} className="alert flat"><span className="edge" style={{ background: r[0] === "ok" ? "var(--teal)" : "var(--signal)" }} /><div><b>{r[1]}</b><div className="muted sm">{r[2]}</div></div><Pill tone={r[0]}>{r[3]}</Pill></div>)}
      </Card>
      <Card className="sp" title="Smart consolidation" sub="4 small shipments to Jebel Ali this week, grouped into one 40' high cube"
        right={st.consol ? <Pill tone="ok">Consolidated booking created</Pill> : <button type="button" className="btn primary sm" onClick={() => { st.set({ consol: true }); st.toastMsg("Consolidated booking created for 4 customers"); }}>Consolidate</button>}>
        <div className="pad stack">
          <div className="stackbar">{LCL.map((c) => <span key={c.n} style={{ flex: c.cbm, background: c.c }} title={c.n}>{c.cbm} m³</span>)}<span style={{ flex: 76 - totalCbm, background: "transparent", color: "var(--muted)" }}>free</span></div>
          <div className="row">{LCL.map((c) => <span key={c.n} className="mleg"><i style={{ background: c.c }} />{c.n}</span>)}</div>
          <span className="muted sm">{totalCbm.toFixed(1)} of 76 m³ used · {Math.round((totalCbm / 76) * 100)}%</span>
          <div className="stats2">
            <Stat label="Shipped separately" value={usd(lclCost)} />
            <Stat label="Consolidated" value={usd(fclCost)} delta="incl. handling" />
            <Stat label="Customers save" value={usd(lclCost - fclCost)} delta={`${Math.round(((lclCost - fclCost) / lclCost) * 100)}% less`} />
            <Stat label="CO₂ avoided" value="1.4 t" delta="fewer part-loads" />
          </div>
        </div>
      </Card>
    </>
  );
}

// ---------------------------------------------------------------- phase 5

export function TrustView() {
  const st = useStore();
  const c = selectedCarrier(st);
  const total = sellPrice(c.price, st.margin), fee = Math.round(total * 0.01);
  const released = st.esc >= 6;
  let prev = "0x0000000000000000";
  const blocks = ESC_EVENTS.slice(0, st.esc).map((e, i) => {
    const h = fakeHash(e[0] + prev);
    const out = { e, h, prev, i };
    prev = h;
    return out;
  });
  const inv: [string, number, number][] = [["Ocean freight", 1850, 1850], ["Bunker surcharge", 240, 240], ["Origin terminal handling", 90, 90], ["Congestion surcharge", 0, 75]];
  return (
    <>
      <PhaseRail n={5} title="A trust layer for payments" desc="A permissioned ledger shared by the shipper, forwarder, carrier, bank and customs, drawn over Dubai. Each handover is recorded once, and payment is released automatically on delivery." />
      <Card title="Escrow for SHP-2301" sub={`${usd(total)} held until the container is delivered`}
        right={released ? <Pill tone="ok">Released</Pill> : <button type="button" className="btn primary sm" onClick={() => { st.set({ esc: st.esc + 1 }); st.toastMsg(`Recorded: ${ESC_EVENTS[st.esc][0]}`); }}>Record next event</button>}>
        <ul className="esc">
          {ESC_EVENTS.map((e, i) => (
            <li key={e[0]} className={i < st.esc ? "done" : i === st.esc ? "next" : "pend"}>
              <span className="d">{i < st.esc && <Check />}</span>
              <div><b>{e[0]}</b><div className="muted sm">{e[1]}</div></div>
              <span className="muted sm">{i < st.esc ? e[3] : ""}</span>
            </li>
          ))}
        </ul>
        {released && (
          <div className="stats2 pad">
            <Stat label={`To ${c.name.split(" ")[0]}`} value={usd(c.price)} />
            <Stat label="To Gulfway" value={usd(total - c.price - fee)} />
            <Stat label="Platform fee" value={usd(fee)} />
            <Stat label="Time to get paid" value="0 days" delta="usually 30 to 60" />
          </div>
        )}
      </Card>
      <Card className="sp" title="Ledger records" sub="Each record points to the one before it, so nobody can change history">
        <div className="chain">
          {blocks.map((b) => (
            <div key={b.i} className={`block${b.i === st.esc - 1 ? " last" : ""}`}>
              <span className="muted sm">Record {b.i + 1} · {b.e[3]}</span><b>{b.e[0]}</b><span className="sm">Signed by {b.e[1]}</span>
              <span className="hash">{b.h}</span><span className="hash muted">prev {b.prev.slice(0, 10)}…</span>
            </div>
          ))}
        </div>
      </Card>
      <Card className="sp" title="Carrier invoice check" sub="Invoice OL-INV-77120 compared with the agreed quote"
        right={st.inv ? <Pill tone={st.inv === "disputed" ? "warn" : "ok"}>{st.inv === "disputed" ? "Disputed, USD 75 held back" : "Surcharge accepted"}</Pill>
          : <div className="row"><button type="button" className="btn ghost sm" onClick={() => st.set({ inv: "accepted" })}>Accept</button><button type="button" className="btn primary sm" onClick={() => { st.set({ inv: "disputed" }); st.toastMsg("Dispute sent to Oceanlink with the signed quote attached"); }}>Dispute USD 75</button></div>}>
        {inv.map((r) => (
          <div key={r[0]} className={`lrow static${r[1] !== r[2] ? " flagrow" : ""}`}>
            <div className="min0"><b>{r[0]}</b><div className="muted sm">Agreed {r[1] ? usd(r[1]) : "not in quote"} · invoiced {usd(r[2])}</div></div>
            {r[1] === r[2] ? <Pill tone="ok">Matches</Pill> : <Pill tone="bad">Not agreed</Pill>}
          </div>
        ))}
      </Card>
    </>
  );
}

// ---------------------------------------------------------------- phase 6

export function NetView() {
  const st = useStore();
  return (
    <>
      <PhaseRail n={6} title="Network scale" desc="More lanes, more carriers and more partners. Routine shipments book themselves, and other companies build on the platform through its API. New lanes light up across the map." />
      <div className="stats4">
        <Stat label="Active lanes" value="146" delta="target by month 48" />
        <Stat label="Connected carriers" value="320" delta="all five modes" />
        <Stat label="Countries" value="38" delta="GCC, Asia, Africa, Europe" />
        <Stat label="Freight booked per month" value="USD 48M" delta="illustrative target" />
      </div>
      <Card className="sp" title="Lanes by region" pad>
        {REGIONS.map((r) => <HBar key={r[0]} label={r[0]} v={r[1]} max={42} right={r[1]} />)}
      </Card>
      <Card className="sp" title="Autopilot booking" sub="Routine shipments are booked without anyone touching them"
        right={<Toggle on={st.autopilot} label="Autopilot" onClick={() => { st.set({ autopilot: !st.autopilot }); st.toastMsg(!st.autopilot ? "Autopilot on" : "Autopilot paused, all quotes go to the desk"); }} />}>
        <div className="pad">
          <span className="muted sm">Book automatically when all are true</span>
          {AUTO_RULES.map((r) => <div key={r} className="rule"><span className="d"><Check /></span><span>{r}</span></div>)}
        </div>
        <div className="pad divider-top">
          <span className="muted sm">Today · {st.autopilot ? "61% of quotes booked automatically" : "paused"}</span>
          {AUTO_LOG.map((l) => (
            <div key={l[0]} className="autolog" style={{ opacity: st.autopilot ? 1 : 0.45 }}>
              <div className="row between"><b>{l[1]}</b><span className="muted sm">{l[0]}</span></div>
              <div className="row between"><span className="sm muted">{l[2]} · {l[5]}</span><Pill tone={l[4]}>{l[3]}</Pill></div>
            </div>
          ))}
        </div>
      </Card>
      <Card className="sp" title="Open API" sub="Shippers and software partners get quotes and book from their own systems" right={<Pill>v1</Pill>}>
        <div className="pad">
          <pre className="codeblk">{`# Get ranked quotes for a shipment
curl -X POST https://api.freightorchestrator.example/v1/quotes \\
  -H "Authorization: Bearer $API_KEY" \\
  -d '{
    "origin": "CNSHA", "destination": "SARUH",
    "cargo": { "pallets": 18, "weight_kg": 21400 },
    "deliver_by": "2026-10-25",
    "rank_by": "best_value"
  }'

# Response
{
  "quote_id": "q_8f21c",
  "options": [
    { "route": "sea+rail via SADMM", "price_usd": 2720,
      "transit_days": 24, "score": 81, "bookable": true }
  ]
}`}</pre>
        </div>
      </Card>
      <Card className="sp" title="Partner marketplace" sub="Services added to any booking">
        <div className="pad tiles">
          {APPS.map((a) => (
            <div key={a[0]} className="tile flatcard"><b>{a[1]}</b><span className="muted sm">{a[2]}</span>
              <button type="button" className={`btn sm${st.apps[a[0]] ? "" : " ghost"}`} onClick={() => st.set({ apps: { ...st.apps, [a[0]]: !st.apps[a[0]] } })}>{st.apps[a[0]] ? "Added" : "Add"}</button></div>
          ))}
        </div>
      </Card>
    </>
  );
}
