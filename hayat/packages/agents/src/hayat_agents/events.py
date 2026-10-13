"""Audit events emitted by agents. The audit stream is the system's record of what happened."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum
from typing import Any


class EventType(StrEnum):
    EVENT_RECEIVED = "event.received"
    DISRUPTION_DETECTED = "disruption.detected"
    DISRUPTION_NO_EXPOSURE = "disruption.no_exposure"
    IMPACT_CALCULATION_STARTED = "impact.calculation.started"
    IMPACT_CALCULATION_COMPLETED = "impact.calculation.completed"
    RESILIENCE_RECALCULATED = "resilience.recalculated"
    SIGNALS_RESET = "signals.reset"
    PIPELINE_FAILED = "pipeline.failed"


@dataclass(frozen=True)
class AuditEvent:
    run_id: str
    event_type: str
    actor: str
    message: str
    occurred_at: datetime
    payload: dict[str, Any] = field(default_factory=dict)
