import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { SessionStore } from "../src/chat-step/server/session-store";
import { ToolRegistry } from "../src/chat-step/server/tool-registry";
import { visualTools } from "../src/features/visual/tools";
test("source copy is self-contained and a repeat cannot overwrite edits", async () => {
  const root = await mkdtemp(join(tmpdir(), "chat-step-copy-"));
  try {
    execFileSync(process.execPath, [
      resolve("scripts/copy.mjs"),
      root,
      "--example",
    ]);
    const file = join(root, "src/chat-step/types.ts");
    await writeFile(file, "user-owned edit");
    assert.throws(() =>
      execFileSync(
        process.execPath,
        [resolve("scripts/copy.mjs"), root, "--example"],
        { stdio: "pipe" },
      ),
    );
    assert.equal(await readFile(file, "utf8"), "user-owned edit");
    assert.match(
      await readFile(
        join(root, "src/features/visual/VisualResult.tsx"),
        "utf8",
      ),
      /visual-result.css/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("real session store serializes writes and restricts IDs", async () => {
  const root = await mkdtemp(join(tmpdir(), "chat-step-store-"));
  try {
    const store = new SessionStore<{ value: number }>(root);
    const s = {
      id: "test",
      stepId: "test",
      messages: [],
      result: { value: 1 },
      status: "idle" as const,
      revision: 1,
    };
    const first = store.write(s);
    s.result.value = 2;
    s.revision = 2;
    const second = store.write(s);
    await Promise.all([first, second]);
    assert.equal((await store.read("test"))?.result.value, 2);
    await assert.rejects(store.read("../../escape"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("registered schemas and UI allowlist reject invalid tool requests before execution", () => {
  // Inspect real definitions only. No inference calls or simulated tool outputs.
  const tools = visualTools("character", {
    generate: () => {
      throw new Error("Not invoked by this schema-only test");
    },
  });
  const registry = new ToolRegistry(tools);
  assert.throws(() => registry.resolve("unknown", "model"));
  assert.throws(() => registry.resolve("generate_character", "ui"));
  assert.throws(() =>
    registry
      .resolve("select_version", "ui")
      .schema.parse({ id: "../../outside" }),
  );
  assert.throws(() =>
    registry
      .resolve("update_brief", "model")
      .schema.parse({ name: "Momo", brief: "", extra: true }),
  );
  assert.equal(registry.definitions().length, 3);
});

test("each module copies independently and has no imports of the other module", async () => {
  const root = await mkdtemp(join(tmpdir(), "codex-module-copy-"));
  try {
    execFileSync(process.execPath, [resolve("scripts/copy.mjs"), root, "--module", "codex-connection"]);
    const connection = await readFile(join(root, "src/codex-connection/server/connection.ts"), "utf8");
    assert.doesNotMatch(connection, /from ["'].*chat-step/);
    await assert.rejects(readFile(join(root, "src/chat-step/types.ts")));
    execFileSync(process.execPath, [resolve("scripts/copy.mjs"), root, "--module", "chat-step"]);
    assert.match(await readFile(join(root, "src/chat-step/types.ts"), "utf8"), /ChatTransport/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
