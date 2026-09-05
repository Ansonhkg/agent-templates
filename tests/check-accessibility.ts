import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const page = await context.newPage();
const errors: string[] = [];
page.on("pageerror", e => errors.push(e.message));
const reports = [];
try {
  await mkdir("test-results/gallery", { recursive: true });
  for (const [route, heading] of [
    ["/", "A starting point for your next app."],
    ["/#character", "Create your character"],
    ["/#style", "Create your style"],
    ["/#source", "Copy it. Make it your step."],
    ["/#connection", "Sign in with Codex"],
  ]) {
    await page.goto(`http://127.0.0.1:4328${route}`);
    await expect(page.locator("h1")).toHaveText(heading);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    reports.push({ route, violations: results.violations.map(v => ({ id: v.id, impact: v.impact, targets: v.nodes.map(n => n.target) })) });
    await page.screenshot({ path: `test-results/gallery/${route.replace(/\W/g, "") || "home"}.png`, fullPage: true });
  }
  await page.getByRole("button", { name: /Codex connected|Connect Codex/, exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Codex connection" })).toBeVisible();
  const modal = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  reports.push({ route: "account dialog", violations: modal.violations.map(v => ({ id: v.id, impact: v.impact, targets: v.nodes.map(n => n.target) })) });
  await page.getByRole("button", { name: "Close connection", exact: true }).click();
  await expect(page.locator("main").getByRole("link", { name: /chat demo/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Chat + result", exact: true }).click();
  await expect(page.locator("h1")).toHaveText("Create your character");
  await page.getByRole("button", { name: "Style example", exact: true }).click();
  await expect(page.locator("h1")).toHaveText("Create your style");
  await page.getByRole("button", { name: "Templates", exact: true }).click();
  await page.getByRole("link", { name: "Preview Sign in with Codex", exact: true }).click();
  await expect(page.locator("h1")).toHaveText("Sign in with Codex");
  await page.goBack();
  await expect(page.locator("h1")).toHaveText("A starting point for your next app.");
  await page.getByRole("link", { name: "Preview Chat and result", exact: true }).click();
  await page.reload();
  await expect(page.locator("h1")).toHaveText("Create your character");
  await page.getByRole("button", { name: "Templates", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/gallery/mobile.png", fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  expect(errors).toEqual([]);
  console.log(JSON.stringify(reports, null, 2));
  if (reports.some(r => r.violations.length)) process.exitCode = 1;
} finally { await browser.close(); }
