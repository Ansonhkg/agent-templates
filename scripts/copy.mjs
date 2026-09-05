import { cp, lstat, mkdir } from "node:fs/promises";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [destination, ...options] = process.argv.slice(2);
let selected = "both";
let example = false;
for (let i = 0; i < options.length; i++) {
  if (options[i] === "--example") example = true;
  else if (options[i] === "--module") selected = options[++i];
  else selected = "invalid";
}
if (!destination || !["both", "codex-connection", "chat-step"].includes(selected) || (example && selected !== "both")) {
  console.error("Usage: node scripts/copy.mjs /path/to/app [--module codex-connection|chat-step|both] [--example]\nExamples require both modules."); process.exit(1);
}
const target = resolve(destination);
const folders = selected === "both" ? ["codex-connection", "chat-step", "integrations"] : [selected];
if (example) folders.push("features/character", "features/style", "features/visual");
for (const folder of folders) {
  const path = join(target, "src", folder);
  try { await lstat(path); console.error(`Refusing to overwrite ${path}`); process.exit(1); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
for (const folder of folders) {
  const path = join(target, "src", folder);
  await mkdir(dirname(path), { recursive: true });
  await cp(join(root, "src", folder), path, { recursive: true, errorOnExist: true, force: false });
}
console.log(`Copied ${folders.join(", ")} into ${target}/src. You own these files.\nUI dependencies: react, react-dom. Chat rendering: react-markdown, remark-gfm. Chat server validation: zod. Server adapters: Node.js.\nSee src/${selected === "both" ? "integrations" : selected}/README.md for setup and wiring. No existing files or package.json were changed.`);
