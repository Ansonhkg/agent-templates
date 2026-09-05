# Use both modules together

The canonical copyable recipe is [src/integrations/README.md](src/integrations/README.md). It specifies the server bridge, routes, client transports, account UI, tools, and completion. The [feature contract](src/integrations/CONTRACT.md) adds fresh context, limits, error codes, and execution guarantees.

```sh
node scripts/copy.mjs /path/to/my-app --example
```

This copies both modules, the integration, and character/style examples. For just the connection:

```sh
node scripts/copy.mjs /path/to/my-app --module codex-connection
```

For just the chat workspace with your own provider:

```sh
node scripts/copy.mjs /path/to/my-app --module chat-step
```

When asking a coding agent to integrate them, say:

> Use the copied codex-connection and chat-step source modules. Follow src/integrations/README.md. Keep a shared local CodexConnection, adapt it with codexChatProvider, and give this feature its own StepDefinition, getContext hook, tool handlers, result renderer, and completion rules. Reuse the host's account UI, routing, storage, and theme where available. Verify normal discussion, a real tool action, streaming, cancellation, reload, and completion.

The modules are source templates, not installed libraries. The copy script refuses existing destinations; it does not merge or overwrite your customizations.
