import { expect, test } from "@playwright/test";

/**
 * Smoke the deployed product:
 *
 *   BHASHAFIX_PRODUCTION_URL=https://bhashafix.vercel.app pnpm production:smoke
 *
 * This lives outside tests/e2e and has its own config so it is never picked up
 * by the local suite. It fails rather than skipping when the target is absent:
 * a skipped smoke test reads as a pass and would hide an unverified deploy.
 */
const productionUrl = process.env.BHASHAFIX_PRODUCTION_URL;
if (!productionUrl) {
  throw new Error(
    "BHASHAFIX_PRODUCTION_URL is required. Set it to the deployment you intend to smoke.",
  );
}

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
