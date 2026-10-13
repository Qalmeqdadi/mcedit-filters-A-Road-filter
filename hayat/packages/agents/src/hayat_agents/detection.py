from __future__ import annotations

from hayat_simulation import MaritimeDisruption

from .base import Agent, AgentContext
from .events import EventType
from .state import PipelineState, Signal


def to_disruption(signal: Signal) -> MaritimeDisruption:
    return MaritimeDisruption(
        source_id=signal.id, chokepoint=signal.chokepoint, delay_days=signal.delay_days
    )


class DisruptionDetectionAgent(Agent):
    name = "disruption-detection"
    role = "Matches signals against the supply network to find exposed routes and commodities."

    def run(self, ctx: AgentContext, state: PipelineState) -> None:
        state.disruptions = [to_disruption(s) for s in state.all_signals]
        signal = state.new_signal
        if signal is None:
            return

        network = state.picture.network
        disruption = to_disruption(signal)
        routes = [r for r in network.routes if disruption.affects(r)]
        route_ids = {r.id for r in routes}
        flows = [f for f in network.flows if f.route_id in route_ids]
        commodity_ids = sorted({f.commodity_id for f in flows})

        if not routes:
            ctx.emit(
                self.name,
                EventType.DISRUPTION_NO_EXPOSURE,
                f"No UAE supply routes transit {signal.chokepoint}; no exposure found",
                signal_id=signal.id,
            )
            return

        port_ids = sorted({r.destination_port_id for r in routes if r.destination_port_id})
        names = [state.picture.profile(c).name for c in commodity_ids]
        ctx.emit(
            self.name,
            EventType.DISRUPTION_DETECTED,
            f"Disruption detected at {signal.chokepoint}: {len(routes)} routes delayed "
            f"{signal.delay_days:g} days, exposing {', '.join(names)}",
            signal_id=signal.id,
            chokepoint=signal.chokepoint,
            delay_days=signal.delay_days,
            route_ids=sorted(route_ids),
            port_ids=port_ids,
            supplier_ids=sorted({f.supplier_id for f in flows}),
            commodity_ids=commodity_ids,
            delayed_inflow_tpd=sum(f.volume_tpd for f in flows),
        )
