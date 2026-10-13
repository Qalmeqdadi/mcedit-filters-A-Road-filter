"""What agents know about the world (the operating picture) and what they pass along."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from hayat_simulation import Assessment, MaritimeDisruption, SupplyNetwork


@dataclass(frozen=True)
class CommodityProfile:
    id: str
    name: str
    name_ar: str
    vulnerable_group: str
    """'general' or 'infants': which population a shortage hurts first."""


@dataclass(frozen=True)
class PortRef:
    id: str
    name: str


@dataclass(frozen=True)
class RouteRef:
    id: str
    name: str
    destination_port_id: str | None


@dataclass(frozen=True)
class SupplierRef:
    id: str
    name: str
    country: str
    commodity_id: str
    route_id: str


@dataclass(frozen=True)
class InventoryPosition:
    warehouse_id: str
    commodity_id: str
    quantity_t: float


@dataclass(frozen=True)
class HospitalRef:
    id: str
    name: str
    zone_id: str
    beds: int
    has_nicu: bool


@dataclass(frozen=True)
class ZoneRef:
    id: str
    name: str
    population: int
    infant_share: float


@dataclass(frozen=True)
class OperatingPicture:
    network: SupplyNetwork
    commodities: tuple[CommodityProfile, ...]
    ports: tuple[PortRef, ...]
    routes: tuple[RouteRef, ...]
    suppliers: tuple[SupplierRef, ...]
    inventory: tuple[InventoryPosition, ...]
    hospitals: tuple[HospitalRef, ...]
    zones: tuple[ZoneRef, ...]

    def profile(self, commodity_id: str) -> CommodityProfile:
        return next(c for c in self.commodities if c.id == commodity_id)

    def route_ref(self, route_id: str) -> RouteRef:
        return next(r for r in self.routes if r.id == route_id)


@dataclass(frozen=True)
class Signal:
    """A normalised external event that may indicate a disruption."""

    id: str
    kind: str
    title: str
    source: str
    severity: str
    chokepoint: str
    delay_days: float
    observed_at: datetime
    raw: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "kind": self.kind,
            "title": self.title,
            "source": self.source,
            "severity": self.severity,
            "chokepoint": self.chokepoint,
            "delay_days": self.delay_days,
            "observed_at": self.observed_at.isoformat(),
        }


@dataclass
class PipelineState:
    picture: OperatingPicture
    active_signals: list[Signal] = field(default_factory=list)
    """Signals already active before this run."""
    raw_event: dict[str, Any] | None = None
    trigger: str = "recalculation"
    new_signal: Signal | None = None
    disruptions: list[MaritimeDisruption] = field(default_factory=list)
    baseline: Assessment | None = None
    revised: Assessment | None = None
    result: dict[str, Any] | None = None

    @property
    def all_signals(self) -> list[Signal]:
        return self.active_signals + ([self.new_signal] if self.new_signal else [])
