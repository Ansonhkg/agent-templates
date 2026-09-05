# Security and runtime boundaries

This is an owned-source template for a **local, single-user Node host**. The demo binds to loopback and checks host/origin and a local request token. Do not expose it on a public interface as a hosted multi-user service. Host authentication, user/session ownership, authorization, deployment hardening, and durable domain idempotency belong in an integrating product.

Codex owns sign-in and credential refresh. Access tokens never enter browser messages. The optional Codex home setting isolates sign-in; signing out of a shared home can affect other applications.

Only server-registered tools execute. Tool manifests contain names, descriptions, and schemas. Tool handlers explicitly opt into browser-visible `display` projections; raw inputs/results are private by default. Display projections are limited to 16 KiB each. Never include credentials in context, results, projections, or user-facing error strings.

Assistant Markdown renders without raw HTML. Script URLs are filtered by the renderer and Markdown images do not load remote pixels. Keep those defaults when changing renderers. Code and JSON render as text. See the renderer's [security guidance](https://github.com/remarkjs/react-markdown#security) before adding plugins.

Stop and timeout abort active tool signals and fence late result updates. They cannot undo completed external writes or forcibly terminate custom code that ignores its signal. Repeated tool-call protection is bounded to a live turn in memory, not durable exactly-once execution.

Local conversations, generated assets, auth homes, screenshots and test traces can contain private data. They are ignored by Git. Use `scripts/prepare-public.mjs` for an allowlisted source export rather than copying your whole working directory.

Do not post credentials or private traces in public issues. Before public launch, the maintainer must add a license and configure a private vulnerability-reporting channel for the chosen repository.
