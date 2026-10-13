"""Domain inputs for the simulation.

These are plain, immutable value objects. The simulation package never touches a
database or the network: callers (the agent layer / API) build these from
whatever persistence they use and pass them in.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Commodity:
    id: str
    name: str
    daily_consumption_t: float
    """National consumption, tonnes per day."""
    safety_stock_days: float
    """Target minimum days of cover held in-country."""
    criticality: float
    """Relative weight (0..1] used when aggregating the national resilience index."""
    unit_price_aed: float
    """Reference price, AED per tonne, used to value demand."""


@dataclass(frozen=True)
class Route:
    id: str
    name: str
    mode: str
    """'sea' or 'land'."""
    destination_port_id: str | None
    chokepoints: tuple[str, ...] = ()
    chokepoint_offsets_days: dict[str, float] = field(default_factory=dict)
    """Transit time from each chokepoint to the UAE destination, in days."""


@dataclass(frozen=True)
class SupplyFlow:
    """A steady inbound flow of one commodity, from one supplier, over one route."""

    supplier_id: str
    commodity_id: str
    route_id: str
    volume_tpd: float
    """Average arrivals, tonnes per day."""


@dataclass(frozen=True)
class SupplyNetwork:
    commodities: tuple[Commodity, ...]
    routes: tuple[Route, ...]
    flows: tuple[SupplyFlow, ...]
    stock_t: dict[str, float]
    """Current national on-hand stock per commodity id, tonnes."""

    def route(self, route_id: str) -> Route:
        for r in self.routes:
            if r.id == route_id:
                return r
        raise KeyError(route_id)

    def flows_for(self, commodity_id: str) -> tuple[SupplyFlow, ...]:
        return tuple(f for f in self.flows if f.commodity_id == commodity_id)
