import type { ServerResponse } from "node:http";
import type { CodexConnection } from "../src/codex-connection/server/connection";
let running = false;
function respond(res: ServerResponse, value: unknown, status = 200) {
  if (res.destroyed) return;
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(value));
}
// A standalone, fixed inference request: no chat sessions or product tools.
// The host authorizes the request before calling this handler.
export async function testConnection(connection: CodexConnection, res: ServerResponse) {
  if (running) { respond(res, { error: "A connection test is already running." }, 409); return; }
  running = true;
  const controller = new AbortController();
  const cancel = () => controller.abort(new Error("Connection test cancelled."));
  const timer = setTimeout(() => controller.abort(new Error("Connection test timed out. Try again.")), 45000);
  res.on("close", cancel);
  const messages = new Map<string, string>();
  try {
    await connection.run({
      instructions: "This is a connection test. Reply briefly with plain text only. Do not use any tools.",
      text: "Reply with exactly: Codex connection works.",
      tools: [], signal: controller.signal,
      onThread: async () => {},
      onText: async (id, text, mode) => { messages.set(id, mode === "replace" ? text : (messages.get(id) || "") + text); },
      callTool: async () => { throw new Error("Connection tests have no tools."); },
    });
    controller.signal.throwIfAborted();
    const text = [...messages.values()].join("\n").trim();
    if (!text) throw new Error("Codex returned an empty response. Try again.");
    respond(res, { text });
  } catch (error) {
    respond(res, { error: controller.signal.aborted ? String(controller.signal.reason?.message || "Connection test cancelled.") : (error as Error).message }, 400);
  } finally {
    running = false;
    clearTimeout(timer);
    res.off("close", cancel);
  }
}
