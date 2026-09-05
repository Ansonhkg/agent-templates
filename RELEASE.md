# Repository and public release

The intended artifact is the source template, not the parent application, local demo data, or a maintained npm library. `private: true` prevents accidental npm publication.

## Prepare

```sh
npm ci
npm run build
npm test
node scripts/prepare-public.mjs /path/to/new-release-directory
```

The allowlist excludes local state, generated artwork, screenshots, environment files, dependency installations, build output and Git history. The exported source has its own ignore file and CI workflow.

## Private repository

Both modules and the shared template gallery live together in one private repository. macOS is the only supported platform; CI runs on macOS. A public reuse license is deferred until a public release is requested. Private source storage does not require choosing that public license now.

## Before making public

Current local verification is complete: build, 17 automated checks, a full live Codex browser E2E (including character revision and style generation), and focused accessibility/navigation scans passed. See `VALIDATION.md` for versions and limits. The items below still govern publishing; the live E2E should be repeated when changing the provider/runtime or release environment.

- Choose a license and add `LICENSE`; source reuse should have explicit terms.
- Choose the public repository and configure private security reporting.
- Complete one fresh browser/device sign-in by hand, then verify the connected state and sign-out in an isolated Codex home.
- Run `npm run test:e2e` with a compatible installed Codex version. The app-server dynamic-tool interface is experimental and version-sensitive.
- State the tested macOS/browser/provider versions. Windows and Linux are outside the supported scope.
- Inspect any additional screenshots, logos, character references or recordings before including them; they are excluded by default.

The local host is not ready to serve multiple unrelated users over the public internet. That requires a host-specific account/session authorization and deployment design. Copyable-source release and hosted-product readiness are separate scopes.

## E2E scope

The committed live journey exercises formatted streaming replies, JSON, copy controls, tool details, real character generation and revision, style generation, selection, acceptance, reload, cancellation/recovery, a real failed tool operation, and narrow-screen layout. It starts with a fresh demo data directory and does not replace inference with canned responses.

Additional unit/contract checks cover HTML/link safety, explicit tool display projections, schema and payload validation, duplicate-call handling, persistence, and lifecycle fault injection. These tests complement live inference; they are not substitutes for it.
