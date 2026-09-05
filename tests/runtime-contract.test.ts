import { test } from "node:test";
import { createServer } from "node:http";
import { handleSession } from "../src/chat-step/server/http-handler";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { z } from "zod";
import { SessionRuntime } from "../src/chat-step/server/session-runtime";
import { SessionStore } from "../src/chat-step/server/session-store";
import type { ConversationProvider, StepDefinition } from "../src/chat-step/server/types";
import { defaultLimits, ToolCalls } from "../src/chat-step/server/execution";
import { characterStep } from "../src/features/character/step";
import { styleStep } from "../src/features/style/step";

type Result = { count: number };
async function idle<R>(runtime: SessionRuntime<R>) {
  for (let i = 0; i < 500 && runtime.snapshot().status === "running"; i++) await delay(10);
  assert.notEqual(runtime.snapshot().status, "running");
}
async function fixture(step: StepDefinition<Result>, provider: ConversationProvider, limits = {}) {
  const directory = await mkdtemp(join(tmpdir(), "chat-contract-"));
  const runtime = new SessionRuntime(step, provider, new SessionStore(directory), limits);
  await runtime.init("test");
  return { runtime, clean: () => rm(directory, { recursive: true, force: true }) };
}
const base = (): StepDefinition<Result> => ({ id: "counter", instructions: "Update only on request.", initialResult: () => ({ count: 0 }), tools: [], canComplete: r => r.count > 0 });

test("feature context is refreshed per turn; manifests omit implementation; duplicate calls execute once; streamed text and result persist", async () => {
  let context = "English", writes = 0;
  const seen: string[] = [];
  const step = base();
  step.getContext = () => ({ language: context });
  const tool = { name: "increment", label: "Increment", description: "Increment the result", schema: z.object({ by: z.number() }).strict(), serverCredential: "server-only-fixture",
    async execute(args: unknown, ctx: Parameters<StepDefinition<Result>["tools"][number]["execute"]>[1]) {
      assert.ok(ctx.callId.startsWith("test:")); writes++;
      await ctx.updateResult({ count: ctx.getResult().count + (args as { by: number }).by }); return { updated: true };
    } };
  step.tools = [tool];
  const { runtime, clean } = await fixture(step, { async run(input) {
    seen.push(input.text);
    assert.deepEqual(Object.keys(input.tools[0]).sort(), ["description", "inputSchema", "name"]);
    assert.ok(!JSON.stringify(input.tools).includes(tool.serverCredential));
    await input.onThread("provider-thread");
    await input.onText(`m${seen.length}`, "Hello", "append");
    await input.onText(`m${seen.length}`, " 世界\n", "append");
    const a = input.callTool("increment", { by: 1 }, { id: "same-call" });
    const b = input.callTool("increment", { by: 1 }, { id: "same-call" });
    assert.deepEqual(await a, await b);
    await assert.rejects(async () => input.callTool("increment", { by: 2 }, { id: "same-call" }), { code: "call_conflict" });
  } });
  try {
    await runtime.send("First"); await idle(runtime);
    assert.equal(runtime.snapshot().status, "idle");
    assert.equal(writes, 1);
    context = "繁體中文";
    await runtime.send("Next"); await idle(runtime);
    assert.equal(writes, 2); // The same ID in a different turn is a different execution.
    assert.match(seen[0], /"language":"English"/); assert.match(seen[1], /繁體中文/);
    assert.equal(runtime.snapshot().result.count, 2);
    assert.equal(runtime.snapshot().messages.find(m => m.id === "m1")?.text, "Hello 世界\n");
  } finally { await clean(); }
});

test("context, argument and result limits fail before publication; a subsequent turn recovers", async () => {
  const step = base(); let oversized = true, executed = 0;
  step.getContext = () => ({ value: oversized ? "x".repeat(defaultLimits.contextBytes) : "small" });
  step.tools = [{ name: "change", label: "Change", description: "Change", schema: z.object({ text: z.string() }).strict(), async execute(_, ctx) { executed++; await ctx.updateResult({ count: 10000 }); return {}; } }];
  const { runtime, clean } = await fixture(step, { async run(input) {
    await assert.rejects(async () => input.callTool("change", { text: "x".repeat(defaultLimits.toolArgsBytes) }, { id: "large" }), { code: "payload_limit" });
    await assert.rejects(async () => input.callTool("change", { text: 1 }, { id: "bad" }), { code: "invalid_input" });
    await assert.rejects(async () => input.callTool("change", { text: "ok" }, { id: "result" }), { code: "payload_limit" });
    await input.onText("recovered", "Recovered", "replace");
  } }, { resultBytes: 12 });
  try {
    await runtime.send("Too much context"); await idle(runtime);
    assert.equal(runtime.snapshot().errorCode, "payload_limit"); assert.equal(executed, 0);
    oversized = false; await runtime.send("Retry"); await idle(runtime);
    assert.equal(runtime.snapshot().status, "idle"); assert.equal(executed, 1);
    assert.equal(runtime.snapshot().result.count, 0);
  } finally { await clean(); }
});

