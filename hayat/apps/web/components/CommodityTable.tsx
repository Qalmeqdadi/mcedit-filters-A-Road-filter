import { formatAed, formatCompact, formatDays, formatPercent } from "@/lib/format";
import { statusColor } from "@/lib/risk";
import type { CommodityState } from "@/lib/types";

const ORDER = { CRITICAL: 0, HIGH: 1, ELEVATED: 2, LOW: 3 } as const;

const day = (d: number | null) => (d === null ? "—" : `d${d}`);

export function CommodityTable({ commodities }: { commodities: CommodityState[] }) {
  const rows = [...commodities].sort(
    (a, b) => ORDER[a.risk_level] - ORDER[b.risk_level] || b.criticality - a.criticality,
  );
  return (
    <section className="panel table-panel" aria-label="Commodity resilience">
      <header className="panel-head">
        <h2>Commodity Resilience</h2>
        <span className="panel-meta">national stock across all warehouses</span>
      </header>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Commodity</th>
              <th className="num">Stock (t)</th>
              <th className="num">Use (t/day)</th>
              <th className="num">Days of cover</th>
              <th className="num">Safety target</th>
              <th className="num">Projected trough</th>
              <th className="num">Target breached</th>
              <th className="num">Stock-out</th>
              <th className="num">Inflow delayed</th>
              <th className="num">Shortage risk</th>
              <th>Level</th>
              <th className="num">Resilience score</th>
              <th className="num">Value at risk</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.commodity_id} className={c.impacted ? "row-impacted" : undefined}>
                <td>
                  {c.name} <span className="ar">{c.name_ar}</span>
                </td>
                <td className="num">{formatCompact(c.stock_t)}</td>
                <td className="num">{formatCompact(c.daily_consumption_t)}</td>
                <td className="num">{formatDays(c.days_of_cover)}</td>
                <td className="num">{formatDays(c.safety_stock_days)}</td>
                <td className="num">
                  {formatDays(c.min_cover_days)}
                  {c.impacted && <span className="muted"> d{c.trough_day}</span>}
                </td>
                <td className="num">{day(c.safety_breach_day)}</td>
                <td className="num">{day(c.stockout_day)}</td>
                <td className="num">{c.impacted ? formatPercent(c.disrupted_inflow_share) : "—"}</td>
                <td className="num">{c.shortage_risk.toFixed(2)}</td>
                <td>
                  <span className="pill" style={{ color: statusColor(c.risk_level) }}>
                    {c.risk_level}
                  </span>
                </td>
                <td className="num">{c.resilience_score.toFixed(1)}</td>
                <td className="num">{c.value_at_risk_aed > 0 ? formatAed(c.value_at_risk_aed) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
