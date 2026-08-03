import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const root = process.cwd();
const baseUrl = process.env.BHASHAFIX_BASE_URL ?? "http://127.0.0.1:3000";
const targetUrl =
  process.env.BHASHAFIX_PUBLIC_TARGET ?? "https://example.com/";
const screenshotPath = path.join(
  root,
  "submission",
  "screenshots",
  "09-live-public-product.png",
);
const proofScreenshotPath = path.join(
  root,
  "submission",
  "screenshots",
  "10-live-public-product-proof.png",
);
const receiptPath = path.join(
  root,
  "artifacts",
  "live-public-scan-receipt.json",
);

await mkdir(path.dirname(screenshotPath), { recursive: true });
await mkdir(path.dirname(receiptPath), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleErrors: string[] = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => consoleErrors.push(error.message));

try {
  await page.goto(`${baseUrl}/scan/new`, { waitUntil: "networkidle" });
  const browserScan = page.locator(".canonical-browser-scan");
  await browserScan.getByLabel("Public URL").fill(targetUrl);
  const scanResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/scan/browser") &&
      response.request().method() === "POST",
    { timeout: 90_000 },
  );
  await browserScan.getByRole("button", { name: "Check this page →" }).click();
  const scanResponse = await scanResponsePromise;
  const payload = await scanResponse.json();
  if (!scanResponse.ok()) {
    throw new Error(payload.error ?? `Live scan returned HTTP ${scanResponse.status()}.`);
  }
  await browserScan.locator(".ls-browser-result").waitFor({
    state: "visible",
    timeout: 10_000,
  });
  if (
    payload.origin !== "LIVE_PUBLIC_BROWSER_SCAN" ||
    payload.scope?.browserRendered !== true ||
    payload.summary?.renders < 1
  ) {
    throw new Error("Live scan response did not contain real Chromium evidence.");
  }
  if (
    payload.renders.some(
      (render: { screenshot?: string | null; measuredElements?: number }) =>
        !render.screenshot || !render.measuredElements,
    )
  ) {
    throw new Error("Live scan returned a render without screenshot measurements.");
  }

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  if (overflow !== 0) throw new Error(`Live result has ${overflow}px viewport overflow.`);
  if (consoleErrors.length > 0) {
    throw new Error(`Live result emitted console errors: ${consoleErrors.join(" | ")}`);
  }

  await page.screenshot({ path: screenshotPath, fullPage: true });
  await browserScan.locator(".ls-browser-result").scrollIntoViewIfNeeded();
  await page.screenshot({ path: proofScreenshotPath, fullPage: false });
  const receipt = {
    generatedAt: new Date().toISOString(),
    scanId: payload.scanId,
    origin: payload.origin,
    baseUrl,
    target: payload.target,
    mode: "bounded hosted Chromium scan",
    engine: payload.engine,
    routesChecked: payload.scope.routes,
    localesRendered: payload.scope.locales,
    renders: payload.summary.renders,
    measuredElements: payload.renders.reduce(
      (total: number, render: { measuredElements: number }) =>
        total + render.measuredElements,
      0,
    ),
    verifiedBlocking: payload.summary.blocking,
    warnings: payload.summary.issues - payload.summary.blocking,
    browserRendered: payload.scope.browserRendered,
    axeExecuted: payload.scope.axeExecuted,
    viewportOverflow: overflow,
    consoleErrors,
    screenshots: [screenshotPath, proofScreenshotPath].map((file) =>
      path.relative(root, file).replaceAll("\\", "/"),
    ),
    status: "PASS",
  };
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(
    `LIVE PUBLIC BROWSER SCAN PASS (${receipt.renders} real Chromium renders; ${receipt.measuredElements} measured elements; ${receipt.verifiedBlocking} blocking in checks run; screenshots ${receipt.screenshots.join(", ")})`,
  );
} finally {
  await browser.close();
}
