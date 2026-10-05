import { useEffect, useRef, type ReactNode } from "react";
import { World } from "./scene/World";
import { routeOf, useStore, type View } from "./store";
import { Stat } from "./ui/bits";
import { Labels } from "./ui/Labels";
import { Guide, MapTools, Side, Toast, TopBar } from "./ui/Shell";
import { FlowView } from "./ui/views/Flow";
import { AnalyticsView, CarriersView, DashView, SetupView } from "./ui/views/Forwarder";
import { CarrierCap, CarrierHome, CarrierPerf, PartnerJobs, ShipperDocs, ShipperHome } from "./ui/views/Portals";
import { MultiView, NetView, OptView, ShipView, TrustView } from "./ui/views/Roadmap";

const VIEWS: Record<View, () => ReactNode> = {
  dash: DashView, flow: FlowView, carriers: CarriersView, analytics: AnalyticsView, setup: SetupView,
  ship: ShipView, multi: MultiView, opt: OptView, trust: TrustView, net: NetView,
  c_home: CarrierHome, c_cap: CarrierCap, c_perf: CarrierPerf, p_jobs: PartnerJobs, sh_home: ShipperHome, sh_docs: ShipperDocs,
};

/** Headline numbers that sit on the map itself, like a strategy game's resource bar. */
const KPIS: Partial<Record<View, [string, string, string][]>> = {
  dash: [["Avg. time to quote", "4 min 12 s", "was 2.3 days before launch"], ["Quotes sent today", "47", "+18 vs. last Wednesday"], ["Quote win rate", "38%", "up from 22%"], ["Replies read without edits", "91%", "across email, PDF and WhatsApp"]],
  analytics: [["Quotes sent", "312", "+41% vs. last month"], ["Win rate", "38%", "up from 22% before launch"], ["Average margin", "12.4%", "steady while volume grew"], ["Margin left on the table", "USD 18.4K", "on quotes priced above market"]],
};

function useHashRouting() {
  const booted = useRef(false);
  const view = useStore((s) => s.view);
  const step = useStore((s) => s.step);
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    const h = decodeURIComponent(location.hash.replace("#", ""));
    if (h) useStore.getState().goRoute(h);
    const on = () => {
      const r = decodeURIComponent(location.hash.replace("#", ""));
      if (r && r !== routeOf(useStore.getState())) useStore.getState().goRoute(r);
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  useEffect(() => {
    try {
      history.replaceState(null, "", "#" + routeOf({ view, step }));
    } catch {
      /* some hosts refuse history changes; links still work without it */
    }
  }, [view, step]);
}

export function App() {
  useHashRouting();
  const view = useStore((s) => s.view);
  const nonce = useStore((s) => s.viewNonce);
  const panel = useRef<HTMLDivElement>(null);
  const Body = VIEWS[view];
  const kpis = KPIS[view];

  useEffect(() => {
    panel.current?.scrollTo({ top: 0 });
  }, [view, nonce]);

  return (
    <div className="app">
      <Side />
      <div className="main">
        <TopBar />
        <main className="workspace">
          <div className="world">
            <World />
            <Labels />
            <MapTools />
          </div>
          {kpis && (
            <div className="kpis" aria-label="Headline numbers">
              {kpis.map(([l, v, d]) => <div key={l} className="kpi"><Stat label={l} value={v} delta={d} /></div>)}
            </div>
          )}
          <div className="panel" ref={panel}>
            <div className="panel-body fade" key={view}>
              <Body />
            </div>
          </div>
          <Guide />
        </main>
      </div>
      <Toast />
    </div>
  );
}
