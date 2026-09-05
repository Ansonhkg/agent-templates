import { useEffect, useRef, useState } from "react";
import { installCommand } from "./install-command";
import { CodeBlock } from "../src/chat-step/ui/JsonView";
import { CodexAccount } from "../src/codex-connection/ui/CodexAccount";
import type { ConnectionTransport } from "../src/codex-connection/types";
import { useCodexConnection } from "../src/codex-connection/client/use-codex-connection";
// Account behavior uses only the connection module; CodeBlock is shared presentation.
export function ConnectionExample({ transport, token }: { transport: ConnectionTransport; token: string }) {
  const { state, error } = useCodexConnection(transport);
  const [testing, setTesting] = useState(false);
  const [reply, setReply] = useState("");
  const [testError, setTestError] = useState("");
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  async function test() {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setTesting(true); setReply(""); setTestError("");
    try {
      const response = await fetch("/api/codex/test", { method: "POST", headers: { "X-Codex-Connection-Token": token }, signal: controller.signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Connection test failed.");
      if (!controller.signal.aborted) setReply(result.text);
    } catch (error) {
      if (!controller.signal.aborted) setTestError((error as Error).message);
    } finally {
      if (active.current === controller) { active.current = null; setTesting(false); }
    }
  }
  return <main className="source-guide">
    <h1>Sign in with Codex</h1>
    <p>Connect your ChatGPT account through local Codex. This standalone template handles sign-in, connection status, and account management.</p>
    <div className="source-columns">
      <section><h2>Your account</h2>
        <CodexAccount transport={transport} />
        <p role="status">{state.connected ? "Connected to your ChatGPT account" : `Connection: ${state.status}`}</p>
        <p>Image generation: {state.imageGeneration ? "available" : "unavailable"}</p>
        {error && <p role="alert">{error}</p>}
        <p>Login state comes from the local Codex process. Credentials stay with Codex.</p>
        <h3>Try the connection</h3>
        <p>Send one small text request and see the response. Uses your Codex account.</p>
        <button disabled={!state.connected || testing} onClick={() => void test()}>{testing ? "Testing…" : "Test connection"}</button>
        {testing && <button onClick={() => { active.current?.abort(); active.current = null; setTesting(false); }}>Cancel test</button>}
        <div className="connection-test-result" role="status" aria-label="Connection test result">{testing ? "Waiting for Codex…" : reply}</div>
        {testError && <p role="alert">{testError} You can retry the test.</p>}
      </section>
      <section><h2>Add it with your agent</h2>
        <p>Give this command to your coding agent. It reads this template’s setup instructions from this site; the agent then installs, connects, and tests the module. Source access still requires permission to the private GitHub repository.</p>
        <CodeBlock language="bash" text={installCommand("codex-connection")} />
        <p>Use the account component, build your own UI with its hook, or call the server connection directly.</p>
        <CodeBlock language="typescript" text={`const connection = new CodexConnection({ workspace });
const state = await connection.refresh();

// Use the connection directly; no chat component required.
await connection.run({
  text: "Reply with a short greeting.",
  instructions: "Respond with plain text only.",
  tools: [],
  signal: AbortSignal.timeout(45_000),
  onThread: async () => {},
  onText: async (id, text, mode) => {
    // Append deltas; replace the item when mode is "replace".
    console.log({ id, text, mode });
  },
  callTool: async () => { throw new Error("No tools configured"); },
});`} />
      </section>
    </div>
  </main>;
}
