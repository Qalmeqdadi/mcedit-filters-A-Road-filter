import { formatAed, formatCompact, formatDays, formatPercent, humanizeChokepoint } from "@/lib/format";
import { statusColor } from "@/lib/risk";
import type { Network, ResilienceState } from "@/lib/types";

import { Sparkline } from "./Sparkline";

export function ThreatPanel({ state, network }: { state: ResilienceState; network: Network }) {
  const byId = new Map(state.commodities.map((c) => [c.commodity_id, c]));
  const routes = Object.keys(state.network_status.routes);
  const ports = Object.keys(state.network_status.ports)
    .map((id) => network.ports.find((p) => p.id === id)?.name ?? id)
    .join(", ");
  const watch = state.commodities.filter((c) => c.impacted && c.risk_level === "ELEVATED");

  return (
    <section className="panel threats" aria-label="Material threats">
      <header className="panel-head">
        <h2>Material Threats</h2>
        <span className="panel-meta">{state.horizon_days}-day projection</span>
      </header>

      {state.signals.map((s) => (
        <div key={s.id} className="signal">
          <div className="signal-tag">SIGNAL · {s.severity.toUpperCase()}</div>
          <p className="signal-title">{s.title}</p>
          <p className="signal-meta">
            {humanizeChokepoint(s.chokepoint)} · +{s.delay_days} days · {routes.length} routes
            delayed{ports ? ` · arrivals at ${ports}` : ""}
          </p>
        </div>
      ))}

      {state.threats.length === 0 ? (
        <p className="empty">
          No material threats. Every commodity&apos;s projected cover stays above its safety target.
        </p>
      ) : (
        state.threats.map((t) => {
          const c = byId.get(t.commodity_id)!;
          const color = statusColor(t.risk_level);
          return (
            <article key={t.commodity_id} className="threat" style={{ borderColor: color }}>
              <header>
                <span className="badge" style={{ background: color }}>
                  {t.risk_level}
                </span>
                <h3>
                  {t.name} <span className="ar">{t.name_ar}</span>
                </h3>
              </header>
              <p className="threat-headline">{t.headline}</p>
              <Sparkline values={c.projected_cover_days} target={c.safety_stock_days} color={color} />
              <dl className="threat-stats">
                <div>
                  <dt>Cover now → trough</dt>
                  <dd>
                    {formatDays(t.days_of_cover)} → {formatDays(t.min_cover_days)}
                  </dd>
                </div>
                <div>
                  <dt>Inflow delayed</dt>
                  <dd>{formatPercent(t.disrupted_inflow_share)}</dd>
                </div>
                <div>
                  <dt>{t.vulnerable_group === "infants" ? "Infants exposed" : "Population exposed"}</dt>
                  <dd>{formatCompact(t.exposed_population)}</dd>
                </div>
                {t.exposed_hospital_ids.length > 0 && (
                  <div>
                    <dt>Neonatal ICUs</dt>
                    <dd>{t.exposed_hospital_ids.length}</dd>
                  </div>
                )}
                <div>
                  <dt>Value at risk</dt>
                  <dd>{formatAed(t.value_at_risk_aed)}</dd>
                </div>
              </dl>
            </article>
          );
        })
      )}

      {watch.length > 0 && (
        <p className="watch">
          Watch:{" "}
          {watch
            .map((c) => `${c.name} ${formatDays(c.days_of_cover)} → ${formatDays(c.min_cover_days)}`)
            .join(" · ")}{" "}
          (ELEVATED, above safety target)
        </p>
      )}
    </section>
  );
}
