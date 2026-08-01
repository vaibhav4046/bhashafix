import { expect, test } from "@playwright/test";

/**
 * Smoke the deployed product. Run with:
 *   BHASHAFIX_PRODUCTION_URL=https://bhashafix.vercel.app pnpm exec playwright test tests/e2e/production-smoke.spec.ts
 * Skipped unless that variable is set, so it never runs against localhost by
 * accident and never silently passes on the wrong target.
 */
const productionUrl = process.env.BHASHAFIX_PRODUCTION_URL;

test.skip(!productionUrl, "BHASHAFIX_PRODUCTION_URL is not set.");

const ROUTES = ["/", "/scan", "/docs", "/trust", "/integrations"];
const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
];

for (const viewport of VIEWPORTS) {
  test(`production is usable at ${viewport.name}`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
    });
    const page = await context.newPage();
    const problems: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") problems.push(`console: ${message.text()}`);
    });
    page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));

    for (const route of ROUTES) {
      const response = await page.goto(new URL(route, productionUrl).href, {
        waitUntil: "domcontentloaded",
      });
      expect(response?.status(), `${route} status`).toBeLessThan(400);
      await expect(page.locator("main")).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${route} horizontal overflow at ${viewport.name}`).toBeLessThanOrEqual(1);
    }

    expect(problems, "console and hydration errors").toEqual([]);
    await context.close();
  });
}
