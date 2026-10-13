import { formatGst } from "@/lib/format";
import type { AuditEvent } from "@/lib/types";
import type { StreamStatus } from "@/lib/usePulse";

const TONE: Record<string, string> = {
  "event.received": "ev-info",
  "disruption.detected": "ev-alert",
  "disruption.no_exposure": "ev-muted",
  "impact.calculation.started": "ev-work",
  "impact.calculation.completed": "ev-work",
  "resilience.recalculated": "ev-good",
  "signals.reset": "ev-muted",
  "pipeline.failed": "ev-alert",
};

export function EventStream({ events, status }: { events: AuditEvent[]; status: StreamStatus }) {
  const newestFirst = [...events].reverse();
  return (
    <section className="panel events" aria-label="Audit event stream">
      <header className="panel-head">
        <h2>Audit Stream</h2>
        <span className={`stream-status stream-${status}`}>{status}</span>
      </header>
      {newestFirst.length === 0 ? (
        <p className="empty">No events recorded yet.</p>
      ) : (
        <div className="event-scroll">
          <ol className="event-list">
            {newestFirst.map((e) => (
              <li key={e.id} className={TONE[e.event_type] ?? "ev-info"}>
                <div className="event-row">
                  <time dateTime={e.occurred_at}>{formatGst(e.occurred_at)}</time>
                  <code className="event-type">{e.event_type}</code>
                  <span className="event-actor">{e.actor}</span>
                </div>
                <p className="event-msg">{e.message}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
