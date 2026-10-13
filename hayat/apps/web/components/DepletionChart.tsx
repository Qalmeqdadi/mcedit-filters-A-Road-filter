import { statusColor } from "@/lib/risk";
import type { CommodityState } from "@/lib/types";

const W = 640;
const H = 240;
const PAD = { l: 44, r: 120, t: 14, b: 28 };
const Y_MAX = 2;

interface Label {
  id: string;
  text: string;
  color: string;
  y: number;
}

/** Nudge end-of-line labels apart so they never overlap (layout only). */
function spreadLabels(labels: Label[], gap = 13): Label[] {
  const sorted = [...labels].sort((a, b) => a.y - b.y);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].y - sorted[i - 1].y < gap) sorted[i] = { ...sorted[i], y: sorted[i - 1].y + gap };
  }
  return sorted;
}

/**
 * Projected cover divided by each commodity's safety target, so commodities with
 * different targets share one axis: 1.0 = at target, 0.5 = critical threshold.
 */
export function DepletionChart({ commodities, horizon }: { commodities: CommodityState[]; horizon: number }) {
  const shown = commodities.filter((c) => c.impacted);
  const series = shown.length ? shown : commodities.slice(0, 4);
  const x = (day: number) => PAD.l + (day / horizon) * (W - PAD.l - PAD.r);
  const y = (ratio: number) => PAD.t + (1 - Math.min(ratio, Y_MAX) / Y_MAX) * (H - PAD.t - PAD.b);

  return (
    <section className="panel" aria-label="Inventory depletion projection">
      <header className="panel-head">
        <h2>Inventory Depletion</h2>
        <span className="panel-meta">
          {shown.length ? "commodities with delayed inflow" : "no delayed inflow, baseline shown"}
        </span>
      </header>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`}>
        {[0, 0.5, 1, 1.5, 2].map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className={v === 1 ? "axis-target" : v === 0.5 ? "axis-critical" : "axis-grid"} />
            <text x={PAD.l - 8} y={y(v) + 4} textAnchor="end" className="axis-label">
              {v.toFixed(1)}×
            </text>
          </g>
        ))}
        {[0, 5, 10, 15, 20, 25, 30].filter((d) => d <= horizon).map((d) => (
          <text key={d} x={x(d)} y={H - 8} textAnchor="middle" className="axis-label">
            d{d}
          </text>
        ))}
        <text x={PAD.l + 6} y={y(1) - 5} className="axis-note">safety target</text>
        <text x={PAD.l + 6} y={y(0.5) - 5} className="axis-note critical">critical</text>
        {series.map((c) => {
          const ratios = c.projected_cover_days.map((v) => v / c.safety_stock_days);
          const d = ratios.map((r, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(r).toFixed(1)}`).join("");
          return (
            <path key={c.commodity_id} d={d} fill="none" stroke={statusColor(c.risk_level)} strokeWidth="2.2" />
          );
        })}
        {spreadLabels(
          series.map((c) => ({
            id: c.commodity_id,
            text: c.name,
            color: statusColor(c.risk_level),
            y: y(c.projected_cover_days[c.projected_cover_days.length - 1] / c.safety_stock_days),
          })),
        ).map((l) => (
          <text key={l.id} x={x(horizon) + 6} y={l.y + 4} className="series-label" fill={l.color}>
            {l.text}
          </text>
        ))}
      </svg>
    </section>
  );
}
