import { FileText } from "lucide-react";
import { JOBS, PARTNER_TYPES, PAYS, RATE_LANES, RFQS, SAILINGS, SCORECARD, arrive, carrierWin, sellPrice, usd } from "../../data";
import { selectedCarrier, useStore } from "../../store";
import { Banner, Card, Head, Meter, Pill, Stat, Toggle } from "../bits";
import { DemandChart } from "../charts";

const CAR_WHO = "Lin Wei, Oceanlink Lines";

// ---------------------------------------------------------------- carrier portal

export function CarrierHome() {
  const st = useStore();
  const r = RFQS.find((x) => x.id === st.rfqSel)!;
  const sent = st.cSent[r.id];
  const w = carrierWin(st.cPrice, r.lo, r.hi);
  const sl = SAILINGS.filter((s) => s.lane === r.lane);
  return (
    <>
      <Banner tone="live" who={CAR_WHO}>What carriers see. Free for carriers, so supply joins quickly.</Banner>
      <div className="welcome"><p className="muted">Oceanlink Lines · carrier portal</p><h1>Quote requests</h1></div>
      <div className="stats4">
        <Stat label="Open requests" value={RFQS.length - Object.keys(st.cSent).length + 10} delta="from 9 forwarders" />
        <Stat label="Your win rate" value="41%" delta="up from 27% on email" />
        <Stat label="Median reply time" value="12 min" delta="was 2 h by email" />
        <Stat label="Space sold, next 4 sailings" value="86%" delta="+9 points this quarter" />
      </div>
      <Card className="sp" title="Inbox" right={<span className="muted sm">Newest first</span>}>
        <div className="doclist">
          {RFQS.map((x) => (
            <button key={x.id} type="button" aria-pressed={x.id === st.rfqSel} onClick={() => st.set({ rfqSel: x.id, cPrice: Math.round((x.lo * 0.95) / 10) * 10 })}>
              <div className="min0"><b>{x.lane} · {x.eq}</b><div className="muted sm">{x.from} · reply within {x.due}</div></div>
              {st.cSent[x.id] ? <Pill tone={st.cSent[x.id] === "won" ? "ok" : "idle"}>{st.cSent[x.id] === "won" ? "Won" : "Quoted"}</Pill> : <Pill tone="warn">New</Pill>}
            </button>
          ))}
        </div>
      </Card>
      <Card className="sp" title={`${r.lane} · ${r.eq}`} sub={`${r.from} · ${r.cargo} · ready ${r.ready}`} right={<Pill tone="ok">Cargo fits, checked by platform</Pill>}>
        <div className="pad stack">
          <div>
            <span className="muted sm">Sailing</span>
            <div className="fchips mt6">
              {sl.length ? sl.map((s) => (
                <button key={s.k} type="button" aria-pressed={st.cSailing === s.k} disabled={!!sent} onClick={() => st.set({ cSailing: s.k })}>{s.v} · {s.date} · {st.cap[s.k]} TEU free</button>
              )) : <span className="muted sm">No sailing on this lane in the next 2 weeks</span>}
            </div>
          </div>
          <div>
            <div className="row between"><span className="muted sm">Your all-in rate</span><span className="big" style={{ fontSize: 32 }}>{usd(st.cPrice)}</span></div>
            <input type="range" min={Math.round((r.lo * 0.8) / 10) * 10} max={Math.round((r.hi * 1.1) / 10) * 10} step={10} value={st.cPrice} aria-label="Your rate" disabled={!!sent} onChange={(e) => st.set({ cPrice: +e.target.value })} />
            <div className="row between sm muted"><span>Market this week: {usd(r.lo)} to {usd(r.hi)}</span><span>Only {r.from} sees your rate</span></div>
          </div>
          <div className="g3">
            <div className="stat"><span className="muted sm">Chance to win</span><b style={{ color: w > 50 ? "var(--teal)" : undefined }}>{w}%</b></div>
            <div className="stat"><span className="muted sm">Last 5 wins, avg</span><b>USD 2,160</b></div>
            <div className="stat"><span className="muted sm">Margin on this box</span><b>{usd(st.cPrice - Math.round((r.lo * 0.67) / 10) * 10)}</b></div>
          </div>
          <div className="row between divider">
            <span className="muted sm">No email to write. The forwarder gets your quote as clean data.</span>
            {sent ? <Pill tone={sent === "won" ? "ok" : "idle"}>{sent === "won" ? "Won · booking received" : <><span className="spin" />Sent, forwarder is comparing</>}</Pill>
              : <button type="button" className="btn primary" onClick={() => st.carrierSend(r.id)}>Send quote</button>}
          </div>
        </div>
      </Card>
    </>
  );
}

