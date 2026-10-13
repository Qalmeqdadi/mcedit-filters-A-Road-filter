"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "./api";
import type { AuditEvent, Pulse } from "./types";

export type StreamStatus = "connecting" | "live" | "reconnecting" | "offline";

const MAX_EVENTS = 200;

export function usePulse() {
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<StreamStatus>("connecting");
  const [busy, setBusy] = useState<null | "trigger" | "reset">(null);
  const lastEventId = useRef(0);

  const refreshPulse = useCallback(async () => {
    try {
      setPulse(await api.pulse());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const appendEvents = useCallback((incoming: AuditEvent[]) => {
    const fresh = incoming.filter((e) => e.id > lastEventId.current);
    if (!fresh.length) return;
    lastEventId.current = fresh[fresh.length - 1].id;
    setEvents((prev) => [...prev, ...fresh].slice(-MAX_EVENTS));
  }, []);

  useEffect(() => {
    let source: EventSource | null = null;
    let cancelled = false;

    (async () => {
      try {
        const [initialPulse, history] = await Promise.all([api.pulse(), api.events(50)]);
        if (cancelled) return;
        setPulse(initialPulse);
        appendEvents(history);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setStream("offline");
      }
      if (cancelled) return;

      source = new EventSource(api.streamUrl(lastEventId.current));
      source.onopen = () => setStream("live");
      source.onerror = () => setStream("reconnecting");
      source.addEventListener("audit", (msg) => {
        const event = JSON.parse((msg as MessageEvent).data) as AuditEvent;
        appendEvents([event]);
        if (event.event_type === "resilience.recalculated") void refreshPulse();
      });
    })();

    return () => {
      cancelled = true;
      source?.close();
    };
  }, [appendEvents, refreshPulse]);

  const run = useCallback(
    async (kind: "trigger" | "reset") => {
      setBusy(kind);
      try {
        const next = kind === "trigger" ? await api.triggerDemoDisruption() : await api.resetDemo();
        setPulse(next);
        setError(null);
        // The SSE stream normally delivers these; fetch as well in case it is reconnecting.
        appendEvents(await api.events(20));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(null);
      }
    },
    [appendEvents],
  );

  return {
    pulse,
    events,
    error,
    stream,
    busy,
    triggerDisruption: () => run("trigger"),
    reset: () => run("reset"),
  };
}
