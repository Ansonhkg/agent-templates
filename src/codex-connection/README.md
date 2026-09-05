# Codex connection

Supported platform: **macOS only**.

Copy this folder into your app. It has no dependency on `chat-step`, Zod, or any product feature. You own and can change every file.

## Pieces

- `server/connection.ts`: `CodexConnection` manages account state, browser/device login, cancellation, logout, reconnect, streamed conversations, dynamic tools, and optional image generation.
- `server/rpc.ts`: local Codex app-server process and JSON-RPC transport.
- `server/http-handler.ts`: optional Node HTTP/SSE routes.
- `client/http-transport.ts`: browser transport for those routes.
- `client/use-codex-connection.ts`: React state/actions, usable with your own UI.
- `ui/CodexAccount.tsx`: optional account button and sign-in dialog.
- `types.ts`: public contracts with no server imports.

Server code requires Node.js 22+ and a local Codex installation. UI code requires React/React DOM. Do not import `server/` into a browser bundle.

## Start one connection

```ts
import { CodexConnection } from "./codex-connection/server/connection";

const connection = new CodexConnection({ workspace: "/absolute/app/workspace" });
const state = await connection.refresh();
const unsubscribe = connection.subscribe(state => { /* update your host */ });
// On shutdown:
unsubscribe();
connection.close();
```

Options include `binary`, `codexHome`, `requestTimeoutMs`, and `turnTimeoutMs`. By default the existing Codex home/sign-in is reused. Pass `codexHome` to keep an app's sign-in separate. `CODEX_CONNECTION_BIN` overrides executable discovery. No access token is sent to the browser; Codex owns credential storage and refresh.

`login("browser")` returns a login URL. `login("device")` also returns a user code. The user completes sign-in on OpenAI's page, and account notifications update subscribers. `cancelLogin()` cancels a pending attempt; `reconnect()` restarts the local process; `logout()` changes the sign-in stored in that Codex home. The supplied UI asks before logout because other apps may share it. Account-changing actions are rejected while turns are active.

## Use without chat-step

Mount `handleCodexConnection(pathSuffix, req, res, connection)` at your chosen base route. Authorize access and validate Origin/CSRF **before** invoking it. This handler is not a hosted authentication system.

```tsx
import { useMemo } from "react";
import { codexHttpTransport } from "./codex-connection/client/http-transport";
import { CodexAccount } from "./codex-connection/ui/CodexAccount";

const transport = useMemo(
  () => codexHttpTransport("/api/codex", csrfToken),
  [csrfToken],
);
<CodexAccount transport={transport} />
```

The transport sends `X-Codex-Connection-Token` on POST requests; your host validates it. SSE uses same-origin cookies if your host has authentication. Replace this transport for Electron IPC or your framework.

For headless inference, call `connection.run(input)` using `CodexRun` in `types.ts`: instructions, text, tools with JSON schemas, an AbortSignal, and callbacks for thread IDs, text, and tool execution. Tool callbacks receive a third argument `{ id, signal }` with the provider call ID and the turn’s cancellation signal. Forward these through adapters to support replay protection and timeout cancellation. Your `callTool` handler owns validation and authorization. The connection does not invent product actions.

## Streaming contract

Codex app-server emits JSON-RPC notifications over stdio. This module forwards text through `onText(id, text, "append")`, followed by authoritative final text with `"replace"`. Dynamic tool requests arrive with complete arguments; `callTool` supplies the result back to Codex. Aborting interrupts the turn.

This is an adapter for the Codex app-server protocol, not a replacement `/v1/responses` or `/v1/chat/completions` endpoint. The optional HTTP handler streams account state; the host chooses how to stream conversation callbacks. With `chat-step`, the integration uses revisioned text events and snapshots.

Dynamic tools use a version-sensitive experimental app-server interface. See [official app-server documentation](https://developers.openai.com/codex/app-server). Check your installed Codex version when adapting the copy.

## Connect to chat-step

Copy both modules and `integrations/`. Follow `../integrations/README.md`; `codexChatProvider(connection)` is the only bridge needed between their server contracts. Do not recreate OAuth or a second inference connection inside every chat step.

Concurrent `refresh()` calls share one account read. Turn timeouts propagate cancellation to tool callbacks; dispatch validates the active turn and registered tool name. `close()` is terminal and fences pending account refreshes. Reconnect before closing, or create a new instance afterwards. The standalone adapter limits tool arguments to 32 KiB and tool output to 64 KiB; validation against JSON schemas and durable idempotency remain the host executor’s responsibility.
