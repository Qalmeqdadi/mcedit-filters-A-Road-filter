from __future__ import annotations

import uuid
from datetime import datetime

from .base import Agent, AgentContext
from .events import EventType
from .state import PipelineState, Signal

SUPPORTED_KINDS = {"maritime_disruption"}
SEVERITIES = {"minor", "moderate", "major", "severe"}
MAX_DELAY_DAYS = 120


class SignalValidationError(ValueError):
    pass


def parse_signal(raw: dict, now: datetime) -> Signal:
    kind = raw.get("kind")
    if kind not in SUPPORTED_KINDS:
        raise SignalValidationError(f"unsupported signal kind: {kind!r}")
    chokepoint = str(raw.get("chokepoint", "")).strip().upper()
    if not chokepoint:
        raise SignalValidationError("chokepoint is required")
    try:
        delay = float(raw["delay_days"])
    except (KeyError, TypeError, ValueError) as exc:
        raise SignalValidationError("delay_days must be a number") from exc
    if not 0 < delay <= MAX_DELAY_DAYS:
        raise SignalValidationError(f"delay_days must be in (0, {MAX_DELAY_DAYS}]")
    severity = str(raw.get("severity", "major")).lower()
    if severity not in SEVERITIES:
        raise SignalValidationError(f"severity must be one of {sorted(SEVERITIES)}")
    observed = raw.get("observed_at")
    observed_at = datetime.fromisoformat(observed) if observed else now
    return Signal(
        id=str(raw.get("id") or uuid.uuid4()),
        kind=kind,
        title=str(raw.get("title") or f"Maritime disruption at {chokepoint}"),
        source=str(raw.get("source") or "unspecified"),
        severity=severity,
        chokepoint=chokepoint,
        delay_days=delay,
        observed_at=observed_at,
        raw=dict(raw),
    )


class SignalIntakeAgent(Agent):
    name = "signal-intake"
    role = "Validates and normalises incoming external events into signals."

    def run(self, ctx: AgentContext, state: PipelineState) -> None:
        if state.raw_event is None:
            return
        signal = parse_signal(state.raw_event, ctx.clock())
        state.new_signal = signal
        ctx.emit(
            self.name,
            EventType.EVENT_RECEIVED,
            f"Event received from {signal.source}: {signal.title}",
            signal=signal.to_dict(),
        )
