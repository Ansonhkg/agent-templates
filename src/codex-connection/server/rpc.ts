import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface } from "node:readline";
import { EventEmitter } from "node:events";
import type { ConnectionOptions } from "../types";
export type Obj = Record<string, unknown>;
export function obj(value: unknown): Obj {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Obj)
    : {};
}
export class CodexRpc extends EventEmitter {
  constructor(private options: Partial<ConnectionOptions> = {}) { super(); }
  onRequest?: (method: string, params: Obj) => Promise<Obj>;
  private child?: ChildProcessWithoutNullStreams;
  private ready?: Promise<void>;
  private seq = 0;
  private generation = 0;
  threadConfig: Obj = {};
  private pending = new Map<
    number,
    {
      resolve: (v: Obj) => void;
      reject: (e: Error) => void;
      timer: NodeJS.Timeout;
    }
  >();
  async start() {
    if (this.ready) return this.ready;
    const generation = this.generation;
    this.ready = this.boot(generation).catch((error) => {
      if (generation !== this.generation) throw error;
      this.ready = undefined;
      const failed = this.child;
      this.child = undefined;
      failed?.kill();
      this.fail(error);
      throw error;
    });
    return this.ready;
  }
  private async boot(generation: number) {
    const current = () => { if (generation !== this.generation) throw new Error("Codex connection closed"); };
    await this.launch([]);
    current();
    const loaded = await this.request("config/read", {});
    current();
    const servers = Object.keys(obj(obj(loaded.config).mcp_servers));
    if (servers.some((name) => !/^[-\w]+$/.test(name)))
      throw new Error(
        "A Codex MCP server name contains unsupported punctuation. Use letters, numbers, underscores or hyphens in server names.",
      );
    if (servers.length) {
      const prior = this.child;
      this.child = undefined;
      prior?.kill();
      await this.launch(
        servers.flatMap((name) => ["-c", `mcp_servers.${name}.enabled=false`]),
      );
    }
  }
  private async launch(extra: string[]) {
    const path = [
      process.env.PATH,
      "/opt/homebrew/bin",
      "/usr/local/bin",
      `${process.env.HOME}/.local/bin`,
    ]
      .filter(Boolean)
      .join(":");
    const child = (this.child = spawn(
      this.options.binary || process.env.CODEX_CONNECTION_BIN || process.env.CHAT_STEP_CODEX_BIN ||
        (process.platform === "darwin" &&
          [
            "/Applications/Codex.app/Contents/Resources/codex",
            join(homedir(), "Applications/Codex.app/Contents/Resources/codex"),
          ].find((path) => existsSync(path))) ||
        "codex",
      [
        "app-server",
        "--stdio",
        "-c",
        "features.multi_agent=false",
        "-c",
        "features.shell_tool=false",
        "-c",
        "features.apps=false",
        "-c",
        "features.plugins=false",
        "-c",
        "features.computer_use=false",
        "-c",
        "features.browser_use=false",
        "-c",
        'web_search="disabled"',
        ...extra,
      ],
      { env: { ...process.env, PATH: path, ...(this.options.codexHome ? { CODEX_HOME: this.options.codexHome } : {}) }, stdio: ["pipe", "pipe", "pipe"] },
    ));
    this.child.stderr.on("data", () => {});
    child.on("error", (error) => {
      if (this.child === child)
        this.fail(
          new Error(
            `Could not start Codex: ${error.message}. Install the Codex CLI, then reconnect.`,
          ),
        );
    });
    child.on("exit", () => {
      if (this.child !== child) return;
      this.ready = undefined;
      this.child = undefined;
      this.fail(new Error("Codex disconnected. Reconnect to continue."));
      this.emit("disconnected");
    });
    createInterface({ input: this.child.stdout }).on("line", (line) => {
      if (this.child !== child) return;
      let message: Obj;
      try {
        message = obj(JSON.parse(line));
      } catch {
        return;
      }
      if (typeof message.id === "number" && this.pending.has(message.id)) {
        const p = this.pending.get(message.id)!;
        this.pending.delete(message.id);
        clearTimeout(p.timer);
        if (message.error)
          p.reject(
            new Error(
              String(obj(message.error).message || "Codex request failed"),
            ),
          );
        else p.resolve(obj(message.result));
      } else if (message.method && message.id !== undefined) {
        const responseId = message.id;
        const reply = (value: Obj) => {
          if (this.child === child && !child.stdin.destroyed)
            child.stdin.write(JSON.stringify(value) + "\n", () => {});
        };
        const answer = this.onRequest
          ? this.onRequest(String(message.method), obj(message.params))
          : Promise.reject(new Error("This action is not available"));
        void answer.then(
          (result) => reply({ id: responseId, result }),
          (error) => reply({ id: responseId, error: { code: -32601, message: String(error.message) } }),
        );
      } else if (typeof message.method === "string")
        this.emit("event", message.method, obj(message.params));
    });
    await this.request("initialize", {
      clientInfo: {
        name: "codex_connection",
        title: "Codex connection",
        version: "0.1.0",
      },
      capabilities: { experimentalApi: true },
    });
    if (this.child !== child) throw new Error("Codex connection closed");
    child.stdin.write(JSON.stringify({ method: "initialized" }) + "\n", () => {});
  }
  private fail(error: Error) {
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(error);
    }
    this.pending.clear();
  }
  request(method: string, params: Obj = {}): Promise<Obj> {
    return new Promise((resolve, reject) => {
      if (!this.child) return reject(new Error("Codex is not running"));
      const id = ++this.seq;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(
          new Error(`Codex did not respond to ${method}. Try reconnecting.`),
        );
      }, this.options.requestTimeoutMs ?? 60000);
      this.pending.set(id, { resolve, reject, timer });
      this.child.stdin.write(
        JSON.stringify({ id, method, params }) + "\n",
        (error) => {
          if (error) {
            clearTimeout(timer);
            this.pending.delete(id);
            reject(error);
          }
        },
      );
    });
  }
  stop() {
    this.generation++;
    const child = this.child;
    this.child = undefined; this.ready = undefined;
    child?.kill();
    this.fail(new Error("Codex connection closed"));
    this.emit("disconnected");
  }
}
