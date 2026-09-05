# Validation

Checked September 5, 2026.

## Latest release-candidate verification

This section supersedes the earlier image-generation gaps in the historical runs below.

- TypeScript and the production build pass; **17 unit/contract tests pass**. Rendering checks cover Markdown, JSON, custom renderers, incomplete content, unsafe links/HTML, and explicit tool display projections.
- **The full live browser E2E passed in four minutes**, using a fresh data directory and the actual signed-in local Codex account. It generated a character, a visual revision, and a style image. It also exercised formatted replies, JSON, clipboard copying, expanded tool details, selection, acceptance, reload persistence, cancellation/recovery, a failed tool operation, and the 390px layout. No browser errors remained.
- The first full run passed its functional assertions but failed the browser-error gate because two demo servers shared a Vite WebSocket port. Separate HMR ports fixed this; the entire live journey then passed on a fresh run.
- Focused accessibility scans found no WCAG A/AA rule violations on the character, source, connection, and account-dialog surfaces after contrast fixes. URL hash navigation now updates the displayed example, verified by page-heading assertions. These automated scans do not establish full accessibility compliance or manual screen-reader coverage.
- A standalone source export passed `npm ci --ignore-scripts`, build, and all 17 tests. Dependency auditing reported no known vulnerabilities. The source-only release scan found no credential, personal-path, or private-network findings; intentional loopback and public documentation URLs remain.

Tested on macOS Apple Silicon with Node 22.23.2, Codex CLI 0.153.4, Playwright 1.63.0, and Chromium 153.0.8010.12. The final contrast/navigation edits were verified by focused browser checks and build/tests; they did not change the generation path.

For a future public release: choose a license and security-reporting destination; complete fresh human OAuth sign-in and sign-out in an isolated account environment. Support is macOS only; Linux/Windows testing is outside scope. Manual assistive-technology testing is not established. This verification covers the reusable template, not the parent application's complete public-release readiness or a hosted multi-user service.

## Live path

The demo was exercised through Playwright in a real browser against its actual Node HTTP/SSE server and signed-in local Codex app-server. No canned replies, provider mocks, or simulated generation were used for this proof.

- A greeting returned a normal assistant reply with zero images and no tool calls.
- A character request invoked `update_brief`, then `generate_character`. A real generated Momo image appeared in the right-hand result panel and its first version was selected.
- A follow-up question about personality returned text without generating another image or invoking another tool.
- Selecting the existing version through the result-panel button called the shared `select_version` action.
- **Use this character** recorded completion and delivered the accepted result to the example's completion screen.
- Reloading retained the conversation, selected image, and brief.
- The independent style example invoked `update_brief` and saved “Quiet ink” without generating an image.
- Stopping a running style conversation produced a cancelled session and preserved its brief.
- The Source & reuse page rendered, and the 390px-wide layout had no horizontal document overflow.
- No browser JavaScript errors were observed in the completed flow.

The first image attempt exposed an output-location assumption: Codex can write to its own `generated_images` directory. The adapter now accepts that canonical output directory as well as its workspace, and the rerun successfully imported and displayed the generated image.

This run generated **one successfully imported character image**. It did not validate a second visual revision or style image generation end-to-end. Those use the same image-service path but are not claimed as separate live proofs.

## Infrastructure

`npm ci --ignore-scripts`, `npm run build`, and `npm test` passed within the template using its own dependency installation. The initial infrastructure tests covered safe source copying and refusal to overwrite edits, serialized real filesystem persistence, and schema/tool allowlist checks.

The template is a separate example, not a completed migration of Tune It Own It's character/style dialogs or Ailised's chat widget. Its stepper is illustrative; completion is a real callback demonstration rather than a full multi-step product workflow. Hosted auth, multi-user sessions, uploads, and alternate inference providers require host adapters as documented in the README.

## Independent connection module and integrated streaming

After extracting `codex-connection`, the real browser flow was repeated against the composed demo:

