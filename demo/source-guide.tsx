export function SourceGuide() {
  return (
    <main className="source-guide">
      <h1>Copy it. Make it your step.</h1>
      <p>
        The workspace is source code inside your app. There is no chat-step
        package to subscribe to or keep in sync.
      </p>
      <div className="source-columns">
        <section>
          <h2>What the repo looks like</h2>
          <pre>{`src/
  chat-step/                ← copy these building blocks
    types.ts                 messages, actions, results
    ui/
      ChatStep.tsx           chat left, result right
      Conversation.tsx      message list + renderer slots
      MessageContent.tsx    Markdown + JSON
      ToolCallCard.tsx      expandable inputs/results
      JsonView.tsx          format and copy
      Composer.tsx          input and stop
      chat-step.css         scoped theme tokens
    client/
      use-chat-step.ts      session state
      http-transport.ts     replaceable connection
    server/
      session-runtime.ts   conversation lifecycle
      tool-registry.ts     schemas → handlers
      session-store.ts     replaceable persistence
      http-handler.ts      thin HTTP adapter
      types.ts

  codex-connection/         ← copy independently, too
    server/                 login + app-server + streaming
    client/                 transport + connection hook
    ui/CodexAccount.tsx     optional account/login dialog
    README.md               standalone setup

  integrations/
    codex-chat-step.ts      connects their contracts
    README.md               exact wiring recipe
    CONTRACT.md             context + execution guarantees

  features/                ← your product owns this
    character/step.ts       purpose + available tools
    style/step.ts           a different purpose
    visual/
      tools.ts              real product actions
      model.ts              result shape
      VisualResult.tsx      right-hand preview

demo/                      runnable example + this guide
scripts/copy.mjs           copies source, never overwrites`}</pre>
        </section>
        <section>
          <h2>Use it in another project</h2>
          <p>Run this from the template directory:</p>
          <pre>{`node scripts/copy.mjs /path/to/my-app --example`}</pre>
          <p>
            This adds <code>src/chat-step</code>, <code>src/codex-connection</code>,
            the integration recipe, and the example feature folders. It refuses existing destinations and does not change your
            package.json.
          </p>
          <h3>Connect once on the server</h3>
          <pre>{`const connection = new CodexConnection({ workspace });
const provider = codexChatProvider(connection);
const task = new SessionRuntime(step, provider, store);
await task.init(sessionId);`}</pre>
          <p>Mount the account and task HTTP routes. Follow <code>src/integrations/README.md</code> for the complete host and client wiring.</p>
          <h3>Copy just one module</h3>
          <pre>{`node scripts/copy.mjs /path/to/my-app --module codex-connection
node scripts/copy.mjs /path/to/my-app --module chat-step`}</pre>
          <h3>Wire your page</h3>
          <pre>{`<ChatStep
  transport={myTransport}
  title="Create your character"
  resultTitle="Your character"
  description="Discuss, generate, refine."
  result={props => <MyPreview {...props} />}
  canComplete={result => !!result.selectedId}
  onComplete={({ result }) => nextStep(result)}
/>`}</pre>
          <h3>Supply fresh feature context</h3>
          <pre>{`getContext: ({ sessionId, result, signal }) => ({
  language: project.language,
  palette: project.palette,
  usage: project.usage,
})`}</pre>
          <p>The server sends relevant JSON each turn. Service implementations and credentials stay on the server.</p>
          <h3>Register your actions</h3>
          <pre>{`{
  name: "generate_character",
  description: "Draw only when requested",
  schema: z.object({ prompt: z.string() }),
  execute: (args, context) => {
    // Call your product service.
    // Update the result on the right.
  }
}`}</pre>
        </section>
      </div>
      <section className="source-bottom">
        <h2>Everything has a place to change</h2>
        <div>
          <p>
            <strong>Appearance</strong>
            <br />
            Edit the CSS or replace any component.
          </p>
          <p>
            <strong>Behavior</strong>
            <br />
            Change the instructions and tool handlers.
          </p>
          <p>
            <strong>Results</strong>
            <br />
            Render images, documents, forms, or previews.
          </p>
          <p>
            <strong>Infrastructure</strong>
            <br />
            Swap transport, storage, or inference adapter.
          </p>
        </div>
        <p>
          A message goes to the model with this step’s tools. The model can
          reply normally or request an action. The server validates the action,
          updates the result, and returns its outcome to the conversation.
        </p>
      </section>
    </main>
  );
}
