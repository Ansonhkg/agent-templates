import { installCommand } from "./install-command";
import { CodeBlock } from "../src/chat-step/ui/JsonView";
export function TemplateGallery() {
  return <main className="template-gallery">
    <h1>A starting point for your next app.</h1>
    <p>Two templates. Copy the source, connect them, and make them yours.</p>
    <p className="gallery-platform">macOS · Local Codex · React + Node.js</p>
    <div className="gallery-grid">
      <article>
        <a className="gallery-preview connection-preview" href="#connection" aria-label="Preview Sign in with Codex">
          <div className="preview-account" aria-hidden="true">
            <span className="preview-mark">◒</span>
            <strong>Connect your account</strong>
            <span>Bring your Codex connection to any app.</span>
            <span className="preview-cta">Sign in with Codex →</span>
          </div>
        </a>
        <div className="gallery-copy">
          <h2>Sign in with Codex</h2>
          <p>Browser and device sign-in, account status, reconnect, and sign-out. Test a real request without a chat interface.</p>
          <div className="gallery-actions"><a className="gallery-link" href="#connection">Open demo →</a><a href="#source">View source & copy</a></div>
          <CodeBlock language="bash" text={installCommand("codex-connection")} />
        </div>
      </article>
      <article>
        <a className="gallery-preview chat-preview" href="#character" aria-label="Preview Chat and result">
          <div className="preview-chat" aria-hidden="true">
            <div><strong>Create your character</strong><span className="preview-bubble">A curious little character?</span><span>Let’s explore its personality.</span><span className="preview-composer">Ask, create, refine… ↑</span></div>
            <div className="preview-result"><span>Your result</span><span className="preview-character">◒</span><span>Version 1</span></div>
          </div>
        </a>
        <div className="gallery-copy">
          <h2>Chat + result</h2>
          <p>A focused conversation beside a live result. Discuss ideas, invoke tools, generate, revise, and accept your work.</p>
          <div className="gallery-actions"><a className="gallery-link" href="#character">Open demo →</a><a href="#source">View source & copy</a></div>
          <CodeBlock language="bash" text={installCommand("chat-step")} />
        </div>
      </article>
    </div>
    <section className="gallery-reuse"><h2>Separate pieces. One working example.</h2><p>Give the template’s command to your coding agent. It reads setup instructions from this site, then the agent installs and integrates the module. The source repository is still private and requires GitHub access. The connection demo works independently; the chat demo shows their integration. Character and style are two configurations of the chat template.</p><a className="gallery-link" href="#source">See how to copy and connect them →</a></section>
  </main>;
}
