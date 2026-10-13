from __future__ import annotations

from typing import Any

from hayat_simulation import Assessment, CommodityAssessment

from .base import Agent, AgentContext
from .events import EventType
from .state import OperatingPicture, PipelineState

_LEVEL_ORDER = {"NORMAL": 0, "LOW": 1, "ELEVATED": 2, "HIGH": 3, "CRITICAL": 4}


def _worst(levels: list[str]) -> str:
    return max(levels, key=_LEVEL_ORDER.__getitem__, default="NORMAL")


def threat_headline(c: CommodityAssessment) -> str:
    """Deterministic, template-based description of a threat. No generated text."""
    text = (
        f"{c.name}: cover falls from {c.days_of_cover:.1f} to {c.min_cover_days:.1f} days "
        f"by day {c.trough_day} (safety target {c.safety_stock_days:g} days)"
    )
    if c.stockout_day is not None:
        text += f"; stock-out projected on day {c.stockout_day}"
    elif c.safety_breach_day is not None:
        text += f"; safety stock breached on day {c.safety_breach_day}"
    return text


def _exposure(picture: OperatingPicture, commodity_id: str) -> dict[str, Any]:
    group = picture.profile(commodity_id).vulnerable_group
    if group == "infants":
        population = sum(round(z.population * z.infant_share) for z in picture.zones)
        hospitals = [h.id for h in picture.hospitals if h.has_nicu]
    else:
        population = sum(z.population for z in picture.zones)
        hospitals = []
    warehouses = sorted(
        {
            p.warehouse_id
            for p in picture.inventory
            if p.commodity_id == commodity_id and p.quantity_t > 0
        }
    )
    return {
        "vulnerable_group": group,
        "exposed_population": population,
        "exposed_hospital_ids": hospitals,
        "warehouse_ids": warehouses,
    }


def _network_status(state: PipelineState, revised: Assessment) -> dict[str, Any]:
    picture = state.picture
    route_status: dict[str, Any] = {}
    for gap in revised.arrival_gaps:
        entry = route_status.setdefault(
            gap.route_id,
            {
                "status": "DISRUPTED",
                "gap_start_day": gap.start_day,
                "gap_end_day": gap.end_day,
                "signal_ids": [],
            },
        )
        entry["gap_start_day"] = min(entry["gap_start_day"], gap.start_day)
        entry["gap_end_day"] = max(entry["gap_end_day"], gap.end_day)
        entry["signal_ids"].append(gap.source_id)
        entry["delay_days"] = entry["gap_end_day"] - entry["gap_start_day"]

    disrupted_ports = sorted(
        {picture.route_ref(rid).destination_port_id for rid in route_status} - {None}
    )
    levels = {c.commodity_id: c.risk_level for c in revised.commodities if c.impacted}
    warehouses: dict[str, list[str]] = {}
    for p in picture.inventory:
        if p.quantity_t > 0 and p.commodity_id in levels:
            warehouses.setdefault(p.warehouse_id, []).append(levels[p.commodity_id])

    material = [revised.commodity(cid) for cid in revised.material_threat_ids]
    groups = {picture.profile(c.commodity_id).vulnerable_group for c in material}
    infant_threat = "infants" in groups
    general_threat = "general" in groups
    return {
        "routes": route_status,
        "ports": {pid: "DISRUPTED" for pid in disrupted_ports},
        "warehouses": {wid: _worst(lv) for wid, lv in warehouses.items()},
        "hospitals": {h.id: "EXPOSED" for h in picture.hospitals if infant_threat and h.has_nicu},
        "zones": {z.id: "EXPOSED" for z in picture.zones if general_threat or infant_threat},
    }


class ResilienceAgent(Agent):
    name = "resilience"
    role = "Aggregates commodity assessments into the national resilience state."

    def run(self, ctx: AgentContext, state: PipelineState) -> None:
        if state.baseline is None or state.revised is None:
            raise RuntimeError("ResilienceAgent requires an impact assessment first")
        baseline, revised = state.baseline, state.revised
        picture = state.picture

        commodities = []
        for c in revised.to_dict()["commodities"]:
            profile = picture.profile(c["commodity_id"])
            c["name_ar"] = profile.name_ar
            c["vulnerable_group"] = profile.vulnerable_group
            commodities.append(c)

        threats = []
        for cid in revised.material_threat_ids:
            c = revised.commodity(cid)
            threats.append(
                {
                    "commodity_id": cid,
                    "name": c.name,
                    "name_ar": picture.profile(cid).name_ar,
                    "risk_level": c.risk_level,
                    "shortage_risk": c.shortage_risk,
                    "headline": threat_headline(c),
                    "days_of_cover": c.days_of_cover,
                    "min_cover_days": c.min_cover_days,
                    "trough_day": c.trough_day,
                    "safety_breach_day": c.safety_breach_day,
                    "stockout_day": c.stockout_day,
                    "disrupted_inflow_share": c.disrupted_inflow_share,
                    "value_at_risk_aed": c.value_at_risk_aed,
                    "affected_route_ids": list(c.affected_route_ids),
                    **_exposure(picture, cid),
                }
            )
        threats.sort(key=lambda t: -t["shortage_risk"])

        signals = state.all_signals
        state.result = {
            "run_id": ctx.run_id,
            "trigger": state.trigger,
            "computed_at": ctx.clock().isoformat(),
            "horizon_days": revised.horizon_days,
            "kpis": {
                "resilience_index": revised.resilience_index,
                "baseline_resilience_index": baseline.resilience_index,
                "resilience_delta": revised.resilience_index - baseline.resilience_index,
                "active_signals": len(signals),
                "material_threats": len(revised.material_threat_ids),
                "protected_value_aed": revised.protected_value_aed,
                "baseline_protected_value_aed": baseline.protected_value_aed,
                "value_at_risk_aed": revised.value_at_risk_aed,
                "demand_value_aed": revised.demand_value_aed,
            },
            "signals": [s.to_dict() for s in signals],
            "commodities": commodities,
            "threats": threats,
            "network_status": _network_status(state, revised),
        }

        ctx.emit(
            self.name,
            EventType.RESILIENCE_RECALCULATED,
            f"Resilience recalculated: index {baseline.resilience_index:.1f} baseline → "
            f"{revised.resilience_index:.1f} current; "
            f"{len(revised.material_threat_ids)} material threats",
            resilience_index=revised.resilience_index,
            baseline_resilience_index=baseline.resilience_index,
            material_threat_ids=list(revised.material_threat_ids),
            trigger=state.trigger,
        )
