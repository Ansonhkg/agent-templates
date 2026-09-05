import { chromium, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"], viewport: { width: 1280, height: 1000 } });
const page = await context.newPage();
const errors: string[] = [];
page.on("pageerror", error => errors.push(error.message));
try {
  await mkdir("test-results/code", { recursive: true });
  let checked = 0;
  for (const route of ["connection", "source", "templates"]) {
    await page.goto(`http://127.0.0.1:4328/#${route}`);
    await expect(page.locator("h1")).toBeVisible();
    const blocks = page.locator("main .cs-code-block");
    await expect(blocks.first()).toBeVisible();
    for (const block of await blocks.all()) {
      const expected = await block.locator("pre code").innerText();
      const button = block.getByRole("button", { name: /^Copy / });
      await button.click();
      await expect(button).toHaveAttribute("data-state", "copied");
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
      await expect(block.getByRole("status")).toHaveText("Copied");
      checked++;
    }
    if (route !== "templates") await expect(page.locator(".hljs-keyword").first()).toBeVisible();
    await page.screenshot({ path: `test-results/code/${route}.png`, fullPage: true });
  }
  const last = page.locator("main .cs-code-block").last();
  await expect(last.getByRole("button")).toHaveAttribute("data-state", "idle", { timeout: 5000 });
  await page.evaluate('Object.defineProperty(navigator.clipboard, "writeText", { configurable: true, value: async () => { throw new Error("Clipboard denied"); } })');
  await last.getByRole("button").click();
  await expect(last.getByRole("button")).toHaveAttribute("data-state", "error");
  await expect(last.getByRole("status")).toHaveText("Copy failed");
  await expect(last).toContainText("Select the text to copy, or try again.");
  await page.evaluate(() => { Reflect.deleteProperty(navigator.clipboard, "writeText"); });
  await last.getByRole("button").click();
  await expect(last.getByRole("button")).toHaveAttribute("data-state", "copied");
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ["connection", "source", "templates"]) {
    await page.goto(`http://127.0.0.1:4328/#${route}`);
    await expect(page.locator("main .cs-code-block").first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  }
  expect(errors).toEqual([]);
  console.log(`Passed: ${checked} code blocks copied exactly; highlighting, copied/reset/error/retry states, and mobile overflow verified.`);
} finally { await browser.close(); }
