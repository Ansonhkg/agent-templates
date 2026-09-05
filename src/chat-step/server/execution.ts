import { createHash } from "node:crypto";

export type ErrorCode = "invalid_input" | "unavailable" | "busy" | "payload_limit" | "call_conflict" | "call_limit" | "cancelled" | "execution_failed" | "timeout";
export class StepError extends Error {
  constructor(readonly code: ErrorCode, message: string) { super(message); this.name = "StepError"; }
}
export function failure(error: unknown): { code: ErrorCode; message: string } {
  if (error instanceof StepError) return { code: error.code, message: error.message };
  if (error instanceof Error && "code" in error && error.code === "timeout") return { code: "timeout", message: error.message };
  if (error instanceof Error && error.name === "AbortError") return { code: "cancelled", message: "Stopped. Your last result is kept." };
  return { code: "execution_failed", message: error instanceof Error ? error.message.slice(0, 2000) : "This action could not be completed." };
}
export const defaultLimits = {
  contextBytes: 32 * 1024,
  resultBytes: 256 * 1024,
  toolArgsBytes: 32 * 1024,
  toolOutputBytes: 64 * 1024,
  manifestBytes: 128 * 1024,
  promptBytes: 512 * 1024,
  assistantBytes: 256 * 1024,
  tools: 32,
  callsPerTurn: 128,
};
export type ExecutionLimits = typeof defaultLimits;
export function jsonPayload(value: unknown, bytes: number, label: string): string {
  let text: string | undefined;
  try { text = JSON.stringify(value); } catch { throw new StepError("invalid_input", `${label} must be JSON serializable`); }
  if (text === undefined) throw new StepError("invalid_input", `${label} must be JSON serializable`);
  if (Buffer.byteLength(text, "utf8") > bytes) throw new StepError("payload_limit", `${label} exceeds ${bytes} bytes`);
  return text;
}
export function checkText(text: string, bytes: number, label: string) {
  if (Buffer.byteLength(text, "utf8") > bytes) throw new StepError("payload_limit", `${label} exceeds ${bytes} bytes`);
  return text;
}
export function abortable<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason ?? new DOMException("Stopped", "AbortError"));
    if (signal.aborted) { void work.catch(() => {}); abort(); return; }
    signal.addEventListener("abort", abort, { once: true });
    work.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}
function ordered(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(ordered);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, val]) => [key, ordered(val)]));
  return value;
}
// Per-turn, bounded replay protection. No eviction within a turn; no durable exactly-once guarantee.
export class ToolCalls {
  private entries = new Map<string, { fingerprint: string; outcome: Promise<unknown> }>();
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private limit: number) {}
  invoke(id: string, name: string, jsonArgs: string, execute: () => Promise<unknown>) {
    const fingerprint = createHash("sha256").update(JSON.stringify([name, ordered(JSON.parse(jsonArgs))])).digest("hex");
    const prior = this.entries.get(id);
    if (prior) {
      if (prior.fingerprint !== fingerprint) throw new StepError("call_conflict", "A repeated tool call ID contained different arguments");
      return prior.outcome;
    }
    if (this.entries.size >= this.limit) throw new StepError("call_limit", "This turn has reached its tool-call limit. Continue in a new message.");
    const outcome = this.queue.then(execute);
    this.entries.set(id, { fingerprint, outcome });
    this.queue = outcome.catch(() => {});
    return outcome;
  }
}
