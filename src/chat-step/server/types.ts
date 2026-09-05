import type { z } from "zod";
import type { Session } from "../types";
export type ToolContext<Result> = {
  signal: AbortSignal;
  // Stable within this execution; forward to a domain service for durable idempotency.
  callId: string;
  getResult(): Result;
  updateResult(next: Result): Promise<void>;
};
export type Tool<Result> = {
  name: string;
  label: string;
  description: string;
  schema: z.ZodType;
  // Explicit allowlist for button-triggered operations, independently of model tools.
  fromUI?: boolean;
  // Optional browser-visible projections. Omit to keep payloads server-only.
  display?: { input?(args: unknown): unknown; output?(result: unknown): unknown };
  execute(args: unknown, context: ToolContext<Result>): Promise<unknown>;
};
export type StepDefinition<Result> = {
  id: string;
  instructions: string;
  initialResult: () => Result;
  // Server-owned, fresh per turn. Return only relevant, model-visible JSON data.
  getContext?(input: { sessionId: string; result: Result; signal: AbortSignal }): unknown | Promise<unknown>;
  tools: Tool<Result>[];
  canComplete(result: Result): boolean;
  complete?(session: Session<Result>): Promise<void>;
};
export type ProviderTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};
export interface ConversationProvider {
  run(input: {
    threadId?: string;
    instructions: string;
    text: string;
    tools: ProviderTool[];
    signal: AbortSignal;
    onThread(id: string): Promise<void>;
    onText(id: string, text: string, mode: "append" | "replace"): Promise<void>;
    callTool(name: string, args: unknown, call?: { id: string; signal?: AbortSignal }): Promise<unknown>;
  }): Promise<void>;
}
export type StoredSession<Result> = Session<Result> & {
  providerThreadId?: string;
};
