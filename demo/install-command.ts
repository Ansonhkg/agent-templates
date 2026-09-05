// One command prints the selected integration guide for the user's coding agent.
// GitHub CLI uses its existing authentication; no token appears in the command.
export function installCommand(module: "codex-connection" | "chat-step" | "example") {
  return `gh api repos/Ansonhkg/agent-templates/contents/install/${module}.md -H 'Accept: application/vnd.github.raw+json'`;
}
