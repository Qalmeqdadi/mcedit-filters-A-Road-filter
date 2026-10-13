from __future__ import annotations

from hayat_simulation import DEFAULT_CONFIG, SimulationConfig, evaluate

from .base import Agent, AgentContext
from .events import EventType
from .state import PipelineState


class ImpactAssessmentAgent(Agent):
    name = "impact-assessment"
    role = "Projects inventory depletion with and without active disruptions."

    def __init__(self, config: SimulationConfig = DEFAULT_CONFIG) -> None:
        self.config = config

    def run(self, ctx: AgentContext, state: PipelineState) -> None:
        network = state.picture.network
        ctx.emit(
            self.name,
            EventType.IMPACT_CALCULATION_STARTED,
            f"Impact calculation started: {len(network.commodities)} commodities, "
            f"{len(state.disruptions)} active disruptions, {self.config.horizon_days}-day horizon",
            disruptions=len(state.disruptions),
            horizon_days=self.config.horizon_days,
        )
        state.baseline = evaluate(network, (), self.config)
        state.revised = evaluate(network, state.disruptions, self.config)

        impacted = [c for c in state.revised.commodities if c.impacted]
        ctx.emit(
            self.name,
            EventType.IMPACT_CALCULATION_COMPLETED,
            f"Impact calculation completed: {len(impacted)} commodities with delayed inflow",
            impacted=[
                {
                    "commodity_id": c.commodity_id,
                    "days_of_cover": round(c.days_of_cover, 2),
                    "min_cover_days": round(c.min_cover_days, 2),
                    "trough_day": c.trough_day,
                    "risk_level": c.risk_level,
                }
                for c in impacted
            ],
        )
