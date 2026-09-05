// Shared wire types. No React, provider, or app-domain dependencies.
export type Activity = {
  id: string;
  name: string;
  label: string;
  status: "running" | "completed" | "failed" | "cancelled";
  detail?: string;
  // Explicit, bounded server projections. Raw executor payloads are not exposed.
  input?: unknown;
  output?: unknown;
  errorCode?: string;
};
export type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  activity?: Activity;
};
export type Session<Result> = {
  id: string;
  stepId: string;
  messages: Message[];
  result: Result;
  status: "idle" | "running" | "cancelled" | "error";
  error?: string;
  errorCode?: string;
  completedAt?: string;
  revision: number;
};
export interface ChatTransport<Result> {
  load(): Promise<Session<Result>>;
  subscribe(
    onSession: (session: Session<Result>) => void,
    onConnection: (connected: boolean) => void,
  ): () => void;
  send(text: string): Promise<void>;
  cancel(): Promise<void>;
  act(name: string, args: unknown): Promise<void>;
  complete(): Promise<Session<Result>>;
}

// Snapshots bootstrap/reconnect and structural changes; text streams incrementally.
export type SessionEvent<Result> =
  | { type: "snapshot"; session: Session<Result> }
  | { type: "text"; revision: number; id: string; text: string; mode: "append" | "replace" };
