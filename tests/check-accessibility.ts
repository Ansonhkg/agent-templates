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
    ["/#character/source", "Copy it. Make it your step."],
    ["/#connection", "Sign in with Codex"],
    ["/#connection/source", "Sign in with Codex — source"],
  ]) {
    await page.goto(`http://127.0.0.1:4328${route}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    await expect(page.locator(".demo-header button, .demo-header nav")).toHaveCount(0);
    if (route !== "/") await expect.poll(() => page.locator(".template-panel:visible").evaluate(el => getComputedStyle(el).opacity)).toBe("1");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    reports.push({ route, violations: results.violations.map(v => ({ id: v.id, impact: v.impact, targets: v.nodes.map(n => n.target) })) });
    await page.screenshot({ path: `test-results/gallery/${route.replace(/\W/g, "") || "home"}.png`, fullPage: true });
  }
  await page.getByRole("tab", { name: "Demo", exact: true }).click();
  await page.getByRole("button", { name: /Codex connected|Connect Codex/, exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Codex connection" })).toBeVisible();
  const modal = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  reports.push({ route: "account dialog", violations: modal.violations.map(v => ({ id: v.id, impact: v.impact, targets: v.nodes.map(n => n.target) })) });
  await page.getByRole("button", { name: "Close connection", exact: true }).click();
  await page.getByRole("link", { name: "← Templates", exact: true }).click();
  await expect(page.getByText("Two templates.", { exact: false })).toHaveCount(0);
  await expect(page.locator(".gallery-reuse, .gallery-platform")).toHaveCount(0);
  await expect(page.locator(".gallery-grid article a")).toHaveCount(2);
  await page.getByRole("link", { name: "Open demo →", exact: true }).last().click();
  await expect(page.getByRole("tab", { name: "Demo", exact: true })).toHaveAttribute("aria-selected", "true");
  const input = page.getByRole("textbox", { name: "Message", exact: true });
  await input.fill("Keep this unsent draft — 中文");
  await expect.poll(() => page.locator(".cs-composer").evaluate(el => Math.round(el.getBoundingClientRect().height))).toBe(98);
  const dimensions = await page.locator(".cs-composer").evaluate(el => ({ height: el.getBoundingClientRect().height, color: getComputedStyle(el).backgroundColor, field: getComputedStyle(el.querySelector("textarea")!).backgroundColor }));
  expect(dimensions.height).toBe(98);
  expect(["transparent", "rgba(0, 0, 0, 0)", dimensions.color]).toContain(dimensions.field);
  await page.getByRole("tab", { name: "Source", exact: true }).click();
  await expect(page.locator("#demo-panel")).toBeHidden();
  expect(await page.locator("#source-panel").evaluate(el => getComputedStyle(el).animationName)).toBe("none");
  await page.getByRole("tab", { name: "Source", exact: true }).press("ArrowLeft");
  await expect(input).toHaveValue("Keep this unsent draft — 中文");
  await expect(page.getByRole("tab", { name: "Demo", exact: true })).toBeFocused();
  await input.fill("");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("tab", { name: "Source", exact: true }).click();
  expect(await page.locator("#source-panel").evaluate(el => getComputedStyle(el).animationName)).toBe("none");
  await page.reload();
  await expect(page.getByRole("tab", { name: "Source", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ["templates", "character", "connection/source"]) {
    await page.goto(`http://127.0.0.1:4328/#${route}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  }
  expect(errors).toEqual([]);
  console.log(JSON.stringify(reports, null, 2));
  if (reports.some(r => r.violations.length)) process.exitCode = 1;
} finally { await browser.close(); }
