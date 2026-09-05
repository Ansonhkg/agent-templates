import type { CodexConnection } from "../codex-connection/server/connection";
import type { ConversationProvider } from "../chat-step/server/types";
// The sole dependency bridge. Both source modules are usable without the other.
export function codexChatProvider(connection: CodexConnection): ConversationProvider {
  return { run: input => connection.run(input) };
}
