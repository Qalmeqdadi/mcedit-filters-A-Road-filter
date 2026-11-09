#!/usr/bin/env python3
"""Bundle the dashboard and its current data into one self-contained HTML file (dist/dashboard.html).
The snapshot is read-only with respect to the server: edits are kept in the viewer's browser only.

    python3 scripts/build_static.py              # dist/dashboard.html (standalone file)
    python3 scripts/build_static.py --artifact   # dist/dashboard-artifact.html (page body only)
"""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
PUB = os.path.join(ROOT, "public")
FILES = {"property": "property.json", "comparables": "comparables.json", "leads": "leads.json",
         "market": "market.json", "transactions": "claimed_transactions.json", "agents": "agents.json",
         "refresh_log": "refresh_log.json"}


def rd(name):
    with open(os.path.join(DATA, name), encoding="utf8") as f:
        return json.load(f)


def main():
    data = {k: rd(v) for k, v in FILES.items()}
    data["refresh_log"] = data["refresh_log"][:5]
    data["state"] = rd("state.seed.json")
    data["mode"] = "static"
    html = open(os.path.join(PUB, "index.html"), encoding="utf8").read()
    css = open(os.path.join(PUB, "styles.css"), encoding="utf8").read()
    js = open(os.path.join(PUB, "app.js"), encoding="utf8").read()
    payload = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    html = html.replace('<link rel="stylesheet" href="styles.css">', f"<style>\n{css}\n</style>")
    html = html.replace('<script src="app.js"></script>',
                        f"<script>window.__STATIC_DATA__ = {payload};</script>\n<script>\n{js}\n</script>")
    os.makedirs(os.path.join(ROOT, "dist"), exist_ok=True)
    if "--artifact" in sys.argv:
        # Page-body form for hosts that add their own <html>/<head>/<body> skeleton.
        body = html.split("<body>", 1)[1].rsplit("</body>", 1)[0]
        html = (f"<title>Radiant Marina Sale Desk</title>\n<style>\n{css}\n</style>\n{body}")
    out = os.path.join(ROOT, "dist", "dashboard-artifact.html" if "--artifact" in sys.argv else "dashboard.html")
    with open(out, "w", encoding="utf8") as f:
        f.write(html)
    print(out, f"{os.path.getsize(out) / 1024:.0f} KB")


if __name__ == "__main__":
    main()
