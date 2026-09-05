import { test } from "node:test";
import assert from "node:assert/strict";
import { applySessionEvent } from "../src/chat-step/client/session-events";
import type { Session, SessionEvent } from "../src/chat-step/types";
const initial = (): Session<null> => ({ id: "s", stepId: "step", result: null, messages: [], revision: 0, status: "running" });
test("text reduction preserves whitespace, Unicode and authoritative final text", () => {
  let state: Session<null> | undefined = initial();
  const chunks = ["Hello", " ", "世界", "\n", "  ", "مرحبا", "🙂"];
  for (const [i, text] of chunks.entries()) state = applySessionEvent(state, { type: "text", revision: i + 1, id: "m", text, mode: "append" });
  assert.equal(state!.messages[0].text, chunks.join(""));
  state = applySessionEvent(state, { type: "text", revision: 8, id: "m", text: chunks.join(""), mode: "replace" });
  assert.equal(state!.messages[0].text, chunks.join(""));
});
test("duplicates do not append twice, gaps request snapshots, stale snapshots cannot regress state", () => {
  const event: SessionEvent<null> = { type: "text", revision: 1, id: "m", text: "A", mode: "append" };
  const state = applySessionEvent(initial(), event)!;
  assert.equal(applySessionEvent(state, event)!.messages[0].text, "A");
  assert.equal(applySessionEvent(state, { ...event, revision: 3 }), undefined);
  const restored = applySessionEvent(state, { type: "snapshot", session: { ...state, revision: 3, messages: [{ id: "m", role: "assistant", text: "ABC" }] } })!;
  assert.equal(applySessionEvent(restored, { type: "snapshot", session: initial() })!.messages[0].text, "ABC");
  assert.equal(applySessionEvent(restored, { ...event, revision: 4, text: "D" })!.messages[0].text, "ABCD");
});
