import { mkdir, readFile, realpath } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { homedir } from "node:os";
import type { CodexRun, ConnectionOptions, ConnectionState } from "../types";
import { CodexRpc, obj, type Obj } from "./rpc";
type Run = CodexRun;
// The only provider-specific protocol lives here; UI and tools never import it.
export class CodexConnection {
  private rpc: CodexRpc;
  private directory: string;
  private activeRuns = 0;
  private refreshing?: Promise<ConnectionState>;
  private epoch = 0;
  private closed = false;
  private authBusy = false;
  private state: ConnectionState = { connected: false, status: "connecting", imageGeneration: false };
  private listeners = new Set<(state: ConnectionState) => void>();
  private handlers = new Map<string, { execute: Run["callTool"]; signal: AbortSignal; names: Set<string>; turn: Promise<string> }>();
  constructor(private options: ConnectionOptions) {
    this.directory = resolve(options.workspace);
    this.rpc = new CodexRpc(options);
    this.rpc.on("disconnected", () => this.publish({ ...this.state, connected: false, status: "error", login: undefined, error: "Codex disconnected. Reconnect to continue." }));
    this.rpc.on("event", (method: string, params: Obj) => {
      if (method === "account/updated") this.accountChanged();
      if (method === "account/login/completed" && params.loginId === this.state.login?.id) {
        this.state.login = undefined;
        if (params.success === false) this.publish({ ...this.state, error: String(params.error || "Sign-in did not complete") });
        else this.accountChanged();
      }
    });
    this.rpc.onRequest = async (method, params) => {
      if (method !== "item/tool/call")
        throw new Error("Only this step's registered tools are available");
      const handler = this.handlers.get(String(params.threadId));
      if (!handler)
        throw new Error("No active tool handler for this conversation");
      try {
        const expectedTurn = await handler.turn;
        handler.signal.throwIfAborted();
        if (params.turnId !== expectedTurn || !handler.names.has(String(params.tool))) throw Object.assign(new Error("This tool is not available in the active turn"), { code: "unavailable" });
        if (typeof params.callId !== "string" || !params.callId || params.callId.length > 256) throw Object.assign(new Error("Invalid tool call ID"), { code: "invalid_input" });
        if (Buffer.byteLength(JSON.stringify(params.arguments ?? null)) > 32 * 1024) throw Object.assign(new Error("Tool arguments exceed 32768 bytes"), { code: "payload_limit" });
        const result = await handler.execute(String(params.tool), params.arguments, { id: params.callId, signal: handler.signal });
        handler.signal.throwIfAborted();
        const text = JSON.stringify(result ?? null);
        if (Buffer.byteLength(text) > 64 * 1024) throw Object.assign(new Error("Tool output exceeds 65536 bytes"), { code: "payload_limit" });
        return {
          success: true,
          contentItems: [
            { type: "inputText", text },
          ],
        };
      } catch (error) {
        return {
          success: false,
          contentItems: [
            {
              type: "inputText",
              text: JSON.stringify({ error: handler.signal.aborted ? "Stopped" : (error as Error).message, code: handler.signal.aborted ? "cancelled" : typeof obj(error).code === "string" ? obj(error).code : "execution_failed" }),
            },
          ],
        };
      }
    };
  }
  snapshot() { return structuredClone(this.state); }
  subscribe(listener: (state: ConnectionState) => void) {
    this.listeners.add(listener); listener(this.snapshot());
    return () => { this.listeners.delete(listener); };
  }
  private publish(next: ConnectionState) {
    this.state = next;
    for (const listener of this.listeners) listener(this.snapshot());
    return this.snapshot();
  }
  private accountChanged() {
    // An account notification can arrive while an older read is still in flight.
    void (this.refreshing || Promise.resolve()).then(() => { if (!this.closed) return this.refresh(); });
  }
  refresh(): Promise<ConnectionState> {
    if (this.closed) return Promise.resolve(this.snapshot());
    if (this.refreshing) return this.refreshing;
    const pending = this.readAccount(this.epoch);
    this.refreshing = pending;
    void pending.finally(() => { if (this.refreshing === pending) this.refreshing = undefined; });
    return pending;
  }
  private async readAccount(epoch: number) {
    try {
      await this.rpc.start();
      const response = await this.rpc.request("account/read", { refreshToken: true });
      const account = obj(response.account);
      const capability = await this.rpc.request("modelProvider/capabilities/read").catch(() => ({} as Obj));
      if (this.closed || epoch !== this.epoch) return this.snapshot();
      const connected = account.type === "chatgpt";
      return this.publish({ connected, status: connected ? "connected" : "signed-out",
        email: typeof account.email === "string" ? account.email : undefined,
        plan: typeof account.planType === "string" ? account.planType : undefined,
        imageGeneration: capability.imageGeneration === true,
        login: this.state.login,
        error: account.type === "apiKey" ? "Use ChatGPT sign-in for your Codex subscription." : undefined,
      });
    } catch (error) {
      if (this.closed || epoch !== this.epoch) return this.snapshot();
      return this.publish({ ...this.state, connected: false, status: "error", error: (error as Error).message });
    }
  }
  private async authAction(action: () => Promise<void>) {
    if (this.closed) throw new Error("This connection has been closed");
    if (this.activeRuns || this.authBusy) throw new Error("Finish or stop current work before changing the connection.");
    this.authBusy = true;
    try { await action(); return this.snapshot(); }
    finally { this.authBusy = false; }
  }
  async login(method: "browser" | "device") {
    return this.authAction(async () => {
      await this.rpc.start();
      if (this.state.login) return;
      const response = await this.rpc.request("account/login/start", { type: method === "device" ? "chatgptDeviceCode" : "chatgpt" });
      const url = String(response.authUrl || response.verificationUrl || "");
      if (!/^https:\/\/(auth\.openai\.com|auth\.chatgpt\.com|chatgpt\.com)(\/|$)/.test(url) || typeof response.loginId !== "string") throw new Error("Codex returned an unsupported sign-in response.");
      this.publish({ ...this.state, error: undefined, login: { id: response.loginId, url, userCode: typeof response.userCode === "string" ? response.userCode : undefined } });
    });
  }
  async cancelLogin() {
    return this.authAction(async () => {
      const login = this.state.login;
      if (!login) return;
      this.publish({ ...this.state, login: undefined, error: undefined });
      await this.rpc.request("account/login/cancel", { loginId: login.id });
      await this.refresh();
    });
  }
  async logout() {
    return this.authAction(async () => {
      await this.rpc.start();
      if (this.state.login) await this.rpc.request("account/login/cancel", { loginId: this.state.login.id });
      this.state.login = undefined;
      await this.rpc.request("account/logout");
      await this.refresh();
    });
  }
  async reconnect() {
    return this.authAction(async () => {
      // Let an in-flight initialization settle before replacing its process.
      await this.refreshing;
      await this.rpc.start().catch(() => {});
      this.epoch++;
      this.rpc.stop();
      await this.refresh();
    });
  }
  async run(input: Run & { onImage?: (image: Buffer) => Promise<void>; references?: string[] }) {
    if (this.closed) throw new Error("This connection has been closed");
    if (this.authBusy) throw new Error("Wait for the connection change to finish.");
    const lifetime = new AbortController();
    const signal = AbortSignal.any([input.signal, lifetime.signal]);
    const timer = setTimeout(() => lifetime.abort(Object.assign(new Error("This turn took too long. Please retry."), { code: "timeout" })), this.options.turnTimeoutMs ?? 10 * 60_000);
    this.activeRuns++;
    try { await this.runTurn({ ...input, signal }); }
    finally { clearTimeout(timer); lifetime.abort(); this.activeRuns--; }
  }
  private async runTurn(
    input: Run & {
      onImage?: (image: Buffer) => Promise<void>;
      references?: string[];
    },
  ) {
    input.signal.throwIfAborted();
    await mkdir(this.directory, { recursive: true });
    if (!(await this.refresh()).connected)
      throw new Error("Sign in to your local Codex app, then try again.");
    const params = {
      cwd: this.directory,
      approvalPolicy: "never",
      sandbox: "workspace-write",
      baseInstructions:
        "You are a focused conversational assistant inside an app step. You are not a coding agent. Never execute shell commands, edit files, browse, or use unrelated tools. Follow the step instructions.",
      developerInstructions: input.instructions,
      dynamicTools: input.tools.map(({ name, description, inputSchema }) => ({ type: "function", name, description, inputSchema })),
    };
    let threadId = input.threadId;
    if (threadId)
      await this.rpc.request("thread/resume", { ...params, threadId });
    else
      threadId = String(
        obj((await this.rpc.request("thread/start", params)).thread).id,
      );
    await input.onThread(threadId);
    input.signal.throwIfAborted();
    if (this.handlers.has(threadId)) throw new Error("This conversation already has an active turn");
    let resolveTurn!: (id: string) => void;
    const turnReady = new Promise<string>(resolve => { resolveTurn = resolve; });
    this.handlers.set(threadId, { execute: input.callTool, signal: input.signal, names: new Set(input.tools.map(tool => tool.name)), turn: turnReady });
    let turnId: string | undefined;
    let chain = Promise.resolve();
    let settled = false;
    let finish!: (error?: Error) => void;
    const done = new Promise<void>((resolveDone, reject) => {
      finish = (error) => {
        if (settled) return;
        settled = true;
        error ? reject(error) : resolveDone();
      };
    });
    // A handler is installed before turn/start because events can arrive before its response.
    const event = (method: string, p: Obj) => {
      if (p.threadId !== threadId) return;
      chain = chain
        .then(async () => {
          if (input.signal.aborted) return;
          const item = obj(p.item);
          if (method === "item/agentMessage/delta")
            await input.onText(
              String(p.itemId),
              String(p.delta || ""),
              "append",
            );
          if (method === "item/completed" && item.type === "agentMessage")
            await input.onText(
              String(item.id),
              String(item.text || ""),
              "replace",
            );
          if (
            method === "item/completed" &&
            item.type === "imageGeneration" &&
            item.status === "completed" &&
            input.onImage
          ) {
            let bytes: Buffer;
            if (typeof item.savedPath === "string") {
              const root = await realpath(this.directory);
              const file = await realpath(resolve(item.savedPath));
              const generatedRoot = await realpath(
                resolve(
                  this.options.codexHome || process.env.CODEX_HOME || resolve(homedir(), ".codex"),
                  "generated_images",
                ),
              ).catch(() => "");
              if (
                !file.startsWith(root + sep) &&
                !(generatedRoot && file.startsWith(generatedRoot + sep))
              )
                throw new Error(
                  "Generated image was outside the allowed output directories",
                );
              bytes = await readFile(file);
            } else if (typeof item.result === "string")
              bytes = Buffer.from(
                item.result.replace(/^data:image\/\w+;base64,/, ""),
                "base64",
              );
            else throw new Error("Codex returned no image file");
            await input.onImage(bytes);
          }
          if (method === "turn/completed") {
            const turn = obj(p.turn);
            finish(
              turn.status === "failed"
                ? new Error(
                    String(
                      obj(turn.error).message ||
                        "Codex could not complete this turn",
                    ),
                  )
                : undefined,
            );
          }
        })
        .catch((error) => finish(error));
    };
    const abort = () => {
      if (turnId)
        void this.rpc
          .request("turn/interrupt", { threadId, turnId })
          .catch(() => {});
      finish(input.signal.reason instanceof Error ? input.signal.reason : new Error("Stopped"));
    };
    const disconnected = () =>
      finish(new Error("Codex disconnected. Try sending again."));
    this.rpc.on("event", event);
    this.rpc.on("disconnected", disconnected);
    input.signal.addEventListener("abort", abort, { once: true });
    try {
      // Prevent a rejection before turn/start resolves becoming an unhandled rejection.
      void done.catch(() => {});
      const started = await this.rpc.request("turn/start", {
        threadId,
        effort: "low",
        input: [
          { type: "text", text: input.text, text_elements: [] },
          ...(input.references || []).map((path) => ({
            type: "localImage",
            path,
          })),
        ],
      });
      turnId = String(obj(started.turn).id);
      resolveTurn(turnId);
      if (input.signal.aborted) abort();
      await done;
    } finally {
      resolveTurn("");
      this.handlers.delete(threadId);
      this.rpc.off("event", event);
      this.rpc.off("disconnected", disconnected);
      input.signal.removeEventListener("abort", abort);
    }
  }
  async generateImage(
    prompt: string,
    signal: AbortSignal,
    references: string[] = [],
  ) {
    let result: Buffer | undefined;
    await this.run({
      instructions:
        "Create ONE image using built-in image generation. Do not use code, SVG, files, shell or external APIs. Use any attached image as the identity/style reference. Generate only the requested revision. No text response is necessary.",
      text: prompt,
      tools: [],
      signal,
      references,
      onThread: async () => {},
      onText: async () => {},
      callTool: async () => {
        throw new Error("No custom tools are available to the image worker");
      },
      onImage: async (bytes) => {
        result = bytes;
      },
    });
    if (!result)
      throw new Error("Codex completed without an image. Please try again.");
    return result;
  }
  close() {
    this.closed = true; this.epoch++;
    this.rpc.stop();
    this.listeners.clear();
  }
}
