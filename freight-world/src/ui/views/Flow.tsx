import { FileText, Globe, Mail, MessageCircle } from "lucide-react";
import { useState, type ReactNode } from "react";
import { BOXES, C, CBM, CHAN, FIELDS, FORM_FIELDS, PRESETS, S, arrive, sellPrice, usd, type Src, type Weights } from "../../data";
import { maxStep, pendingFields, ranked, selectedCarrier, useStore } from "../../store";
import { Card, Check, Head, Meter, Mono, Pill, Ring, Stat } from "../bits";
import { Scatter } from "../charts";

export const CHAN_ICON: Record<Src, ReactNode> = {
  email: <Mail size={14} />, pdf: <FileText size={14} />, whatsapp: <MessageCircle size={14} />, portal: <Globe size={14} />,
};
const STEP_NAMES = ["Request", "RFQ", "Extract", "Compare", "Quote", "Track"];

export function FlowHeader() {
  const st = useStore();
  const c = selectedCarrier(st);
  const top = maxStep(st);
  return (
    <div className="card flowhead">
      <div className="shipstrip">
        <div className="lanept">
          <div className="code">SHA<small>Shanghai · ready {S.ready}</small></div>
          <div className="lanearrow" />
          <div className="code">JEA<small>Jebel Ali · by {S.deadline}</small></div>
        </div>
        {st.approved ? <Pill tone="ok" dot>Booked with {c.name}</Pill> : st.step >= 4 ? <Pill tone="warn" dot>Awaiting decision</Pill> : <Pill dot>New request</Pill>}
      </div>
      <div className="chips">
        <span className="chip">{S.customer}</span><span className="chip">{S.pallets} pallets</span><span className="chip">{S.weight.toLocaleString()} kg</span><span className="chip">{CBM} m³</span><span className="chip">Non-hazardous</span>
      </div>
      <nav className="steps" aria-label="Walkthrough steps">
        {STEP_NAMES.map((n, i) => {
          const k = i + 1;
          return (
            <button key={n} type="button" className={`step${k < st.step ? " done" : ""}${k === st.step ? " cur" : ""}`} disabled={k > top} onClick={() => st.go(k)} aria-current={k === st.step ? "step" : undefined}>
              <span className="n">{k < st.step ? <Check /> : k}</span>
              <b>{n}</b>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

// ---------------------------------------------------------------- step 1

function Mk({ f, children }: { f: string; children: ReactNode }) {
  const fillCount = useStore((s) => s.fillCount);
  const filling = useStore((s) => s.filling);
  const idx = FORM_FIELDS.findIndex((x) => x[0] === f);
  return <mark className={filling && idx === fillCount - 1 ? "lit" : ""}>{children}</mark>;
}

function Step1() {
  const st = useStore();
  return (
    <>
      <Head title="Shipper request" sub="Sara from Al Noor sent a plain email. The details are pulled into a structured request, ready for carriers." />
      <Card>
        <div className="mail-h">
          <span className="avatar" style={{ background: "var(--teal-soft)", color: "var(--teal)" }}>SH</span>
          <div className="min0"><b>{S.contact}</b> <span className="muted sm">· Al Noor Home Appliances</span><div className="sm muted">Need a rate for next week's Shanghai shipment · 09:58</div></div>
        </div>
        <div className="mail-b">
          Hi team,<br /><br />
          We have a new order of <Mk f="com">household appliances</Mk> ready at our supplier in <Mk f="pol">Shanghai</Mk> from <Mk f="date">20 September</Mk>, going to <Mk f="pod">Jebel Ali</Mk>. It's <Mk f="pkg">18 pallets</Mk>, each <Mk f="dim">120×100×160 cm</Mk>, total <Mk f="wt">21.4 tons</Mk>. Pallets can't be double stacked. We need it in our Dubai warehouse by <Mk f="date">20 October</Mk> at the latest for the Eid promotion.<br /><br />
          Can you send us your best option today?<br /><br />Thanks,<br />Sara
        </div>
      </Card>
      <Card
        className="sp"
        title="Structured request"
        sub={st.filled ? "8 of 8 fields filled from the email" : st.filling ? `Reading… ${st.fillCount} of 8` : "Waiting to read the email"}
        right={st.filled ? <Pill tone="ok">Ready for carriers</Pill> : <button type="button" className="btn sm" disabled={st.filling} onClick={st.autofill}>{st.filling ? <><span className="spin" />Reading</> : "Read the email"}</button>}
      >
        <div className="form">
          {FORM_FIELDS.map(([k, label, v], i) => {
            const on = i < st.fillCount;
            return (
              <div key={k} className="fld">
                <label>{label}</label>
                <div className={`in${on ? " filled" : ""}`}>
                  <span>{on ? v : ""}</span>
                  {st.filling && i === st.fillCount - 1 && <span className="caret" />}
                  <span className="ai">AI</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      <Card className="sp" title="Container fit check" sub="18 pallets laid out on real container floor plans, on the load-planning yard" right={st.filled ? <Pill tone="ok">Suggested: 1 × 40' container</Pill> : null}>
        {st.filled ? (
          <div className="fitlist">
            {BOXES.map((b) => (
              <div key={b.key} className="fitrow">
                <div className="row between"><b>{b.name}</b>{b.ok ? <Pill tone="ok">Fits</Pill> : <Pill tone="bad">Doesn't fit</Pill>}</div>
                <div className="kvs">
                  <span className="muted">Floor spots</span><b>{Math.min(S.pallets, b.cols * 2)} of {S.pallets} pallets</b>
                  <span className="muted">Weight</span><b>{S.weight.toLocaleString()} / {b.payload.toLocaleString()} kg</b>
                </div>
                <Meter v={(S.weight / b.payload) * 100} />
                <span className="muted sm">Door height {b.door} m, pallets 1.6 m · {b.ok ? b.note : `${S.pallets - b.cols * 2} pallets left over`}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="pad muted center">Read the email to run the fit check.</p>
        )}
      </Card>
    </>
  );
}

// ---------------------------------------------------------------- step 2

function Step2() {
  const st = useStore();
  const m = st.rfqMin;
  const feed = st.rfqGot.map((id) => C(id)).reverse();
  const verb: Record<Src, string> = { portal: "replied via carrier portal", email: "replied by email", pdf: "sent a PDF quotation", whatsapp: "replied on WhatsApp, with a voice note" };
  return (
    <>
      <Head title="Request for quote" sub="Sent to six carriers at 10:00, each on the channel they already use. The desk doesn't chase anyone." />
      <Card className="timer-card">
        <div className="row between end pad">
          <div><span className="muted sm">Time since RFQ (h:mm, sped up)</span><div className="timer">{Math.floor(m / 60)}:{String(m % 60).padStart(2, "0")}</div></div>
          <div className="num"><span className="muted sm">Replies</span><div className="price">{st.rfqGot.length} / 6</div></div>
        </div>
      </Card>
      <div className="cgrid sp">
        {st.carriers.map((c) => {
          const got = st.rfqGot.includes(c.id);
          return (
            <div key={c.id} className={`card cc${got ? " got" : ""}`}>
              <div className="row nowrap"><Mono id={c.id} color={c.color} /><div className="min0"><b className="ellip">{c.name}</b><div className="chan">{CHAN_ICON[c.src]}{CHAN[c.src]}</div></div></div>
              <div className="row between">
                {got ? <><div><div className="price">{usd(c.price)}</div><span className="muted sm">{c.eq} · reply in {c.reply} min</span></div><Pill tone="ok">Quoted</Pill></> : <><span className="muted sm">Sent 10:00</span><Pill><span className="spin" />Waiting</Pill></>}
              </div>
            </div>
          );
        })}
      </div>
      <Card className="sp" title="Replies" sub="Collected into one thread as they arrive">
        <ul className="feed">
          {feed.length === 0 && <li className="muted">RFQs sent. Replies will appear here.</li>}
          {feed.map((c) => (
            <li key={c.id}><span className="muted">{Math.floor((600 + c.reply) / 60)}:{String((600 + c.reply) % 60).padStart(2, "0")}</span><span><b>{c.name}</b> {verb[c.src]}</span></li>
          ))}
        </ul>
      </Card>
    </>
  );
}

// ---------------------------------------------------------------- step 3

function Hl({ f, lit, children }: { f: string; lit: string | null; children: ReactNode }) {
  return <mark className={lit === f ? "lit" : ""}>{children}</mark>;
}

function SourceView({ id, lit }: { id: string; lit: string | null }) {
  const c = C(id);
  if (id === "OL")
    return (
      <>
        <div className="mail-h"><span className="avatar" style={{ background: c.color, color: "#fff" }}>OL</span><div className="min0"><b>Lin Wei · Oceanlink Lines</b><div className="sm muted">RE: RFQ SHA–JEA 1x40HC appliances · 10:31</div></div></div>
        <div className="mail-b pre">
          Dear team,{"\n\n"}Pls find our best offer for <Hl f="eq" lit={lit}>1x40HC</Hl> Shanghai to Jebel Ali:{"\n\n"}
          <Hl f="brk" lit={lit}>O/F USD 1,850 + BAF 240 + THC origin 90</Hl>{"\n"}= all in <Hl f="rate" lit={lit}>USD 2,180</Hl>{"\n"}
          <Hl f="via" lit={lit}>Direct service</Hl>, T/T abt <Hl f="tt" lit={lit}>18 days</Hl>{"\n"}Vsl OL AURORA V.126E, CY cut off <Hl f="cut" lit={lit}>24/09</Hl>{"\n"}
          <Hl f="valid" lit={lit}>Validity till 30/09</Hl>. Subject to space & equipment.{"\n\n"}Rgds, Lin
        </div>
      </>
    );
  if (id === "MC")
    return (
      <>
        <div className="mail-h"><span className="chan"><FileText size={16} /></span><div><b>Quotation_MC-88412.pdf</b><div className="sm muted">Attached to email from Meridian Container · 10:44</div></div></div>
        <div className="pdf">
          <div className="pdf-top"><b>MERIDIAN CONTAINER</b><span className="sm muted">Quotation MC-88412 · page 1 of 2</span></div>
          <div className="scroll-x"><table><thead><tr><th>POL</th><th>POD</th><th>EQP</th><th className="num">OFT</th><th className="num">SURCH</th><th className="num">TOTAL</th></tr></thead>
            <tbody><tr><td>CNSHA</td><td>AEJEA</td><td><Hl f="eq" lit={lit}>40HQ</Hl></td><td className="num"><Hl f="brk" lit={lit}>1,640</Hl></td><td className="num"><Hl f="brk" lit={lit}>300</Hl></td><td className="num"><b><Hl f="rate" lit={lit}>1,940</Hl></b></td></tr></tbody></table></div>
          <div className="meta">
            <span>Routing</span><span><Hl f="via" lit={lit}>T/S Colombo</Hl></span>
            <span>Transit</span><span><Hl f="tt" lit={lit}>24 days</Hl> port to port</span>
            <span>Closing</span><span><Hl f="cut" lit={lit}>25-Sep-2026 12:00</Hl></span>
            <span>Terms</span><span>All rates USD, <Hl f="valid" lit={lit}>valid until 05-Oct-2026</Hl>. 7 days free time at POD.</span>
          </div>
        </div>
      </>
    );
  const bub = (t: ReactNode, time: string) => <div className="bub">{t}<time>{time}</time></div>;
  return (
    <>
      <div className="mail-h"><span className="avatar" style={{ background: "#25D366", color: "#083" }}>R</span><div><b>Rahul · BlueHarbor sales</b><div className="sm muted">WhatsApp Business · 10:45</div></div></div>
      <div className="wa">
        {bub("hi bro for SHA to JEA", "10:42")}
        {bub(<><Hl f="eq" lit={lit}>40hc</Hl> can do <Hl f="rate" lit={lit}>2050 all in</Hl></>, "10:42")}
        {bub("usd ofc 😄", "10:43")}
        {bub(<><Hl f="via" lit={lit}>via klang</Hl>, around <Hl f="tt" lit={lit}>20 days</Hl></>, "10:43")}
        <div className="bub voice"><b className="sm">🎤 Voice note · 0:14</b><br /><span className="muted sm">Transcript:</span> "cut off is the <Hl f="cut" lit={lit}>twenty fourth</Hl>, vessel is BH Meridian, space ok for now"<time>10:44</time></div>
        {bub("confirm fast pls space tight", "10:45")}
      </div>
    </>
  );
}

function Step3() {
  const st = useStore();
  const [lit, setLit] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const need = pendingFields(st);
  const fields = FIELDS[st.src];
  return (
    <>
      <Head title="Replies, read by AI" sub="Three very different formats. Hover or tap a field to see exactly where it came from." right={need ? <Pill tone="warn">{need} fields need a person</Pill> : <Pill tone="ok">All 6 replies verified</Pill>} />
      <div className="srcs" role="tablist">
        {["OL", "MC", "BH"].map((id) => {
          const c = C(id);
          const pend = pendingFields(st, id);
          return (
            <button key={id} type="button" role="tab" aria-selected={st.src === id} onClick={() => st.set({ src: id, editing: null })}>
              <Mono id={id} color={c.color} size={28} />
              <span className="min0"><b className="ellip">{c.name}</b><span className="chan">{CHAN_ICON[c.src]}{CHAN[c.src]}</span></span>
              {pend > 0 && <Pill tone="warn">{pend}</Pill>}
            </button>
          );
        })}
      </div>
      <Card className="sp">{<SourceView id={st.src} lit={lit} />}</Card>
      <Card className="sp" title="Extracted" right={<span className="muted sm">Confidence</span>}>
        {fields.map(([k, label, v0, conf, action]) => {
          const key = st.src + k;
          const res = st.resolved[key];
          const ed = st.edits[key];
          const val = ed ? ed.to : v0;
          const meter = conf ? <span className={`conf${conf < 80 ? " low" : ""}`}><Meter v={conf} tone={conf < 80 ? "warn" : undefined} />{conf}%</span> : null;
          const act = action && !res ? <button type="button" className="btn ghost sm" onClick={() => st.resolve(key, action === "ask" ? "ask" : "ok")}>{action === "ask" ? "Ask carrier" : "Confirm"}</button> : null;
          return (
            <div key={k} className={`xf${lit === k ? " lit" : ""}`} onMouseEnter={() => setLit(k)} onMouseLeave={() => setLit(null)} onFocus={() => setLit(k)} onClick={() => setLit(k)}>
              <span className="k">{label}</span>
              {ed ? <Pill tone="warn">Corrected</Pill> : res ? <Pill tone="ok">{res === "ask" ? "Follow-up sent" : "Confirmed"}</Pill> : act ?? meter}
              <div className="vrow">
                {st.editing === key ? (
                  <>
                    <input id="editbox" className="ebox" value={draft} autoFocus onChange={(e) => setDraft(e.target.value)} aria-label={`Correct ${label}`} onKeyDown={(e) => e.key === "Enter" && st.saveEdit(key, label, val, draft.trim())} />
                    <button type="button" className="btn primary sm" onClick={() => st.saveEdit(key, label, val, draft.trim())}>Save</button>
                    <button type="button" className="btn ghost sm" onClick={() => st.set({ editing: null })}>Cancel</button>
                  </>
                ) : (
                  <>
                    <span className="v" style={conf === 0 && !ed ? { color: "var(--muted)" } : undefined}>{val}</span>
                    {ed && <span className="muted sm strike">{ed.from}</span>}
                    <button type="button" className="ebtn" onClick={() => { setDraft(val); st.set({ editing: key }); }}>Edit</button>
                    {act && meter}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </Card>
      <EditLog />
    </>
  );
}

function EditLog() {
  const edits = useStore((s) => s.edits);
  const resolved = useStore((s) => s.resolved);
  const list = Object.entries(edits);
  const res = Object.entries(resolved);
  if (!list.length && !res.length)
    return <Card className="sp" title="When the AI gets it wrong" sub="Edit any extracted field, or confirm a flagged one. Every change is logged and feeds back into the model." right={<Pill>No corrections yet</Pill>} />;
  return (
    <Card className="sp" title="Correction log" sub="Every change is attributed, reversible, and used to improve extraction" right={<Pill tone="ok">{list.length + res.length} this session</Pill>}>
      {list.map(([k, e]) => (
        <div key={k} className="caprow"><div><b>{e.label} corrected</b><div className="muted sm">{C(k.slice(0, 2)).name} · <span className="strike">{e.from}</span> → <b>{e.to}</b></div></div><span className="muted sm">Jebel Ali desk · {e.when}</span></div>
      ))}
      {res.map(([k, kind]) => (
        <div key={k} className="caprow"><div><b>{kind === "ask" ? "Follow-up sent to carrier" : "Flagged field confirmed"}</b><div className="muted sm">{C(k.slice(0, 2)).name} · handled by a person before ranking</div></div><Pill tone="ok">Closed</Pill></div>
      ))}
      <p className="pad muted sm">BlueHarbor sends voice notes, the hardest format to read. After 3 corrections, extraction confidence on that carrier rose from 79% to 94%. Corrections are the training data nobody else has.</p>
    </Card>
  );
}

// ---------------------------------------------------------------- step 4

function Step4() {
  const st = useStore();
  const list = ranked(st);
  const top = list[0];
  const sel = selectedCarrier(st);
  const el = st.carriers.filter((c) => c.fit);
  const cheapest = [...el].sort((a, b) => a.price - b.price)[0];
  const why = top.id === cheapest.id
    ? "Lowest all-in price of the options that actually work for this cargo."
    : `${usd(top.price - cheapest.price)} more than ${cheapest.name.split(" ")[0]}, but ${cheapest.days - top.days > 0 ? `${cheapest.days - top.days} days faster and ` : ""}${top.rel - cheapest.rel > 0 ? `${top.rel - cheapest.rel} points more reliable` : "better on your priorities"}.`;
  const maxP = Math.max(...el.map((c) => c.price));
  const sliders: [keyof Weights, string][] = [["price", "Price"], ["speed", "Speed"], ["rel", "Reliability"], ["co2", "CO₂"]];
  return (
    <>
      <Head title="Compare and choose" sub="Two replies were ruled out automatically. The other four are scored on what matters for this shipment. On the map, the winner's beacon rises highest." />
      <Card pad title="What matters for this customer?" sub="Presets, or tune the weights yourself">
        <div className="seg">
          {Object.entries(PRESETS).map(([k, p]) => (
            <button key={k} type="button" aria-pressed={st.preset === k} onClick={() => st.setPreset(k)}>{p.label}</button>
          ))}
        </div>
        <div className="sliders">
          {sliders.map(([k, l]) => (
            <div key={k} className="sl">
              <label htmlFor={`w-${k}`}>{l}</label><output>{st.w[k]}</output>
              <input id={`w-${k}`} type="range" min={0} max={100} step={5} value={st.w[k]} onChange={(e) => st.setWeight(k, +e.target.value)} />
            </div>
          ))}
        </div>
      </Card>
      <div className="card pick sp">
        <div className="min0">
          <span className="muted sm">Top match · {PRESETS[st.preset]?.label ?? "Custom weights"}</span>
          <div className="row nowrap" style={{ margin: "6px 0 4px" }}><Mono id={top.id} color={top.color} /><h2 className="ellip">{top.name}</h2></div>
          <p className="ink2">{why}</p>
        </div>
        <div className="num"><div className="big">{usd(top.price)}</div><span className="muted sm">{top.days} days · {top.rel}% on time</span></div>
      </div>
      <Card className="sp" title="Price against transit" right={<span className="muted sm">Bubble size shows on-time record</span>} pad>
        <Scatter ranked={list} selected={sel.id} onPick={(id) => st.set({ selected: id })} />
      </Card>
      <Card className="sp">
        {list.map((c, i) => (
          <div key={c.id} className={`opt${c.id === sel.id ? " sel" : ""}`}>
            <span className="rk">{i + 1}</span>
            <Mono id={c.id} color={c.color} />
            <div className="min0">
              <b className="ellip">{c.name}</b>
              <div className="muted sm">{c.eq} · {c.via === "Direct" ? "Direct" : "Via " + c.via} · cut-off {c.cut}</div>
              <div className="optm">
                <span><b>{usd(c.price)}</b><Meter v={(c.price / maxP) * 100} tone="ink" /></span>
                <span><b>{c.days} d</b><Meter v={(c.days / 26) * 100} tone="ink" /></span>
                <span><b>{c.rel}%</b><Meter v={c.rel} /></span>
                <span><b>{c.co2.toFixed(1)} t</b><Meter v={(c.co2 / 2.5) * 100} tone="ink" /></span>
              </div>
            </div>
            <Ring v={c.score} color={i === 0 ? "var(--signal)" : "var(--teal)"} />
            <button type="button" className={`btn sm${c.id === sel.id ? "" : " ghost"}`} onClick={() => st.set({ selected: c.id })}>{c.id === sel.id ? "Selected" : "Select"}</button>
          </div>
        ))}
        <details className="excl">
          <summary>2 ruled out before ranking</summary>
          {st.carriers.filter((c) => !c.fit).map((c) => (
            <div key={c.id} className="exrow"><Mono id={c.id} color={c.color} /><div><b>{c.name}</b><div className="sm">{c.eq} · {usd(c.price)}</div></div><Pill tone="bad">{c.reason}</Pill></div>
          ))}
        </details>
      </Card>
    </>
  );
}

// ---------------------------------------------------------------- step 5

function Step5() {
  const st = useStore();
  const c = selectedCarrier(st);
  const total = sellPrice(c.price, st.margin);
  const profit = total - c.price - 60;
  const lo = 2300, hi = 2650;
  const pos = Math.max(0, Math.min(100, ((total - 2200) / 550) * 100));
  const win = Math.round(Math.max(8, Math.min(88, 86 - ((total - 2250) / 400) * 45)));
  const zone: [("bad" | "warn" | "ok"), string] = total > hi ? ["bad", "Above market"] : total < lo ? ["warn", "Below market"] : ["ok", "Within market range"];
  return (
    <>
      <Head title="Price it and send it" sub="The forwarder sets the margin against this week's market. The customer sees a clean quote on their phone." />
      <div className="card pad row nowrap">
        <Mono id={c.id} color={c.color} />
        <div className="min0"><h3 className="ellip">{c.name}</h3><p className="muted sm">{c.eq} · {c.via === "Direct" ? "Direct" : "Via " + c.via} · {c.days} days · cut-off {c.cut}</p></div>
        <button type="button" className="btn ghost sm ml" onClick={() => st.go(4)}>Change</button>
      </div>
      <div className="card pad stack sp">
        <div className="row between"><h3>Margin</h3><span className="big" style={{ fontSize: 30 }}>{st.margin}%</span></div>
        <input type="range" min={4} max={30} value={st.margin} aria-label="Margin" disabled={st.sent} onChange={(e) => st.set({ margin: +e.target.value })} />
        <div className="g3">
          <div><span className="muted sm">Carrier cost</span><div className="price">{usd(c.price)}</div></div>
          <div><span className="muted sm">Customer price</span><div className="price">{usd(total)}</div></div>
          <div><span className="muted sm">Gross profit</span><div className="price teal">{usd(profit)}</div></div>
        </div>
        <div>
          <div className="row between"><span className="muted sm">This week's all-in rates, SHA to JEA</span><Pill tone={zone[0]}>{zone[1]}</Pill></div>
          <div className="bench">
            <div className="track" style={{ left: `${((lo - 2200) / 550) * 100}%`, right: `${100 - ((hi - 2200) / 550) * 100}%` }} />
            <div className="mk" style={{ left: `${pos}%` }}><span>You</span></div>
          </div>
          <div className="row between sm muted"><span>USD 2,200</span><span>market USD 2,300 to 2,650</span><span>USD 2,750</span></div>
        </div>
        <div className="row between divider">
          <span><span className="muted sm">Estimated chance of winning</span><br /><b style={{ fontSize: 20 }}>{win}%</b></span>
          {st.sent ? <Pill tone={st.approved ? "ok" : "idle"}>{st.approved ? "Approved 11:19" : <><span className="spin" />Sent 11:16</>}</Pill> : <button type="button" className="btn primary" onClick={st.sendQuote}>Send quote to Sara</button>}
        </div>
      </div>
      <div className="card phone-stage sp">
        <div className="muted sm" style={{ marginBottom: 10 }}>What Sara sees</div>
        <div className="phone">
          <div className="screen">
            <div className="notch" />
            <div className="p-top"><b>9:41</b><span>Gulfway Logistics</span></div>
            {!st.sent ? (
              <div className="p-empty"><div style={{ fontSize: 30, marginBottom: 6 }}>📭</div>No new quotes yet</div>
            ) : (
              <div className="p-body">
                {st.approved ? (
                  <div className="p-ok"><div className="tick"><Check size={26} /></div><b style={{ fontSize: 17 }}>Booked</b><span className="p-mute">We'll track it from here</span></div>
                ) : (
                  <div className="p-mute" style={{ padding: "0 4px" }}>New quote for your Shanghai order</div>
                )}
                <div className="p-card">
                  <div className="p-mute">Quote Q-0916-0142</div>
                  <div className="row nowrap" style={{ margin: "6px 0 10px" }}><div className="code" style={{ fontSize: 24 }}>SHA</div><div className="lanearrow" style={{ width: 44 }} /><div className="code" style={{ fontSize: 24 }}>JEA</div></div>
                  <table className="lines"><tbody>
                    <tr><td>Ocean freight, 40' HC</td><td className="num">{usd(total - 150)}</td></tr>
                    <tr><td>Documents and B/L</td><td className="num">USD 150</td></tr>
                    <tr><td>Arrives by</td><td className="num">{arrive(c.days)}</td></tr>
                    <tr><td>Total</td><td className="num">{usd(total)}</td></tr>
                  </tbody></table>
                  {!st.approved && <><button type="button" className="p-btn pulse-btn" onClick={st.approve}>Approve and book</button><div className="p-mute center" style={{ marginTop: 8 }}>Valid for 7 days</div></>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- step 6

function Step6() {
  const st = useStore();
  const c = selectedCarrier(st);
  const ms: [string, string, string, "done" | "now" | ""][] = [
    ["Booking confirmed", `${c.name} · ${c.id}-4471902`, "16 Sep", "done"],
    ["Empty container picked up", "Waigaoqiao depot, Shanghai", "21 Sep", "done"],
    ["Gated in at terminal", `Before cut-off on ${c.cut}`, "22 Sep", "done"],
    ["Loaded and sailed", "Left on schedule", "26 Sep", "now"],
    [c.via === "Direct" ? "Passing Singapore" : `Transshipment at ${c.via}`, "Predicted on time, 94% confidence", "~3 Oct", ""],
    ["Arrives Jebel Ali", "Discharge and customs", arrive(c.days), ""],
    ["Delivered to Al Noor warehouse", `Deadline ${S.deadline}`, "+2 days", ""],
  ];
  return (
    <>
      <Head title="Booked and on the water" sub="Every milestone is visible to the forwarder and the shipper. Watch the ship cross the map, then the truck make the last mile to Al Noor." />
      <Card title={`${c.name} · 1 × ${c.eq}`} sub={`${c.via === "Direct" ? "Direct sailing" : "Via " + c.via} · ETA ${arrive(c.days)}`} right={<Pill tone="ok" dot>On schedule</Pill>}>
        <ul className="tl">
          {ms.map((m) => (
            <li key={m[0]} className={m[3]}>
              <span className="d">{m[3] === "done" && <Check />}</span>
              <div><b>{m[0]}</b><div className="muted sm">{m[1]}</div></div>
              <span className="muted sm">{m[2]}</span>
            </li>
          ))}
        </ul>
      </Card>
      <div className="impact sp">
        <Stat label="Email to approved quote" value="81 min" delta="typically 2 to 3 days" />
        <Stat label="Desk time spent" value="4 min" delta="review and send only" />
        <Stat label="Options checked" value="6" delta="2 ruled out automatically" />
        <Stat label="Forwarder gross profit" value={usd(sellPrice(c.price, st.margin) - c.price - 60)} delta={`at ${st.margin}% margin`} />
      </div>
    </>
  );
}

export function FlowView() {
  const step = useStore((s) => s.step);
  const Body = [Step1, Step2, Step3, Step4, Step5, Step6][step - 1];
  return (
    <>
      <FlowHeader />
      <div className="sp fade" key={step}>
        <Body />
      </div>
    </>
  );
}
