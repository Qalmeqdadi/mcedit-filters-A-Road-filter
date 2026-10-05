import { LOSSES, LOSS_REASONS, RECENT_QUOTES, SCORE_EXTRA, VISIBILITY, WIN_LOSS, CHAN } from "../../data";
import { useStore } from "../../store";
import { Card, Check, HBar, Head, Mono, Pill } from "../bits";
import { HoursChart } from "../charts";
import { CHAN_ICON } from "./Flow";

export function DashView() {
  const go = useStore((s) => s.go);
  return (
    <>
      <div className="welcome">
        <p className="muted">Wednesday, 16 September</p>
        <h1>Good morning, Jebel Ali desk</h1>
        <div className="row"><Pill tone="ok" dot>6 carriers connected</Pill><Pill>Lane: Asia to UAE · Ocean FCL</Pill></div>
      </div>
      <div className="cta sp">
        <h2>Follow one quote, end to end</h2>
        <p>A new request from Al Noor Home Appliances just arrived. Watch it become a booked container in six steps, right on the map.</p>
        <button type="button" className="btn primary" onClick={() => go(1)}>Start walkthrough</button>
      </div>
      <Card className="sp" title="Live lanes" sub="12 containers moving on 3 lanes, on the map behind this panel" right={<Pill tone="ok" dot>On schedule</Pill>}>
        <div className="legend-row pad">
          <span><i className="lg-line" />China</span><span><i className="lg-line dash" />West India</span><span><i className="lg-line dot" />East India</span>
        </div>
      </Card>
      <Card className="sp" title="Hours from request to quote" sub="Pilot desk, last 8 weeks" pad>
        <HoursChart />
      </Card>
      <Card className="sp" title="Recent quotes" right={<span className="muted sm">Today</span>}>
        {RECENT_QUOTES.map((q, i) => (
          <button key={q[0]} type="button" className="lrow" onClick={i === 0 ? () => go(1) : undefined} disabled={i !== 0}>
            <div className="min0"><b>{q[0]}</b><div className="muted sm">{q[1]} · {q[2]}</div></div>
            <Pill tone={q[4]}>{q[3]}</Pill>
            <span className="num muted sm w48">{q[5]}</span>
          </button>
        ))}
      </Card>
    </>
  );
}

export function CarriersView() {
  const carriers = useStore((s) => s.carriers);
  return (
    <>
      <Head title="Carrier scorecards" sub="Built automatically from every quote and shipment on the platform. Scores feed straight into ranking. Each carrier's ship is berthed on the Shanghai quay." />
      <Card>
        {carriers.map((c) => {
          const [acc, claims, reply] = SCORE_EXTRA[c.id];
          return (
            <div key={c.id} className="scorerow">
              <div className="row nowrap"><Mono id={c.id} color={c.color} size={30} /><div className="min0"><b className="ellip">{c.name}</b><span className="chan">{CHAN_ICON[c.src]}{CHAN[c.src]}</span></div></div>
              <div className="scoregrid">
                <span><small>On-time</small><b>{c.rel}%</b></span>
                <span><small>Quote accuracy</small><b>{acc}%</b></span>
                <span><small>Claims /100</small><b>{claims}</b></span>
                <span><small>Median reply</small><b>{reply}</b></span>
              </div>
            </div>
          );
        })}
      </Card>
    </>
  );
}

