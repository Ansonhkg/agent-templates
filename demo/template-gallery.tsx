import connectionPreview from "./assets/connection-preview.png";
import chatPreview from "./assets/chat-preview.png";
import { installCommand } from "./install-command";
import { CodeBlock } from "../src/chat-step/ui/JsonView";
export function TemplateGallery() {
  return <main className="template-gallery">
    <h1>A starting point for your next app.</h1>
    <p>Copy the source, connect them, and make them yours.</p>
    <div className="gallery-grid">
      <article>
        <div className="gallery-preview connection-preview"><img className="gallery-screenshot" src={connectionPreview} alt="Sign-in controls and a connection test" /></div>
        <div className="gallery-copy">
          <h2>Sign in with Codex</h2>
          <p>Browser and device sign-in, account status, reconnect, and sign-out. Test a real request without a chat interface.</p>
          <div className="gallery-actions"><a className="gallery-link" href="#connection">Open demo →</a></div>
          <CodeBlock language="bash" text={installCommand("codex-connection")} />
        </div>
      </article>
      <article>
        <div className="gallery-preview chat-preview"><img className="gallery-screenshot" src={chatPreview} alt="Chat, tool activity, and a result panel" /></div>
        <div className="gallery-copy">
          <h2>Chat + result</h2>
          <p>A focused conversation beside a live result. Discuss ideas, invoke tools, generate, revise, and accept your work.</p>
          <div className="gallery-actions"><a className="gallery-link" href="#character">Open demo →</a></div>
          <CodeBlock language="bash" text={installCommand("chat-step")} />
        </div>
      </article>
    </div>

  </main>;
}
