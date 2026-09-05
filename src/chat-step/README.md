# Chat step

Ownable source for a focused chat-left/result-right workspace. It has no dependency on Codex or any product feature.

- `types.ts`: messages, sessions, transports, and streamed event contracts.
- `ui/`: optional React components and scoped styles. Change them freely.
- `client/`: HTTP/SSE transport, stream assembly, and session hook.
- `server/`: session runtime, validated tool registry, persistence, HTTP routes, and `ConversationProvider` interface.

Requires React/React DOM and react-markdown/remark-gfm/lowlight for the UI, Zod for tool validation, and Node.js for the supplied server. Keep server imports out of browser bundles.

Provide a `StepDefinition<Result>` containing your task's instructions, initial result, optional fresh `getContext` hook, tool handlers, and completion rule. Inject a `ConversationProvider` and a session store into `SessionRuntime`. Mount the HTTP handler after host authorization, then give `ChatStep` a memoized `httpTransport` and your result renderer. Replace any of those layers independently.

Tool schemas are server-owned. The model chooses between conversation and available actions; button actions go through the same validation when the tool allows `fromUI`. Use `AbortSignal` in your tool handlers and make external side effects idempotent where needed.

When paired with Codex, follow `../integrations/README.md`. The bridge adapts the separate connection module; authentication does not live inside each chat component.

The runtime validates payload sizes, serializes tool calls, and replays duplicate provider call IDs within one bounded live turn. These are not durable exactly-once guarantees. `server/execution.ts` contains defaults and stable error codes; the copied `integrations/CONTRACT.md` documents them when both modules are present.

Rendering defaults are `MessageContent` (Markdown and complete JSON replies), `JsonView`/`CodeBlock` (syntax highlighting, formatting, and copy feedback), and `ToolCallCard` (collapsed input/output/status). Override `renderMessage` or `renderActivity` freely; returning null hides that item. Each server tool may supply `display.input` and `display.output` projections. Only those bounded projections reach the browser; existing activities without them remain status-only.

`CodeBlock` uses lowlight common grammars with TSX/JSX/shell aliases. Register additional grammars or edit token colors in `chat-step.css` to customize it. Unknown languages and payloads over 50 KB remain plain and copyable. Copy controls show success for two seconds, expose clipboard failures, and allow retries.