export function AnalyticsView() {
  const carriers = useStore((s) => s.carriers);
  const maxWL = Math.max(...WIN_LOSS.map((r) => r[2] + r[3]));
  return (
    <>
      <Head title="Insights" sub="Every quote, won or lost, becomes data the desk can price with next week. This is what a spreadsheet can never give back." right={<Pill>Last 30 days</Pill>} />
      <Card title="Won and lost by carrier" sub="Which carrier's rates actually convert into bookings" right={<span className="row"><span className="mleg"><i style={{ background: "var(--teal)" }} />Won</span><span className="mleg"><i style={{ background: "var(--line-2)" }} />Lost</span></span>} pad>
        {WIN_LOSS.map((r) => (
          <div key={r[1]} className="hbar wlb">
            <span className="row nowrap"><Mono id={r[1]} color={(carriers.find((c) => c.id === r[1]) ?? { color: "#6C8088" }).color} size={24} /><span className="sm">{r[0].split(" ")[0]}</span></span>
            <div className="t split"><i style={{ width: `${(r[2] / maxWL) * 100}%` }} /><i style={{ width: `${(r[3] / maxWL) * 100}%`, background: "var(--line-2)" }} /></div>
            <b className="num sm">{Math.round((r[2] / (r[2] + r[3])) * 100)}%</b>
          </div>
        ))}
        <p className="muted sm mt">Meridian is cheapest but wins least: customers on this lane pay for speed. Quote them only where the deadline is loose.</p>
      </Card>
      <Card className="sp" title="Why we lose" pad>
        {LOSS_REASONS.map((r) => <HBar key={r[0]} label={r[0]} v={r[1]} max={100} right={`${r[1]}%`} color={r[1] > 40 ? "var(--red)" : "var(--ink-2)"} />)}
        <p className="muted sm mt">A quarter of losses are fixable without touching price: reply faster, or check the cut-off first.</p>
      </Card>
      <div className="card pick sp">
        <div><span className="muted sm">This week's pricing insight</span><h2 style={{ margin: "4px 0 6px" }}>You lose Shanghai to Jebel Ali above USD 2,600</h2>
          <p className="ink2">Below that you win 6 quotes in 10. Above it, 2 in 10. Offering the 24-day option as a second line would have won 4 of last month's 11 losses.</p></div>
        <div className="num"><div className="big">USD 9.2K</div><span className="muted sm">margin those 4 bookings would have earned</span></div>
      </div>
      <Card className="sp" title="Recent losses" sub="Gap shows how far above the winning quote we were">
        {LOSSES.map((l) => (
          <div key={l[0]} className="lrow static">
            <div className="min0"><b>{l[0]}</b><div className="muted sm">{l[1]} · {l[2]} · gap {l[3]}</div></div>
            <Pill tone={l[4] === "Price" ? "warn" : "bad"}>{l[4]}</Pill>
          </div>
        ))}
      </Card>
    </>
  );
}

export function SetupView() {
  const st = useStore();
  const steps: [string, string, string, boolean][] = [
    ["Connect your quoting mailbox", "quotes@gulfway.example · read-only access to RFQ threads", "Connected in 2 minutes", true],
    ["Forward your first request", "Al Noor's email, read and structured automatically", "Done · 16 Sep", true],
    ["Invite your carriers", `${st.invited ? 6 : 4} of 6 carriers on the portal. The rest keep replying by email and are read the same way.`, st.invited ? "All invited" : "2 still on email", st.invited],
    ["Set your desk rules", "Margin floor, approved customers, when to send to a person", st.rulesSet ? "Rules saved" : "Not set yet", st.rulesSet],
  ];
  const done = steps.filter((s) => s[3]).length;
  const cell = (t: string) => (t === "Never" ? <Pill tone="bad">Never</Pill> : t === "Everything" ? <Pill tone="ok">Full</Pill> : <span className="sm">{t}</span>);
  return (
    <>
      <Head title="Setup" sub="A desk is live the same day. Nothing to install, and no carrier integration needed to start." right={<Pill tone={done === 4 ? "ok" : "warn"}>{done} of 4 steps done</Pill>} />
      <Card title="Getting started" sub="Median time from first login to first quote sent: 41 minutes">
        {steps.map((s, i) => (
          <div key={s[0]} className="caprow three">
            <span className={`dstep${s[3] ? " on" : ""}`}>{s[3] ? <Check /> : i + 1}</span>
            <div className="min0"><b>{s[0]}</b><div className="muted sm">{s[1]}</div></div>
            {s[3] ? <Pill tone="ok">{s[2]}</Pill> : i === 2
              ? <button type="button" className="btn ghost sm" onClick={() => { st.set({ invited: true }); st.toastMsg("Invitations sent to 2 carriers"); }}>Invite carriers</button>
              : <button type="button" className="btn primary sm" onClick={() => { st.set({ rulesSet: true }); st.toastMsg("Desk rules saved"); }}>Set rules</button>}
          </div>
        ))}
      </Card>
      <Card className="sp" title="Who sees what" sub="The rule that makes carriers and forwarders willing to put data in" right={<Pill tone="ok">Enforced by the platform</Pill>}>
        <div className="scroll-x">
          <table>
            <thead><tr><th>Data</th><th>Shipper</th><th>Forwarder</th><th>Carrier</th><th>Partner</th></tr></thead>
            <tbody>{VISIBILITY.map((r) => <tr key={r[0]}><td><b>{r[0]}</b></td>{r.slice(1).map((t, i) => <td key={i}>{cell(t)}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <p className="pad muted sm">Rates belong to the forwarder who negotiated them. A carrier never sees a competitor's bid, and a shipper never sees the carrier's rate or the desk's margin. Benchmarks are aggregated across many desks and never name a carrier's price.</p>
      </Card>
      <p className="muted sm center mt">Synthetic demo. All companies and figures are illustrative.</p>
    </>
  );
}
