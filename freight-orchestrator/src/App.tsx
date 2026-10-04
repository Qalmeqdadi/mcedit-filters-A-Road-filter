import { Minus, Plus, Scan } from "lucide-react";
import { useEffect, useRef } from "react";
import { DockTags } from "./scene/DockTags";
import { Scene } from "./scene/Scene";
import { useStore } from "./sim/store";
import { DepartureStrip, Kpis } from "./ui/Overview";
import { Panel } from "./ui/Panel";
import { TopBar } from "./ui/TopBar";

const zoom = (n: number) => window.dispatchEvent(new CustomEvent("fo-zoom", { detail: n }));

function MapTools() {
  const resetView = useStore((s) => s.resetView);
  return (
    <div className="maptools" role="group" aria-label="Map view">
      <button type="button" className="iconbtn" onClick={() => zoom(1)} aria-label="Zoom in"><Plus size={15} /></button>
      <button type="button" className="iconbtn" onClick={() => zoom(-1)} aria-label="Zoom out"><Minus size={15} /></button>
      <button type="button" className="iconbtn" onClick={resetView} aria-label="Reset the view"><Scan size={15} /></button>
    </div>
  );
}

export function App() {
  const selection = useStore((s) => s.selection);
  const first = useRef(true);

  // on phones the panel sits under the map, so bring it into view when something is picked
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!selection || window.innerWidth > 900) return;
    document.getElementById("panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selection]);

  return (
    <div className="app">
      <TopBar />
      <main className="workspace">
        <div className="stage">
          <Scene />
          <DockTags />
          <MapTools />
          <p className="stage-note">Drag to pan · scroll or pinch to zoom · tap a trailer</p>
        </div>
        <Kpis />
        <DepartureStrip />
        <Panel />
      </main>
    </div>
  );
}
