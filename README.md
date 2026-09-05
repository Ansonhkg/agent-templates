# Agent templates

A copyable **chat on the left, result on the right** workspace for one focused task. Discuss ideas, invoke app tools, iterate on a result, then accept it and continue. Character creation and style exploration are runnable examples.

This is source you own, in the spirit of shadcn. It is not a published component package or an ongoing dependency. Edit any copied file. There is no update mechanism or compatibility promise between copies.

## Run the demo

**Supported platform: macOS only.** Requires Node.js 22+, npm, and a local Codex installation. Use the header’s **Connect Codex** control to sign in; image examples require image generation support.

```sh
gh repo clone Ansonhkg/agent-templates
cd agent-templates
npm install
npm run dev
```

Open **http://127.0.0.1:4328**. The homepage is a template gallery with two working demos:

- **Sign in with Codex:** http://127.0.0.1:4328/#connection — standalone account UI.
- **Chat + result:** http://127.0.0.1:4328/#character — a chat workspace with character and style variants.
Each template has **Demo** and **Source** tabs. Source links are http://127.0.0.1:4328/#connection/source and http://127.0.0.1:4328/#character/source. Tabs switch instantly and keep the draft and demo state mounted.

The connection demo provides account management and a standalone inference test. The chat demo separately shows how to integrate that connection into a conversation. The example stepper shows where this focused workspace belongs; it is not a separate workflow engine.

Try these in order:

1. “Hello, I'd like to discuss a character.” → a normal text reply, no image.
2. “Call it Momo. A curious, deadpan pink blob.” → the assistant can update the brief on the right.
3. “Generate a version waving.” → an action runs and the image appears on the right.
4. “Make its arms shorter.” → generate a revision using the selected image.
5. Choose a version and click **Use this character** → the example receives the completed session and shows the selected result.

This is real inference. Sending messages uses your local Codex account. Generating images uses its image allowance. No canned chat replies or simulated tool results are used. The demo uses its own isolated local data directory.

`PORT` changes the listener. `CHAT_STEP_HMR_PORT` changes the development WebSocket port (default 24328). `CHAT_STEP_DATA_DIR` changes the demo's private data location. `CODEX_CONNECTION_BIN` selects a Codex executable (`CHAT_STEP_CODEX_BIN` remains supported). `CODEX_CONNECTION_HOME` isolates the demo’s Codex sign-in when set. Otherwise the adapter prefers the installed macOS Codex app, then the CLI on PATH. Credentials remain in Codex; browser code does not receive them. The independently copyable connection module includes account state, browser/device login, cancel, logout, reconnect, and optional React UI. Mount that UI once in your host.

## Repo shape

```text
src/
  chat-step/                      reusable source; no product imports
    types.ts                      session/message/transport contracts
    ui/
      ChatStep.tsx                split workspace and completion slot
      Conversation.tsx            messages + replaceable tool activity
      Composer.tsx                typing, IME, send, cancellation
      chat-step.css               scoped CSS and appearance tokens
    client/
      use-chat-step.ts            loading, live state, actions, errors
      http-transport.ts          HTTP/SSE connection adapter
    server/
      types.ts                   provider, tool, step contracts
      tool-registry.ts           tool descriptions + Zod validation
      session-runtime.ts         turns, tool execution, result updates
      session-store.ts           local JSON persistence adapter
      http-handler.ts            thin transport adapter
  codex-connection/              independent source; no chat-step imports
    types.ts                     account and conversation contracts
    server/                      app-server, auth, streaming, tools
    client/                      connection transport + React hook
    ui/                          optional account and login dialog
    README.md                    standalone setup
  integrations/
    codex-chat-step.ts           small bridge between both modules
    README.md                    exact host + client wiring recipe
  features/
    character/step.ts            character instructions + tool allowlist
    style/step.ts                style instructions + tool allowlist
    visual/
      model.ts                   example result shape
      tools.ts                   product actions and image-service port
      VisualResult.tsx           example preview/version selector
      visual-result.css          example-specific styles
demo/
  server.ts                      local host, auth boundary, composition
  main.tsx                       examples + completion callback
  source-guide.tsx               browse the anatomy and copy instructions
scripts/copy.mjs                  copy source into a host app
tests/                           infrastructure checks
```

