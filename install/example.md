# Integrate the chat-and-result example

You are the coding agent in the user's project. Follow the chat-step integration guide from this same repository (`install/chat-step.md`) and the user's project instructions. Clone the source with authenticated `gh repo clone Ansonhkg/agent-templates <fresh-source-directory>` if needed, then read that guide locally before implementation.

For a requested character/style example, use `node scripts/copy.mjs <absolute-target-app-path> --example` from the source checkout. This copies both modules, their integration recipe, and the character/style/visual feature examples. Preserve existing customized modules and copy only missing files if the script refuses an existing destination.

Read `demo/server.ts` for image generation, asset serving, and persistence wiring. Adapt that wiring to the host; do not replace the user's app with the demo gallery. Verify discussion, a requested real generation, revision, selection, acceptance, cancellation, and reload. Report any provider sign-in or live-generation checks still unverified.

## Run the standalone demo

If the user asks to try the demo instead of integrating it into an app, clone this repository into a fresh directory with `gh repo clone Ansonhkg/agent-templates <fresh-source-directory>`. On their Mac, enter that checkout, run `npm ci` and `npm run dev`, then open `http://127.0.0.1:4328`. Requires Node.js 22+ and local Codex. Use the connection demo to sign in with their own account. Keep this server bound to loopback; do not deploy it as a shared authentication backend.
