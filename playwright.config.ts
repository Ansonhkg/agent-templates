import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  timeout: 15 * 60_000,
  expect: { timeout: 15000 },
  use: { baseURL: "http://127.0.0.1:4337", viewport: { width: 1440, height: 1100 }, screenshot: "only-on-failure", trace: "retain-on-failure" },
  webServer: {
    command: "node --import tsx demo/server.ts",
    url: "http://127.0.0.1:4337/api/bootstrap",
    reuseExistingServer: false,
    env: { PORT: "4337", CHAT_STEP_HMR_PORT: "24337", CHAT_STEP_DATA_DIR: `.data/e2e-${Date.now()}` },
    timeout: 30000,
  },
});
