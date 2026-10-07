import { BarChart3, Container, Earth, FileText, Globe, Inbox, LayoutGrid, Lock, Mail, Minus, Plug, Plus, Route, Scan, ScrollText, Ship, Sparkles, Wand2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { S } from "../data";
import { LENSES } from "../live/engine";
import { PERSONAS, ROAD_VIEWS, SUPPLY_VIEWS, TOUR, isGlobal, maxStep, personaOf, routeOf, selectedCarrier, useStore, type Persona, type View } from "../store";

interface NavItem { k?: View; l?: string; i?: ReactNode; tag?: string; sep?: string }
const WORLD: NavItem = { k: "world", l: "World map", i: <Earth size={18} /> };
const NAV: Record<Persona, NavItem[]> = {
  fwd: [
    { sep: "Global · live" },
    WORLD,
    { k: "inbox", l: "Inbox", i: <Inbox size={18} /> },
    { k: "replies", l: "Reply lab", i: <Wand2 size={18} /> },
    { k: "audit", l: "Audit trail", i: <ScrollText size={18} /> },
    { sep: "Jebel Ali board" },
    { k: "dash", l: "Dashboard", i: <LayoutGrid size={18} /> },
    { k: "flow", l: "New quote", i: <Plus size={18} /> },
    { k: "analytics", l: "Insights", i: <BarChart3 size={18} /> },
    { k: "carriers", l: "Carriers", i: <Container size={18} /> },
    { k: "setup", l: "Setup", i: <Plug size={18} /> },
    { sep: "Roadmap" },
    { k: "ship", l: "Shipments", i: <Ship size={18} />, tag: "2" },
    { k: "multi", l: "Multimodal", i: <Route size={18} />, tag: "3" },
    { k: "opt", l: "Optimization", i: <Sparkles size={18} />, tag: "4" },
    { k: "trust", l: "Trust & payments", i: <Lock size={18} />, tag: "5" },
    { k: "net", l: "Network & API", i: <Globe size={18} />, tag: "6" },
  ],
  car: [{ sep: "Global · live" }, WORLD, { sep: "Carrier portal · MVP" }, { k: "c_home", l: "Quote requests", i: <Mail size={18} /> }, { k: "c_cap", l: "Capacity & rates", i: <Container size={18} /> }, { k: "c_perf", l: "Performance & pay", i: <BarChart3 size={18} /> }],
  par: [{ sep: "Global · live" }, WORLD, { sep: "Partner portal · Phase 2–6" }, { k: "p_jobs", l: "Job queue", i: <FileText size={18} /> }],
  shp: [{ sep: "Global · live" }, WORLD, { sep: "Shipper portal · MVP" }, { k: "sh_home", l: "My shipments", i: <LayoutGrid size={18} /> }, { k: "sh_docs", l: "Documents & invoices", i: <FileText size={18} /> }],
};

const CRUMBS: Record<View, ReactNode> = {
  world: <>World <span>/ Global network</span></>,
  inbox: <>Inbox <span>/ Requests, live</span></>,
  replies: <>Reply lab <span>/ Carrier replies, live</span></>,
  audit: <>Audit trail <span>/ Append-only</span></>,
  dash: "Dashboard",
  flow: <>Quotes <span>/ Q-0916-0142 · {S.customer}</span></>,
  carriers: <>Carriers <span>/ Scorecards</span></>,
  analytics: <>Insights <span>/ Win and loss</span></>,
  setup: <>Setup <span>/ Desk and permissions</span></>,
  ship: <>Shipments <span>/ Phase 2 preview</span></>,
  multi: <>Multimodal <span>/ Phase 3 preview</span></>,
  opt: <>Optimization <span>/ Phase 4 preview</span></>,
  trust: <>Trust & payments <span>/ Phase 5 preview</span></>,
  net: <>Network & API <span>/ Phase 6 preview</span></>,
  c_home: <>Oceanlink Lines <span>/ Quote requests</span></>,
  c_cap: <>Oceanlink Lines <span>/ Capacity and rates</span></>,
  c_perf: <>Oceanlink Lines <span>/ Performance and payments</span></>,
  p_jobs: <>Al Safa Customs Brokers <span>/ Job queue</span></>,
  sh_home: <>Al Noor Home Appliances <span>/ My shipments</span></>,
  sh_docs: <>Al Noor Home Appliances <span>/ Documents and invoices</span></>,
};

export function Mark() {
  return <span className="mark" aria-hidden><i style={{ left: 9 }} /><i style={{ left: 17 }} /></span>;
}

export function Side() {
  const view = useStore((s) => s.view);
  const open = useStore((s) => s.open);
  const go = useStore((s) => s.go);
  const step = useStore((s) => s.step);
  const lens = useStore((s) => s.lens);
  const pk = personaOf(view, lens);
  const P = PERSONAS[pk];
  const L = LENSES[lens];
  const who: [string, string, string, string] = isGlobal(view) ? [L.person.split(" ").map((w) => w[0]).join(""), L.person, L.org, L.color] : P.who;
  return (
    <aside className="side">
      <div className="brand"><Mark /><span className="lbl-hide">Freight Orchestrator</span></div>
      <div className="side-role lbl-hide">{P.role}</div>
      <nav className="navlist" aria-label="Screens">
        {NAV[pk].map((n, i) =>
          n.sep ? <div key={i} className="navsep">{n.sep}</div> : (
            <button key={n.k} type="button" className="nav" aria-current={view === n.k ? "page" : undefined} title={`${n.l}${n.tag ? " · Phase " + n.tag : ""}`}
              onClick={() => (n.k === "flow" ? go(step) : open(n.k!))}>
              {n.i}<span className="lbl-hide">{n.l}</span>{n.tag && <span className="soon">P{n.tag}</span>}
            </button>
          ),
        )}
      </nav>
      <div className="side-foot">
        <span className="avatar" style={{ background: who[3], color: "#fff" }}>{who[0]}</span>
        <div className="lbl-hide"><div className="side-name">{who[1]}</div><div className="sm side-muted">{who[2]}</div></div>
      </div>
    </aside>
  );
}

export function TopBar() {
  const view = useStore((s) => s.view);
  const auto = useStore((s) => s.auto);
  const tour = useStore((s) => s.tour);
  const startTour = useStore((s) => s.startTour);
  const stopTour = useStore((s) => s.stopTour);
  const toastMsg = useStore((s) => s.toastMsg);
  const lens = useStore((s) => s.lens);
  const personaGo = useStore((s) => s.personaGo);
  const pk = personaOf(view, lens);
  const copy = () => {
    const url = location.href.split("#")[0] + "#" + routeOf(useStore.getState());
    navigator.clipboard?.writeText(url).then(() => toastMsg("Link to this screen copied"), () => toastMsg("Link: " + url));
  };
  return (
    <header className="bar">
      <div className="crumbs">{CRUMBS[view]}</div>
      <div className="persona" role="group" aria-label="View the platform as">
        {(["shp", "fwd", "car", "par"] as Persona[]).map((k) => (
          <button key={k} type="button" aria-pressed={k === pk} onClick={() => personaGo(k)}>{PERSONAS[k].label}</button>
        ))}
      </div>
      <button type="button" className="btn ghost sm" onClick={copy} title="Copy a link to this screen">Copy link</button>
      <button type="button" className="btn ghost sm" onClick={() => (auto ? stopTour() : startTour())}>{auto ? `Stop tour (${tour + 1}/${TOUR.length})` : "Play tour"}</button>
      <span className="flag">Demo · illustrative data</span>
    </header>
  );
}

// ---------------------------------------------------------------- guide bar

const NARR: Record<string, [string, string]> = {
  world: ["One network, seen through each person's permissions", "Drag the globe, unroll it flat, or switch who you are. Every lane, rate and shipment shown has passed the same permission check the server runs."],
  inbox: ["Email in, structured request out", "Deliver a message: it is routed to a desk, read field by field, checked for completeness and deduplicated. The enquiry is drawn on the globe."],
  replies: ["Any reply format, one comparable price", "Read an email, a PDF table or a WhatsApp thread. Shaky fields wait for a person, and each answer becomes a training label."],
  audit: ["Every step on the record", "Rule and model versions, state changes, refusals and overrides, in the order they happened."],
  0: ["This is the forwarder's desk", "Every live quote, lane and shipment in one place, on one map. Start the walkthrough to follow one request end to end."],
  1: ["A shipper's email becomes a clean request", "Details are read from the email automatically, then the 18 pallets are laid into real containers on the load-planning yard."],
  2: ["RFQs go out on channels carriers already use", "Watch the requests fly to the six ships on the Shanghai quay. Beacons turn teal as replies come back."],
  3: ["Messy replies become structured data", "Hover any field to see where it came from. Anything the AI isn't sure about waits for a person."],
  4: ["Only workable options get ranked", "Pick what this customer cares about, or drag the sliders. The winner's beacon rises; ruled-out ships go grey."],
  5: ["The forwarder keeps the margin and the customer", "Set the margin against this week's lane benchmark, send, and Sara approves from her phone in Dubai."],
  6: ["Booked, tracked, done", "From shipper email to approved booking in minutes instead of days. Follow the ship across the map."],
  carriers: ["Carrier scorecards", "Built automatically from every quote and shipment, and used in every ranking."],
  ship: ["Phase 2: booking, documents and tracking", "Paperwork is generated from data already in the system, and problems ring on the map before they cause delays."],
  multi: ["Phase 3: every mode, live capacity", "Sea, air, rail, road and coastal on one timeline, with space pulled live from carrier systems."],
  opt: ["Phase 4: AI that plans ahead", "Rate forecasts, disruption alerts, consolidation and a 3D load plan turn platform data into savings."],
  trust: ["Phase 5: trust layer for payments", "Press Record next event to follow the container. Payment is released the moment delivery is signed."],
  net: ["Phase 6: network scale", "Autopilot books routine shipments, and partners build on the platform through its API. Next: the supply side."],
  c_home: ["The other side: carriers", "Carriers answer a request in one click with live market guidance, instead of writing emails. Try moving the rate and sending."],
  c_cap: ["Carriers publish space once", "Change free TEU and watch the containers on Oceanlink's ships update. Demand data gives carriers a reason to join."],
  c_perf: ["Scorecards and fast payment", "Carriers see how they are ranked and get paid on delivery, which is the strongest reason for them to stay."],
  analytics: ["Every quote becomes data", "Win and loss by carrier, why deals are lost, and the margin left on the table. This is what keeps a desk subscribing."],
  setup: ["Live the same day", "Connect a mailbox and the desk is running. The permissions table answers the first question every carrier asks."],
  sh_home: ["The shipper's side", "Shippers send requests, approve quotes and follow every shipment. They never deal with carriers directly."],
  sh_docs: ["Documents and money", "Every document in one place, and invoices that match the approved quote line by line."],
  p_jobs: ["Service partners", "Customs brokers, insurers, warehouses and truckers receive ready-to-work jobs. Each one adds revenue to every booking."],
};

interface Next { label: string; fn: () => void; dis?: boolean }

function useNext(): { next: Next; back?: () => void; dots?: { n: number; on: number } } {
  const st = useStore();
  const { view, step } = st;
  const ri = ROAD_VIEWS.indexOf(view);
  if (ri >= 0) return {
    next: ri < ROAD_VIEWS.length - 1 ? { label: `Next: Phase ${ri + 3}`, fn: () => st.open(ROAD_VIEWS[ri + 1]) } : { label: "See the carrier side", fn: () => st.open("c_home") },
    back: () => (ri ? st.open(ROAD_VIEWS[ri - 1]) : st.go(maxStep(st))),
    dots: { n: ROAD_VIEWS.length, on: ri },
  };
  const si = SUPPLY_VIEWS.indexOf(view);
  if (si >= 0) return {
    next: si < SUPPLY_VIEWS.length - 1 ? { label: si === 2 ? "See service partners" : "Next", fn: () => st.open(SUPPLY_VIEWS[si + 1]) } : { label: "See the shipper side", fn: () => st.open("sh_home") },
    back: () => st.open(si ? SUPPLY_VIEWS[si - 1] : "net"),
  };
  const tail: View[] = ["sh_home", "sh_docs", "analytics", "setup"];
  const ti = tail.indexOf(view);
  if (ti >= 0) return {
    next: ti < 3 ? { label: "Next", fn: () => st.open(tail[ti + 1]) } : { label: "Restart demo", fn: st.restart },
    back: () => st.open(({ sh_home: "p_jobs", sh_docs: "sh_home", analytics: "sh_docs", setup: "analytics" } as Record<string, View>)[view]),
  };
  const gi = (["world", "inbox", "replies", "audit"] as View[]).indexOf(view);
  if (gi >= 0) {
    const desk = LENSES[st.lens].persona === "fwd";
    if (!desk) return { next: { label: "Zoom into the board", fn: () => st.open(PERSONAS[LENSES[st.lens].persona].home) } };
    const order: View[] = ["world", "inbox", "replies", "audit"];
    return gi < 3
      ? { next: { label: ["Open the Inbox", "Open the Reply lab", "See the audit trail"][gi]!, fn: () => st.open(order[gi + 1]!) }, back: gi ? () => st.open(order[gi - 1]!) : undefined, dots: { n: 4, on: gi } }
      : { next: { label: "Zoom into the Jebel Ali board", fn: () => st.open("dash") }, back: () => st.open("replies"), dots: { n: 4, on: 3 } };
  }
  if (view !== "flow") return { next: { label: "Start walkthrough", fn: () => st.go(1) } };
  const back = () => (step > 1 ? st.go(step - 1) : st.open("dash"));
  const dots = { n: 6, on: step - 1 };
  if (step === 1) return { back, dots, next: st.filled ? { label: "Send RFQ to 6 carriers", fn: () => st.go(2) } : { label: st.filling ? "Reading email…" : "Read the email", fn: st.autofill, dis: st.filling } };
  if (step === 2) return { back, dots, next: { label: st.rfqGot.length === 6 ? "Review replies" : "Collecting replies…", fn: () => st.go(3), dis: st.rfqGot.length < 6 } };
  if (step === 3) return { back, dots, next: { label: "Compare options", fn: () => st.go(4) } };
  if (step === 4) return { back, dots, next: { label: `Quote ${selectedCarrier(st).name.split(" ")[0]}`, fn: () => st.go(5) } };
  if (step === 5) return { back, dots, next: st.approved ? { label: "Book and track", fn: () => st.go(6) } : st.sent ? { label: "Waiting for customer", fn: () => {}, dis: true } : { label: "Send quote", fn: st.sendQuote } };
  return { back, dots, next: { label: "See the roadmap", fn: () => st.open("ship") } };
}

export function Guide() {
  const view = useStore((s) => s.view);
  const step = useStore((s) => s.step);
  const key = view === "flow" ? String(step) : NARR[view] ? view : "0";
  const [t, d] = NARR[key];
  const { next, back, dots } = useNext();

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches("input, textarea")) return;
      const s = useStore.getState();
      if (s.view !== "flow") return;
      if (e.key === "ArrowRight" && s.step < maxStep(s)) s.go(s.step + 1);
      if (e.key === "ArrowLeft" && s.step > 1) s.go(s.step - 1);
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);

  return (
    <div className="guide" role="region" aria-label="Guide">
      {dots && <div className="gdots">{Array.from({ length: dots.n }, (_, i) => <i key={i} className={i === dots.on ? "on" : ""} />)}</div>}
      <div className="gtxt"><b>{t}</b><p>{d}</p></div>
      {back && <button type="button" className="btn ghost sm" onClick={back}>Back</button>}
      <button type="button" className="btn primary" disabled={next.dis} onClick={next.fn}>{next.label}</button>
    </div>
  );
}

export function Toast() {
  const toast = useStore((s) => s.toast);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!toast) return;
    setShow(true);
    const t = setTimeout(() => setShow(false), 2600);
    return () => clearTimeout(t);
  }, [toast]);
  return (
    <div className={`toast${show ? " show" : ""}`} role="status" aria-live="polite">
      <span className="dotc" style={{ color: "var(--signal)" }} />{toast?.msg}
    </div>
  );
}

const zoom = (n: number) => window.dispatchEvent(new CustomEvent("fw-zoom", { detail: n }));
export function MapTools() {
  const reset = () => {
    const s = useStore.getState();
    s.set({ viewNonce: s.viewNonce + 1 });
  };
  return (
    <div className="maptools" role="group" aria-label="Map view">
      <button type="button" className="iconbtn" onClick={() => zoom(1)} aria-label="Zoom in"><Plus size={15} /></button>
      <button type="button" className="iconbtn" onClick={() => zoom(-1)} aria-label="Zoom out"><Minus size={15} /></button>
      <button type="button" className="iconbtn" onClick={reset} aria-label="Fly back to this screen's view"><Scan size={15} /></button>
    </div>
  );
}
