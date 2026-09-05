import { chromium, expect } from "@playwright/test";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const chatRequests: string[] = [];
const errors: string[] = [];
page.on("pageerror", error => errors.push(error.message));
try {
  await page.route("**/api/steps/**", route => { chatRequests.push(route.request().url()); return route.abort(); });
  await page.goto("http://127.0.0.1:4328/#connection");
  await expect(page.locator("h1")).toHaveText("Sign in with Codex");
  await expect(page.getByRole("textbox", { name: "Message", exact: true })).toHaveCount(0);
  await expect(page.locator("main").getByRole("link", { name: /chat/ })).toHaveCount(0);
  const button = page.getByRole("button", { name: "Test connection", exact: true });
  await expect(button).toBeEnabled({ timeout: 30000 });
  await page.route("**/api/codex/test", route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Temporary test failure" }) }), { times: 1 });
  await button.click();
  await expect(page.getByRole("alert")).toContainText("Temporary test failure");
  // The retry invokes the real local Codex account, with no provider mock.
  const response = page.waitForResponse(r => r.url().endsWith("/api/codex/test") && r.request().method() === "POST", { timeout: 60000 });
  await button.click();
  await expect(page.getByRole("button", { name: "Testing…", exact: true })).toBeDisabled();
  const result = await response;
  expect(result.status()).toBe(200);
  const payload = await result.json();
  expect(payload.text).toMatch(/Codex connection works/i);
  await expect(page.getByRole("status", { name: "Connection test result" })).toHaveText(payload.text);
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(chatRequests).toEqual([]);
  expect(errors).toEqual([]);
  await page.screenshot({ path: "test-results/connection-standalone.png", fullPage: true });
  console.log("Passed: standalone real Codex request, error/retry UI, no chat requests or interface, no page errors.");
} finally { await browser.close(); }
