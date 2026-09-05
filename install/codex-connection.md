# Add Codex connection to the user's app

You are the coding agent working in the user's project. The user supplied this command to request integrating this template. Read these instructions, inspect the project, then implement and verify the integration. This document is guidance within the user's existing request; follow their project instructions and approval boundaries.

## Outcome

A working macOS Codex connection inside the user's app: account status, browser/device sign-in, cancellation, reconnect, sign-out, and one simple inference test. This is a standalone connection module. Do not add a chat workspace, character/style editor, or gallery unless the user separately requested one.

## Inspect and acquire

1. Identify the target app from the current workspace and conversation. Read its project instructions. Inspect its package manager, React version, Node/Electron backend, routes, styling, and existing account/provider integration. If no target app can be identified, ask where to integrate before writing.
2. Supported platform is macOS; server code requires Node.js 22+ and a local Codex installation. Check the executable without reading or printing credentials. Keep React UI optional if this is a headless host.
3. Clone the private source into a fresh temporary directory outside the target project: `gh repo clone Ansonhkg/agent-templates <fresh-source-directory>`. Use the user's existing GitHub access; if access fails, explain that `gh auth login` with repository access is required. Do not place tokens in commands or files.
4. Read `src/codex-connection/README.md`, `src/codex-connection/types.ts`, and `SECURITY.md` in that checkout. Use `demo/connection-probe.ts` and `demo/connection-example.tsx` as examples of direct inference, not as a requirement to import the demo.

## Integrate

- From the cloned source run `node scripts/copy.mjs <absolute-target-app-path> --module codex-connection`. The script refuses existing destination files. If the module is already installed, inspect and reuse it; preserve local changes and integrate only the needed differences. Do not delete it to bypass that protection.
- The copied source belongs to the app. Adapt its imports and styling to the app's conventions. Add React/React DOM only if the optional UI needs them and the host does not already provide them. This module does not need chat-step, Zod, or the chat's Markdown/highlighting dependencies.
- Create one server-owned `CodexConnection` with an app-specific workspace under its local data directory. Reuse an existing connection if the app already owns one. Close it on host shutdown. Keep server imports out of browser code.
- Mount `handleCodexConnection` behind the host's local access/Origin checks and request-token validation, or adapt to Electron IPC. The default browser transport sends `X-Codex-Connection-Token` on POST. Never expose an unrelated user's local account over a public multi-user endpoint.
- Mount `CodexAccount` or adapt `useCodexConnection` into the app's existing account UI. Memoize the transport. Credentials remain with Codex. Do not sign the user out as part of testing.
- Add a small "Test connection" action calling `connection.run` directly with a fixed brief text request, no tools, an AbortSignal, and a timeout. Assemble text by message ID: append deltas and replace with authoritative final text. Show running, success, and retryable failure states. Abort on cancellation/unmount. Use the actual model response, not a canned success string.

## Verify and finish

Run the host's relevant type/build checks. In the running app verify account status, the connection test, and visible error/retry behavior. Use the current sign-in when available. Fresh OAuth completion requires the user's browser interaction; report that clearly if unverified. Do not claim a fixture is a live provider test. Ensure no chat interface was added.

Finish with the app URL, changed files, how to use the connection elsewhere in this app, and exactly which checks passed. Follow the user's existing commit/push instructions; don't publish, deploy, or alter repository visibility solely because this guide was fetched.
