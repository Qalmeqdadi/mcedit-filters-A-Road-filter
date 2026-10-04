import { Bell, ChevronDown, FastForward, Pause, Play, RotateCcw, Search } from "lucide-react";
import { useState } from "react";
import { CARRIER, LANES } from "../sim/data";
import { clock, dayLabel } from "../sim/engine";
import { type Speed, useStore } from "../sim/store";

const SPEEDS: { s: Speed; label: string }[] = [
  { s: 0, label: "Pause" },
  { s: 1, label: "1×" },
  { s: 4, label: "4×" },
  { s: 15, label: "15×" },
];

export function Mark() {
  return (
    <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden className="mark">
      <path d="M16 3 28 10v12l-12 7-12-7V10z" fill="var(--accent)" />
      <path d="M16 3 28 10 16 17 4 10z" fill="var(--accent-hi)" />
      <path d="M10 13.5 16 17v7" stroke="var(--on-accent)" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M22 13.5 16 17" stroke="var(--on-accent)" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function SearchBox() {
  const [q, setQ] = useState("");
  const [miss, setMiss] = useState(false);
  const run = () => {
    const s = q.trim().toLowerCase();
    if (!s) return;
    const { world, select, setTab } = useStore.getState();
    const dep = world.departures.find(
      (d) => d.status !== "departed" &&
        (d.id.toLowerCase().includes(s) || d.lane.toLowerCase() === s || LANES[d.lane].city.toLowerCase().includes(s) || `d${d.dock}` === s ||
          [...d.bookings, ...d.holds].some((a) => a.ref.toLowerCase() === s)),
    );
    const rfq = world.rfqs.find((r) => r.id.toLowerCase().includes(s) || r.desk.toLowerCase().includes(s) || r.commodity.toLowerCase().includes(s));
    if (rfq && (!dep || s.startsWith("rfq"))) {
      setTab("rfqs");
      select({ kind: "rfq", id: rfq.id });
    } else if (dep) select({ kind: "departure", id: dep.id });
    else {
      setMiss(true);
      return;
    }
    setQ("");
  };
  return (
    <form className={`search${miss ? " is-miss" : ""}`} onSubmit={(e) => { e.preventDefault(); run(); }} role="search">
      <Search size={15} aria-hidden />
      <input
        id="search"
        value={q}
        onChange={(e) => { setQ(e.target.value); setMiss(false); }}
        placeholder={miss ? "No match. Try RUH, D3 or RFQ-4093" : "Find a dock, lane, booking or RFQ"}
        aria-label="Find a dock, lane, booking or RFQ"
      />
      <kbd>↵</kbd>
    </form>
  );
}

export function TopBar() {
  const now = useStore((s) => s.world.now);
  const speed = useStore((s) => s.speed);
  const setSpeed = useStore((s) => s.setSpeed);
  const restart = useStore((s) => s.restart);
  const pending = useStore((s) => s.world.rfqs.filter((r) => r.state === "new").length);
  const setTab = useStore((s) => s.setTab);
  const select = useStore((s) => s.select);
  const [menu, setMenu] = useState(false);

  return (
    <header className="topbar">
      <div className="brand">
        <Mark />
        <div className="brand-text">
          <strong>Freight Orchestrator</strong>
          <span>Carrier</span>
        </div>
      </div>
      <SearchBox />
      <button className="site" type="button" title="Switch site">
        <span className="site-badge">JA</span>
        <span className="site-text">
          <strong>{CARRIER.site}</strong>
          <small>{CARRIER.name} · {CARRIER.docks} docks</small>
        </span>
        <ChevronDown size={14} aria-hidden />
      </button>
      <div className="clock" aria-live="off">
        <span className={`live-dot${speed === 0 ? " is-paused" : ""}`} />
        <span className="clock-day">{dayLabel(now)}</span>
        <span className="clock-time">{clock(now)}</span>
        <span className="clock-tz">GST</span>
      </div>
      <div className="speed" role="group" aria-label="Simulation speed">
        {SPEEDS.map(({ s, label }) => (
          <button key={s} type="button" className={speed === s ? "is-on" : ""} onClick={() => setSpeed(s)} aria-pressed={speed === s} title={s === 0 ? "Pause" : `${s} sim minute${s > 1 ? "s" : ""} per second`}>
            {s === 0 ? <Pause size={13} /> : s === 1 ? <Play size={13} /> : <FastForward size={13} />}
            <span>{label}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="iconbtn bell"
        aria-label={`${pending} RFQs waiting for a reply`}
        onClick={() => { setTab("rfqs"); select(null); }}
      >
        <Bell size={17} />
        {pending > 0 && <span className="bell-n">{pending}</span>}
      </button>
      <div className="user">
        <button type="button" className="user-btn" onClick={() => setMenu((m) => !m)} aria-expanded={menu}>
          <span className="avatar">{CARRIER.user.initials}</span>
          <span className="user-text">
            <strong>{CARRIER.user.name}</strong>
            <small>{CARRIER.user.role}</small>
          </span>
          <ChevronDown size={14} aria-hidden />
        </button>
        {menu && (
          <div className="menu" role="menu">
            <button type="button" role="menuitem" onClick={() => { restart(); setMenu(false); }}>
              <RotateCcw size={14} /> Restart the shift
            </button>
            <p>All carriers, desks, people and figures are synthetic.</p>
          </div>
        )}
      </div>
    </header>
  );
}
