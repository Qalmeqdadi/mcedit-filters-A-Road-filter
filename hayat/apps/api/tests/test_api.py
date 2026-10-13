import pytest

from hayat_api.seed.synthetic_uae import build_dataset, split_whole_tonnes

PHASE1_EVENTS = [
    "event.received",
    "disruption.detected",
    "impact.calculation.started",
    "impact.calculation.completed",
    "resilience.recalculated",
]


def test_dataset_is_consistent():
    data = build_dataset()
    route_ids = {r["id"] for r in data.routes}
    port_ids = {p["id"] for p in data.ports}
    assert all(s["route_id"] in route_ids for s in data.suppliers)
    assert all(r["destination_port_id"] in port_ids | {None} for r in data.routes)
    consumption = {c["id"]: c["daily_consumption_t"] for c in data.commodities}
    for cid, daily in consumption.items():
        inflow = sum(s["volume_tpd"] for s in data.suppliers if s["commodity_id"] == cid)
        assert inflow == pytest.approx(daily)
    assert split_whole_tonnes(10, {"a": 1, "b": 1, "c": 1}) == {"a": 4, "b": 3, "c": 3}


def test_health(client):
    body = client.get("/api/health").json()
    assert body["status"] == "ok" and body["seeded"] is True


def test_baseline_pulse(client):
    body = client.get("/api/pulse").json()
    kpis = body["state"]["kpis"]
    assert body["snapshot"]["trigger"] == "seed"
    assert kpis["active_signals"] == 0
    assert kpis["material_threats"] == 0
    assert kpis["value_at_risk_aed"] == 0
    assert 0 < kpis["resilience_index"] <= 100
    assert len(body["network"]["ports"]) == 6
    assert len(body["network"]["hospitals"]) == 13


def test_demo_disruption_end_to_end(client):
    before = client.get("/api/pulse").json()["state"]["kpis"]
    last_id = client.get("/api/events").json()[-1]["id"]

    res = client.post("/api/demo/disruption")
    assert res.status_code == 201
    state = res.json()["state"]
    kpis = state["kpis"]

    assert kpis["active_signals"] == 1
    assert kpis["resilience_index"] < before["resilience_index"]
    assert kpis["protected_value_aed"] < before["protected_value_aed"]
    impacted = {c["commodity_id"] for c in state["commodities"] if c["impacted"]}
    assert impacted == {"WHEAT", "RICE", "COOKING_OIL", "INFANT_FORMULA"}
    threats = {t["commodity_id"]: t["risk_level"] for t in state["threats"]}
    assert threats["INFANT_FORMULA"] == "CRITICAL"
    assert set(threats) <= impacted
    assert "JEA" in state["network_status"]["ports"]
    assert state["network_status"]["routes"]["R-RTM-JEA"]["delay_days"] == 11

    events = client.get(f"/api/events?after_id={last_id}").json()
    assert [e["event_type"] for e in events] == PHASE1_EVENTS
    assert len({e["run_id"] for e in events}) == 1

    # The persisted state is what the pulse now reports.
    assert client.get("/api/pulse").json()["state"]["kpis"] == kpis


def test_reset_restores_baseline(client):
    baseline = client.get("/api/pulse").json()["state"]["kpis"]["resilience_index"]
    client.post("/api/demo/disruption")
    body = client.post("/api/demo/reset").json()
    assert body["state"]["kpis"]["active_signals"] == 0
    assert body["state"]["kpis"]["resilience_index"] == pytest.approx(baseline)


def test_generic_signal_ingest_and_validation(client):
    ok = client.post(
        "/api/signals",
        json={
            "kind": "maritime_disruption",
            "title": "Malacca congestion",
            "source": "test",
            "chokepoint": "MALACCA",
            "delay_days": 4,
        },
    )
    assert ok.status_code == 201
    assert ok.json()["state"]["kpis"]["active_signals"] == 1

    bad = client.post(
        "/api/signals",
        json={
            "kind": "maritime_disruption",
            "title": "bad",
            "source": "test",
            "chokepoint": "SUEZ",
            "delay_days": 0,
        },
    )
    assert bad.status_code == 422


def test_event_stream_replays_after_cursor(client):
    with client.stream("GET", "/api/events/stream?after_id=0&max_seconds=0.1") as res:
        assert res.headers["content-type"].startswith("text/event-stream")
        body = "".join(res.iter_text())
    assert "event: audit" in body
    assert "resilience.recalculated" in body
