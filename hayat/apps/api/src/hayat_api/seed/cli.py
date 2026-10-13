"""Seed the database with the synthetic UAE dataset.

uv run hayat-seed            # drop + recreate all tables, load data, compute baseline
uv run hayat-seed --url sqlite:///./hayat.db
"""

from __future__ import annotations

import argparse
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from .. import models as m
from .. import services
from ..db import create_schema, drop_schema, init_engine, new_session
from .synthetic_uae import build_dataset


def load_dataset(session: Session) -> dict[str, int]:
    data = build_dataset()
    as_of = datetime.now(UTC)
    session.add_all(m.Commodity(**c) for c in data.commodities)
    session.add_all(m.Port(**p) for p in data.ports)
    session.add_all(m.PopulationZone(**z) for z in data.zones)
    session.add_all(m.Warehouse(**w) for w in data.warehouses)
    session.flush()
    session.add_all(m.ShippingRoute(**r) for r in data.routes)
    session.add_all(m.Hospital(**h) for h in data.hospitals)
    session.flush()
    session.add_all(m.Supplier(**s) for s in data.suppliers)
    session.add_all(m.InventoryLevel(**i, as_of=as_of) for i in data.inventory)
    session.commit()
    return {
        "commodities": len(data.commodities),
        "ports": len(data.ports),
        "shipping_routes": len(data.routes),
        "suppliers": len(data.suppliers),
        "warehouses": len(data.warehouses),
        "inventory_levels": len(data.inventory),
        "population_zones": len(data.zones),
        "hospitals": len(data.hospitals),
    }


def seed(url: str | None = None) -> tuple[dict[str, int], float]:
    init_engine(url)
    drop_schema()
    create_schema()
    with new_session() as session:
        counts = load_dataset(session)
        snapshot = services.run_pipeline(session, trigger="seed")
    return counts, snapshot.resilience_index


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed HAYAT with synthetic UAE data.")
    parser.add_argument("--url", help="database URL (defaults to HAYAT_DATABASE_URL)")
    args = parser.parse_args()
    counts, index = seed(args.url)
    for table, n in counts.items():
        print(f"  {table:<18} {n:>4}")
    print(f"Seeded. Baseline resilience index: {index:.1f}")


if __name__ == "__main__":
    main()
