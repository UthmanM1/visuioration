// Test-only stand-in for the Supabase API gateway: /auth/v1 -> GoTrue, /rest/v1 -> PostgREST, /storage/v1 -> Storage.
const http = require("http");
const routes = [["/auth/v1", 9999], ["/rest/v1", 54322], ["/storage/v1", 5000]];
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*", "access-control-expose-headers": "*" };
http.createServer((req, res) => {
  if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }
  const route = routes.find(([p]) => req.url.startsWith(p));
  if (!route) { res.writeHead(404, cors); return res.end("no route"); }
  const upstream = http.request({ host: "127.0.0.1", port: route[1], method: req.method, path: req.url.slice(route[0].length) || "/", headers: req.headers }, (up) => {
    res.writeHead(up.statusCode, { ...up.headers, ...cors }); up.pipe(res);
  });
  upstream.on("error", (e) => { if (!res.headersSent) res.writeHead(502, cors); res.end(String(e)); });
  req.pipe(upstream);
}).listen(54321, () => console.log("gateway on 54321"));
