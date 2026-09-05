import { TemplateVisuals } from "./template-visuals";
import { installCommand } from "./install-command";
import { CodeBlock } from "../src/chat-step/ui/JsonView";
export function ConnectionSource() {
  return <main className="source-guide connection-source">
    <h1>Sign in with Codex — source</h1>
    <TemplateVisuals kind="connection" />
    <div className="source-columns">
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
      <section><h2>What you can change</h2>
        <p>Copy the connection module into your app and edit the source freely.</p>
        <CodeBlock language="text" text={`src/codex-connection/
  server/connection.ts       account and inference lifecycle
  server/http-handler.ts    HTTP and account events
  client/http-transport.ts  browser transport
  client/use-codex-connection.ts
  ui/CodexAccount.tsx        account control and sign-in dialog
  ui/codex-connection.css   appearance
  types.ts                  connection contracts`} />
        <p>Use the account UI as supplied, replace it with your own, or call the connection directly from your server. Read the module’s README for setup and lifecycle details.</p>
      </section>
    </div>
  </main>;
}
