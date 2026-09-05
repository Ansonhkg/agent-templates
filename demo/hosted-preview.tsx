import { useState } from "react";
import { Conversation } from "../src/chat-step/ui/Conversation";
import { Composer } from "../src/chat-step/ui/Composer";
import { CodeBlock } from "../src/chat-step/ui/JsonView";
import { installCommand } from "./install-command";

// Public showcase only. Never connects visitors to the maintainer's local account.
export function HostedPreview({ connection, kind }: { connection: boolean; kind: "character" | "style" }) {
  const [setup, setSetup] = useState(false);
  return <main>
    <div className="hosted-notice">
      <span><strong>Interface preview.</strong> Live sign-in and generation run on your Mac with your own Codex account.</span>
      <button onClick={() => setSetup(!setup)}>{setup ? "Hide setup" : "Run locally"}</button>
    </div>
    {setup && <section className="hosted-setup">
      <h2>Run this demo on your Mac</h2>
      <p>Give this command to your coding agent. Repository access is currently required.</p>
      <CodeBlock language="bash" text={installCommand("example")} />
    </section>}
    {connection ? <div className="source-guide">
      <h1>Sign in with Codex</h1>
      <p>Connect your ChatGPT account through local Codex. Keep authentication, account status, and requests together.</p>
      <div className="connection-demo-content"><section>
        <h2>Your account</h2>
        <p>Not connected · Preview</p>
        <button onClick={() => setSetup(true)}>Sign in with Codex →</button>
        <p>Run the demo locally to sign in. Credentials stay with your local Codex process.</p>
        <h3>Try the connection</h3>
        <p>After connecting locally, send one small request and see the response here.</p>
        <button disabled>Test connection</button>
      </section></div>
    </div> : <>
      <div className="demo-variants" aria-label="Chat examples">
        <button aria-pressed={kind === "character"} onClick={() => { location.hash = "character"; }}>Character example</button>
        <button aria-pressed={kind === "style"} onClick={() => { location.hash = "style"; }}>Style example</button>
      </div>
      <section className="cs-step">
        <header className="cs-step-heading"><div><h1>Create your {kind}</h1><p>A conversation on the left. Your result on the right.</p></div><span className="cs-connection">Preview</span></header>
        <div className="cs-workspace">
          <section className="cs-chat" aria-label="Chat">
            <h2>Work it out together</h2>
            <Conversation busy={false} empty={null} messages={[
              {id: "preview-user", role: "user", text: kind === "character" ? "What personality would suit a little pink blob?" : "What would make this style feel calmer?"},
              {id: "preview-reply", role: "assistant", text: kind === "character" ? "Try **quiet curiosity**: dot eyes, a straight mouth, and a small wave. We can discuss the personality before drawing anything." : "Try **muted colors**, generous white space, and thin pencil lines. We can refine the direction before generating a sample."},
              {id: "preview-tool", role: "assistant", text: "", activity: {id: "example-tool", name: "update_brief", label: "Update design brief · example", status: "completed", input: {name: kind === "character" ? "Momo" : "Quiet pencil"}, output: {updated: true}}},
            ]} />
            <Composer busy={false} disabled placeholder="Run locally to discuss and generate…" send={async () => {}} cancel={async () => {}} />
          </section>
          <section className="cs-result" aria-label="Result"><h2>Your {kind === "character" ? "character" : "style sample"}</h2>
            <div className="cs-result-content"><div className="demo-welcome"><span className="preview-character" aria-hidden="true">◒</span><h3>Your creation appears here</h3><p>Generate, compare versions, and refine the result alongside your conversation.</p></div></div>
            <footer className="cs-result-footer"><span>You choose when this step is done.</span><button className="cs-primary" disabled>Use this {kind} →</button></footer>
          </section>
        </div>
      </section>
    </>}
  </main>;
}
