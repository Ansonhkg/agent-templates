// Opt-in: requires the running demo and a signed-in Codex account. Uses real inference.
// Updates only each demo example's brief and keeps existing images.
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
const base = process.env.CHAT_STEP_DEMO_URL || "http://127.0.0.1:4328";
const { token } = await (await fetch(base + "/api/bootstrap")).json();
const account = await (await fetch(base + "/api/codex")).json();
assert.equal(account.connected, true, "Sign in through the demo before this live check");
const results = [];
for (const kind of ["character", "style"] as const) {
  const path = `${base}/api/steps/${kind}`;
  const state = async () => (await fetch(path)).json();
  const before = await state();
  assert.notEqual(before.status, "running", "Finish existing demo work before testing");
  const post = async (suffix: string, body: unknown) => {
    const response = await fetch(path + suffix, { method: "POST", headers: { "Content-Type": "application/json", "X-Chat-Step-Token": token }, body: JSON.stringify(body) });
    assert.equal(response.status, 202); return response.json();
  };
  async function send(text: string) {
    await post("/messages", { text });
    for (let n = 0; n < 180; n++) {
      const next = await state();
      if (next.status !== "running") { assert.equal(next.status, "idle", next.error); return next; }
      await delay(500);
    }
    await post("/cancel", {}); throw new Error("Live turn timed out");
  }
  const discussed = await send('Read the current Feature context. Reply with its exact purpose and language values, using JSON keys purpose and language. Do not call any tools or generate images.');
  const text = discussed.messages.findLast((m: { role: string; text: string }) => m.role === "assistant" && m.text)?.text || "";
  assert.ok(text.includes("English"));
  assert.ok(text.includes(kind === "character" ? "Article illustration mascot" : "Compare rendering styles"));
  const ids = new Set(discussed.messages.map((m: { id: string }) => m.id));
  const name = kind === "character" ? "Momo" : "Quiet ink";
  const brief = kind === "character" ? "A curious dusty-pink blob with dot eyes and a straight mouth." : "Quiet ink lines, generous white space, and a restrained warm accent.";
  const changed = await send(`Call update_brief once with ${JSON.stringify({ name, brief })}. Keep all existing images. Do not generate images or call other tools.`);
  assert.equal(changed.result.name, name); assert.equal(changed.result.brief, brief);
  assert.equal(changed.result.versions.length, before.result.versions.length);
  assert.ok(changed.messages.some((m: { id: string; activity?: { name: string; status: string } }) => !ids.has(m.id) && m.activity?.name === "update_brief" && m.activity.status === "completed"));
  results.push({ feature: kind, context: true, realTool: true, resultUpdated: true, imagesPreserved: true });
}
console.log(JSON.stringify(results, null, 2));
