from __future__ import annotations

import json
import os
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


class _Handler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler API
        if self.path != "/health":
            self.send_response(404)
            self.end_headers()
            return
        body = json.dumps({"ok": True, "service": os.environ.get("RAILWAY_SERVICE_NAME", "gary")}).encode("utf-8")
        self.send_response(200)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, _format: str, *_args: object) -> None:
        return


def start_health_server() -> ThreadingHTTPServer | None:
    port_value = os.environ.get("PORT")
    if not port_value:
        return None
    server = ThreadingHTTPServer(("0.0.0.0", int(port_value)), _Handler)
    threading.Thread(target=server.serve_forever, name="gary-health", daemon=True).start()
    return server
