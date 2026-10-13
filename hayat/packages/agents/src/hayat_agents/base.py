"""The agent contract.

An agent reads from and writes to a shared ``PipelineState`` and reports what it
did through the audit sink. Agents never produce numbers themselves: every
quantity comes from ``hayat_simulation`` or from data.

Later phases add agents (SENTINEL, NEXUS, ORACLE, MIRROR, STRATEGIST, GUARDIAN,
EXECUTOR, WATCHTOWER) by implementing this same interface.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any, Protocol

from .events import AuditEvent

if TYPE_CHECKING:
    from .state import PipelineState


class EventSink(Protocol):
    def publish(self, event: AuditEvent) -> None: ...


class ListSink:
    """In-memory sink, used by tests and offline runs."""

    def __init__(self) -> None:
        self.events: list[AuditEvent] = []

    def publish(self, event: AuditEvent) -> None:
        self.events.append(event)

    @property
    def types(self) -> list[str]:
        return [e.event_type for e in self.events]


def utc_now() -> datetime:
    return datetime.now(UTC)


@dataclass
class AgentContext:
    run_id: str
    sink: EventSink
    clock: Callable[[], datetime] = field(default=utc_now)

    def emit(self, actor: str, event_type: str, message: str, **payload: Any) -> AuditEvent:
        event = AuditEvent(
            run_id=self.run_id,
            event_type=str(event_type),
            actor=actor,
            message=message,
            occurred_at=self.clock(),
            payload=payload,
        )
        self.sink.publish(event)
        return event


class Agent(ABC):
    name: str
    """Stable identifier, used as the audit ``actor``."""
    role: str
    """One-line description of the agent's responsibility."""

    @abstractmethod
    def run(self, ctx: AgentContext, state: PipelineState) -> None: ...
