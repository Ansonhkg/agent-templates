import type { IncomingMessage, ServerResponse } from "node:http";
import type { CodexConnection } from "./connection";
function json(res: ServerResponse, value: unknown, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  res.end(JSON.stringify(value));
}
// Host MUST authorize this connection and validate Origin/CSRF before calling.
export async function handleCodexConnection(path: string, req: IncomingMessage, res: ServerResponse, connection: CodexConnection) {
  if (path === "" && req.method === "GET") { json(res, await connection.refresh()); return; }
  if (path === "/events" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
    const off = connection.subscribe(state => res.write(`event: connection\ndata: ${JSON.stringify(state)}\n\n`));
    const timer = setInterval(() => res.write(": keepalive\n\n"), 20000);
    res.on("close", () => { off(); clearInterval(timer); }); return;
  }
  if (req.method !== "POST") { json(res, { error: "Not found" }, 404); return; }
  if (path === "/login/browser" || path === "/login/device") { json(res, await connection.login(path.endsWith("device") ? "device" : "browser")); return; }
  if (path === "/login/cancel") { json(res, await connection.cancelLogin()); return; }
  if (path === "/logout") { json(res, await connection.logout()); return; }
  if (path === "/reconnect") { json(res, await connection.reconnect()); return; }
  json(res, { error: "Not found" }, 404);
}