export function CarrierCap() {
  const st = useStore();
  return (
    <>
      <Banner tone="live" who={CAR_WHO}>Free space shows on your ships at the Oceanlink terminal: solid boxes are sold, glowing ones are free.</Banner>
      <Head title="Capacity and rates" sub="Publish free space once instead of answering the same question in 50 emails. Rates stay private to the forwarders you choose."
        right={st.rateSheet ? <Pill tone="ok">214 rates updated</Pill> : <button type="button" className="btn primary sm" onClick={() => { st.set({ rateSheet: true }); st.toastMsg("Excel rate sheet read: 214 rates updated"); }}>Upload rate sheet</button>} />
      <Card title="Your upcoming sailings" sub="Changes reach every forwarder's comparison instantly" right={<Pill tone="ok" dot>Published</Pill>}>
        {SAILINGS.map((s) => {
          const sold = Math.round((1 - st.cap[s.k] / s.total) * 100);
          return (
            <div key={s.k} className="sailrow">
              <div className="min0"><b>{s.v}</b><div className="muted sm">{s.lane} · departs {s.date} · cut-off {s.cut}</div>
                <div className="row nowrap mt6"><div className="capbar grow"><i style={{ width: `${sold}%` }} /></div><span className="sm">{sold}% sold</span></div></div>
              <div className="stepper">
                <button type="button" className="btn ghost sm" aria-label={`Less space on ${s.v}`} onClick={() => st.set({ cap: { ...st.cap, [s.k]: Math.max(0, st.cap[s.k] - 50) } })}>−</button>
                <b>{st.cap[s.k]}<small> TEU</small></b>
                <button type="button" className="btn ghost sm" aria-label={`More space on ${s.v}`} onClick={() => st.set({ cap: { ...st.cap, [s.k]: Math.min(s.total, st.cap[s.k] + 50) } })}>+</button>
              </div>
            </div>
          );
        })}
      </Card>
      <Card className="sp" title="Rate cards" sub="Choose who can see each lane's rates">
        {RATE_LANES.map((l) => (
          <div key={l[0]} className="caprow three">
            <div className="min0"><b>{l[1]}</b><div className="muted sm">40' HC from {l[2]}</div></div>
            <span className="muted sm">{st.shared[l[0]] ? (l[3] === "Hidden" ? "4 forwarders" : l[3]) : "Hidden"}</span>
            <Toggle on={st.shared[l[0]]} label={`Share ${l[1]}`} onClick={() => st.set({ shared: { ...st.shared, [l[0]]: !st.shared[l[0]] } })} />
          </div>
        ))}
      </Card>
      <Card className="sp" title="Demand on your lanes" sub="Quote requests for SHA → JEA, past 4 and next 4 weeks" pad>
        <DemandChart />
        <p className="muted sm mt">Demand is expected to peak in 3 weeks. Hold some space on OL BOREAS for better rates.</p>
      </Card>
    </>
  );
}

export function CarrierPerf() {
  return (
    <>
      <Banner tone="live" who={CAR_WHO}>Scorecards and fast payment are the strongest reasons for carriers to stay.</Banner>
      <Head title="Performance and payments" sub="Carriers see the same scorecard forwarders use to rank them, and get paid the day cargo is delivered." />
      <Card title="Your scorecard" right={<Pill tone="ok">Ranked #2 on your main lane</Pill>}>
        <div className="pad stack">
          {SCORECARD.map((s) => (
            <div key={s[0]}><div className="row between"><b>{s[0]}</b><b>{s[1]}</b></div><Meter v={s[3]} /><span className="muted sm">{s[2]}</span></div>
          ))}
          <p className="muted sm">Tip: 3 of your last 20 invoices had charges that weren't in the quote. Fixing this would move you to #1.</p>
        </div>
      </Card>
      <Card className="sp" title="Payments" sub="Released automatically from escrow on delivery">
        <div className="stats3 pad">
          <Stat label="Paid this month" value="USD 1.9M" />
          <Stat label="Held in escrow" value="USD 640K" />
          <Stat label="Average days to cash" value="0.4" delta="was 47 days" />
        </div>
        {PAYS.map((p) => (
          <div key={p[0]} className="lrow static">
            <div className="min0"><b>{p[0]}</b> <span className="muted sm">· {p[1]}</span><div className="muted sm">{p[5]}</div></div>
            <b className="sm">{p[2]}</b>
            <Pill tone={p[4]}>{p[3]}</Pill>
          </div>
        ))}
      </Card>
    </>
  );
}

// ---------------------------------------------------------------- partner portal

export function PartnerJobs() {
  const st = useStore();
  const earned = JOBS.filter((j) => st.jobs[j.id]).reduce((a, j) => a + j.fee, 0);
  return (
    <>
      <Banner tone="road" who="Amal Saeed, Al Safa Customs Brokers">What service partners see. Customs brokers first, then insurers, warehouses and truckers.</Banner>
      <Head title="Job queue" sub="Jobs arrive with every document attached and checked, so a declaration takes minutes instead of a morning of chasing paperwork."
        right={<div className="num"><span className="muted sm">Accepted today</span><div className="big" style={{ fontSize: 30 }}>{usd(earned)}</div></div>} />
      {JOBS.map((j) => (
        <Card key={j.id} className="sp" title={`${j.ref} · ${j.who}`} sub={`${j.what} · arrives ${j.eta} · via Gulfway Logistics`}>
          <div className="pad stack">
            <div className="row">{j.missing ? <Pill tone="bad">Missing: {j.missing}</Pill> : <Pill tone="ok">All documents attached</Pill>}
              {st.jobs[j.id] ? <Pill tone="ok">Accepted</Pill> : <button type="button" className={`btn sm${j.missing ? " ghost" : " primary"}`} onClick={() => { st.set({ jobs: { ...st.jobs, [j.id]: true } }); st.toastMsg(`Job accepted · USD ${j.fee}`); }}>Accept for {usd(j.fee)}</button>}</div>
            <div><span className="muted sm">Documents</span><div className="row mt6">{j.docs.map((d) => <span key={d} className="chip">{d}</span>)}</div></div>
            <div className="g2"><div><span className="muted sm">Suggested HS codes</span><div><b>{j.hs}</b></div></div><div><span className="muted sm">Duty estimate</span><div><b>{j.duty}</b></div></div></div>
          </div>
        </Card>
      ))}
      <Card className="sp" title="Service partners on the network" sub="Each partner type adds revenue to every booking">
        <div className="tiles pad">
          {PARTNER_TYPES.map((t) => <div key={t[0]} className="tile flatcard"><b>{t[0]}</b><span className="muted sm">{t[1]}</span><Pill tone={t[2].startsWith("Live") ? "ok" : "idle"}>{t[2]}</Pill></div>)}
        </div>
      </Card>
    </>
  );
}

// ---------------------------------------------------------------- shipper portal

export function ShipperHome() {
  const st = useStore();
  const c = selectedCarrier(st);
  const total = sellPrice(c.price, st.margin);
  const reqs: [string, string, string, string, "ok" | "warn" | "idle", string][] = [
    ["RQ-0142", "Shanghai → Jebel Ali", "18 pallets · 21,400 kg", st.approved ? "Booked" : "Quote ready", st.approved ? "ok" : "warn", "Today"],
    ...st.shReq,
    ["RQ-0139", "Nhava Sheva → Jebel Ali", "6 pallets · 4,100 kg", "Collecting rates", "idle", "Yesterday"],
    ["RQ-0136", "Shanghai → Riyadh", "18 pallets · 21,400 kg", "Quote ready", "warn", "Yesterday"],
  ];
  const moving: [string, string, string, string, number, string][] = [
    ["SHP-2301", "Shanghai → Jebel Ali", "Sailed 26 Sep", "14 Oct", 22, "On time"],
    ["SHP-2270", "Shanghai → Jebel Ali", "Delivered", "12 Sep", 100, "Delivered"],
    ["SHP-2264", "Ningbo → Jebel Ali", "In transit", "4 Oct", 68, "On time"],
  ];
  return (
    <>
      <Banner tone="live" who="Sara Haddad, Al Noor Home Appliances">What the shipper sees. They deal with their forwarder, never with carriers.</Banner>
      <div className="welcome row between end">
        <div><p className="muted">Your forwarder: Gulfway Logistics</p><h1>Good morning, Sara</h1></div>
        <button type="button" className="btn primary" onClick={() => st.set({ shNew: !st.shNew })}>{st.shNew ? "Close form" : "New shipment request"}</button>
      </div>
      {st.shNew && (
        <Card className="sp" title="New request" sub="Or just email it. Gulfway's desk reads either the same way.">
          <div className="form">
            {[["From", "Shanghai, CN"], ["To", "Jebel Ali, AE"], ["Cargo", "12 pallets, washing machines"], ["Ready date", "5 Oct 2026"]].map(([l, v]) => (
              <div key={l} className="fld"><label>{l}</label><div className="in">{v}</div></div>
            ))}
          </div>
          <div className="pad dropzone">
            <span className="muted sm">Drop the packing list or purchase order here. Details are read automatically.</span>
            <button type="button" className="btn primary sm" onClick={() => { st.set({ shReq: [["RQ-0143", "Shanghai → Jebel Ali", "12 pallets · washing machines", "Collecting rates", "idle", "Just now"]], shNew: false }); st.toastMsg("Request sent to Gulfway Logistics"); }}>Send request</button>
          </div>
        </Card>
      )}
      <div className="stats4 sp">
        <Stat label="Open requests" value={reqs.filter((r) => r[4] !== "ok").length} delta="quotes usually same day" />
        <Stat label="Waiting for you" value={st.approved ? 1 : 2} delta="quotes ready to approve" />
        <Stat label="In transit" value="4" delta="2 arriving this month" />
        <Stat label="Delivered on time" value="96%" delta="last 90 days" />
      </div>
      <div className="card pick sp">
        <div className="min0"><span className="muted sm">Quote ready · Q-0916-0142</span>
          <div className="row nowrap" style={{ margin: "6px 0 4px" }}><div className="code" style={{ fontSize: 24 }}>SHA</div><div className="lanearrow" style={{ width: 44 }} /><div className="code" style={{ fontSize: 24 }}>JEA</div></div>
          <p className="ink2">Gulfway Logistics · {c.via === "Direct" ? "direct sailing" : "via " + c.via} · {c.days} days · arrives {arrive(c.days)}</p>
          <p className="muted sm">Includes ocean freight, documents and B/L. Carrier chosen by Gulfway from 6 offers.</p></div>
        <div className="num"><div className="big">{usd(total)}</div>
          <div style={{ marginTop: 10 }}>{st.approved ? <Pill tone="ok">Approved · booked</Pill> : <button type="button" className="btn primary" onClick={st.approve}>Approve and book</button>}</div></div>
      </div>
      <Card className="sp" title="Your requests" right={<span className="muted sm">Last 7 days</span>}>
        {reqs.map((r) => <div key={r[0]} className="lrow static"><div className="min0"><b>{r[0]}</b> <span className="muted sm">· {r[1]}</span><div className="muted sm">{r[2]} · {r[5]}</div></div><Pill tone={r[4]}>{r[3]}</Pill></div>)}
      </Card>
      <Card className="sp" title="On the water" right={<span className="muted sm">{st.approved ? "Your new booking is sailing on the map" : "Live"}</span>}>
        {moving.map((m) => (
          <div key={m[0]} className="lrow static">
            <div className="min0"><b>{m[0]}</b><div className="muted sm">{m[1]} · {m[2]} · ETA {m[3]}</div><div className="prog"><i style={{ width: `${m[4]}%` }} /></div></div>
            <Pill tone="ok">{m[5] === "Delivered" ? "Done" : m[5]}</Pill>
          </div>
        ))}
        <p className="pad muted sm">Every milestone reaches you without asking. Exceptions arrive as an alert, not a phone call.</p>
      </Card>
    </>
  );
}

export function ShipperDocs() {
  const st = useStore();
  const c = selectedCarrier(st);
  const docs: [string, string, string, "ok" | "idle"][] = [["Bill of lading", "SHP-2301", "Issued", "ok"], ["Commercial invoice", "SHP-2301", "Matched to your PO", "ok"], ["Packing list", "SHP-2301", "Uploaded by supplier", "ok"], ["Certificate of origin", "SHP-2301", "Verified", "ok"], ["Customs declaration", "SHP-2301", "Filed by Al Safa Brokers", "ok"], ["Arrival notice", "SHP-2270", "Delivered 12 Sep", "idle"]];
  const inv: [string, string, string, string, "ok" | "warn"][] = [["INV-5521", "SHP-2301", usd(sellPrice(c.price, st.margin)), st.shPaid ? "Paid" : "Due 14 Oct", st.shPaid ? "ok" : "warn"], ["INV-5498", "SHP-2270", "USD 2,540", "Paid", "ok"], ["INV-5470", "SHP-2264", "USD 1,980", "Paid", "ok"]];
  return (
    <>
      <Banner tone="live">One place for every document and invoice, instead of chasing email threads.</Banner>
      <Head title="Documents and invoices" sub="Shared automatically as each document is issued. Forward them to your bank and broker." />
      <Card title="Documents" right={<span className="muted sm">6 files</span>}>
        {docs.map((d) => <div key={d[0]} className="lrow static"><span className="chan"><FileText size={16} /></span><div className="min0 grow"><b>{d[0]}</b><div className="muted sm">{d[1]} · {d[2]}</div></div><Pill tone={d[3]}>Ready</Pill></div>)}
      </Card>
      <Card className="sp" title="Invoices" sub="Charges match the quote you approved, line by line"
        right={st.shPaid ? <Pill tone="ok">All settled</Pill> : <button type="button" className="btn primary sm" onClick={() => { st.set({ shPaid: true }); st.toastMsg("Payment sent into escrow, released on delivery"); }}>Pay INV-5521</button>}>
        {inv.map((i) => <div key={i[0]} className="lrow static"><div className="min0"><b>{i[0]}</b><div className="muted sm">{i[1]}</div></div><b className="sm">{i[2]}</b><Pill tone={i[4]}>{i[3]}</Pill></div>)}
        <p className="pad muted sm">Paid into escrow and released to the carrier when delivery is signed, so nobody argues about surcharges later.</p>
      </Card>
    </>
  );
}
