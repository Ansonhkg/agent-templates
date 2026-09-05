import { testConnection } from "./connection-probe";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomBytes, randomUUID } from "node:crypto";
import { resolve, join } from "node:path";
import { createServer as createViteServer } from "vite";
import { CodexConnection } from "../src/codex-connection/server/connection";
import { handleCodexConnection } from "../src/codex-connection/server/http-handler";
import { codexChatProvider } from "../src/integrations/codex-chat-step";
import { SessionRuntime } from "../src/chat-step/server/session-runtime";
import { SessionStore } from "../src/chat-step/server/session-store";
import { handleSession, json } from "../src/chat-step/server/http-handler";
import { characterStep } from "../src/features/character/step";
import { styleStep } from "../src/features/style/step";
import type { ImageService } from "../src/features/visual/tools";
import type { VisualDraft } from "../src/features/visual/model";
const root = resolve(process.env.CHAT_STEP_DATA_DIR || ".data/chat-step-demo");
const assets = join(root, "assets");
await mkdir(assets, { recursive: true });
const connection = new CodexConnection({ workspace: join(root, "workspace"), codexHome: process.env.CODEX_CONNECTION_HOME });
const provider = codexChatProvider(connection);
const images: ImageService = {
  async generate(prompt, referenceId, signal) {
    if (referenceId && !/^[\da-f-]{36}$/.test(referenceId))
      throw new Error("Invalid reference ID");
    const image = await connection.generateImage(
      prompt,
      signal,
      referenceId ? [join(assets, `${referenceId}.png`)] : [],
    );
    signal.throwIfAborted();
    const id = randomUUID();
    await writeFile(join(assets, `${id}.png`), image);
    return { id, url: `/assets/${id}.png` };
  },
};
const sessions = new Map<string, SessionRuntime<VisualDraft>>();
// Only this small JSON projection goes to the model; image services stay server-side.
const getCharacterContext = () => ({ purpose: "Article illustration mascot", language: "English", framing: "Full body on white", referencePolicy: "Preserve identity across revisions" });
const getStyleContext = () => ({ purpose: "Compare rendering styles", language: "English", scene: "A pink blob presses scattered notes into a paper crane", referencePolicy: "Keep the scene and composition consistent" });
for (const step of [characterStep(images, getCharacterContext), styleStep(images, getStyleContext)]) {
  const session = new SessionRuntime(
    step,
    provider,
    new SessionStore(join(root, "sessions")),
  );
  await session.init(`${step.id}-demo`);
  sessions.set(step.id, session);
}
const token = randomBytes(32).toString("hex");
const vite = await createViteServer({
  server: { middlewareMode: true, hmr: { port: Number(process.env.CHAT_STEP_HMR_PORT || 24328) } },
  appType: "spa",
});
const server = createServer(async (req, res) => {
  const host = req.headers.host || "";
  if (
    !/^127\.0\.0\.1:\d+$/.test(host) ||
    (req.headers.origin && req.headers.origin !== `http://${host}`)
  ) {
    json(res, { error: "Local app requests only" }, 403);
    return;
  }
  const path = new URL(req.url || "/", `http://${host}`).pathname;
  try {
    if (path.startsWith("/api/")) {
      if (
        !["GET", "HEAD"].includes(req.method || "GET") &&
        (path.startsWith("/api/codex") ? req.headers["x-codex-connection-token"] : req.headers["x-chat-step-token"]) !== token
      ) {
        json(res, { error: "Reload to reconnect" }, 403);
        return;
      }
      if (path === "/api/bootstrap") {
        json(res, { token });
        return;
      }
      if (path === "/api/account") {
        json(res, await connection.refresh());
        return;
      }
      if (path === "/api/codex/test" && req.method === "POST") {
        await testConnection(connection, res); return;
      }
      if (path === "/api/codex" || path.startsWith("/api/codex/")) {
        await handleCodexConnection(path.slice("/api/codex".length), req, res, connection); return;
      }
      const match = path.match(/^\/api\/steps\/(character|style)(.*)$/);
      if (!match) {
        json(res, { error: "Not found" }, 404);
        return;
      }
      await handleSession(match[2], req, res, sessions.get(match[1])!);
      return;
    }
    if (path.startsWith("/assets/")) {
      if (!/^\/assets\/[\da-f-]{36}\.png$/.test(path)) {
        json(res, { error: "Not found" }, 404);
        return;
      }
      const bytes = await readFile(join(assets, path.slice(8)));
      res.writeHead(200, {
        "Content-Type": "image/png",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(bytes);
      return;
    }
    vite.middlewares(req, res, () => json(res, { error: "Not found" }, 404));
  } catch (error) {
    json(res, { error: (error as Error).message }, 400);
  }
});
server.listen(Number(process.env.PORT || 4328), "127.0.0.1", () =>
  console.log(
    `Chat step demo → http://127.0.0.1:${(server.address() as { port: number }).port}`,
  ),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    for (const session of sessions.values()) session.cancel();
    connection.close();
    server.closeAllConnections();
    server.close();
    void vite.close().then(() => process.exit(0));
  });
