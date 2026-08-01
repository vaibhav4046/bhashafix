import { defineConfig, devices } from "@playwright/test";

/**
 * Production smoke only. Separate from playwright.config.ts so the deployed
 * target is never exercised by the local suite, and no local server is started.
 */
export default defineConfig({
  testDir: "./tests/production",
  fullyParallel: false,
  forbidOnly: true,
  retries: 1,
  reporter: [["line"]],
  outputDir: "artifacts/playwright-production",
  use: {
    ...devices["Desktop Chrome"],
    trace: "retain-on-failure",
  },
});
