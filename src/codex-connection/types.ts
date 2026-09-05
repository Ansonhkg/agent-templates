// This module has no dependency on chat-step or an app's domain types.
export type CodexRun = {
  threadId?: string;
  instructions: string;
  text: string;
  tools: { name: string; description: string; inputSchema: Record<string, unknown> }[];
  signal: AbortSignal;
  onThread(id: string): Promise<void>;
  onText(id: string, text: string, mode: "append" | "replace"): Promise<void>;
  callTool(name: string, args: unknown, call?: { id: string; signal?: AbortSignal }): Promise<unknown>;
};
export type LoginAttempt = { id: string; url: string; userCode?: string };
export type ConnectionState = {
  connected: boolean;
  status: "connecting" | "connected" | "signed-out" | "error";
  email?: string;
  plan?: string;
  imageGeneration: boolean;
  login?: LoginAttempt;
  error?: string;
};
export type ConnectionOptions = {
  workspace: string;
  binary?: string;
  codexHome?: string;
  requestTimeoutMs?: number;
  turnTimeoutMs?: number;
};
export interface ConnectionTransport {
  read(): Promise<ConnectionState>;
  subscribe(listener: (state: ConnectionState) => void): () => void;
  login(method: "browser" | "device"): Promise<ConnectionState>;
  cancelLogin(): Promise<ConnectionState>;
  reconnect(): Promise<ConnectionState>;
  logout(): Promise<ConnectionState>;
}
