// Run from any directory; GitHub CLI uses your existing private-repository access.
export function installCommand(module: "codex-connection" | "chat-step" | "example") {
  const option = module === "example" ? "--example" : `--module ${module}`;
  return `gh repo clone Ansonhkg/agent-templates\nnode agent-templates/scripts/copy.mjs /path/to/my-app ${option}`;
}
