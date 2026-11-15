#!/usr/bin/env python3
"""ECO DRIFT local server.

    python server.py            ->  http://localhost:8000

* serves the website (static files, with sensible caching)
* /api/chat   proxies Eco Bot questions to Google Gemini, so the API key stays on this
              computer (in .env) and is never sent to the browser
* /api/health tells the page whether the AI is available

Put your key in a file called .env next to this script:
    GEMINI_API_KEY=your-key-here
"""
import json
import os
import sys
import time
import threading
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(os.environ.get("PORT", "8000"))
API = "https://generativelanguage.googleapis.com/v1beta/models/{}:streamGenerateContent?alt=sse"
MODELS = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-3.7-flash", "gemini-3.8-flash", "gemini-flash-latest"]
MAX_BODY = 200_000
RATE = 40          # requests per minute per visitor


def load_env():
    path = os.path.join(ROOT, ".env")
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


load_env()
KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("gemini_api_key") or ""
if os.environ.get("GEMINI_MODEL"):
    MODELS.insert(0, os.environ["GEMINI_MODEL"])
good_model = {"name": None}
hits = {}
lock = threading.Lock()


def allowed(ip):
    now = time.time()
    with lock:
        recent = [t for t in hits.get(ip, []) if now - t < 60]
        recent.append(now)
        hits[ip] = recent
        return len(recent) <= RATE


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    # ---------- static files ----------
    def end_headers(self):
        p = self.path.split("?")[0]
        if p.startswith("/img/"):
            self.send_header("Cache-Control", "public, max-age=604800")
        elif p.endswith((".css", ".js", ".html")) or p == "/":
            self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def do_GET(self):
        p = self.path.split("?")[0]
        if p == "/api/health":
            return self.json({"ai": bool(KEY), "model": good_model["name"]})
        name = os.path.basename(p)
        if name.startswith(".") or name in ("server.py",) or p.startswith("/__"):
            return self.send_error(404)
        return super().do_GET()

    def json(self, obj, code=200):
        data = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    # ---------- Gemini proxy ----------
    def do_POST(self):
        if self.path.split("?")[0] != "/api/chat":
            return self.send_error(404)
        if not KEY:
            return self.json({"error": "No GEMINI_API_KEY on the server"}, 503)
        if not allowed(self.client_address[0]):
            return self.json({"error": "Too many questions, slow down a little"}, 429)
        try:
            n = int(self.headers.get("Content-Length", "0"))
            if n <= 0 or n > MAX_BODY:
                return self.json({"error": "Bad request size"}, 413)
            payload = json.loads(self.rfile.read(n))
            body = json.dumps({k: payload[k] for k in ("systemInstruction", "contents", "generationConfig", "tools") if k in payload}).encode()
        except Exception:
            return self.json({"error": "Bad request"}, 400)

        order = ([good_model["name"]] if good_model["name"] else []) + [m for m in MODELS if m != good_model["name"]]
        last = "no model answered"
        for model in order:
            req = urllib.request.Request(API.format(model), body, {"Content-Type": "application/json", "x-goog-api-key": KEY})
            try:
                res = urllib.request.urlopen(req, timeout=25)
            except urllib.error.HTTPError as e:
                last = f"{model}: HTTP {e.code}"
                if e.code in (404, 400, 503):
                    continue              # model retired or busy: try the next one
                if e.code == 429:
                    return self.json({"error": "The AI is rate limited right now. Try again in a moment."}, 429)
                return self.json({"error": "AI error " + str(e.code)}, 502)
            except Exception as e:
                last = f"{model}: {e}"
                continue
            good_model["name"] = model
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("X-Accel-Buffering", "no")
            self.end_headers()
            try:
                for line in res:
                    self.wfile.write(line)
                    if line in (b"\n", b"\r\n"):
                        self.wfile.flush()
                self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError):
                pass
            return
        self.json({"error": "AI unavailable (" + last + ")"}, 502)

    def log_message(self, fmt, *args):
        if args and "/api/" in str(args[0]):
            sys.stderr.write("[api] " + fmt % args + "\n")


if __name__ == "__main__":
    srv = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"ECO DRIFT running at http://localhost:{PORT}   (AI chat: {'ON' if KEY else 'OFF - add GEMINI_API_KEY to .env'})")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass

