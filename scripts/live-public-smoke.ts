import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const root = process.cwd();
const baseUrl = process.env.BHASHAFIX_BASE_URL ?? "http://127.0.0.1:3000";
const targetUrl =
  process.env.BHASHAFIX_PUBLIC_TARGET ?? "https://www.mozilla.org/";
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
  await page.getByPlaceholder("https://www.mozilla.org").fill(targetUrl);
  const scanResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/scan") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Run real scan →" }).click();
  const scanResponse = await scanResponsePromise;
  await page
    .getByRole("heading", {
      name: "Here is exactly what BhashaFix found.",
    })
    .waitFor({ state: "visible", timeout: 60_000 });

  const payload = await scanResponse.json();
  if (!scanResponse.ok()) {
    throw new Error(payload.error ?? `Live scan returned HTTP ${scanResponse.status()}.`);
  }
  if (payload.mode !== "live hosted HTTP scan" || payload.summary.routesChecked < 1) {
    throw new Error("Live scan response did not contain real route evidence.");
  }
  const dottedBrandFalsePositive = payload.issues.some(
    (issue: { category: string; measuredEvidence: string }) =>
      issue.category === "raw-translation-key" &&
      issue.measuredEvidence.includes("Mozilla.ai"),
  );
  if (dottedBrandFalsePositive) {
    throw new Error("Live scan regressed: Mozilla.ai was classified as a raw key.");
  }

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  if (overflow !== 0) throw new Error(`Live result has ${overflow}px viewport overflow.`);
  if (consoleErrors.length > 0) {
    throw new Error(`Live result emitted console errors: ${consoleErrors.join(" | ")}`);
  }

  await page.screenshot({ path: screenshotPath, fullPage: true });
  await page.locator(".live-scan-result").scrollIntoViewIfNeeded();
  await page.screenshot({ path: proofScreenshotPath, fullPage: false });
  const receipt = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    target: payload.target,
    mode: payload.mode,
    routesChecked: payload.summary.routesChecked,
    stringsExtracted: payload.summary.stringsExtracted,
    verifiedBlocking: payload.summary.verifiedBlocking,
    warnings: payload.summary.warnings,
    robotsPolicy: payload.robots.checked ? "READ" : "UNAVAILABLE",
    staticHttpOnly: payload.scope.browserRendered === false,
    viewportOverflow: overflow,
    consoleErrors,
    screenshots: [screenshotPath, proofScreenshotPath].map((file) =>
      path.relative(root, file).replaceAll("\\", "/"),
    ),
    status: "PASS",
  };
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(
    `LIVE PUBLIC SCAN PASS (${receipt.routesChecked} real routes; ${receipt.stringsExtracted} strings; ${receipt.verifiedBlocking} blocking in checks run; screenshots ${receipt.screenshots.join(", ")})`,
  );
} finally {
  await browser.close();
}
