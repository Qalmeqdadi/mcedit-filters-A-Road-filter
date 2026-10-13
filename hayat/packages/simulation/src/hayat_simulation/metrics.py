"""Deterministic resilience metrics.

All functions are pure: same inputs, same outputs. No randomness, no I/O,
no model inference.
"""

from __future__ import annotations

import math
from collections.abc import Mapping, Sequence
from dataclasses import dataclass

from .config import RiskBands


def days_of_cover(stock_t: float, daily_consumption_t: float) -> float:
    """Days the current stock lasts at the current consumption rate, with no inflow."""
    if stock_t < 0:
        raise ValueError("stock_t must be >= 0")
    if daily_consumption_t <= 0:
        return math.inf
    return stock_t / daily_consumption_t


@dataclass(frozen=True)
class InventoryProjection:
    stock_t: tuple[float, ...]
    """Opening stock for day 0..horizon (length horizon + 1)."""
    inflow_t: tuple[float, ...]
    served_t: tuple[float, ...]
    shortfall_t: tuple[float, ...]
    daily_consumption_t: float

    @property
    def horizon_days(self) -> int:
        return len(self.inflow_t)

    @property
    def cover_days(self) -> tuple[float, ...]:
        return tuple(days_of_cover(s, self.daily_consumption_t) for s in self.stock_t)

    @property
    def min_cover_days(self) -> float:
        return min(self.cover_days)

    @property
    def trough_day(self) -> int:
        """First day on which stock is at its minimum."""
        lowest = min(self.stock_t)
        return self.stock_t.index(lowest)

    @property
    def total_shortfall_t(self) -> float:
        return sum(self.shortfall_t)

    @property
    def stockout_day(self) -> int | None:
        """First day on which demand cannot be fully served, if any."""
        for day, short in enumerate(self.shortfall_t):
            if short > 1e-9:
                return day
        return None

    def first_day_below(self, threshold_t: float) -> int | None:
        for day, stock in enumerate(self.stock_t):
            if stock < threshold_t - 1e-9:
                return day
        return None


def project_inventory(
    opening_stock_t: float,
    daily_consumption_t: float,
    inflow_t: Sequence[float],
) -> InventoryProjection:
    """Daily inventory depletion model.

    For each day t: available = stock[t] + inflow[t]; demand is served up to
    what is available; the remainder is shortfall; stock[t+1] is what is left.
    """
    if opening_stock_t < 0 or daily_consumption_t < 0:
        raise ValueError("stock and consumption must be >= 0")
    stock = [float(opening_stock_t)]
    served: list[float] = []
    shortfall: list[float] = []
    for arrivals in inflow_t:
        available = stock[-1] + max(0.0, float(arrivals))
        day_served = min(daily_consumption_t, available)
        served.append(day_served)
        shortfall.append(daily_consumption_t - day_served)
        stock.append(available - day_served)
    return InventoryProjection(
        stock_t=tuple(stock),
        inflow_t=tuple(float(x) for x in inflow_t),
        served_t=tuple(served),
        shortfall_t=tuple(shortfall),
        daily_consumption_t=daily_consumption_t,
    )


def shortage_risk(min_cover_days: float, safety_stock_days: float, has_shortfall: bool) -> float:
    """Shortage risk in [0, 1].

    Linear in the lowest projected days of cover: 0 at twice the safety target or
    above, 0.5 exactly at the safety target, 1 at zero cover. Any projected
    shortfall is 1.
    """
    if safety_stock_days <= 0:
        raise ValueError("safety_stock_days must be > 0")
    if has_shortfall:
        return 1.0
    reference = 2.0 * safety_stock_days
    return min(1.0, max(0.0, (reference - min_cover_days) / reference))


def risk_level(risk: float, bands: RiskBands) -> str:
    if risk < bands.low:
        return "LOW"
    if risk < bands.elevated:
        return "ELEVATED"
    if risk < bands.high:
        return "HIGH"
    return "CRITICAL"


def resilience_score(
    risk: float, supply_continuity: float, buffer_weight: float, continuity_weight: float
) -> float:
    """Commodity resilience score in [0, 100].

    ``supply_continuity`` is the share of baseline inflow that is not disrupted.
    """
    if not 0.0 <= risk <= 1.0 or not 0.0 <= supply_continuity <= 1.0:
        raise ValueError("risk and supply_continuity must be in [0, 1]")
    total = buffer_weight + continuity_weight
    raw = (buffer_weight * (1.0 - risk) + continuity_weight * supply_continuity) / total
    return 100.0 * raw


def resilience_index(scores: Mapping[str, float], weights: Mapping[str, float]) -> float:
    """Criticality-weighted mean of commodity resilience scores."""
    total_weight = sum(weights[k] for k in scores)
    if total_weight <= 0:
        raise ValueError("weights must sum to > 0")
    return sum(scores[k] * weights[k] for k in scores) / total_weight


def protected_demand_t(projection: InventoryProjection, safety_floor_t: float) -> float:
    """Demand (tonnes) over the horizon that is served while the safety buffer stays intact.

    A day counts as protected when demand is fully served and closing stock is
    at or above the safety floor.
    """
    protected = 0.0
    for day, served in enumerate(projection.served_t):
        closing = projection.stock_t[day + 1]
        if projection.shortfall_t[day] <= 1e-9 and closing >= safety_floor_t - 1e-9:
            protected += served
    return protected
