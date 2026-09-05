import { CodexAccount } from "../src/codex-connection/ui/CodexAccount";
import type { ConnectionTransport } from "../src/codex-connection/types";
import { useCodexConnection } from "../src/codex-connection/client/use-codex-connection";
// This page deliberately uses only the connection module, with no chat imports.
export function ConnectionExample({ transport }: { transport: ConnectionTransport }) {
  const { state, error } = useCodexConnection(transport);
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
        <a className="gallery-link" href="#character">Continue to the chat demo →</a>
      </section>
      <section><h2>Copy it on its own</h2>
        <pre>{`node scripts/copy.mjs /path/to/my-app --module codex-connection`}</pre>
        <p>Use the account component, build your own UI with its hook, or call the server connection directly.</p>
        <pre>{`const connection = new CodexConnection({ workspace });
const state = await connection.refresh();

// When adding a chat step:
const provider = codexChatProvider(connection);`}</pre>
      </section>
    </div>
  </main>;
}
