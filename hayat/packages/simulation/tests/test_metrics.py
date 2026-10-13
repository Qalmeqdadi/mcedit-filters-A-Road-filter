import math

import pytest

from hayat_simulation import (
    DEFAULT_CONFIG,
    days_of_cover,
    project_inventory,
    protected_demand_t,
    resilience_index,
    resilience_score,
    risk_level,
    shortage_risk,
)


def test_days_of_cover():
    assert days_of_cover(1000, 100) == 10
    assert days_of_cover(0, 100) == 0
    assert math.isinf(days_of_cover(10, 0))
    with pytest.raises(ValueError):
        days_of_cover(-1, 10)


def test_projection_steady_state_is_flat():
    p = project_inventory(500, 50, [50] * 10)
    assert p.stock_t == (500.0,) * 11
    assert p.total_shortfall_t == 0
    assert p.stockout_day is None
    assert p.min_cover_days == 10


def test_projection_depletes_and_records_shortfall():
    # 100 t on hand, 40 t/day demand, no inflow: 40, 40, 20(+20 short), 0(+40 short)
    p = project_inventory(100, 40, [0, 0, 0, 0])
    assert p.stock_t == (100, 60, 20, 0, 0)
    assert p.served_t == (40, 40, 20, 0)
    assert p.shortfall_t == (0, 0, 20, 40)
    assert p.stockout_day == 2
    assert p.trough_day == 3
    assert p.first_day_below(50) == 2


def test_shortage_risk_anchor_points():
    assert shortage_risk(60, 30, False) == 0.0  # 2x target
    assert shortage_risk(90, 30, False) == 0.0  # clamped
    assert shortage_risk(30, 30, False) == 0.5  # at target
    assert shortage_risk(0, 30, False) == 1.0
    assert shortage_risk(25, 30, True) == 1.0  # any shortfall


def test_risk_bands():
    bands = DEFAULT_CONFIG.risk_bands
    assert risk_level(0.0, bands) == "LOW"
    assert risk_level(0.30, bands) == "ELEVATED"
    assert risk_level(0.50, bands) == "HIGH"
    assert risk_level(0.75, bands) == "CRITICAL"


def test_resilience_score_and_index():
    assert resilience_score(0.0, 1.0, 0.75, 0.25) == 100
    assert resilience_score(1.0, 0.0, 0.75, 0.25) == 0
    assert resilience_score(0.5, 1.0, 0.75, 0.25) == pytest.approx(62.5)
    assert resilience_index({"a": 80, "b": 40}, {"a": 1.0, "b": 0.5}) == pytest.approx(200 / 3)


def test_protected_demand_counts_only_days_with_buffer_intact():
    # floor 50 t; stock 100 -> 60 -> 20 (below floor on day 1 close)
    p = project_inventory(100, 40, [0, 0, 0])
    assert protected_demand_t(p, 50) == 40  # only day 0 closes at/above floor