test("stop releases a stuck tool and fences late result writes while a new turn succeeds", async () => {
  const step = base(); let started!: () => void, release!: () => void;
  const entered = new Promise<void>(resolve => { started = resolve; });
  const blocked = new Promise<void>(resolve => { release = resolve; });
  let late!: Promise<unknown>;
  step.tools = [{ name: "slow", label: "Slow", description: "Slow action", schema: z.object({}).strict(), async execute(_, ctx) { started(); await blocked; await ctx.updateResult({ count: 99 }); return {}; } }];
  let turns = 0;
  const { runtime, clean } = await fixture(step, { async run(input) {
    if (++turns === 1) { late = input.callTool("slow", {}, { id: "slow" }); await late; }
    else await input.onText("ready", "Ready", "replace");
  } });
  try {
    await runtime.send("Begin"); await entered; runtime.cancel(); await idle(runtime);
    assert.equal(runtime.snapshot().status, "cancelled");
    await runtime.send("Continue"); await idle(runtime);
    release(); await late.catch(() => {}); await delay(30);
    assert.equal(runtime.snapshot().status, "idle"); assert.equal(runtime.snapshot().result.count, 0);
    assert.equal(runtime.snapshot().messages.find(m => m.id === "ready")?.text, "Ready");
  } finally { release(); await clean(); }
});

test("bounded tool-call ledger serializes distinct writes and replays failures without execution", async () => {
  const calls = new ToolCalls(3); let count = 0;
  const failure = () => { count++; return Promise.reject(new Error("domain failure")); };
  await assert.rejects(calls.invoke("a", "write", '{}', failure), /domain failure/);
  await assert.rejects(calls.invoke("a", "write", '{}', failure), /domain failure/);
  await Promise.all(["b", "c"].map(id => calls.invoke(id, "write", '{}', async () => { const before = count; await delay(5); count = before + 1; })));
  assert.throws(() => calls.invoke("d", "write", '{}', async () => {}), { code: "call_limit" });
  assert.equal(count, 3);
});

test("character and style examples accept feature context and run their actual brief tools", async () => {
  const images = { async generate(): Promise<{ id: string; url: string }> { throw new Error("Image generation is outside this contract test"); } };
  for (const make of [characterStep, styleStep]) {
    const step = make(images, () => ({ language: "日本語", destination: "Article" }));
    const directory = await mkdtemp(join(tmpdir(), "visual-context-"));
    const runtime = new SessionRuntime(step, { async run(input) {
      assert.match(input.text, /日本語/);
      await input.callTool("update_brief", { name: "静か", brief: "A calm visual direction" }, { id: "brief" });
    } }, new SessionStore(directory));
    try { await runtime.init("example"); await runtime.send("Update my brief"); await idle(runtime); assert.equal(runtime.snapshot().result.name, "静か"); assert.equal(runtime.snapshot().result.versions.length, 0); }
    finally { await rm(directory, { recursive: true, force: true }); }
  }
});


test("HTTP errors have stable codes and body limits; concurrent completion executes once", async () => {
  let completed = 0;
  const step = { ...base(), initialResult: () => ({ count: 1 }), async complete() { completed++; await delay(20); } };
  const { runtime, clean } = await fixture(step, { async run() {} });
  const server = createServer((req, res) => { void handleSession(req.url || "", req, res, runtime); });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  try {
    const invalid = await fetch(url + "/messages", { method: "POST", body: JSON.stringify({ text: 42 }) });
    assert.equal(invalid.status, 400); assert.equal((await invalid.json()).code, "invalid_input");
    const large = await fetch(url + "/messages", { method: "POST", body: JSON.stringify({ text: "x".repeat(64000) }) });
    assert.equal(large.status, 413); assert.equal((await large.json()).code, "payload_limit");
    await Promise.all([runtime.complete(), runtime.complete()]);
    assert.equal(completed, 1); assert.ok(runtime.snapshot().completedAt);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); await clean(); }
});

test("only explicit tool display projections reach snapshots; missing projections remain private", async () => {
  const step = base();
  step.tools = [
    { name: "visible", label: "Visible", description: "Project display fields", schema: z.object({ label: z.string(), internal: z.string() }),
      display: { input: value => ({ label: (value as { label: string }).label }), output: value => ({ saved: (value as { saved: boolean }).saved }) },
      async execute() { return { saved: true, internal: "server-result" }; } },
    { name: "private", label: "Private", description: "No display payload", schema: z.object({ internal: z.string() }), async execute() { return { internal: "hidden-result" }; } },
  ];
  const { runtime, clean } = await fixture(step, { async run(input) {
    await input.callTool("visible", { label: "Example", internal: "server-input" }, { id: "visible" });
    await input.callTool("private", { internal: "hidden-input" }, { id: "private" });
  } });
  try {
    await runtime.send("Perform actions"); await idle(runtime);
    const snapshot = runtime.snapshot();
    const visible = snapshot.messages.find(m => m.activity?.name === "visible")!.activity!;
    assert.deepEqual(visible.input, { label: "Example" }); assert.deepEqual(visible.output, { saved: true });
    assert.equal(snapshot.messages.find(m => m.activity?.name === "private")!.activity!.input, undefined);
    assert.doesNotMatch(JSON.stringify(snapshot), /server-input|server-result|hidden-input|hidden-result/);
  } finally { await clean(); }
});
