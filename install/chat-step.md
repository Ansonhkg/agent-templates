# Add a focused chat-and-result step to the user's app

You are the coding agent working in the user's project. The user supplied this command to request integrating this template. Inspect the app, implement the integration, and verify it. This guide operates within the user's existing request and project instructions.

## Outcome

A single-purpose page or workflow step with conversation on the left and the task's live result on the right. Users can discuss ideas without triggering an action, ask the model to invoke domain tools, refine a result, and accept it. This is copyable source the app owns, not a maintained npm component package or a floating general-purpose chatbot.

## Inspect and acquire

1. Identify the target app and requested use case from the current workspace and conversation. Read project instructions and inspect routes, styling, package manager, existing chat/connection modules, persistence, and domain actions. If the target or purpose is missing, do useful inspection first, then ask the one missing question. Don't invent a character editor for an unrelated app.
2. Clone `Ansonhkg/agent-templates` using `gh repo clone Ansonhkg/agent-templates <fresh-source-directory>` into a fresh temporary directory outside the app. The repo is private: use existing GitHub access; explain `gh auth login` if access is unavailable. Never print credentials.
3. Read `src/chat-step/README.md`, `src/chat-step/server/types.ts`, `src/integrations/README.md`, `src/integrations/CONTRACT.md`, and `SECURITY.md`. Inspect the actual source contracts before adapting them. Support is macOS with Node.js 22+ for the supplied Codex backend.

## Choose the copy scope

- If a suitable provider already exists, run `node scripts/copy.mjs <absolute-target-app-path> --module chat-step` from the source checkout and adapt that provider to the declared interface.
- If the app needs Codex and neither module exists, run `node scripts/copy.mjs <absolute-target-app-path>` to copy both independent modules and their integration recipe.
- If Codex connection is already present, reuse it. Copy only missing modules and integration files, inspecting existing destinations before writing. Don't create a second OAuth flow or inference connection for each step.
- The script refuses existing files. Preserve customized copies; compare and deliberately integrate needed differences instead of deleting or overwriting whole directories.
- Install only missing dependencies using the host's package manager: React/React DOM, react-markdown, remark-gfm, lowlight, and Zod. Match the template's package.json versions and the host's constraints. Source imports and CSS may be adapted freely.

## Wire the host and feature

- Keep server imports out of browser bundles. When using Codex, create/reuse one server-owned `CodexConnection`; `codexChatProvider(connection)` bridges it to a per-session `SessionRuntime`. Mount authorized account/task routes with the correct request-token and Origin checks. Reuse the host's storage and asset service where possible.
- Define the feature's `StepDefinition<Result>`: purpose/instructions, initial result, tools, fresh `getContext`, and completion rule. Keep services and credentials server-side; send only relevant context to the model.
- Register real actions with Zod schemas, descriptions, and handlers. The model decides whether to converse or call a tool. Ordinary questions must not automatically generate an image. Use `AbortSignal`, propagate provider call IDs, and design side effects for cancellation/idempotency. UI buttons may call the same actions if `fromUI` permits them.
- Expose tool input/result summaries through explicit `display` projections; don't dump internal payloads or credentials into chat. Preserve the existing Markdown, JSON, highlighted code, copy feedback, and expandable tool cards.
- Render `ChatStep` with a memoized transport, a domain-specific result panel, `canComplete`, and `onComplete`. Adapt appearance to the app. Keep the result beside the conversation, with a usable narrow-window layout. Use the existing account control once in the host rather than duplicating sign-in inside every step.
- Preserve the SSE reducer's append/replace, revision, duplicate, and reconnect semantics. Use the copied integration contract rather than inventing a new streaming protocol.
- Character and style folders are examples, not required product features. For a requested illustration use case, inspect those examples and inject the host's real image service. For other tasks, supply the corresponding domain service and result renderer.

## Verify and finish

Run relevant host type/build checks. Test a normal conversation without unintended actions, one real domain tool, visible result updates, acceptance, cancellation/recovery, and reload persistence. Check both plain replies and structured/tool rendering. Use the actual provider when signed in; distinguish live results from fixtures and report any OAuth/manual step still pending.

Finish with the app URL, changed files, customization points, and exact verification results. Follow existing user instructions for commit/push. Fetching this guide alone does not authorize public publication, deployment, or repository visibility changes.
