"""Evaluate a supply network under zero or more disruptions."""

from __future__ import annotations

import math
from collections import defaultdict
from collections.abc import Sequence
from dataclasses import asdict, dataclass

from . import metrics
from .config import DEFAULT_CONFIG, SimulationConfig
from .model import SupplyNetwork
from .scenarios import ArrivalGap, MaritimeDisruption, blocked_fraction_by_day


@dataclass(frozen=True)
class CommodityAssessment:
    commodity_id: str
    name: str
    stock_t: float
    daily_consumption_t: float
    days_of_cover: float
    safety_stock_days: float
    baseline_inflow_tpd: float
    disrupted_inflow_share: float
    supply_continuity: float
    affected_route_ids: tuple[str, ...]
    delayed_volume_t: float
    projected_stock_t: tuple[float, ...]
    projected_cover_days: tuple[float, ...]
    min_cover_days: float
    trough_day: int
    safety_breach_day: int | None
    stockout_day: int | None
    total_shortfall_t: float
    shortage_risk: float
    risk_level: str
    resilience_score: float
    criticality: float
    demand_value_aed: float
    protected_value_aed: float
    value_at_risk_aed: float

    @property
    def impacted(self) -> bool:
        return self.disrupted_inflow_share > 0


@dataclass(frozen=True)
class Assessment:
    horizon_days: int
    commodities: tuple[CommodityAssessment, ...]
    resilience_index: float
    demand_value_aed: float
    protected_value_aed: float
    value_at_risk_aed: float
    material_threat_ids: tuple[str, ...]
    affected_route_ids: tuple[str, ...]
    arrival_gaps: tuple[ArrivalGap, ...]

    def commodity(self, commodity_id: str) -> CommodityAssessment:
        for c in self.commodities:
            if c.commodity_id == commodity_id:
                return c
        raise KeyError(commodity_id)

    def to_dict(self) -> dict:
        """JSON-safe representation (infinities become None)."""
        data = asdict(self)
        for c, src in zip(data["commodities"], self.commodities, strict=True):
            c["impacted"] = src.impacted
        return _json_safe(data)


def _json_safe(value):
    if isinstance(value, float):
        return None if math.isinf(value) or math.isnan(value) else value
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(v) for v in value]
    return value


def evaluate(
    network: SupplyNetwork,
    disruptions: Sequence[MaritimeDisruption] = (),
    config: SimulationConfig = DEFAULT_CONFIG,
) -> Assessment:
    horizon = config.horizon_days

    gaps: list[ArrivalGap] = []
    for disruption in disruptions:
        gaps.extend(disruption.arrival_gaps(network.routes))
    gaps_by_route: dict[str, list[ArrivalGap]] = defaultdict(list)
    for gap in gaps:
        gaps_by_route[gap.route_id].append(gap)
    blocked = {rid: blocked_fraction_by_day(g, horizon) for rid, g in gaps_by_route.items()}

    results: list[CommodityAssessment] = []
    for commodity in network.commodities:
        flows = network.flows_for(commodity.id)
        baseline_inflow = sum(f.volume_tpd for f in flows)
        disrupted_inflow = sum(f.volume_tpd for f in flows if f.route_id in blocked)
        disrupted_share = disrupted_inflow / baseline_inflow if baseline_inflow > 0 else 0.0

        inflow = [0.0] * horizon
        for flow in flows:
            fractions = blocked.get(flow.route_id)
            for day in range(horizon):
                inflow[day] += flow.volume_tpd * (1.0 - (fractions[day] if fractions else 0.0))
        delayed_volume = baseline_inflow * horizon - sum(inflow)

        stock = network.stock_t.get(commodity.id, 0.0)
        projection = metrics.project_inventory(stock, commodity.daily_consumption_t, inflow)
        floor_t = commodity.safety_stock_days * commodity.daily_consumption_t
        risk = metrics.shortage_risk(
            projection.min_cover_days,
            commodity.safety_stock_days,
            has_shortfall=projection.stockout_day is not None,
        )
        continuity = 1.0 - disrupted_share
        score = metrics.resilience_score(
            risk, continuity, config.buffer_weight, config.continuity_weight
        )
        demand_value = commodity.daily_consumption_t * horizon * commodity.unit_price_aed
        protected_value = metrics.protected_demand_t(projection, floor_t) * commodity.unit_price_aed

        results.append(
            CommodityAssessment(
                commodity_id=commodity.id,
                name=commodity.name,
                stock_t=stock,
                daily_consumption_t=commodity.daily_consumption_t,
                days_of_cover=metrics.days_of_cover(stock, commodity.daily_consumption_t),
                safety_stock_days=commodity.safety_stock_days,
                baseline_inflow_tpd=baseline_inflow,
                disrupted_inflow_share=disrupted_share,
                supply_continuity=continuity,
                affected_route_ids=tuple(
                    sorted({f.route_id for f in flows if f.route_id in blocked})
                ),
                delayed_volume_t=delayed_volume,
                projected_stock_t=projection.stock_t,
                projected_cover_days=projection.cover_days,
                min_cover_days=projection.min_cover_days,
                trough_day=projection.trough_day,
                safety_breach_day=projection.first_day_below(floor_t),
                stockout_day=projection.stockout_day,
                total_shortfall_t=projection.total_shortfall_t,
                shortage_risk=risk,
                risk_level=metrics.risk_level(risk, config.risk_bands),
                resilience_score=score,
                criticality=commodity.criticality,
                demand_value_aed=demand_value,
                protected_value_aed=protected_value,
                value_at_risk_aed=demand_value - protected_value,
            )
        )

    index = metrics.resilience_index(
        {r.commodity_id: r.resilience_score for r in results},
        {r.commodity_id: r.criticality for r in results},
    )
    demand_value = sum(r.demand_value_aed for r in results)
    protected_value = sum(r.protected_value_aed for r in results)
    return Assessment(
        horizon_days=horizon,
        commodities=tuple(results),
        resilience_index=index,
        demand_value_aed=demand_value,
        protected_value_aed=protected_value,
        value_at_risk_aed=demand_value - protected_value,
        material_threat_ids=tuple(
            r.commodity_id for r in results if r.risk_level in config.material_levels
        ),
        affected_route_ids=tuple(sorted(blocked)),
        arrival_gaps=tuple(gaps),
    )
