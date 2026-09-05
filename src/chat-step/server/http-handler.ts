import type { IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod";
import { failure, StepError } from "./execution";
import type { SessionRuntime } from "./session-runtime";
export function json(res: ServerResponse, value: unknown, status = 200) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(JSON.stringify(value));
}
async function body(req: IncomingMessage) {
  const parts: Buffer[] = [];
  let size = 0;
  for await (const part of req) {
    size += part.length;
    if (size > 64_000) throw new StepError("payload_limit", "Request exceeds 64,000 bytes");
    parts.push(part);
  }
  try { return JSON.parse(Buffer.concat(parts).toString() || "{}"); }
  catch { throw new StepError("invalid_input", "Request must contain valid JSON"); }
}
// Authentication/scope resolution belongs to the host, before calling this handler.
async function routeSession<Result>(
  path: string,
  req: IncomingMessage,
  res: ServerResponse,
  runtime: SessionRuntime<Result>,
) {
  if (path === "" && req.method === "GET") {
    json(res, runtime.snapshot());
    return;
  }
  if (path === "/events" && req.method === "GET") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    const unsubscribe = runtime.subscribe((event) =>
      res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`),
    );
    const heartbeat = setInterval(() => res.write(": keepalive\n\n"), 20_000);
    res.on("close", () => {
      unsubscribe();
      clearInterval(heartbeat);
    });
    return;
  }
  if (req.method !== "POST") {
    json(res, { error: "Not found" }, 404);
    return;
  }
  if (path === "/messages") {
    await runtime.send(
      z.object({ text: z.string() }).parse(await body(req)).text,
    );
    json(res, { accepted: true }, 202);
    return;
  }
  if (path === "/cancel") {
    runtime.cancel();
    json(res, { accepted: true }, 202);
    return;
  }
  if (path === "/complete") {
    json(res, await runtime.complete());
    return;
  }
  if (path === "/actions") {
    const action = z
      .object({ name: z.string(), args: z.unknown() })
      .parse(await body(req));
    await runtime.act(action.name, action.args);
    json(res, { accepted: true }, 202);
    return;
  }
  json(res, { error: "Not found" }, 404);
}

export async function handleSession<Result>(path: string, req: IncomingMessage, res: ServerResponse, runtime: SessionRuntime<Result>) {
  try { await routeSession(path, req, res, runtime); }
  catch (error) {
    if (res.headersSent) { res.end(); return; }
    const info = failure(error instanceof z.ZodError ? new StepError("invalid_input", "Request does not match the expected schema") : error);
    const status = info.code === "payload_limit" ? 413 : info.code === "busy" || info.code === "call_conflict" ? 409 : 400;
    json(res, { error: info.message, code: info.code }, status);
  }
}
