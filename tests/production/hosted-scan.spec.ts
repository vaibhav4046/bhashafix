import { expect, test } from "@playwright/test";

/**
 * The judge journey: paste a URL on the live homepage, press the button, and
 * see a real render come back. This exercises the panel, the API, Chromium in
 * the function and the result rendering as one path.
 */
const productionUrl = process.env.BHASHAFIX_PRODUCTION_URL;
if (!productionUrl) {
  throw new Error("BHASHAFIX_PRODUCTION_URL is required.");
}

test("a visitor can scan a real site from the homepage", async ({ page }) => {
  const problems: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(`console: ${m.text()}`);
  });
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));

  await page.goto(productionUrl, { waitUntil: "domcontentloaded" });

  await page.getByLabel("Public URL").fill("https://example.com");
  await page.getByLabel("Page locale").fill("en-US");
  await page.getByLabel("Target locale").fill("ar-SA");
  await page.getByLabel("Viewport", { exact: true }).selectOption("mobile");
  await page.getByRole("button", { name: /Check this page/ }).click();

  // Cold start plus two renders. Generous, but it must finish.
  const result = page.locator(".ls-browser-result");
  await expect(result).toBeVisible({ timeout: 90_000 });

  await expect(result).toContainText("LIVE_PUBLIC_BROWSER_SCAN");
  await expect(result).toContainText("chromium");
  await expect(
    result.getByRole("button", { name: "Download JSON evidence ↓" }),
  ).toBeVisible();

  // The screenshots must be real images the function returned, not placeholders.
  const shots = result.locator(".ls-render-strip img");
  await expect(shots).toHaveCount(2);
  for (const shot of await shots.all()) {
    const src = await shot.getAttribute("src");
    expect(src?.startsWith("data:image/png;base64,")).toBe(true);
    expect((src ?? "").length).toBeGreaterThan(5_000);
    const decoded = await shot.evaluate(
      (node) => (node as HTMLImageElement).naturalWidth,
    );
    expect(decoded, "the browser must actually decode the screenshot").toBeGreaterThan(0);
  }

  // Requesting Arabic from an English page is a real finding, and opening it
  // must show the measurement behind it.
  const firstIssue = result.locator(".ls-issue-list button").first();
  await expect(firstIssue).toContainText("BF-LOC-");
  await firstIssue.click();
  await expect(result.locator(".ls-issue-body").first()).toBeVisible();

  await expect(result).toContainText("What this run did not do");
  expect(problems, "console and hydration errors").toEqual([]);
});
