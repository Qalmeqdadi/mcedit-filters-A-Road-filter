from __future__ import annotations

import uuid
from collections.abc import Sequence
from typing import Any

from .base import Agent, AgentContext, EventSink
from .detection import DisruptionDetectionAgent
from .events import EventType
from .impact import ImpactAssessmentAgent
from .intake import SignalIntakeAgent
from .resilience import ResilienceAgent
from .state import OperatingPicture, PipelineState, Signal


def default_agents() -> list[Agent]:
    """Phase-1 pipeline. Each stage is deterministic."""
    return [
        SignalIntakeAgent(),
        DisruptionDetectionAgent(),
        ImpactAssessmentAgent(),
        ResilienceAgent(),
    ]


class ResiliencePipeline:
    """Runs agents in order over one shared state, reporting through the sink."""

    def __init__(self, agents: Sequence[Agent] | None = None) -> None:
        self.agents = list(agents) if agents is not None else default_agents()

    def run(
        self,
        picture: OperatingPicture,
        sink: EventSink,
        *,
        active_signals: Sequence[Signal] = (),
        raw_event: dict[str, Any] | None = None,
        trigger: str = "recalculation",
        run_id: str | None = None,
        ctx: AgentContext | None = None,
    ) -> PipelineState:
        ctx = ctx or AgentContext(run_id=run_id or str(uuid.uuid4()), sink=sink)
        state = PipelineState(
            picture=picture,
            active_signals=list(active_signals),
            raw_event=raw_event,
            trigger=trigger,
        )
        for agent in self.agents:
            try:
                agent.run(ctx, state)
            except Exception as exc:
                ctx.emit(
                    agent.name,
                    EventType.PIPELINE_FAILED,
                    f"{agent.name} failed: {exc}",
                    error=type(exc).__name__,
                )
                raise
        return state
