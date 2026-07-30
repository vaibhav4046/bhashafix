import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import path from "node:path";

const screenshotDir = path.resolve("submission/screenshots");

function collectConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test("landing page is responsive, themeable and accessible", async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Every language. Every viewport. Evidence before release.",
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBe(0);

  await page.screenshot({
    path: path.join(screenshotDir, "01-landing-dark.png"),
    fullPage: true,
  });

  await page.getByRole("button", { name: "Use light theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.screenshot({
    path: path.join(screenshotDir, "02-landing-light.png"),
    fullPage: false,
  });

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(
    accessibility.violations.filter((violation) =>
      violation.impact === "critical" || violation.impact === "serious",
    ),
  ).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("mobile and reduced-motion layouts remain usable", async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBe(0);
  expect(
    Number.parseFloat(
      await page.locator(".language-orbit").evaluate(
        (element) => getComputedStyle(element).animationDuration,
      ),
    ),
  ).toBeLessThanOrEqual(0.001);

  await page.screenshot({
    path: path.join(screenshotDir, "03-landing-mobile.png"),
    fullPage: false,
  });
  expect(consoleErrors).toEqual([]);
});

test("scan wizard accepts arbitrary valid BCP 47 targets", async ({ page }) => {
  await page.goto("/scan/new");
  await page.getByRole("button", { name: "Continue →" }).click();
  await page.getByLabel("Search target locales").fill("zh-Hant");
  await expect(page.getByRole("button", { name: "zh-Hant-TW" })).toBeVisible();

  await page.getByLabel("Custom BCP 47 target locale").fill("pt-br");
  await page.getByRole("button", { name: "Add locale" }).click();
  await expect(page.getByRole("button", { name: "pt-BR ✓" })).toBeVisible();
});

test("replay workspace presents genuine 10-to-0 evidence and toggles the real fixture", async ({
  page,
}) => {
  const consoleErrors = collectConsoleErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/scan/atlaspay-replay");

  await expect(
    page.getByRole("heading", { level: 1, name: "AtlasPay global release gate" }),
  ).toBeVisible();
  await expect(page.getByText("10 → 0", { exact: true })).toBeVisible();
  await expect(page.locator("iframe")).toHaveAttribute(
    "src",
    "/atlaspay/ar-SA/dashboard?state=broken",
  );
  await page.getByRole("button", { name: "Before repair ↔" }).click();
  await expect(page.locator("iframe")).toHaveAttribute(
    "src",
    "/atlaspay/ar-SA/dashboard?state=fixed",
  );

  await page.screenshot({
    path: path.join(screenshotDir, "04-scan-workspace.png"),
    fullPage: false,
  });
  expect(consoleErrors).toEqual([]);
});

test("AtlasPay exposes and then repairs the Arabic direction predicate", async ({ page }) => {
  await page.goto("/atlaspay/ar-SA/dashboard?state=broken");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar-SA");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");

  await page.goto("/atlaspay/ar-SA/dashboard?state=fixed");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar-SA");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
});

test("proof report exposes verified release evidence and portable exports", async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/scan/atlaspay-replay/report");

  await expect(
    page.getByRole("heading", { name: "Ready for engineering release." }),
  ).toBeVisible();
  const sourceRegression = page.locator("article").filter({ hasText: "Source regression" });
  await expect(sourceRegression).toContainText("PASS");
  const downloads = page.locator("a[download]");
  await expect(downloads).toHaveCount(7);
  for (const link of await downloads.evaluateAll((items) =>
    items.map((item) => ({
      href: (item as HTMLAnchorElement).href,
      filename: (item as HTMLAnchorElement).download,
    })),
  )) {
    const response = await page.request.get(link.href);
    expect(response.ok(), `${link.filename} should download`).toBe(true);
    expect(
      (await response.body()).byteLength,
      `${link.filename} should not be empty`,
    ).toBeGreaterThan(20);
  }
  await page.screenshot({
    path: path.join(screenshotDir, "05-proof-report.png"),
    fullPage: true,
  });
  expect(consoleErrors).toEqual([]);
});

test("synthetic localisation preview is isolated, labelled and locale-aware", async ({
  page,
}) => {
  const consoleErrors = collectConsoleErrors(page);
  await page.goto("/playground");
  await expect(
    page.getByText(
      "SYNTHETIC LOCALISATION PREVIEW — NOT THE PRODUCTION WEBSITE",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByLabel("Target BCP 47 locale").fill("bn-BD");
  const preview = page.frameLocator('iframe[title*="Synthetic bn-BD"]');
  await expect(preview.locator("html")).toHaveAttribute("lang", "bn-BD");
  await expect(preview.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(preview.locator("body")).toContainText("{amount}");
  await expect(preview.locator("body")).toContainText("AtlasPay");
  await page.screenshot({
    path: path.join(screenshotDir, "08-synthetic-preview.png"),
    fullPage: true,
  });
  expect(consoleErrors).toEqual([]);
});
