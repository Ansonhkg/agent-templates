# Connect Codex and chat-step

This recipe travels with both source modules. Keep `codex-connection`, `chat-step`, and `integrations` as siblings, or adjust their imports. Neither module imports the other; `codex-chat-step.ts` is the bridge.

For feature authors, [CONTRACT.md](CONTRACT.md) defines the five inputs, model/server boundary, context hook, execution limits, and recovery guarantees.

## Server wiring

Use one local connection and a separate runtime for each task. Supply your feature's instructions, tools, initial result, and completion rule through `StepDefinition<Result>`.

```ts
import { join } from "node:path";
import { CodexConnection } from "../codex-connection/server/connection";
import { handleCodexConnection } from "../codex-connection/server/http-handler";
import { codexChatProvider } from "./codex-chat-step";
import { SessionRuntime } from "../chat-step/server/session-runtime";
import { SessionStore } from "../chat-step/server/session-store";
import { handleSession } from "../chat-step/server/http-handler";

const connection = new CodexConnection({ workspace: join(dataDir, "workspace") });
const provider = codexChatProvider(connection);
const runtime = new SessionRuntime(myStep, provider, new SessionStore(join(dataDir, "sessions")));
await runtime.init(sessionId);

// Inside your HTTP router, AFTER host authentication/authorization and CSRF:
// /api/codex and /api/codex/*
await handleCodexConnection(path.slice("/api/codex".length), req, res, connection);
// OR /api/tasks/:id and /api/tasks/:id/*, using the authorized task's runtime
await handleSession(pathSuffix, req, res, runtime);

// On shutdown: runtime.cancel(); connection.close();
```

The route calls above are alternatives in your router, not two calls for the same request. The runnable `demo/server.ts` shows the complete router, local host/origin checks, bootstrap token, asset serving, and shutdown.

Validate `X-Codex-Connection-Token` on account POST routes and `X-Chat-Step-Token` on task POST routes. The demo supplies both from its local bootstrap token. For hosted apps, use your own authenticated session and authorize GET/SSE routes as well; never share one desktop user's connection across unrelated users.

## Page wiring

```tsx
import { useMemo } from "react";
import { CodexAccount } from "../codex-connection/ui/CodexAccount";
import { codexHttpTransport } from "../codex-connection/client/http-transport";
import { ChatStep } from "../chat-step/ui/ChatStep";
import { httpTransport } from "../chat-step/client/http-transport";
import "../chat-step/ui/chat-step.css";

// Inside your component. MyResult and MyResultPanel belong to your feature.
const account = useMemo(() => codexHttpTransport("/api/codex", token), [token]);
const chat = useMemo(
  () => httpTransport<MyResult>(`/api/tasks/${sessionId}`, token),
  [sessionId, token],
);

return <>
  <CodexAccount transport={account} />
  <ChatStep
    transport={chat}
    title="Create your character"
    description="Discuss ideas, generate, and refine."
    resultTitle="Your character"
    result={props => <MyResultPanel {...props} />}
    canComplete={result => Boolean(result.selectedId)}
    onComplete={({ result }) => advance(result)}
  />
</>;
```

Put the account component in your app header once. Each character/style/document step gets its own chat transport and result renderer. You can also compose `useCodexConnection` into your existing account UI.

## Action flow

1. Chat sends the user's message to its runtime.
2. The runtime supplies the feature's instructions and registered tool schemas to the Codex bridge.
3. Codex streams a text reply or requests a tool. Discussion does not require generation.
4. The runtime validates arguments, executes the registered handler, updates the result panel, and returns the tool outcome to Codex.
5. UI buttons call the same tools through `act(name, args)` when `fromUI` is allowed.
6. Completion is validated on the server and delivered to the host's `onComplete` callback.

For image tools, inject an image service backed by `connection.generateImage(prompt, signal, referencePaths)`. Store its returned bytes with your own asset service and expose an authorized URL. See the copied `features/visual/tools.ts` and `demo/server.ts` for this additional wiring. Other products can supply completely different actions.

## Streaming and verification

Chat SSE emits `text` events with message IDs and monotonic revisions, plus `snapshot` events for initial state, reconnect, tool/result updates, and turn status. The client preserves whitespace/Unicode, ignores duplicate revisions, and resynchronizes gaps. Do not replace this with string concatenation over full snapshots.

Before shipping your copy, verify login, ordinary discussion, one real domain tool, result acceptance, stop/resume, and reload using your own services. The template's root `VALIDATION.md` records tested paths and remaining limits; `npm test` checks copy safety, persistence, tool validation, and stream assembly.
