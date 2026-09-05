# Feature integration contract

The host connects two independently owned source modules once. A feature then supplies five things: **instructions, tools, context, result view, and completion rules**. Character and style are examples of that contract; neither implements authentication or a conversation loop.

| Responsibility | Contract | Owner |
| --- | --- | --- |
| Model connection and lifecycle | `CodexConnection` | Server / codex-connection |
| Provider bridge | `codexChatProvider(connection)` | Integration |
| Task instructions, tools, initial result, context, completion | `StepDefinition<Result>` | Feature server code |
| Session, streaming, validated execution | `SessionRuntime<Result>` | chat-step server |
| Chat and result display, accepting the result | `ChatStep<Result>` props | Feature React code |

## Feature server definition

```ts
const step: StepDefinition<MyResult> = {
  id: "character",
  instructions: "Discuss ideas. Draw only when requested.",
  initialResult: () => ({ name: "", selectedId: null }),
  tools: characterTools(imageService),
  async getContext({ sessionId, result, signal }) {
    const project = await projects.forSession(sessionId, { signal });
    // An explicit model-visible projection, not the full service or account.
    return { language: project.language, palette: project.palette, usage: project.usage };
  },
  canComplete: result => Boolean(result.selectedId),
  complete: session => projects.accept(session.id, session.result),
};
```

`getContext` is optional and runs once at the beginning of **every** turn, including resumed conversations. It receives a cloned result and cancellation signal. Return JSON data only. It is passed to the model separately from the current result and labelled as data; it is not persisted in the browser session or added to developer instructions. The provider may retain it in its conversation. Omit credentials and irrelevant private state. Tool handlers can consult their server services directly when they need fresher state during execution.

`characterStep(images, getContext)` and `styleStep(images, getContext)` demonstrate this injection in `demo/server.ts`. Their context includes intended use, language, framing or scene, and revision policy. Their actual image service remains a private server closure.

## Model contract versus implementation

`ToolRegistry.definitions()` emits only `name`, `description`, and JSON `inputSchema`. `execute`, Zod parsers, `fromUI`, `display` projections, services, credentials, and closures stay on the server. Codex additionally projects those three fields when registering dynamic tools.

A tool receives `{ signal, callId, getResult, updateResult }`. Arguments pass the registered Zod schema before execution. Result updates are cloned, size-checked, persisted, and streamed to the result renderer. Only tools marked `fromUI` can be called by result-panel buttons. To show expandable input/output in chat, opt into `display: { input: args => ({ ...selectedFields }), output: result => ({ ...selectedFields }) }`. Each projection is capped at 16 KiB; raw executor payloads are not automatically included in browser snapshots. No browser-supplied functions or manifests are accepted.

## Execution guarantees and limits

- **Tool requests:** Codex supplies its call ID and turn cancellation signal. The runtime serializes distinct calls in a turn to avoid overlapping read/modify/write operations. Repeating the same ID and arguments returns the same in-flight or settled outcome, including errors. Reusing that ID with different arguments is rejected.
- **Bounded replay protection:** at most 128 distinct call IDs per turn; no eviction within that turn. It lasts only for that live turn in this process. New turns, restarts, and explicit UI actions are new executions. Other providers must pass stable call IDs to get the same protection.
- **Cancellation:** Stop releases the chat even if a custom handler ignores its signal. Late text, thread changes, and result writes are fenced off. Codex timeouts also abort the signal passed to active tools. This cannot undo an external write that already happened or forcibly stop arbitrary user code.
- **Completion:** concurrent completion requests share one promise and the recorded completion timestamp prevents repeated acceptance in that runtime. Use durable domain-service idempotency for external writes and crash recovery. `callId` is available to forward to a service, but the in-memory ledger is **not durable exactly-once execution**.
- **Recovery:** failed or cancelled conversations clear their provider thread ID. The next turn receives current result, fresh feature context, and recent conversation bounded to 128 KiB (older entries are dropped first).

Defaults, measured as serialized UTF-8 unless stated otherwise:

| Boundary | Limit |
| --- | --- |
| User message | 12,000 characters |
| HTTP request body | 64,000 bytes |
| Feature context / tool arguments | 32 KiB each |
| Tool output | 64 KiB |
| Result / one assistant message | 256 KiB each |
| Tool manifest | 128 KiB; up to 32 tools |
| Composed turn input | 512 KiB |
| Tool calls | 128 distinct IDs per turn |

Pass partial overrides as the fourth `SessionRuntime` constructor argument, or edit the owned source. The standalone Codex adapter also bounds tool arguments/output at 32/64 KiB; adjust both when raising those two limits. Images belong in the asset service and are represented by IDs/URLs in JSON. An oversized output is rejected **after** a handler runs; neither size validation nor cancellation rolls back its earlier side effects.

`StepError` provides stable codes: `invalid_input`, `unavailable`, `busy`, `payload_limit`, `call_conflict`, `call_limit`, `cancelled`, `timeout`, and `execution_failed`. HTTP responses use `{ error, code }`; session errors and tool activity carry `errorCode`; Codex tool failures return `{ error, code }`. Hosts can localize these codes and should keep handler error messages suitable for display.

## Connection lifecycle

The connection owns process initialization, shared concurrent account reads, provider-managed credential refresh, login notifications, reconnect, request/turn timeouts, and shutdown. It checks the active turn and tool allowlist before dispatch. The runtime owns task state and domain execution. UI components consume transports and do not read tokens or launch processes.

`close()` is terminal for that connection instance. It stops the process and prevents pending account refreshes from reopening it; create another instance if needed. Normal `reconnect()` is available before close. Fresh sign-in still requires the user to complete OpenAI's browser/device flow.

Follow [README.md](README.md) for the exact server routes and React wiring. The root `VALIDATION.md` distinguishes live checks from deterministic fault-injection tests.
