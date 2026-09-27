"""Forwards to the real Anthropic API. Questions containing a marker get a substituted response, so the
app's handling of malformed output, API errors and rate limiting can be tested alongside real calls.
The API key is read from the incoming request (set by the app); nothing is logged or stored."""
import json, re, urllib.request, urllib.error
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
UPSTREAM = "https://api.anthropic.com"

class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def reply(self, code, body, headers=None):
        data = json.dumps(body).encode()
        self.send_response(code); self.send_header("content-type", "application/json")
        for k, v in (headers or {}).items(): self.send_header(k, v)
        self.send_header("content-length", str(len(data))); self.end_headers(); self.wfile.write(data)
    def do_POST(self):
        raw = self.rfile.read(int(self.headers.get("content-length", 0)))
        body = json.loads(raw)
        q = re.search(r"<question>(.*?)</question>", body["messages"][0]["content"], re.S)
        q = q.group(1).lower() if q else ""
        tool = body["tools"][0]["name"]
        if "[fault:429]" in q:
            return self.reply(429, {"type": "error", "error": {"type": "rate_limit_error", "message": "rate limited"}}, {"retry-after": "30"})
        if "[fault:500]" in q:
            return self.reply(500, {"type": "error", "error": {"type": "api_error", "message": "internal"}})
        if "[fault:malformed]" in q and tool == "plan_queries":
            return self.reply(200, {"id": "x", "type": "message", "role": "assistant", "content": [{"type": "text", "text": "SELECT * FROM datasets; -- not a tool call"}], "usage": {"input_tokens": 1, "output_tokens": 1}})
        if "[fault:badplan]" in q and tool == "plan_queries":
            return self.reply(200, {"id": "x", "type": "message", "role": "assistant", "content": [{"type": "tool_use", "id": "t", "name": tool, "input": {"status": "ok", "dataset": "D1", "queries": [{"title": "x", "chart": "bar", "x": {"column": "Region; DROP TABLE datasets"}, "measure": {"aggregation": "sum", "column": "Revenue"}}]}}], "usage": {"input_tokens": 1, "output_tokens": 1}})
        req = urllib.request.Request(UPSTREAM + self.path, data=raw, method="POST", headers={k: v for k, v in self.headers.items() if k.lower() in ("x-api-key", "anthropic-version", "content-type")})
        try:
            r = urllib.request.urlopen(req, timeout=60); data = r.read(); code = r.status
        except urllib.error.HTTPError as e:
            data = e.read(); code = e.code
        self.send_response(code); self.send_header("content-type", "application/json"); self.send_header("content-length", str(len(data))); self.end_headers(); self.wfile.write(data)

if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", 4011), H).serve_forever()
