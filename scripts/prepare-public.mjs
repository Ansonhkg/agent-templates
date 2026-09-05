import { cp, lstat, mkdir } from "node:fs/promises";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = process.argv[2] && resolve(process.argv[2]);
if (!target || target === root || root.startsWith(target + "/") || target.startsWith(root + "/")) throw new Error("Choose a new destination outside the template's parents");
try { await lstat(target); throw new Error("Destination already exists; refusing to overwrite"); } catch (error) { if (error.code !== "ENOENT") throw error; }
const paths = ["src", "demo", "tests", "e2e", "scripts", ".github", ".gitignore", "package.json", "package-lock.json", "tsconfig.json", "vite.config.ts", "playwright.config.ts", "index.html", "README.md", "INTEGRATION.md", "SECURITY.md", "CONTRIBUTING.md", "RELEASE.md", "VALIDATION.md"];
try { await lstat(join(root, "LICENSE")); paths.push("LICENSE"); } catch (error) { if (error.code !== "ENOENT") throw error; }
await mkdir(target, { recursive: true });
for (const path of paths) await cp(join(root, path), join(target, path), { recursive: true, dereference: false, errorOnExist: true });
console.log(`Prepared source-only release at ${target}. Local data, images, screenshots, environment files, build output and Git history were excluded.`);
if (!paths.includes("LICENSE")) console.log("Public release requires a LICENSE. The source export can be committed to a private repository now.");
