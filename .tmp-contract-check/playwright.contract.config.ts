import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./.tmp-contract-check",
  fullyParallel: false,
  workers: 1,
  reporter: [["line"]],
  outputDir: "artifacts/playwright-contract",
  use: {
    baseURL: "http://127.0.0.1:3101",
    trace: "off",
    screenshot: "off",
    video: "off",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "pnpm start --hostname 127.0.0.1 --port 3101",
    url: "http://127.0.0.1:3101",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
