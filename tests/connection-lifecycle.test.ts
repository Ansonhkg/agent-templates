import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, chmod, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CodexConnection } from "../src/codex-connection/server/connection";

// A fault-injection app-server fixture, not a live inference/authentication proof.
test("connection coalesces account reads and turn timeout aborts tool work, then reconnect recovers", async () => {
  const directory = await mkdtemp(join(tmpdir(), "codex-protocol-"));
  const binary = join(directory, "codex-fixture.mjs");
  await writeFile(binary, `#!/usr/bin/env node
import {createInterface} from 'node:readline';
let reads=0;
const send = value => process.stdout.write(JSON.stringify(value)+'\\n');
createInterface({input:process.stdin}).on('line', line=>{
  const m=JSON.parse(line); if(!m.method || m.id===undefined)return;
  let result={};
  if(m.method==='config/read') result={config:{}};
  if(m.method==='account/read') result={account:{type:'chatgpt',email:'read-'+(++reads)+'@fixture'}};
  if(m.method==='modelProvider/capabilities/read') result={imageGeneration:false};
  if(m.method==='thread/start') result={thread:{id:'thread'}};
  if(m.method==='turn/start') {
    result={turn:{id:'turn'}};
    send({id:9999,method:'item/tool/call',params:{threadId:'thread',turnId:'turn',callId:'call-1',tool:'slow',arguments:{}}});
  }
  send({id:m.id,result});
});
`);
  await chmod(binary, 0o755);
  const connection = new CodexConnection({ workspace: directory, binary, codexHome: directory, turnTimeoutMs: 250, requestTimeoutMs: 1000 });
  try {
    const first = connection.refresh();
    assert.equal(connection.refresh(), first);
    assert.equal((await first).email, "read-1@fixture");
    let aborted = false, invoked = false;
    await assert.rejects(connection.run({ instructions: "Test", text: "Start", tools: [{ name: "slow", description: "Slow action", inputSchema: { type: "object", properties: {} } }], signal: new AbortController().signal, onThread: async () => {}, onText: async () => {},
      async callTool(_, __, call) {
        invoked = true; assert.equal(call?.id, "call-1");
        await new Promise<void>(resolve => call!.signal!.addEventListener("abort", () => { aborted = true; resolve(); }, { once: true }));
        return {};
      },
    }), /took too long/);
    assert.ok(invoked); assert.ok(aborted);
    assert.equal((await connection.reconnect()).status, "connected");
    connection.close();
    assert.equal((await connection.refresh()).status, "error");
  } finally { connection.close(); await rm(directory, { recursive: true, force: true }); }
});
