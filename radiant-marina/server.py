#!/usr/bin/env python3
"""Local server for the Radiant Marina buyer-acquisition dashboard (Python standard library only).

    python3 server.py              -> http://127.0.0.1:8787
    python3 server.py --port 9000  --host 0.0.0.0

Endpoints
  GET  /api/all       all data files + your working state
  PUT  /api/state     save working state (lead statuses, approvals, outreach log, calculator, campaigns)
  POST /api/refresh   run scripts/refresh.py (Property Finder) and return its output

Nothing here sends messages, posts adverts or contacts anyone. Outreach is drafted, approved by you in the
dashboard, and then sent by you, by hand, from your own WhatsApp / LinkedIn / email.
"""
import argparse, http.server, json, os, shutil, subprocess, sys, threading

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, "data")
PUBLIC = os.path.join(ROOT, "public")
STATE = os.path.join(DATA, "state.json")
SEED = os.path.join(DATA, "state.seed.json")
FILES = {"property": "property.json", "comparables": "comparables.json", "leads": "leads.json",
         "market": "market.json", "transactions": "claimed_transactions.json", "agents": "agents.json",
         "refresh_log": "refresh_log.json"}
_refresh_lock = threading.Lock()
_state_lock = threading.Lock()


def read_json(path, default=None):
    try:
        with open(path, encoding="utf8") as f:
            return json.load(f)
    except FileNotFoundError:
        return default


def load_state():
    if not os.path.exists(STATE):
        shutil.copyfile(SEED, STATE)
    return read_json(STATE, {})


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=PUBLIC, **kw)

    def log_message(self, fmt, *args):
        sys.stderr.write("[dashboard] " + fmt % args + "\n")

    def send_json(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.split("?")[0] == "/api/all":
            out = {k: read_json(os.path.join(DATA, v)) for k, v in FILES.items()}
            if out["refresh_log"]:
                out["refresh_log"] = out["refresh_log"][:10]
            out["state"] = load_state()
            out["mode"] = "server"
            return self.send_json(out)
        return super().do_GET()

    def do_PUT(self):
        if self.path != "/api/state":
            return self.send_json({"error": "not found"}, 404)
        n = int(self.headers.get("Content-Length") or 0)
        if n > 5_000_000:
            return self.send_json({"error": "state too large"}, 413)
        try:
            state = json.loads(self.rfile.read(n) or b"{}")
            if not isinstance(state, dict):
                raise ValueError("state must be an object")
        except ValueError as e:
            return self.send_json({"error": str(e)}, 400)
        with _state_lock:
            tmp = STATE + ".tmp"
            with open(tmp, "w", encoding="utf8") as f:
                json.dump(state, f, ensure_ascii=False, indent=1)
            os.replace(tmp, STATE)
        return self.send_json({"ok": True})

    def do_POST(self):
        if self.path != "/api/refresh":
            return self.send_json({"error": "not found"}, 404)
        if not _refresh_lock.acquire(blocking=False):
            return self.send_json({"error": "a refresh is already running"}, 409)
        try:
            p = subprocess.run([sys.executable, os.path.join(ROOT, "scripts", "refresh.py")],
                               capture_output=True, text=True, timeout=900, cwd=ROOT)
            return self.send_json({"ok": p.returncode == 0, "code": p.returncode,
                                   "output": (p.stdout + p.stderr)[-20000:]})
        except subprocess.TimeoutExpired:
            return self.send_json({"ok": False, "output": "refresh timed out after 15 minutes"}, 504)
        finally:
            _refresh_lock.release()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8787)
    a = ap.parse_args()
    load_state()
    srv = http.server.ThreadingHTTPServer((a.host, a.port), Handler)
    print(f"Radiant Marina dashboard: http://{a.host}:{a.port}")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
