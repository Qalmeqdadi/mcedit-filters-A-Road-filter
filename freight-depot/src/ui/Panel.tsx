import { ArrowLeft, Ban, Check, Clock, Flame, Hourglass, Minus, Plus, Send, ShieldAlert, Snowflake, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { LANES, LANE_ORDER } from "../sim/data";
import * as E from "../sim/engine";
import { useStore } from "../sim/store";
import type { Departure, Rfq } from "../sim/types";
import { Addr, CapBar, Chip, KV, Meter, SlotGrid } from "./bits";

const { clock, dayClock, until, effDepart } = E;

// ---------------------------------------------------------------- lists

function RfqCard({ r }: { r: Rfq }) {
  const now = useStore((s) => s.world.now);
  const select = useStore((s) => s.select);
  const left = r.replyBy - now;
  return (
    <button type="button" className={`card rfq is-${r.state}`} onClick={() => select({ kind: "rfq", id: r.id })}>
      <span className="card-row">
        <span className="mono strong">{r.id}</span>
        <Chip>{r.channel}</Chip>
        <span className="grow" />
        {r.state === "new" && <span className={`due${left < 15 ? " is-bad" : left < 30 ? " is-warn" : ""}`}><Clock size={12} /> {until(r.replyBy, now)}</span>}
        {r.state === "replied" && <Chip tone="accent">Replied · {Math.round((r.reply?.winChance ?? 0) * 100)}%</Chip>}
        {r.state === "won" && <Chip tone="ok">Won</Chip>}
        {r.state === "lost" && <Chip tone="bad">Lost</Chip>}
        {r.state === "expired" && <Chip tone="bad">Missed</Chip>}
        {r.state === "declined" && <Chip>Declined</Chip>}
      </span>
      <span className="card-title">
        {r.pallets} plt {r.commodity} <span className="muted">to</span> {LANES[r.lane].city}
      </span>
      <span className="card-row muted">
        <span>{r.desk}</span>
        <span>·</span>
        <span>{(r.weightKg / 1000).toFixed(1)} t</span>
        {r.dgClass && <Chip tone="bad"><Flame size={11} /> DG {r.dgClass}</Chip>}
        {r.tempRange && <Chip tone="cold"><Snowflake size={11} /> {r.tempRange[0]}–{r.tempRange[1]} °C</Chip>}
      </span>
    </button>
  );
}

function RfqList() {
  const rfqs = useStore((s) => s.world.rfqs);
  const open = rfqs.filter((r) => r.state === "new").sort((a, b) => a.replyBy - b.replyBy);
  const rest = rfqs.filter((r) => r.state !== "new");
  return (
    <div className="list">
      <p className="hint">
        Desks send requests for space. Reply with a departure and a rate; the platform tests feasibility <Addr a="4.4" /> and holds the slots while the quote is live <Addr a="2.4.1" />.
      </p>
      {open.length === 0 && <p className="empty">No requests waiting. New RFQs arrive every 15 to 35 minutes of shift time.</p>}
      {open.map((r) => <RfqCard key={r.id} r={r} />)}
      {rest.length > 0 && <h3 className="list-sub">Answered and closed</h3>}
      {rest.map((r) => <RfqCard key={r.id} r={r} />)}
    </div>
  );
}

function HoldList() {
  const w = useStore((s) => s.world);
  const act = useStore((s) => s.act);
  const select = useStore((s) => s.select);
  const rows = w.departures.flatMap((d) => E.liveHolds(d).map((h) => ({ d, h }))).sort((a, b) => a.h.expiresAt - b.h.expiresAt);
  return (
    <div className="list">
      <p className="hint">
        A soft hold keeps space while a desk decides <Addr a="2.4.1" />. It becomes a booking when the desk accepts, or goes back on sale when it lapses <Addr a="2.4.2" />.
      </p>
      {rows.length === 0 && <p className="empty">No live holds. Reply to an RFQ to place one.</p>}
      {rows.map(({ d, h }) => {
        const left = h.expiresAt - w.now;
        const span = Math.max(1, h.expiresAt - h.createdAt);
        return (
          <div key={h.id} className="card hold">
            <span className="card-row">
              <span className="mono strong">{h.ref}</span>
              <button type="button" className="linkbtn" onClick={() => select({ kind: "departure", id: d.id })}>{E.depLabel(d)}</button>
              <span className="grow" />
              <span className={`due${left < 15 ? " is-bad" : left < 30 ? " is-warn" : ""}`}><Hourglass size={12} /> {until(h.expiresAt, w.now)}</span>
            </span>
            <span className="card-title">{h.pallets} plt {h.commodity}</span>
            <span className="card-row muted"><span>{h.desk}</span><span>·</span><span className="mono">AED {h.ratePerPallet}/plt</span></span>
            <Meter value={left / span} tone={left < 15 ? "bad" : "held"} />
            <span className="card-actions">
              <button type="button" className="btn btn-quiet" onClick={() => act((x) => E.extendHold(x, d.id, h.id, 30))}><Plus size={13} /> 30 min</button>
              <button type="button" className="btn btn-quiet" onClick={() => act((x) => E.releaseHoldById(x, d.id, h.id))}><X size={13} /> Release</button>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function FeedList() {
  const w = useStore((s) => s.world);
  const act = useStore((s) => s.act);
  const thin = LANE_ORDER.map((lane) => {
    const deps = w.departures.filter((d) => d.lane === lane && E.isSellable(d, w.now));
    return { lane, free: deps.reduce((s, d) => s + E.freePallets(d), 0), n: deps.length };
  }).filter((x) => x.free <= 8);
  return (
    <div className="list">
      <p className="hint">Supply health <Addr a="2.5" />: how fresh each feed is, and lanes running short before customers feel it.</p>
      {w.feeds.map((f) => {
        const st = E.feedStatus(f, w.now);
        return (
          <div key={f.id} className={`card feed is-${st}`}>
            <span className="card-row">
              <span className={`dot dot-${st}`} />
              <strong>{f.name}</strong>
              <Chip>{f.fallback ? "Portal fallback" : f.channel}</Chip>
              <span className="grow" />
              <span className="muted mono">{Math.round(w.now - f.lastUpdate)} min ago</span>
            </span>
            <span className="card-row muted">Expected every {f.cadenceMin >= 60 ? `${f.cadenceMin / 60} h` : `${f.cadenceMin} min`} · {st}</span>
            {(st !== "fresh" || f.fallback) && (
              <span className="card-actions">
                {!f.fallback && <button type="button" className="btn btn-quiet" onClick={() => act((x) => E.fallbackFeed(x, f.id))}>Fall back to portal <Addr a="2.5.2" /></button>}
                <button type="button" className="btn btn-quiet" onClick={() => act((x) => E.restoreFeed(x, f.id))}>Mark feed restored</button>
              </span>
            )}
          </div>
        );
      })}
      <h3 className="list-sub">Thin lanes <Addr a="2.5.3" /></h3>
      {thin.length === 0 && <p className="empty">Every lane has more than 8 free slots on sale.</p>}
      {thin.map((t) => (
        <div key={t.lane} className="card thin">
          <span className="card-row"><strong>{t.lane}</strong><span className="muted">{LANES[t.lane].city}</span><span className="grow" /><Chip tone={t.free === 0 ? "bad" : "held"}>{t.free} free</Chip></span>
          <span className="card-row muted">Across {t.n} departure{t.n === 1 ? "" : "s"} on sale</span>
        </div>
      ))}
      <h3 className="list-sub">Restrictions on the network <Addr a="2.3.4" /></h3>
      {Object.values(LANES).filter((l) => l.restriction).map((l) => (
        <div key={l.id} className="card thin">
          <span className="card-row"><ShieldAlert size={14} /><strong>{l.id}</strong><span className="muted">{l.restriction}</span></span>
        </div>
      ))}
    </div>
  );
}

function Log() {
  const events = useStore((s) => s.world.events);
  return (
    <ol className="log">
      {events.map((e) => (
        <li key={e.id} className={`log-${e.kind}`}>
          <span className="mono muted">{clock(e.t)}</span>
          <Addr a={e.address} />
          <span>{e.text}</span>
        </li>
      ))}
    </ol>
  );
}

// ---------------------------------------------------------------- RFQ detail

function RfqDetail({ r }: { r: Rfq }) {
  const w = useStore((s) => s.world);
  const draft = useStore((s) => s.draft);
  const setDraft = useStore((s) => s.setDraft);
  const act = useStore((s) => s.act);
  const select = useStore((s) => s.select);
  const [declining, setDeclining] = useState(false);
  const now = w.now;
  const lane = LANES[r.lane];

  const options = useMemo(
    () => w.departures.filter((d) => d.lane === r.lane && d.status !== "departed").sort((a, b) => effDepart(a) - effDepart(b)),
    [w.departures, r.lane],
  );
  const checksFor = (d: Departure) => E.feasibility(r, d, now);

  useEffect(() => {
    if (r.state !== "new" || draft?.rfqId === r.id) return;
    const best = options.find((d) => E.feasible(checksFor(d)));
    setDraft({ rfqId: r.id, departureId: best?.id ?? options[0]?.id ?? null, rate: E.suggestedRate(r), validityMin: 60 });
  }, [r.id, r.state]); // eslint-disable-line react-hooks/exhaustive-deps

  const d = draft?.rfqId === r.id ? options.find((x) => x.id === draft.departureId) : undefined;
  const checks = d ? checksFor(d) : [];
  const ok = !!d && E.feasible(checks);
  const rate = draft?.rfqId === r.id ? draft.rate : E.suggestedRate(r);
  const chance = E.winChance(r, rate);
  const suggestion = E.suggestedRate(r);
  const repDep = r.reply ? w.departures.find((x) => x.id === r.reply!.departureId) : undefined;
  const repHold = repDep?.holds.find((h) => h.id === r.reply?.holdId);

  return (
    <div className="detail">
      <div className="detail-head">
        <button type="button" className="iconbtn" onClick={() => { select(null); setDraft(null); }} aria-label="Back to the list"><ArrowLeft size={16} /></button>
        <span className="mono strong">{r.id}</span>
        <Chip>{r.channel}</Chip>
        <span className="grow" />
        {r.state === "new" && <span className={`due${r.replyBy - now < 15 ? " is-bad" : ""}`}><Clock size={12} /> reply in {until(r.replyBy, now)}</span>}
      </div>
      <h2 className="detail-title">{r.pallets} pallets {r.commodity}<br /><span className="muted">Jebel Ali → {lane.city}</span></h2>
      <dl className="kvs">
        <KV k="Desk">{r.desk}</KV>
        <KV k="Shipper">Withheld by the desk <Addr a="4.1.2" /></KV>
        <KV k="Weight">{(r.weightKg / 1000).toFixed(2)} t</KV>
        <KV k="HS code"><span className="mono">{r.hs}</span></KV>
        <KV k="Ready">{dayClock(r.readyAt)}</KV>
        <KV k="Deliver by">{dayClock(r.deliverBy)}</KV>
        {r.dgClass && <KV k="Dangerous goods"><Chip tone="bad"><Flame size={11} /> Class {r.dgClass} · {r.un}</Chip></KV>}
        {r.tempRange && <KV k="Temperature"><Chip tone="cold"><Snowflake size={11} /> {r.tempRange[0]} to {r.tempRange[1]} °C</Chip></KV>}
        {r.targetRate && <KV k="Desk target"><span className="mono">AED {r.targetRate}/plt</span></KV>}
      </dl>

      {r.state === "new" && draft?.rfqId === r.id && (
        <>
          <h3 className="sec">Pick a departure <Addr a="4.5.1" /></h3>
          <div className="opts">
            {options.map((o) => {
              const c = checksFor(o);
              const fails = c.filter((x) => !x.ok).length;
              const on = o.id === draft.departureId;
              return (
                <button type="button" key={o.id} className={`opt${on ? " is-on" : ""}`} onClick={() => setDraft({ ...draft, departureId: o.id })} aria-pressed={on}>
                  <span className="opt-top">
                    <span className={`dock-pill${o.dock && o.status !== "planned" ? "" : " is-plan"}`}>{o.dock && o.status !== "planned" ? `D${o.dock}` : "Plan"}</span>
                    <strong className="mono">{dayClock(effDepart(o))}</strong>
                    <span className="grow" />
                    {fails ? <Chip tone="bad">{fails} fail</Chip> : <Chip tone="ok"><Check size={11} /> Fits</Chip>}
                  </span>
                  <CapBar d={o} preview={on ? r.pallets : 0} compact />
                  <span className="muted">{E.freePallets(o)} of {o.slots} slots free · {((o.payloadKg - E.usedKg(o)) / 1000).toFixed(1)} t left</span>
                </button>
              );
            })}
          </div>

          {d && (
            <>
              <h3 className="sec">Feasibility <Addr a="4.4" /></h3>
              <ul className="checks">
                {checks.map((c) => (
                  <li key={c.id + c.label} className={c.ok ? "is-ok" : "is-bad"}>
                    <span className="check-ic">{c.ok ? <Check size={12} /> : <X size={12} />}</span>
                    <span className="check-body"><strong>{c.label}</strong><span className="muted">{c.detail}</span></span>
                    <Addr a={c.address} />
                  </li>
                ))}
              </ul>
            </>
          )}

          <h3 className="sec">Your rate <Addr a="4.2.1" /></h3>
          <div className="rate">
            <div className="stepper">
              <button type="button" className="iconbtn" aria-label="Lower the rate by 5" onClick={() => setDraft({ ...draft, rate: Math.max(5, rate - 5) })}><Minus size={14} /></button>
              <label className="rate-in">
                <span>AED</span>
                <input id="rate" type="number" inputMode="numeric" min={5} step={5} value={rate} onChange={(e) => setDraft({ ...draft, rate: Math.max(0, Number(e.target.value) || 0) })} aria-label="Rate per pallet in AED" />
                <span>/plt</span>
              </label>
              <button type="button" className="iconbtn" aria-label="Raise the rate by 5" onClick={() => setDraft({ ...draft, rate: rate + 5 })}><Plus size={14} /></button>
            </div>
            <button type="button" className="suggest" onClick={() => setDraft({ ...draft, rate: suggestion })} title="The platform drafts a rate; you set the price">
              <Sparkles size={13} /> Suggested AED {suggestion}
            </button>
          </div>
          <div className="rate-facts">
            <span>Lane index <strong className="mono">AED {lane.benchmark}</strong> <Addr a="11.2" /></span>
            <span>Quote total <strong className="mono">AED {(rate * r.pallets).toLocaleString("en-US")}</strong></span>
          </div>
          <div className="win">
            <span>Chance the desk picks you</span>
            <strong className="mono">{Math.round(chance * 100)}%</strong>
            <Meter value={chance} tone={chance > 0.6 ? "ok" : chance > 0.35 ? "held" : "bad"} />
          </div>

          <h3 className="sec">Hold the slots for <Addr a="2.4.1" /></h3>
          <div className="seg-ctl" role="group" aria-label="Hold validity">
            {[30, 60, 120].map((m) => (
              <button type="button" key={m} className={draft.validityMin === m ? "is-on" : ""} aria-pressed={draft.validityMin === m} onClick={() => setDraft({ ...draft, validityMin: m })}>
                {m < 60 ? `${m} min` : `${m / 60} h`}
              </button>
            ))}
          </div>
          {d && <p className="muted small">Holds never outlast gate-in, which closes at {clock(E.gateInCutoff(d))}.</p>}

          <div className="actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!ok || rate <= 0}
              onClick={() => {
                if (!d) return;
                act((x) => E.replyToRfq(x, r.id, d.id, rate, draft.validityMin));
                setDraft(null);
              }}
            >
              <Send size={14} /> Reply and hold {r.pallets} slots
            </button>
            {!declining ? (
              <button type="button" className="btn btn-quiet" onClick={() => setDeclining(true)}><Ban size={14} /> Decline</button>
            ) : (
              <div className="decline">
                {["No space on this lane", "Cargo not accepted", "Rate below cost"].map((why) => (
                  <button type="button" key={why} className="btn btn-quiet" onClick={() => { act((x) => E.declineRfq(x, r.id, why)); setDraft(null); setDeclining(false); }}>{why}</button>
                ))}
                <button type="button" className="btn btn-quiet" onClick={() => setDeclining(false)}>Keep it</button>
              </div>
            )}
          </div>
          {!ok && d && <p className="muted small">Fix the failing checks or pick another departure to reply.</p>}
        </>
      )}

      {r.state !== "new" && (
        <div className={`outcome is-${r.state}`}>
          {r.state === "replied" && r.reply && (
            <>
              <strong>Waiting for {r.desk}</strong>
              <span>AED {r.reply.ratePerPallet}/plt on {repDep ? E.depLabel(repDep) : "a departure that has left"}.</span>
              {repHold && repHold.state === "live" && <span>Hold {repHold.ref} lapses in {until(repHold.expiresAt, now)}.</span>}
              <span>Estimated chance to win {Math.round(r.reply.winChance * 100)}%.</span>
            </>
          )}
          {r.state === "won" && <><strong>Won</strong><span>{r.outcome}. The hold became a booking <Addr a="2.4.2" />.</span></>}
          {r.state === "lost" && <><strong>Lost</strong><span>{r.outcome}. Recorded for pricing guidance <Addr a="4.8.4" />.</span></>}
          {r.state === "expired" && <><strong>Missed</strong><span>The reply deadline passed. The desk moved on without us <Addr a="4.1.5" />.</span></>}
          {r.state === "declined" && <><strong>Declined</strong><span>{r.outcome}.</span></>}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- departure detail

function DepartureDetail({ d }: { d: Departure }) {
  const now = useStore((s) => s.world.now);
  const act = useStore((s) => s.act);
  const select = useStore((s) => s.select);
  const [delaying, setDelaying] = useState(false);
  const lane = LANES[d.lane];
  const eff = effDepart(d);
  const cut = [
    { label: "Dangerous goods documents", t: eff - E.CUTOFF.dgDocs },
    { label: "Shipping documents", t: eff - E.CUTOFF.docs },
    { label: "Gate-in", t: eff - E.CUTOFF.gateIn },
  ];
  const holds = E.liveHolds(d);
  const kg = E.usedKg(d);
  const gone = d.status === "departed";
  const statusLabel = { planned: "Planned", inbound: "Trailer inbound", open: d.stopSell ? "Stop-sell" : "On sale", closed: "Loading", departed: "Gated out" }[d.status];

  return (
    <div className="detail">
      <div className="detail-head">
        <button type="button" className="iconbtn" onClick={() => select(null)} aria-label="Back to the list"><ArrowLeft size={16} /></button>
        <span className={`dock-pill${d.dock && d.status !== "planned" ? "" : " is-plan"}`}>{d.dock && d.status !== "planned" ? `D${d.dock}` : "Plan"}</span>
        <span className="mono muted small">{d.id}</span>
        <span className="grow" />
        <Chip tone={d.status === "open" && !d.stopSell ? "ok" : d.stopSell ? "bad" : "accent"}>{statusLabel}</Chip>
      </div>
      <h2 className="detail-title">Jebel Ali → {lane.city}<br /><span className="muted">{lane.country} · via {lane.via}</span></h2>
      <div className="depart-when">
        <div>
          <span className="muted small">Departs</span>
          <strong className="mono big">{clock(eff)}</strong>
          <span className="muted small">{E.dayLabel(eff)}{!gone && ` · in ${until(eff, now)}`}</span>
        </div>
        <div>
          <span className="muted small">Arrives</span>
          <strong className="mono big">{clock(eff + lane.transitH * 60)}</strong>
          <span className="muted small">{E.dayLabel(eff + lane.transitH * 60)} · {lane.km} km</span>
        </div>
      </div>
      {d.delayMin > 0 && (
        <p className="banner banner-held"><Clock size={14} /> Delayed {Math.round(d.delayMin / 6) / 10} h from {clock(d.departsAt)}: {d.delayReason} <Addr a="2.2.3" /></p>
      )}
      {lane.restriction && <p className="banner"><ShieldAlert size={14} /> {lane.restriction} <Addr a="2.3.4" /></p>}

      <h3 className="sec">Capacity <Addr a="2.3.1" /></h3>
      <SlotGrid d={d} />
      <div className="cap-nums">
        <span><i className="lg lg-booked" />{E.bookedPallets(d)} booked</span>
        <span><i className="lg lg-held" />{E.heldPallets(d)} held</span>
        <span><i className="lg lg-free" />{E.freePallets(d)} free</span>
        <span className="muted">of {d.slots} euro pallets</span>
      </div>
      <div className="weight">
        <span className="muted small">Payload {(kg / 1000).toFixed(1)} of {(d.payloadKg / 1000).toFixed(1)} t</span>
        <Meter value={kg / d.payloadKg} tone={kg / d.payloadKg > 0.9 ? "bad" : "accent"} />
      </div>
      <p className="muted small">{d.trailer === "reefer" ? `Reefer 13.6 m, set ${d.tempRange?.[0]} to ${d.tempRange?.[1]} °C, no DG` : d.trailer === "box" ? "Box trailer 13.6 m, sealable" : "Curtainsider 13.6 m"}</p>

      <h3 className="sec">Cut-offs <Addr a="2.2.2" /></h3>
      <ul className="cutoffs">
        {cut.map((c) => {
          const passed = now >= c.t;
          return (
            <li key={c.label} className={passed ? "is-passed" : c.t - now < 30 ? "is-soon" : ""}>
              <span>{c.label}</span>
              <span className="mono">{clock(c.t)}</span>
              <span className="muted">{passed ? "closed" : `in ${until(c.t, now)}`}</span>
            </li>
          );
        })}
      </ul>

      <h3 className="sec">On board <Addr a="5.5.2" /></h3>
      <ul className="allocs">
        {d.bookings.map((b) => (
          <li key={b.id}>
            <span className="lg lg-booked" />
            <span className="alloc-main"><strong>{b.pallets} plt {b.commodity}</strong><span className="muted">{b.desk} · <span className="mono">{b.ref}</span></span></span>
            {b.dgClass && <Chip tone="bad">DG {b.dgClass}</Chip>}
            <span className="mono muted">{(b.weightKg / 1000).toFixed(1)} t</span>
          </li>
        ))}
        {holds.map((h) => (
          <li key={h.id} className="is-hold">
            <span className="lg lg-held" />
            <span className="alloc-main"><strong>{h.pallets} plt {h.commodity}</strong><span className="muted">{h.desk} · <span className="mono">{h.ref}</span> · lapses in {until(h.expiresAt, now)}</span></span>
            <button type="button" className="btn btn-quiet btn-xs" onClick={() => act((x) => E.releaseHoldById(x, d.id, h.id))}>Release</button>
          </li>
        ))}
        {d.bookings.length + holds.length === 0 && <li className="muted">Nothing booked yet.</li>}
      </ul>

      {!gone && (
        <div className="actions">
          {!delaying ? (
              <button type="button" className="btn btn-quiet" onClick={() => setDelaying(true)}><Clock size={14} /> Report a delay</button>
            ) : (
              <div className="decline">
                {([[60, "Driver hours"], [120, "Border queue"], [240, "Trailer repair"]] as const).map(([m, why]) => (
                  <button type="button" key={m} className="btn btn-quiet" onClick={() => { act((x) => E.delayDeparture(x, d.id, m, why)); setDelaying(false); }}>
                    +{m / 60} h · {why}
                  </button>
                ))}
                <button type="button" className="btn btn-quiet" onClick={() => setDelaying(false)}>Cancel</button>
              </div>
            )}
          {(d.status === "open" || d.status === "planned") && (
            <button type="button" className="btn btn-quiet" onClick={() => act((x) => E.toggleStopSell(x, d.id))}>
              <Ban size={14} /> {d.stopSell ? "Put back on sale" : "Stop-sell"}
            </button>
          )}
        </div>
      )}
      {!gone && <p className="muted small">A delay notifies every desk with cargo on this departure <Addr a="7.5.2" />.</p>}
    </div>
  );
}

// ---------------------------------------------------------------- panel

export function Panel() {
  const tab = useStore((s) => s.tab);
  const setTab = useStore((s) => s.setTab);
  const sel = useStore((s) => s.selection);
  const select = useStore((s) => s.select);
  const w = useStore((s) => s.world);
  const newRfqs = w.rfqs.filter((r) => r.state === "new").length;
  const holds = w.departures.reduce((s, d) => s + E.liveHolds(d).length, 0);
  const stale = w.feeds.filter((f) => E.feedStatus(f, w.now) !== "fresh").length;

  const dep = sel?.kind === "departure" ? w.departures.find((d) => d.id === sel.id) : undefined;
  const rfq = sel?.kind === "rfq" ? w.rfqs.find((r) => r.id === sel.id) : undefined;

  const tabs = [
    { id: "rfqs", label: "RFQs", n: newRfqs },
    { id: "holds", label: "Holds", n: holds },
    { id: "feeds", label: "Supply", n: stale },
    { id: "log", label: "Log", n: 0 },
  ] as const;

  return (
    <aside className="panel" id="panel" aria-label="Work panel">
      <nav className="tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id && !dep && !rfq}
            className={tab === t.id && !dep && !rfq ? "is-on" : ""}
            onClick={() => { setTab(t.id); select(null); useStore.getState().setDraft(null); }}
          >
            {t.label}
            {t.n > 0 && <span className={`tab-n${t.id === "feeds" ? " is-bad" : ""}`}>{t.n}</span>}
          </button>
        ))}
      </nav>
      <div className="panel-body">
        {dep ? <DepartureDetail d={dep} /> : rfq ? <RfqDetail r={rfq} /> : tab === "rfqs" ? <RfqList /> : tab === "holds" ? <HoldList /> : tab === "feeds" ? <FeedList /> : <Log />}
      </div>
    </aside>
  );
}
