"""HAYAT simulation: deterministic resilience calculations.

Every number HAYAT shows is produced here (or from data), never by a language model.
"""

from .config import DEFAULT_CONFIG, RiskBands, SimulationConfig
from .engine import Assessment, CommodityAssessment, evaluate
from .metrics import (
    InventoryProjection,
    days_of_cover,
    project_inventory,
    protected_demand_t,
    resilience_index,
    resilience_score,
    risk_level,
    shortage_risk,
)
from .model import Commodity, Route, SupplyFlow, SupplyNetwork
from .scenarios import ArrivalGap, MaritimeDisruption, blocked_fraction_by_day

__all__ = [
    "DEFAULT_CONFIG",
    "ArrivalGap",
    "Assessment",
    "Commodity",
    "CommodityAssessment",
    "InventoryProjection",
    "MaritimeDisruption",
    "RiskBands",
    "Route",
    "SimulationConfig",
    "SupplyFlow",
    "SupplyNetwork",
    "blocked_fraction_by_day",
    "days_of_cover",
    "evaluate",
    "project_inventory",
    "protected_demand_t",
    "resilience_index",
    "resilience_score",
    "risk_level",
    "shortage_risk",
]
