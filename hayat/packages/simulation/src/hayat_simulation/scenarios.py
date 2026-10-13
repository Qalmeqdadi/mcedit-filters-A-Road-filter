"""Disruption scenarios and how they change inbound arrivals."""

from __future__ import annotations

from collections.abc import Iterable, Sequence
from dataclasses import dataclass

from .model import Route


@dataclass(frozen=True)
class ArrivalGap:
    """A window [start_day, end_day) during which a route delivers nothing."""

    route_id: str
    start_day: float
    end_day: float
    source_id: str


@dataclass(frozen=True)
class MaritimeDisruption:
    """A chokepoint becomes impassable and vessels are rerouted, adding ``delay_days``.

    Vessels already past the chokepoint keep arriving as planned. Every vessel
    behind it arrives ``delay_days`` late, so the destination sees a gap in
    arrivals of ``delay_days`` that starts once the last pre-disruption vessel
    has landed (``onset_day`` + transit time from chokepoint to destination).
    After the gap, arrivals resume at the normal rate; the lost volume is not
    made up unless someone acts (a later-phase decision, not modelled here).
    """

    source_id: str
    chokepoint: str
    delay_days: float
    onset_day: float = 0.0

    def __post_init__(self) -> None:
        if self.delay_days < 0:
            raise ValueError("delay_days must be >= 0")

    def affects(self, route: Route) -> bool:
        return route.mode == "sea" and self.chokepoint in route.chokepoints

    def arrival_gaps(self, routes: Iterable[Route]) -> list[ArrivalGap]:
        gaps = []
        for route in routes:
            if not self.affects(route):
                continue
            start = self.onset_day + route.chokepoint_offsets_days.get(self.chokepoint, 0.0)
            gaps.append(ArrivalGap(route.id, start, start + self.delay_days, self.source_id))
        return gaps


def _merge(intervals: list[tuple[float, float]]) -> list[tuple[float, float]]:
    merged: list[tuple[float, float]] = []
    for start, end in sorted(intervals):
        if merged and start <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(merged[-1][1], end))
        else:
            merged.append((start, end))
    return merged


def blocked_fraction_by_day(gaps: Sequence[ArrivalGap], horizon_days: int) -> list[float]:
    """Fraction of each day [t, t+1) covered by the union of the gaps (all for one route)."""
    merged = _merge([(g.start_day, g.end_day) for g in gaps])
    fractions = []
    for day in range(horizon_days):
        covered = 0.0
        for start, end in merged:
            covered += max(0.0, min(end, day + 1) - max(start, day))
        fractions.append(min(1.0, covered))
    return fractions
