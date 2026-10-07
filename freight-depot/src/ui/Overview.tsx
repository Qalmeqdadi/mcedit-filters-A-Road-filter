import { Hourglass, Inbox, Layers, Rss } from "lucide-react";
import { LANES } from "../sim/data";
import { bookedPallets, clock, effDepart, feedStatus, freePallets, gateInCutoff, heldPallets, isSellable, liveHolds, until } from "../sim/engine";
import { useStore } from "../sim/store";
import type { Departure } from "../sim/types";
import { CapBar, Chip } from "./bits";

export function Kpis() {
  const w = useStore((s) => s.world);
  const setTab = useStore((s) => s.setTab);
  const select = useStore((s) => s.select);
  const now = w.now;
  const horizon = w.departures.filter((d) => d.status !== "departed" && effDepart(d) <= now + 1440);
  const sellable = horizon.filter((d) => isSellable(d, now));
  const free = sellable.reduce((s, d) => s + freePallets(d), 0);
  const slots = horizon.reduce((s, d) => s + d.slots, 0);
  const used = horizon.reduce((s, d) => s + bookedPallets(d) + heldPallets(d), 0);
  const holds = w.departures.flatMap((d) => liveHolds(d));
  const soon = holds.filter((h) => h.expiresAt - now <= 30).length;
  const open = w.rfqs.filter((r) => r.state === "new").sort((a, b) => a.replyBy - b.replyBy);
  const stale = w.feeds.filter((f) => feedStatus(f, now) !== "fresh");
  const go = (tab: "rfqs" | "holds" | "feeds") => { setTab(tab); select(null); };

  return (
    <section className="kpis" aria-label="Shift summary">
      <button type="button" className="kpi" onClick={() => go("holds")}>
        <span className="kpi-icon"><Layers size={16} /></span>
        <span className="kpi-label">Free slots · 24 h</span>
        <span className="kpi-value">{free}<small> / {slots}</small></span>
        <span className="kpi-sub">Load factor {slots ? Math.round((used / slots) * 100) : 0}% · {sellable.length} on sale</span>
      </button>
      <button type="button" className="kpi" onClick={() => go("holds")}>
        <span className="kpi-icon is-held"><Hourglass size={16} /></span>
        <span className="kpi-label">Live soft holds</span>
        <span className="kpi-value">{holds.length}<small> · {holds.reduce((s, h) => s + h.pallets, 0)} plt</small></span>
        <span className={`kpi-sub${soon ? " is-warn" : ""}`}>{soon ? `${soon} expire within 30 min` : "None expiring soon"}</span>
      </button>
      <button type="button" className="kpi" onClick={() => go("rfqs")}>
        <span className="kpi-icon"><Inbox size={16} /></span>
        <span className="kpi-label">RFQs to answer</span>
        <span className="kpi-value">{open.length}</span>
        <span className={`kpi-sub${open[0] && open[0].replyBy - now < 15 ? " is-bad" : ""}`}>
          {open[0] ? `Next due in ${until(open[0].replyBy, now)}` : "Inbox clear"}
        </span>
      </button>
      <button type="button" className="kpi" onClick={() => go("feeds")}>
        <span className={`kpi-icon${stale.length ? " is-bad" : " is-ok"}`}><Rss size={16} /></span>
        <span className="kpi-label">Supply feeds</span>
        <span className="kpi-value">{w.feeds.length - stale.length}<small> / {w.feeds.length} fresh</small></span>
        <span className={`kpi-sub${stale.length ? " is-bad" : ""}`}>{stale.length ? `${stale[0].name} ${feedStatus(stale[0], now)}` : "All feeds current"}</span>
      </button>
    </section>
  );
}

function statusOf(d: Departure, now: number): { label: string; tone: "neutral" | "accent" | "held" | "ok" | "bad" } {
  if (d.status === "departed") return { label: "Gated out", tone: "ok" };
  if (d.status === "inbound") return { label: "Trailer inbound", tone: "accent" };
  if (d.status === "planned") return { label: "Planned", tone: "neutral" };
  if (d.status === "closed") return { label: "Loading", tone: "accent" };
  if (d.stopSell) return { label: "Stop-sell", tone: "bad" };
  if (gateInCutoff(d) - now <= 30) return { label: "Closing", tone: "held" };
  return { label: "On sale", tone: "ok" };
}

export function DepartureStrip() {
  const w = useStore((s) => s.world);
  const sel = useStore((s) => s.selection);
  const select = useStore((s) => s.select);
  const setHover = useStore((s) => s.setHover);
  const now = w.now;
  const list = [...w.departures].sort((a, b) => effDepart(a) - effDepart(b)).slice(0, 14);

  return (
    <section className="strip" aria-label="Departures">
      <header className="strip-head">
        <h2>Departures</h2>
        <span className="muted">Next 36 h · gate-in closes 45 min before departure</span>
        <span className="legend" aria-hidden>
          <i className="lg lg-booked" />Booked <i className="lg lg-held" />Held <i className="lg lg-free" />Free
        </span>
      </header>
      <div className="strip-scroll">
        {list.map((d) => {
          const st = statusOf(d, now);
          const isSel = sel?.kind === "departure" && sel.id === d.id;
          const free = freePallets(d);
          return (
            <button
              type="button"
              key={d.id}
              className={`dep${isSel ? " is-selected" : ""}${d.status === "departed" ? " is-gone" : ""}`}
              onClick={() => select({ kind: "departure", id: d.id })}
              onPointerEnter={() => setHover(d.id)}
              onPointerLeave={() => setHover(null)}
            >
              <span className="dep-top">
                <span className={`dock-pill${d.dock && d.status !== "planned" ? "" : " is-plan"}`}>{d.dock && d.status !== "planned" ? `D${d.dock}` : "Plan"}</span>
                <strong>{d.lane}</strong>
                <span className="dep-city">{LANES[d.lane].city}</span>
                {d.trailer === "reefer" && <Chip tone="cold">2–8 °C</Chip>}
              </span>
              <span className="dep-time">
                <span className="mono">{clock(effDepart(d))}</span>
                {d.delayMin > 0 && <span className="dep-delay">+{Math.round(d.delayMin / 60)}h</span>}
                <span className="muted">{d.status === "departed" ? "gone" : `in ${until(effDepart(d), now)}`}</span>
              </span>
              <CapBar d={d} compact />
              <span className="dep-foot">
                <Chip tone={st.tone}>{st.label}</Chip>
                <span className={`dep-free${free === 0 ? " is-full" : free <= 4 ? " is-thin" : ""}`}>{free} free</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
