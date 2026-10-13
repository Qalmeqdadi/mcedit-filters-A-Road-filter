"""The single-file page must compute exactly what the Python engine computes.

Runs the JavaScript engine embedded in apps/standalone/template.html under Node and
compares its results with the Python agent pipeline on the same synthetic dataset.
Skipped when Node is not installed.
"""

import importlib.util
import json
import re
import shutil
import subprocess
from pathlib import Path

import pytest

from hayat_agents import ListSink, ResiliencePipeline
from hayat_api import repository
from hayat_api.db import new_session
from hayat_api.seed.cli import seed
from hayat_api.services import DEMO_EVENT

ROOT = Path(__file__).resolve().parents[3]
NODE = shutil.which("node")

COMMODITY_KEYS = [
    "commodity_id",
    "stock_t",
    "days_of_cover",
    "disrupted_inflow_share",
    "affected_route_ids",
    "delayed_volume_t",
    "projected_cover_days",
    "min_cover_days",
    "trough_day",
    "safety_breach_day",
    "stockout_day",
    "shortage_risk",
    "risk_level",
    "resilience_score",
    "protected_value_aed",
    "value_at_risk_aed",
    "impacted",
    "name_ar",
    "vulnerable_group",
]
THREAT_KEYS = [
    "commodity_id",
    "risk_level",
    "headline",
    "exposed_population",
    "exposed_hospital_ids",
    "warehouse_ids",
    "affected_route_ids",
    "value_at_risk_aed",
]

HARNESS = """
const out = [];
for (const raw of [null, %s]) {
  const run = runPipelineSync({ raw, trigger: raw ? "signal" : "seed" });
  out.push({ result: run.state.result, events: run.events.map((e) => [e.event_type, e.message]) });
}
process.stdout.write(JSON.stringify(out));
"""


def _load_build():
    spec = importlib.util.spec_from_file_location(
        "standalone_build", ROOT / "apps/standalone/build.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _approx_equal(a, b):
    if isinstance(a, float) or isinstance(b, float):
        return a == pytest.approx(b, rel=1e-9, abs=1e-9)
    if isinstance(a, list) and isinstance(b, list):
        return len(a) == len(b) and all(_approx_equal(x, y) for x, y in zip(a, b, strict=True))
    return a == b


@pytest.mark.skipif(NODE is None, reason="node is not installed")
def test_javascript_engine_matches_python(tmp_path):
    fragment = _load_build().render_fragment()
    engine = re.search(r'<script id="hayat-engine">(.*?)</script>', fragment, re.S).group(1)
    event = {**DEMO_EVENT, "id": "parity-signal"}
    script = tmp_path / "parity.cjs"
    script.write_text(engine + HARNESS % json.dumps(event), encoding="utf-8")
    js_runs = json.loads(
        subprocess.run([NODE, str(script)], capture_output=True, text=True, check=True).stdout
    )

    seed(f"sqlite:///{tmp_path / 'parity.db'}")
    with new_session() as session:
        picture = repository.load_picture(session)

    for raw, js in zip([None, event], js_runs, strict=True):
        sink = ListSink()
        py = (
            ResiliencePipeline()
            .run(picture, sink, raw_event=raw, trigger="signal" if raw else "seed")
            .result
        )
        assert [(e.event_type, e.message) for e in sink.events] == [tuple(x) for x in js["events"]]
        res = js["result"]
        for key, value in py["kpis"].items():
            assert _approx_equal(res["kpis"][key], value), key
        for p, j in zip(py["commodities"], res["commodities"], strict=True):
            for key in COMMODITY_KEYS:
                assert _approx_equal(j[key], p[key]), (p["commodity_id"], key)
        assert len(py["threats"]) == len(res["threats"])
        for p, j in zip(py["threats"], res["threats"], strict=True):
            for key in THREAT_KEYS:
                assert _approx_equal(j[key], p[key]), (p["commodity_id"], key)
        status_py, status_js = py["network_status"], res["network_status"]
        for part in ("ports", "warehouses", "hospitals", "zones"):
            assert status_js[part] == status_py[part], part
        assert _approx_equal(
            {k: v["delay_days"] for k, v in status_js["routes"].items()},
            {k: v["delay_days"] for k, v in status_py["routes"].items()},
        )
