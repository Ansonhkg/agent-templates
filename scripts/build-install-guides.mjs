import { copyFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = new URL("../", import.meta.url);
const output = new URL("public/install/", root);
await mkdir(output, { recursive: true });
// Only the reviewed agent instructions are exposed as public static files.
for (const name of ["codex-connection", "chat-step", "example"]) {
  await copyFile(new URL(`install/${name}.md`, root), new URL(`${name}.md`, output));
}
console.log(`Prepared agent instructions in ${fileURLToPath(output)}`);
