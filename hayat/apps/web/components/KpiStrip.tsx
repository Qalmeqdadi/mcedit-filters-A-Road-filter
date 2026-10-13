import { formatAed, formatSigned, humanizeChokepoint } from "@/lib/format";
import type { ResilienceState } from "@/lib/types";

function indexTone(value: number): string {
  if (value >= 75) return "tone-good";
  if (value >= 60) return "tone-warn";
  return "tone-bad";
}

function Gauge({ value }: { value: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const filled = (Math.max(0, Math.min(100, value)) / 100) * c;
  return (
    <svg className="gauge" viewBox="0 0 84 84" aria-hidden>
      <circle cx="42" cy="42" r={r} className="gauge-track" />
      <circle
        cx="42"
        cy="42"
        r={r}
        className="gauge-fill"
        strokeDasharray={`${filled} ${c}`}
        transform="rotate(-90 42 42)"
      />
    </svg>
  );
}

export function KpiStrip({ state }: { state: ResilienceState }) {
  const k = state.kpis;
  const signal = state.signals[state.signals.length - 1];
  const threats = state.threats;

  return (
    <section className="kpis" aria-label="Key indicators">
      <article className={`kpi kpi-index ${indexTone(k.resilience_index)}`}>
        <Gauge value={k.resilience_index} />
        <div>
          <h3>Resilience Index</h3>
          <p className="kpi-value">{k.resilience_index.toFixed(1)}</p>
          <p className="kpi-sub">
            {k.resilience_delta === 0 ? (
              <>Baseline · no active disruptions</>
            ) : (
              <>
                <span className={k.resilience_delta < 0 ? "neg" : "pos"}>
                  {formatSigned(k.resilience_delta)}
                </span>{" "}
                vs baseline {k.baseline_resilience_index.toFixed(1)}
              </>
            )}
          </p>
        </div>
      </article>

      <article className={`kpi ${k.active_signals ? "tone-warn" : ""}`}>
        <h3>Active Signals</h3>
        <p className="kpi-value">{k.active_signals}</p>
        <p className="kpi-sub">
          {signal
            ? `${humanizeChokepoint(signal.chokepoint)} · +${signal.delay_days} days · ${signal.severity}`
            : "No active disruption signals"}
        </p>
      </article>

      <article className={`kpi ${k.material_threats ? "tone-bad" : ""}`}>
        <h3>Material Threats</h3>
        <p className="kpi-value">{k.material_threats}</p>
        <p className="kpi-sub">
          {threats.length
            ? threats.map((t) => `${t.name} (${t.risk_level})`).join(" · ")
            : "No commodity at HIGH or CRITICAL risk"}
        </p>
      </article>

      <article className={`kpi ${k.value_at_risk_aed > 0 ? "tone-warn" : ""}`}>
        <h3>Protected Value</h3>
        <p className="kpi-value">{formatAed(k.protected_value_aed)}</p>
        <p className="kpi-sub">
          {k.value_at_risk_aed > 0 ? (
            <>
              <span className="neg">{formatAed(k.value_at_risk_aed)}</span> at risk of{" "}
              {formatAed(k.demand_value_aed)} {state.horizon_days}-day demand
            </>
          ) : (
            <>All {state.horizon_days}-day essential demand served with safety stock intact</>
          )}
        </p>
      </article>
    </section>
  );
}
