import { useState } from "react";
import { CodeBlock } from "../src/chat-step/ui/JsonView";
import connectionPreview from "./assets/connection-preview.png";
import chatPreview from "./assets/chat-preview.png";

const connectionSnippets = [
  { name: "React UI", language: "tsx", code: `import { useMemo } from "react";
import { CodexAccount } from "./codex-connection/ui/CodexAccount";
import { codexHttpTransport } from "./codex-connection/client/http-transport";
import "./codex-connection/ui/codex-connection.css";

export function Account({ csrfToken }: { csrfToken: string }) {
  const transport = useMemo(
    () => codexHttpTransport("/api/codex", csrfToken),
    [csrfToken],
  );
  return <CodexAccount transport={transport} />;
}` },
  { name: "Server connection", language: "typescript", code: `import { CodexConnection } from "./codex-connection/server/connection";

// workspace is an absolute directory owned by your app.
const connection = new CodexConnection({ workspace });
const account = await connection.refresh();

const unsubscribe = connection.subscribe(next => {
  // Publish account changes through your host.
  console.log(next.status);
});

// When your host shuts down:
unsubscribe();
connection.close();` },
];
const chatSnippets = [
  { name: "Workspace", language: "tsx", code: `import { ChatStep } from "./chat-step/ui/ChatStep";
import "./chat-step/ui/chat-step.css";

<ChatStep
  transport={transport}
  title="Create your character"
  description="Discuss, generate, refine."
  resultTitle="Your character"
  result={props => <CharacterPreview {...props} />}
  canComplete={result => Boolean(result.selectedId)}
  completeLabel="Use this character"
  onComplete={({ result }) => saveCharacter(result)}
/>` },
  { name: "Tool action", language: "typescript", code: `import { z } from "zod";

const schema = z.object({ name: z.string().trim().min(1).max(80) });
const renameTool = {
  name: "rename_character",
  label: "Rename character",
  description: "Rename the character when the user asks.",
  schema,
  async execute(raw, context) {
    const { name } = schema.parse(raw);
    await context.updateResult({ ...context.getResult(), name });
    return { renamed: true, name };
  },
};
// Include renameTool in your server-owned step.tools array.` },
  { name: "JSON & code", language: "tsx", code: `import { CodeBlock, JsonView } from "./chat-step/ui/JsonView";

<JsonView value={{ name: "Momo", mood: "curious" }} />

<CodeBlock
  language="typescript"
  text={'const character = { name: "Momo" };'}
/>
// Highlighting, formatted JSON, and copy feedback are included.` },
];

export function TemplateVisuals({ kind }: { kind: "connection" | "chat" }) {
  const [index, setIndex] = useState(0);
  const snippets = kind === "connection" ? connectionSnippets : chatSnippets;
  const snippet = snippets[index] || snippets[0];
  const screenshot = kind === "connection" ? connectionPreview : chatPreview;
  return <section className="template-visuals" aria-label="Preview and snippets">
    <figure>
      <a href={screenshot} target="_blank" rel="noreferrer" aria-label="Open full-size interface preview">
        <img src={screenshot} alt={kind === "connection" ? "Account controls and a standalone connection test" : "A conversation with Markdown and tool activity beside a result panel"} />
      </a>
      <figcaption>Interface preview · {kind === "connection" ? "Sign-in and requests run locally." : "Example messages; your app supplies the tools and result."} Click to enlarge.</figcaption>
    </figure>
    <div className="template-snippets">
      <div className="snippet-choices" role="group" aria-label="Code examples">
        {snippets.map((item, i) => <button key={item.name} aria-pressed={index === i} onClick={() => setIndex(i)}>{item.name}</button>)}
      </div>
      <CodeBlock language={snippet.language} text={snippet.code} />
      <p>{kind === "connection" ? "Your host mounts /api/codex and supplies the request token. Full setup is below." : "Connect these examples to your own transport, result renderer, and server tools. Full wiring is below."}</p>
    </div>
  </section>;
}
