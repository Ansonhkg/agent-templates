# Working on your copy

Use Node.js 22+ and `npm ci`. Run `npm run dev` for the local demo, `npm run build` for compilation, and `npm test` for infrastructure/rendering checks.

Keep browser imports separate from server code. Put feature instructions, context, tools and completion in feature definitions; keep inference/authentication in codex-connection. UI buttons and model requests should use the same validated tool handlers.

`npm run test:e2e` runs an opt-in real browser/Codex journey with empty demo data. It requires a signed-in local Codex installation and uses its inference/image allowance. Install Chromium first with `npx playwright install chromium`. It generates a character, a revision, and a style sample. Screenshots and traces stay in ignored test-results. Never commit them without inspecting their contents.

`npm run test:live:connection` tests login initiation/cancellation in a temporary empty Codex home. Completing a fresh login is a manual release check. `npm run test:live:features` targets a running demo and updates only example briefs.

The GitHub workflow runs build and deterministic infrastructure checks without credentials. It does not claim real model/authentication coverage. You own any copied source and can change its components, CSS, transport, storage or provider.
