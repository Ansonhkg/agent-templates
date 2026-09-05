import { useState } from "react";
import { CodeBlock } from "../src/chat-step/ui/JsonView";
import { installCommand } from "./install-command";
import { MockConnection } from "./mock-connection";
import { MockChat } from "./mock-chat";

// Hosted demos use browser memory only. No auth, inference, or API requests.
export function HostedPreview({ connection, kind }: { connection: boolean; kind: "character" | "style" }) {
  const [setup, setSetup] = useState(false);
  return <main>
    <div className="hosted-notice"><span><strong>Interactive mock demo.</strong> Scripted responses, no account needed. Refresh resets the demo.</span><button onClick={() => setSetup(!setup)}>{setup ? "Hide setup" : "Run locally"}</button></div>
    {setup && <section className="hosted-setup"><h2>Run this demo on your Mac</h2><p>Use your own Codex account for real sign-in and generation. Give this command to your coding agent. Repository access is currently required.</p><CodeBlock language="bash" text={installCommand("example")}/></section>}
    {connection ? <MockConnection/> : <><div className="demo-variants" aria-label="Chat examples"><button aria-pressed={kind === "character"} onClick={() => { location.hash = "character"; }}>Character example</button><button aria-pressed={kind === "style"} onClick={() => { location.hash = "style"; }}>Style example</button></div><MockChat key={kind} kind={kind}/></>}
  </main>;
}
