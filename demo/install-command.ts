// Use the page's own host/base path: localhost in development, the site URL when hosted.
export function installCommand(module: "codex-connection" | "chat-step" | "example") {
  const url = new URL(`${import.meta.env.BASE_URL}install/${module}.md`, window.location.origin);
  const quoted = "'" + url.href.replace(/'/g, "'\\''") + "'";
  return `curl -fsSL ${quoted}`;
}
