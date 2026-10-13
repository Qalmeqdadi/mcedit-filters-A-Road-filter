"""Persistence schema. Portable SQLAlchemy types; PostgreSQL gets JSONB."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base

Json = JSON().with_variant(JSONB(), "postgresql")
TZDateTime = DateTime(timezone=True)


# --- Reference data -------------------------------------------------------------------


class Commodity(Base):
    __tablename__ = "commodities"
    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    name_ar: Mapped[str] = mapped_column(String(80))
    category: Mapped[str] = mapped_column(String(40))
    unit: Mapped[str] = mapped_column(String(8), default="t")
    daily_consumption_t: Mapped[float] = mapped_column(Float)
    safety_stock_days: Mapped[float] = mapped_column(Float)
    criticality: Mapped[float] = mapped_column(Float)
    unit_price_aed: Mapped[float] = mapped_column(Float)
    vulnerable_group: Mapped[str] = mapped_column(String(16), default="general")


class Port(Base):
    __tablename__ = "ports"
    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    emirate: Mapped[str] = mapped_column(String(40))
    kind: Mapped[str] = mapped_column(String(8))  # sea | land
    coast: Mapped[str] = mapped_column(String(16))  # gulf | east | inland
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    handling_capacity_tpd: Mapped[float] = mapped_column(Float)


class ShippingRoute(Base):
    __tablename__ = "shipping_routes"
    id: Mapped[str] = mapped_column(String(24), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    mode: Mapped[str] = mapped_column(String(8))  # sea | land
    origin: Mapped[str] = mapped_column(String(80))
    origin_country: Mapped[str] = mapped_column(String(60))
    destination_port_id: Mapped[str | None] = mapped_column(ForeignKey("ports.id"), nullable=True)
    corridor: Mapped[str] = mapped_column(String(40))
    chokepoints: Mapped[list[str]] = mapped_column(Json, default=list)
    chokepoint_offsets_days: Mapped[dict[str, float]] = mapped_column(Json, default=dict)
    transit_days: Mapped[float] = mapped_column(Float)


class Supplier(Base):
    __tablename__ = "suppliers"
    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    country: Mapped[str] = mapped_column(String(60))
    commodity_id: Mapped[str] = mapped_column(ForeignKey("commodities.id"))
    route_id: Mapped[str] = mapped_column(ForeignKey("shipping_routes.id"))
    volume_tpd: Mapped[float] = mapped_column(Float)


class Warehouse(Base):
    __tablename__ = "warehouses"
    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    emirate: Mapped[str] = mapped_column(String(40))
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    capacity_t: Mapped[float] = mapped_column(Float)
    cold_chain: Mapped[bool] = mapped_column(Boolean, default=False)


class InventoryLevel(Base):
    __tablename__ = "inventory_levels"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    warehouse_id: Mapped[str] = mapped_column(ForeignKey("warehouses.id"), index=True)
    commodity_id: Mapped[str] = mapped_column(ForeignKey("commodities.id"), index=True)
    quantity_t: Mapped[float] = mapped_column(Float)
    as_of: Mapped[datetime] = mapped_column(TZDateTime)


class PopulationZone(Base):
    __tablename__ = "population_zones"
    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    emirate: Mapped[str] = mapped_column(String(40))
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    radius_km: Mapped[float] = mapped_column(Float)
    population: Mapped[int] = mapped_column(Integer)
    infant_share: Mapped[float] = mapped_column(Float)


class Hospital(Base):
    __tablename__ = "hospitals"
    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    emirate: Mapped[str] = mapped_column(String(40))
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    beds: Mapped[int] = mapped_column(Integer)
    has_nicu: Mapped[bool] = mapped_column(Boolean, default=False)
    zone_id: Mapped[str] = mapped_column(ForeignKey("population_zones.id"))


# --- Operational records --------------------------------------------------------------


class SignalRecord(Base):
    __tablename__ = "signals"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    kind: Mapped[str] = mapped_column(String(40))
    title: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(120))
    severity: Mapped[str] = mapped_column(String(16))
    chokepoint: Mapped[str] = mapped_column(String(40))
    delay_days: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(16), default="active", index=True)
    observed_at: Mapped[datetime] = mapped_column(TZDateTime)
    received_at: Mapped[datetime] = mapped_column(TZDateTime)
    resolved_at: Mapped[datetime | None] = mapped_column(TZDateTime, nullable=True)
    raw: Mapped[dict[str, Any]] = mapped_column(Json, default=dict)


class AuditEventRecord(Base):
    __tablename__ = "audit_events"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(String(64), index=True)
    event_type: Mapped[str] = mapped_column(String(64), index=True)
    actor: Mapped[str] = mapped_column(String(64))
    message: Mapped[str] = mapped_column(Text)
    occurred_at: Mapped[datetime] = mapped_column(TZDateTime)
    payload: Mapped[dict[str, Any]] = mapped_column(Json, default=dict)


class ResilienceSnapshot(Base):
    __tablename__ = "resilience_snapshots"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(String(64), index=True)
    trigger: Mapped[str] = mapped_column(String(32))
    created_at: Mapped[datetime] = mapped_column(TZDateTime)
    resilience_index: Mapped[float] = mapped_column(Float)
    state: Mapped[dict[str, Any]] = mapped_column(Json)