- The account dialog detected the existing sign-in and successfully reconnected the local process.
- A real reply produced **38 append events**. Reassembling the captured SSE events exactly matched the final stored assistant text, including its Unicode content. Discussion did not generate an image.
- A subsequent request invoked `update_brief` through the registered dynamic tool and updated the result panel.
- The existing generated image could be selected through its shared action, and reload preserved that selection.
- Stop cancelled an active conversation; a subsequent message completed successfully.
- No browser JavaScript errors occurred.

A separate real Codex process used a temporary empty Codex home to verify browser login start/cancel, device-code start/cancel, signed-out logout, and reconnect. It did not access or sign out the user's existing account. Reproduce with `npm run test:live:connection` (requires local Codex and network access).

**Fresh OAuth completion was not performed:** a human must finish the browser/device sign-in. The connected path used an already authenticated account. Logging out that real account was intentionally not exercised. Character revision and style image generation remain outside the live proof listed above.

Infrastructure checks additionally cover copying either module independently with no cross-imports, preservation of whitespace/Unicode text chunks, duplicate event suppression, revision gap detection, and rejecting stale snapshots. These are transport/contract tests, not claims of compatibility with the public OpenAI HTTP API. Codex app-server JSON-RPC is adapted into the template's own HTTP/SSE contract.

The standalone Connection example and updated Source & reuse page were checked in a real browser at desktop and 390px widths. A narrow-screen overflow exposed by the longer copy commands was fixed; both pages now fit without document overflow. Screenshots: `docs/connection.png` and `docs/source.png`.

## Feature contract and execution discipline

The integration contract is now documented in `src/integrations/CONTRACT.md`. The existing provider bridge, owned React UI, model/tool separation, auth lifecycle, and streaming transport were retained. Added fresh feature context, bounded per-turn call replay protection, serialized tool execution, payload limits, stable error codes, and cancellation guards for late callbacks/results.

Verification after these changes:

- **13 automated checks passed**, plus TypeScript and production Vite build. New tests exercise the real runtime, registry, filesystem store, and HTTP handler with controlled provider callbacks. They cover context refresh, manifest projection, duplicate/conflicting calls, serialization, limits, schema failures, stop/late writes, recovery, and concurrent completion.
- A deliberately controlled app-server subprocess tests account-read coalescing, timeout propagation into tool signals, and reconnect recovery. This is a protocol fault-injection fixture, not a live authentication or model proof.
- The real browser/Codex flow passed again: **32 captured text events** reconstructed the final reply; registered tools, result selection, reload, and stop/resume worked with no browser errors.
- `npm run test:live:features` passed against the final stricter turn/tool dispatch: **both character and style** read their injected purpose/language context, invoked their actual `update_brief` handler, and updated the result without generating or losing images.
- `npm run test:live:connection` passed again using an isolated empty Codex home for browser/device login initiation and cancellation.
- The source and connection pages still passed the desktop/390px browser checks.

Replay protection is limited to 128 calls within one live turn and is not durable exactly-once execution. It cannot undo external side effects. Fresh human OAuth completion, additional character/style image generation, and migration of the main app's dialogs remain outside this round of proof.

Account transport recovery was additionally verified by shutting down and restarting a separate real demo host while the browser stayed open. The UI showed the lost connection, automatically refreshed account state after SSE reconnected, and cleared the error. A stale initial-fetch error found during this check was fixed. The primary demo and existing sign-in were left running.

## Template gallery and private repository

The gallery now exposes separate Sign in with Codex and Chat + result demos, with character/style variants and a shared source guide. Browser checks passed for both preview links, sign-in-to-chat navigation, hash navigation, back/reload behavior, the account dialog, and 390px gallery layout. All five pages plus the dialog had zero automated accessibility-rule violations and no page errors. Build and all 17 tests passed after this change. Support is macOS only; the package platform field and CI runner reflect that scope. A clean standalone checkout passed npm installation, build, and tests; 67 staged source files had no privacy-scan findings. Local demo data and generated media are excluded.
