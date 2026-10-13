"""Translate persisted records into the agent/simulation domain objects."""

from __future__ import annotations

from collections import defaultdict
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from hayat_agents import (
    CommodityProfile,
    HospitalRef,
    InventoryPosition,
    OperatingPicture,
    PortRef,
    RouteRef,
    Signal,
    SupplierRef,
    ZoneRef,
)
from hayat_simulation import Commodity, Route, SupplyFlow, SupplyNetwork

from . import models as m


def is_seeded(session: Session) -> bool:
    return session.scalar(select(m.Commodity.id).limit(1)) is not None


def load_picture(session: Session) -> OperatingPicture:
    commodities = session.scalars(select(m.Commodity).order_by(m.Commodity.id)).all()
    routes = session.scalars(select(m.ShippingRoute).order_by(m.ShippingRoute.id)).all()
    suppliers = session.scalars(select(m.Supplier).order_by(m.Supplier.id)).all()
    inventory = session.scalars(select(m.InventoryLevel).order_by(m.InventoryLevel.id)).all()
    ports = session.scalars(select(m.Port).order_by(m.Port.id)).all()
    hospitals = session.scalars(select(m.Hospital).order_by(m.Hospital.id)).all()
    zones = session.scalars(select(m.PopulationZone).order_by(m.PopulationZone.id)).all()

    stock: dict[str, float] = defaultdict(float)
    for level in inventory:
        stock[level.commodity_id] += level.quantity_t

    network = SupplyNetwork(
        commodities=tuple(
            Commodity(
                id=c.id,
                name=c.name,
                daily_consumption_t=c.daily_consumption_t,
                safety_stock_days=c.safety_stock_days,
                criticality=c.criticality,
                unit_price_aed=c.unit_price_aed,
            )
            for c in commodities
        ),
        routes=tuple(
            Route(
                id=r.id,
                name=r.name,
                mode=r.mode,
                destination_port_id=r.destination_port_id,
                chokepoints=tuple(r.chokepoints),
                chokepoint_offsets_days=dict(r.chokepoint_offsets_days),
            )
            for r in routes
        ),
        flows=tuple(SupplyFlow(s.id, s.commodity_id, s.route_id, s.volume_tpd) for s in suppliers),
        stock_t=dict(stock),
    )
    return OperatingPicture(
        network=network,
        commodities=tuple(
            CommodityProfile(c.id, c.name, c.name_ar, c.vulnerable_group) for c in commodities
        ),
        ports=tuple(PortRef(p.id, p.name) for p in ports),
        routes=tuple(RouteRef(r.id, r.name, r.destination_port_id) for r in routes),
        suppliers=tuple(
            SupplierRef(s.id, s.name, s.country, s.commodity_id, s.route_id) for s in suppliers
        ),
        inventory=tuple(
            InventoryPosition(i.warehouse_id, i.commodity_id, i.quantity_t) for i in inventory
        ),
        hospitals=tuple(
            HospitalRef(h.id, h.name, h.zone_id, h.beds, h.has_nicu) for h in hospitals
        ),
        zones=tuple(ZoneRef(z.id, z.name, z.population, z.infant_share) for z in zones),
    )


def active_signals(session: Session) -> list[Signal]:
    rows = session.scalars(
        select(m.SignalRecord)
        .where(m.SignalRecord.status == "active")
        .order_by(m.SignalRecord.received_at)
    ).all()
    return [
        Signal(
            id=r.id,
            kind=r.kind,
            title=r.title,
            source=r.source,
            severity=r.severity,
            chokepoint=r.chokepoint,
            delay_days=r.delay_days,
            observed_at=r.observed_at,
            raw=r.raw,
        )
        for r in rows
    ]


def network_reference(session: Session) -> dict[str, Any]:
    """Geographic reference data for the map, as plain dicts."""

    def rows(model, *cols: str) -> list[dict[str, Any]]:
        records = session.scalars(select(model).order_by(model.id)).all()
        return [{c: getattr(r, c) for c in cols} for r in records]

    return {
        "ports": rows(
            m.Port, "id", "name", "emirate", "kind", "coast", "lat", "lon", "handling_capacity_tpd"
        ),
        "routes": rows(
            m.ShippingRoute,
            "id",
            "name",
            "mode",
            "origin",
            "origin_country",
            "destination_port_id",
            "corridor",
            "chokepoints",
            "transit_days",
        ),
        "suppliers": rows(
            m.Supplier, "id", "name", "country", "commodity_id", "route_id", "volume_tpd"
        ),
        "warehouses": rows(
            m.Warehouse, "id", "name", "emirate", "lat", "lon", "capacity_t", "cold_chain"
        ),
        "hospitals": rows(
            m.Hospital, "id", "name", "emirate", "lat", "lon", "beds", "has_nicu", "zone_id"
        ),
        "zones": rows(
            m.PopulationZone,
            "id",
            "name",
            "emirate",
            "lat",
            "lon",
            "radius_km",
            "population",
            "infant_share",
        ),
    }
