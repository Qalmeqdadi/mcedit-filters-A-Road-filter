import pytest

from hayat_agents import (
    CommodityProfile,
    EventType,
    HospitalRef,
    InventoryPosition,
    ListSink,
    OperatingPicture,
    PortRef,
    ResiliencePipeline,
    RouteRef,
    SignalValidationError,
    SupplierRef,
    ZoneRef,
)
from hayat_simulation import Commodity, Route, SupplyFlow, SupplyNetwork


@pytest.fixture
def picture() -> OperatingPicture:
    network = SupplyNetwork(
        commodities=(
            Commodity("FORMULA", "Infant formula", 10.0, 10.0, 1.0, 90000.0),
            Commodity("SUGAR", "Sugar", 50.0, 30.0, 0.5, 2000.0),
        ),
        routes=(
            Route(
                "R1",
                "Rotterdam - Jebel Ali",
                "sea",
                "JEA",
                ("SUEZ", "BAB_EL_MANDEB"),
                {"SUEZ": 8.0, "BAB_EL_MANDEB": 6.0},
            ),
            Route(
                "R2",
                "Santos - Khor Fakkan",
                "sea",
                "KFK",
                ("CAPE_OF_GOOD_HOPE",),
                {"CAPE_OF_GOOD_HOPE": 14.0},
            ),
        ),
        flows=(
            SupplyFlow("S1", "FORMULA", "R1", 9.0),
            SupplyFlow("S2", "FORMULA", "R2", 1.0),
            SupplyFlow("S3", "SUGAR", "R2", 50.0),
        ),
        stock_t={"FORMULA": 145.0, "SUGAR": 2500.0},
    )
    return OperatingPicture(
        network=network,
        commodities=(
            CommodityProfile("FORMULA", "Infant formula", "حليب الأطفال", "infants"),
            CommodityProfile("SUGAR", "Sugar", "سكر", "general"),
        ),
        ports=(PortRef("JEA", "Jebel Ali"), PortRef("KFK", "Khor Fakkan")),
        routes=(
            RouteRef("R1", "Rotterdam - Jebel Ali", "JEA"),
            RouteRef("R2", "Santos - Khor Fakkan", "KFK"),
        ),
        suppliers=(
            SupplierRef("S1", "Supplier 1", "Netherlands", "FORMULA", "R1"),
            SupplierRef("S2", "Supplier 2", "Brazil", "FORMULA", "R2"),
            SupplierRef("S3", "Supplier 3", "Brazil", "SUGAR", "R2"),
        ),
        inventory=(
            InventoryPosition("W1", "FORMULA", 145.0),
            InventoryPosition("W2", "SUGAR", 2500.0),
        ),
        hospitals=(
            HospitalRef("H1", "Hospital 1", "Z1", 300, True),
            HospitalRef("H2", "Hospital 2", "Z1", 100, False),
        ),
        zones=(ZoneRef("Z1", "Zone 1", 1_000_000, 0.025),),
    )


EVENT = {
    "id": "sig-demo",
    "kind": "maritime_disruption",
    "title": "Red Sea corridor closed",
    "source": "test",
    "severity": "major",
    "chokepoint": "bab_el_mandeb",
    "delay_days": 11,
}


def test_baseline_recalculation_emits_only_calculation_events(picture):
    sink = ListSink()
    state = ResiliencePipeline().run(picture, sink, trigger="baseline")
    assert sink.types == [
        EventType.IMPACT_CALCULATION_STARTED,
        EventType.IMPACT_CALCULATION_COMPLETED,
        EventType.RESILIENCE_RECALCULATED,
    ]
    kpis = state.result["kpis"]
    assert kpis["active_signals"] == 0
    assert kpis["material_threats"] == 0
    assert kpis["resilience_delta"] == 0


def test_disruption_run_emits_full_audit_trail_and_flags_threat(picture):
    sink = ListSink()
    state = ResiliencePipeline().run(picture, sink, raw_event=EVENT, trigger="signal")

    assert sink.types == [
        EventType.EVENT_RECEIVED,
        EventType.DISRUPTION_DETECTED,
        EventType.IMPACT_CALCULATION_STARTED,
        EventType.IMPACT_CALCULATION_COMPLETED,
        EventType.RESILIENCE_RECALCULATED,
    ]
    assert len({e.run_id for e in sink.events}) == 1
    detected = sink.events[1].payload
    assert detected["route_ids"] == ["R1"]
    assert detected["commodity_ids"] == ["FORMULA"]

    result = state.result
    assert result["kpis"]["active_signals"] == 1
    assert result["kpis"]["resilience_delta"] < 0
    # 14.5 days of cover, 90% of inflow missing for 11 days -> 4.6 days at the trough.
    threat = result["threats"][0]
    assert threat["commodity_id"] == "FORMULA"
    assert threat["min_cover_days"] == pytest.approx(4.6)
    assert threat["risk_level"] == "CRITICAL"
    assert threat["exposed_population"] == 25_000
    assert threat["exposed_hospital_ids"] == ["H1"]
    status = result["network_status"]
    assert status["routes"]["R1"]["delay_days"] == 11
    assert status["ports"] == {"JEA": "DISRUPTED"}
    assert status["warehouses"] == {"W1": "CRITICAL"}
    assert status["hospitals"] == {"H1": "EXPOSED"}


def test_unrelated_chokepoint_has_no_exposure(picture):
    sink = ListSink()
    state = ResiliencePipeline().run(
        picture, sink, raw_event={**EVENT, "chokepoint": "PANAMA"}, trigger="signal"
    )
    assert EventType.DISRUPTION_NO_EXPOSURE in sink.types
    assert state.result["kpis"]["material_threats"] == 0


def test_invalid_event_is_rejected_and_logged(picture):
    sink = ListSink()
    with pytest.raises(SignalValidationError):
        ResiliencePipeline().run(picture, sink, raw_event={**EVENT, "delay_days": -3})
    assert sink.types == [EventType.PIPELINE_FAILED]
