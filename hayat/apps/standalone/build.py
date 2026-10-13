"""Build the single-file HAYAT Global Pulse page (no install, no server).

    uv run python apps/standalone/build.py

Embeds the synthetic dataset from ``hayat_api.seed.synthetic_uae`` into ``template.html``
and writes ``hayat-global-pulse.html`` next to this script. The page runs the same
deterministic engine as the API, ported to JavaScript; ``apps/api/tests/test_standalone_parity.py``
checks that both produce identical results.
"""

from __future__ import annotations

import argparse
import json
from dataclasses import asdict
from pathlib import Path

from hayat_api.seed.synthetic_uae import build_dataset
from hayat_api.services import DEMO_EVENT

HERE = Path(__file__).parent
TEMPLATE = HERE / "template.html"
OUTPUT = HERE / "hayat-global-pulse.html"
PLACEHOLDER = "/*__DATASET__*/null"


def dataset_json() -> str:
    data = asdict(build_dataset())
    data["demo_event"] = DEMO_EVENT
    # "</" must not appear inside an inline <script>.
    return json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")


def render_fragment() -> str:
    template = TEMPLATE.read_text(encoding="utf-8")
    if PLACEHOLDER not in template:
        raise RuntimeError("dataset placeholder missing from template")
    return template.replace(PLACEHOLDER, dataset_json())


def render_document() -> str:
    """Full HTML document: title, fonts and styles in <head>, the app in <body>."""
    head, marker, body = render_fragment().partition('<div class="shell">')
    if not marker:
        raise RuntimeError("app root missing from template")
    return (
        '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        + head
        + "</head>\n<body>\n"
        + marker
        + body
        + "\n</body>\n</html>\n"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--out", type=Path, default=OUTPUT, help="output HTML document")
    parser.add_argument("--fragment", type=Path, help="also write the page body only")
    args = parser.parse_args()
    args.out.write_text(render_document(), encoding="utf-8")
    print(f"wrote {args.out}")
    if args.fragment:
        args.fragment.write_text(render_fragment(), encoding="utf-8")
        print(f"wrote {args.fragment}")


if __name__ == "__main__":
    main()