## Add with your coding agent

Each gallery card offers a single `curl -fsSL` command for that template's instructions. The URL uses the page's own origin and configured Vite base path, so it works on localhost now and on the site's domain when hosted. Give that command to your coding agent in the target app's project. It prints a guide; it does not pipe code into a shell or perform installation by itself.

Local example:

```sh
curl -fsSL 'http://127.0.0.1:4328/install/codex-connection.md'
```

The instruction routes are `install/codex-connection.md`, `install/chat-step.md`, and `install/example.md`. `npm run dev` and `npm run build` generate these static files from the reviewed Markdown in `install/`. The production `dist/` includes them, so the eventual static host can serve them without a Codex backend or GitHub authentication. Acquiring the actual source still requires access to the private GitHub repository.

Edit the canonical guides in `install/`; regenerate with `node scripts/build-install-guides.mjs` during an already-running dev session. Do not place credentials in these publicly served documents.

## Copy into an existing app

Requires Node.js and GitHub CLI. For this private repository, authenticate with `gh auth login` first. Replace `/path/to/my-app` with your app folder.

```sh
gh repo clone Ansonhkg/agent-templates
cd agent-templates
# Both modules plus their integration recipe
node scripts/copy.mjs /path/to/my-app

# Both modules plus character and style examples
node scripts/copy.mjs /path/to/my-app --example

# Either module independently
node scripts/copy.mjs /path/to/my-app --module codex-connection
node scripts/copy.mjs /path/to/my-app --module chat-step
```

The script writes into the target's `src/`. It checks all destinations first and refuses to overwrite an existing folder, including a symlink. It does not edit `package.json`, install dependencies, register a route, or overwrite your theme. Dependencies are React/React DOM for the UI, react-markdown/remark-gfm/lowlight for chat rendering, and Zod for server validation. The bundled server and Codex adapter require Node.js; they do not belong in the browser bundle.

To create a clean standalone checkout, use `node scripts/prepare-public.mjs /path/to/new-directory`. Its `package.json` is the private demo app manifest, not a library package. The export excludes local data, credentials, generated artwork, dependencies, and build output.

## Connect the modules

Follow [INTEGRATION.md](INTEGRATION.md) and the copyable [integration recipe](src/integrations/README.md). One `CodexConnection` supplies both account controls and inference; `codexChatProvider(connection)` connects it to the chat runtime. Each feature supplies its own tools and result renderer.

## Wire your step

The UI only needs a stable `ChatTransport<Result>` and a result renderer. Memoize the transport so rerenders do not reopen subscriptions.

```tsx
import { useMemo } from "react";
import { ChatStep } from "./chat-step/ui/ChatStep";
import { httpTransport } from "./chat-step/client/http-transport";
import "./chat-step/ui/chat-step.css";

const transport = useMemo(
  () => httpTransport<MyResult>(`/api/my-step/${sessionId}`, token),
  [sessionId, token],
);

<ChatStep
  transport={transport}
  title="Create your character"
  description="Find the personality. Refine the details."
  resultTitle="Your character"
  result={props => <MyResultPanel {...props} />}
  canComplete={result => Boolean(result.selectedId)}
  completeLabel="Use this character"
  onComplete={({ result }) => advanceToNextStep(result)}
/>
```

For a modal, put this same workspace inside your app's dialog. For a stepper, render it as that step's content. There is no floating assistant shell.

## Tools are product operations

The model receives the tool names, descriptions, and JSON input schemas from a **server-owned** registry. It can reply with text or request a tool. The runtime validates arguments with Zod, calls your handler, streams activity and updated results to the UI, and returns the outcome to the model.

```ts
const schema = z.object({ name: z.string().min(1).max(80) }).strict();

const renameTool = {
  name: "rename_character",
  label: "Rename the character",
  description: "Change the name when the user requests a rename.",
  schema,
  fromUI: true, // also allow a button to invoke this exact operation
  async execute(raw, context) {
    const { name } = schema.parse(raw);
    const next = { ...context.getResult(), name };
    await context.updateResult(next);
    return { renamed: true, name };
  },
};
```

Use `act("rename_character", { name })` from your result panel to call the same validated handler. There is no second implementation for buttons. For existing apps, handlers should call existing domain services/SDK operations. Avoid putting domain rules in React or adding a second switch statement in each transport.

