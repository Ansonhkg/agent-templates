import { chromium, expect } from "@playwright/test";
import { preview } from "vite";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const run = promisify(execFile);
import { readFile } from "node:fs/promises";
const server = await preview({ preview: { host: "127.0.0.1", port: 4340, strictPort: true } });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
try {
  for (const origin of ["http://127.0.0.1:4328", "http://127.0.0.1:4340"]) {
    await page.goto(`${origin}/#templates`);
    const commands = page.locator("main .cs-code-block pre code");
    await expect(commands).toHaveCount(2);
    for (const [index, name] of ["codex-connection", "chat-step"].entries()) {
      const url = `${origin}/install/${name}.md`;
      await expect(commands.nth(index)).toHaveText(`curl -fsSL '${url}'`);
      const { stdout: text } = await run("curl", ["-fsSL", "--max-time", "15", url], { encoding: "utf8" });
      expect(text).toBe(await readFile(`install/${name}.md`, "utf8"));
    }
    await page.getByRole("button", { name: "Source & reuse", exact: true }).click();
    const url = `${origin}/install/example.md`;
    await expect(page.locator("main .cs-code-block pre code").filter({ hasText: `curl -fsSL '${url}'` })).toBeVisible();
    expect((await run("curl", ["-fsSL", "--max-time", "15", url], { encoding: "utf8" })).stdout).toBe(await readFile("install/example.md", "utf8"));
    console.log(`Passed: all three displayed curl commands return exact agent guides from ${origin}.`);
  }
} finally {
  await browser.close();
  server.httpServer.closeAllConnections();
  await new Promise<void>((resolve, reject) => server.httpServer.close(error => error ? reject(error) : resolve()));
}
