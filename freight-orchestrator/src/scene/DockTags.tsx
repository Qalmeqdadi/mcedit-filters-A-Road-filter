import { LANES } from "../sim/data";
import { clock, effDepart, freePallets, liveHolds } from "../sim/engine";
import { useStore } from "../sim/store";
import { tagEls } from "./anchors";

export function DockTags() {
  const w = useStore((s) => s.world);
  const sel = useStore((s) => s.selection);
  const select = useStore((s) => s.select);
  const docked = w.departures.filter((d) => d.dock !== null && (d.status === "open" || d.status === "closed"));
  return (
    <div className="dock-tags">
      {docked.map((d) => {
        const free = freePallets(d);
        const leaving = effDepart(d) - w.now;
        const isSel = sel?.kind === "departure" && sel.id === d.id;
        return (
          <button
            key={d.id}
            type="button"
            ref={(el) => {
              if (el) tagEls.set(d.id, el);
              else tagEls.delete(d.id);
            }}
            className={`dock-tag${isSel ? " is-selected" : ""}${d.status === "closed" ? " is-closed" : ""}`}
            style={{ visibility: "hidden" }}
            onClick={() => select({ kind: "departure", id: d.id })}
            title={`${LANES[d.lane].city}, departs ${clock(effDepart(d))}`}
          >
            <span className="dock-tag-id">D{d.dock}</span>
            <span className="dock-tag-lane">{d.lane}</span>
            <span className={`dock-tag-free${free === 0 ? " is-full" : free <= 4 ? " is-thin" : ""}`}>
              {d.status === "closed" ? (leaving <= 15 ? "leaving" : "loading") : `${free} free`}
            </span>
            {liveHolds(d).length > 0 && d.status === "open" && <span className="dock-tag-hold" />}
          </button>
        );
      })}
    </div>
  );
}