Each `StepDefinition<Result>` supplies `instructions`, `initialResult`, `tools`, `canComplete`, optional fresh `getContext`, and an optional server `complete` callback. See the [feature integration contract](src/integrations/CONTRACT.md) for context, payload limits, replay protection, and error codes. `canComplete` is checked on the server too. The demo's button validates and records acceptance, then `onComplete` advances the example UI. In your app, make completion persist the result through your own domain service; give external writes an idempotency key such as the session ID and accepted revision.

## What to customize

| Concern | Change here |
| --- | --- |
| Split ratio, color, radius | `--cs-chat-width`, `--cs-accent`, `--cs-radius` or edit the CSS |
| Layout, toolbar, header | `ChatStep.tsx`, or compose the lower-level components yourself |
| Markdown, JSON, code, message actions | Edit `MessageContent.tsx` / `JsonView.tsx`, or supply `renderMessage` |
| Tool activity | Edit `ToolCallCard.tsx` or supply `renderActivity`; server tools opt into `display` projections |
| Attachments | Supply `composerAccessory` and extend your transport/provider with attachment IDs; uploads are not built into this demo |
| Result type and rendering | Define your own `Result` type and `result` renderer |
| Purpose and allowed actions | Your feature's step definition and tools |
| Inference | Implement `ConversationProvider` |
| HTTP vs another connection | Implement `ChatTransport<Result>` |
| Persistence | Replace the local `SessionStore` implementation with your database |
| Completion | Your server `complete` operation and client `onComplete` callback |

The template uses plain React and scoped CSS to keep the copied dependency surface small. The template keeps routing, persistence, administration, and product workflows with the host. HeroUI can replace the UI pieces without changing the tools.

## Runtime boundaries

- The bundled demo is a **local, single-user, one-process host** with one durable session per example. Its HTTP host/origin/token checks are local protections, not a hosted authentication system. Production hosts must resolve authenticated users, session ownership, and tool authorization before calling `handleSession`.
- Conversation state and images are stored beneath `.data/chat-step-demo`. Closing a tab keeps a running turn alive; Stop interrupts inference and propagates an abort signal to tool handlers. Handlers must honor that signal and never publish stale results. Already-completed external side effects cannot be undone by Stop.
- Restarting interrupts active work, preserves the previous result, and marks unfinished actions cancelled. After cancellation, a new provider conversation receives recent chat context and the current result.
- The local Codex adapter uses dynamic tools, a version-sensitive experimental app-server interface. It was checked against the installed protocol. Update this copied adapter for other protocol versions or use your own inference service. See [official app-server documentation](https://developers.openai.com/codex/app-server).
- A separate image-worker turn produces a real image for the registered generation action. The conversation itself is allowed to finish with text; it is not required to generate on every message.

## Check your copy

```sh
npm run build
npm test
```

These checks cover compilation, actual filesystem persistence, schema/allowlist validation, independent copying, and streaming assembly. `npm run test:live:connection` checks real browser/device login initiation and cancellation in a temporary Codex home without touching your existing sign-in. `npm run test:live:features` exercises fresh context and the real brief-update tools for both examples against a running, signed-in demo; it uses inference and changes only demo briefs. Live chat/image validation and remaining limits are described in `VALIDATION.md`.

## Public source release

See [RELEASE.md](RELEASE.md) for the clean export command and remaining release gates. Run `npm run test:e2e` for the real Codex/browser journey; it uses inference and generates images. [SECURITY.md](SECURITY.md) explains local-host and rendering boundaries.

## Hosted showcase

The gallery is hosted at https://anson.sh/templates/. Build it with `npm run build:showcase`; serve `dist-showcase/` at `/templates/`. The hosted Demo tabs are interactive mocks with a clickable flow DAG and Play E2E walkthrough. Sign-in, streamed replies, tool calls, sample results, revision, acceptance, failure, and cancellation are simulated in browser memory and reset on refresh. They never request a Codex backend. Live authentication and generation remain in the local demo. The Source tabs and public instruction URLs work on either host.

Run `npx tsx tests/check-showcase.ts <showcase-url>` to check the deployed gallery, previews, Demo/Source navigation, instruction routes, and mobile layout.
