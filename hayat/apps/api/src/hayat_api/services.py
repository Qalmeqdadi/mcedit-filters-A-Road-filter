"""Application services: run the agent pipeline against persisted state."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from hayat_agents import AgentContext, AuditEvent, EventType, ResiliencePipeline

from . import models as m
from . import repository
from .db import new_session

DEMO_EVENT: dict[str, Any] = {
    "kind": "maritime_disruption",
    "title": "Red Sea corridor disruption: Bab el-Mandeb transits suspended, "
    "vessels rerouting via the Cape of Good Hope",
    "source": "HAYAT demo scenario",
    "severity": "major",
    "chokepoint": "BAB_EL_MANDEB",
    "delay_days": 11,
}


class NotSeededError(RuntimeError):
    pass


class DatabaseSink:
    """Writes each audit event in its own transaction so the live stream sees it at once."""

    def publish(self, event: AuditEvent) -> None:
        with new_session() as session:
            session.add(
                m.AuditEventRecord(
                    run_id=event.run_id,
                    event_type=event.event_type,
                    actor=event.actor,
                    message=event.message,
                    occurred_at=event.occurred_at,
                    payload=event.payload,
                )
            )
            session.commit()


def _now() -> datetime:
    return datetime.now(UTC)


def run_pipeline(
    session: Session, *, raw_event: dict[str, Any] | None = None, trigger: str
) -> m.ResilienceSnapshot:
    if not repository.is_seeded(session):
        raise NotSeededError("database is not seeded; run `uv run hayat-seed`")
    picture = repository.load_picture(session)
    ctx = AgentContext(run_id=str(uuid.uuid4()), sink=DatabaseSink())
    state = ResiliencePipeline().run(
        picture,
        ctx.sink,
        active_signals=repository.active_signals(session),
        raw_event=raw_event,
        trigger=trigger,
        ctx=ctx,
    )
    if state.new_signal is not None:
        s = state.new_signal
        session.add(
            m.SignalRecord(
                id=s.id,
                kind=s.kind,
                title=s.title,
                source=s.source,
                severity=s.severity,
                chokepoint=s.chokepoint,
                delay_days=s.delay_days,
                status="active",
                observed_at=s.observed_at,
                received_at=_now(),
                raw=s.raw,
            )
        )
    assert state.result is not None
    snapshot = m.ResilienceSnapshot(
        run_id=ctx.run_id,
        trigger=trigger,
        created_at=_now(),
        resilience_index=state.result["kpis"]["resilience_index"],
        state=state.result,
    )
    session.add(snapshot)
    session.commit()
    return snapshot


def reset_signals(session: Session) -> m.ResilienceSnapshot:
    now = _now()
    resolved = session.execute(
        update(m.SignalRecord)
        .where(m.SignalRecord.status == "active")
        .values(status="resolved", resolved_at=now)
    ).rowcount
    session.commit()
    ctx = AgentContext(run_id=str(uuid.uuid4()), sink=DatabaseSink())
    ctx.emit(
        "operator",
        EventType.SIGNALS_RESET,
        f"Demo reset: {resolved} active signals resolved",
        resolved=resolved,
    )
    return run_pipeline(session, trigger="reset")


def latest_snapshot(session: Session) -> m.ResilienceSnapshot:
    snapshot = session.scalar(
        select(m.ResilienceSnapshot).order_by(m.ResilienceSnapshot.id.desc()).limit(1)
    )
    if snapshot is None:
        # Seeded data but no calculation yet: compute the baseline once.
        snapshot = run_pipeline(session, trigger="baseline")
    return snapshot


def pulse(session: Session) -> dict[str, Any]:
    if not repository.is_seeded(session):
        raise NotSeededError("database is not seeded; run `uv run hayat-seed`")
    snapshot = latest_snapshot(session)
    return {
        "snapshot": {
            "id": snapshot.id,
            "run_id": snapshot.run_id,
            "trigger": snapshot.trigger,
            "created_at": snapshot.created_at.isoformat(),
        },
        "state": snapshot.state,
        "network": repository.network_reference(session),
    }


def event_to_dict(e: m.AuditEventRecord) -> dict[str, Any]:
    return {
        "id": e.id,
        "run_id": e.run_id,
        "event_type": e.event_type,
        "actor": e.actor,
        "message": e.message,
        "occurred_at": e.occurred_at.isoformat(),
        "payload": e.payload,
    }


def events_after(session: Session, after_id: int, limit: int = 100) -> list[dict[str, Any]]:
    rows = session.scalars(
        select(m.AuditEventRecord)
        .where(m.AuditEventRecord.id > after_id)
        .order_by(m.AuditEventRecord.id)
        .limit(limit)
    ).all()
    return [event_to_dict(e) for e in rows]


def recent_events(session: Session, limit: int = 50) -> list[dict[str, Any]]:
    rows = session.scalars(
        select(m.AuditEventRecord).order_by(m.AuditEventRecord.id.desc()).limit(limit)
    ).all()
    return [event_to_dict(e) for e in reversed(rows)]


def max_event_id(session: Session) -> int:
    return (
        session.scalar(
            select(m.AuditEventRecord.id).order_by(m.AuditEventRecord.id.desc()).limit(1)
        )
        or 0
    )
