# Test-only stand-in for the Anthropic Messages API. Scripted by keywords in the question.
import json, re, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

LOG = "/tmp/fake_anthropic_requests.jsonl"

def plan_for(q, retry):
    ql = q.lower()
    if "margin trick" in ql:
        return {"status": "cannot_answer", "reason": "Revenue was only $2.4M last year, so margins can't be computed."}
    if "profit" in ql:
        return {"status": "cannot_answer", "reason": "This workspace's data has no profit or cost columns, so profit can't be calculated."}
    if "bad column" in ql and not retry:
        return {"status": "ok", "dataset": "D1", "queries": [{"title": "Profit by region", "chart": "bar", "x": {"column": "Region"}, "measure": {"column": "Profit", "aggregation": "sum"}}]}
    if "west" in ql and "3 months" in ql:
        return {"status": "ok", "dataset": "D1", "queries": [{"title": "West revenue, last 3 months", "chart": "kpi", "measure": {"column": "Revenue", "aggregation": "sum"},
                "filters": [{"column": "Region", "op": "eq", "value": "West"}], "date_range": {"column": "Date", "preset": "last_3_months"}}]}
    if "over time" in ql or "trend" in ql:
        return {"status": "ok", "dataset": "D1", "queries": [{"title": "Monthly revenue", "chart": "line", "x": {"column": "Date", "grain": "month"}, "measure": {"column": "Revenue", "aggregation": "sum"}}]}
    return {"status": "ok", "dataset": "D1", "queries": [
        {"title": "Revenue by region", "chart": "bar", "x": {"column": "Region"}, "measure": {"column": "Revenue", "aggregation": "sum"}},
        {"title": "Total revenue", "chart": "kpi", "measure": {"column": "Revenue", "aggregation": "sum"}}]}

def answer_for(q, evidence, retry):
    ql = q.lower()
    e1 = evidence[0]
    facts = {f["label"]: f["formatted"] for f in e1["facts"]}
    if "stubborn" in ql or ("invent" in ql and not retry):
        return {"answer": "Revenue reached $9,999,999 and grew 87% year over year.", "evidence_ids": ["E1"], "follow_ups": ["a?", "b?", "c?"]}
    lead = [k for k in facts if k.startswith("Highest")]
    if lead:
        top = lead[0].split(": ", 1)[1]
        share = facts.get(f"{top} share of total")
        text = f"{top} had the highest revenue at {facts[lead[0]]}" + (f", {share} of the total" if share else "") + f". Across all regions the total was {facts[[k for k in facts if k.startswith('Total')][0]]}."
    else:
        total_key = [k for k in facts if k.startswith("Total") or k.startswith("Overall")][0]
        text = f"{e1['title']}: {facts[total_key]} across {facts['Rows matched']} rows."
    return {"answer": text, "evidence_ids": [e["id"] for e in evidence], "follow_ups": ["How has revenue changed over time?", "Which region grew fastest?", "What is the average order value?"]}

class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def send(self, code, body):
        data = json.dumps(body).encode()
        self.send_response(code); self.send_header("content-type", "application/json"); self.send_header("content-length", str(len(data))); self.end_headers(); self.wfile.write(data)
    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers.get("content-length", 0))))
        with open(LOG, "a") as f: f.write(json.dumps({"path": self.path, "headers": {"x-api-key": self.headers.get("x-api-key"), "anthropic-version": self.headers.get("anthropic-version")}, "body": body}) + "\n")
        if self.path != "/v1/messages": return self.send(404, {"type": "error", "error": {"type": "not_found_error"}})
        if self.headers.get("x-api-key") != "test-key": return self.send(401, {"type": "error", "error": {"type": "authentication_error"}})
        if not self.headers.get("anthropic-version"): return self.send(400, {"type": "error", "error": {"type": "invalid_request_error"}})
        tool = body["tools"][0]["name"]
        if body.get("tool_choice") != {"type": "tool", "name": tool}: return self.send(400, {"type": "error", "error": {"type": "invalid_request_error", "message": "tool_choice"}})
        content = body["messages"][0]["content"]
        q = re.search(r"<question>(.*?)</question>", content, re.S).group(1)
        if "overload" in q.lower(): return self.send(529, {"type": "error", "error": {"type": "overloaded_error"}})
        if tool == "plan_queries":
            out = plan_for(q, "<problems>" in content)
        else:
            ev = json.loads(re.search(r"<evidence>(.*?)</evidence>", content, re.S).group(1))
            out = answer_for(q, ev, "<rejected_answer>" in content)
        self.send(200, {"id": "msg_test", "type": "message", "role": "assistant", "model": body["model"], "stop_reason": "tool_use",
                        "content": [{"type": "tool_use", "id": "toolu_test", "name": tool, "input": out}], "usage": {"input_tokens": len(content) // 4, "output_tokens": 50}})

ThreadingHTTPServer(("127.0.0.1", 4010), H).serve_forever()
