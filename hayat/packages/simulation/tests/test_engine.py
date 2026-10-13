import pytest

from hayat_simulation import (
    Commodity,
    MaritimeDisruption,
    Route,
    SupplyFlow,
    SupplyNetwork,
    blocked_fraction_by_day,
    evaluate,
)
from hayat_simulation.scenarios import ArrivalGap


def _network() -> SupplyNetwork:
    commodities = (
        Commodity("WHEAT", "Wheat", 100.0, 30.0, 1.0, 1000.0),
        Commodity("SUGAR", "Sugar", 50.0, 30.0, 0.5, 2000.0),
    )
    routes = (
        Route(
            "R_SUEZ",
            "Europe via Suez",
            "sea",
            "P1",
            ("SUEZ", "BAB_EL_MANDEB"),
            {"SUEZ": 8.0, "BAB_EL_MANDEB": 6.0},
        ),
        Route("R_IND", "India direct", "sea", "P1", ("HORMUZ",), {"HORMUZ": 1.0}),
    )
    flows = (
        SupplyFlow("S1", "WHEAT", "R_SUEZ", 60.0),
        SupplyFlow("S2", "WHEAT", "R_IND", 40.0),
        SupplyFlow("S3", "SUGAR", "R_IND", 50.0),
    )
    return SupplyNetwork(commodities, routes, flows, {"WHEAT": 4500.0, "SUGAR": 2500.0})


def test_blocked_fraction_handles_partial_days_and_overlaps():
    gaps = [ArrivalGap("R", 1.5, 3.0, "a"), ArrivalGap("R", 2.0, 4.0, "b")]
    assert blocked_fraction_by_day(gaps, 5) == [0.0, 0.5, 1.0, 1.0, 0.0]


def test_baseline_has_no_impact():
    a = evaluate(_network())
    wheat = a.commodity("WHEAT")
    assert wheat.disrupted_inflow_share == 0
    assert wheat.days_of_cover == 45
    assert wheat.min_cover_days == 45
    assert wheat.risk_level == "LOW"
    assert a.material_threat_ids == ()
    assert a.value_at_risk_aed == 0
    assert a.affected_route_ids == ()


def test_eleven_day_disruption_hits_only_routes_through_chokepoint():
    d = MaritimeDisruption("sig-1", "BAB_EL_MANDEB", delay_days=11)
    a = evaluate(_network(), [d])
    wheat, sugar = a.commodity("WHEAT"), a.commodity("SUGAR")

    assert a.affected_route_ids == ("R_SUEZ",)
    assert wheat.impacted and not sugar.impacted
    assert wheat.disrupted_inflow_share == pytest.approx(0.6)
    # Gap starts after the 6-day post-chokepoint transit and lasts 11 days.
    assert wheat.projected_stock_t[6] == pytest.approx(4500)
    assert wheat.trough_day == 17
    # 60 t/day missing for 11 days = 660 t = 6.6 days of cover lost.
    assert wheat.delayed_volume_t == pytest.approx(660)
    assert wheat.min_cover_days == pytest.approx(45 - 6.6)
    assert wheat.shortage_risk == pytest.approx((60 - 38.4) / 60)
    assert sugar.min_cover_days == sugar.days_of_cover == 50
    assert a.resilience_index < evaluate(_network()).resilience_index


def test_disruption_can_cause_stockout_and_value_at_risk():
    net = _network()
    lean = SupplyNetwork(net.commodities, net.routes, net.flows, {"WHEAT": 300.0, "SUGAR": 2500.0})
    a = evaluate(lean, [MaritimeDisruption("sig", "BAB_EL_MANDEB", 11)])
    wheat = a.commodity("WHEAT")
    assert wheat.stockout_day is not None
    assert wheat.total_shortfall_t == pytest.approx(660 - 300)
    assert wheat.risk_level == "CRITICAL"
    assert "WHEAT" in a.material_threat_ids
    assert a.value_at_risk_aed > 0


def test_evaluate_is_deterministic():
    d = [MaritimeDisruption("sig", "BAB_EL_MANDEB", 11)]
    assert evaluate(_network(), d).to_dict() == evaluate(_network(), d).to_dict()
