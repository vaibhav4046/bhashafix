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

  await page.getByRole("button", { name: "Toggle color theme" }).click();
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

test("real public scan UI shows exact routes, evidence and honest coverage", async ({
  page,
}) => {
  const consoleErrors = collectConsoleErrors(page);
  await page.route("**/api/scan", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        scanId: "web-ui-contract",
        origin: "LIVE_PUBLIC_SCAN",
        status: "completed_with_warnings",
        mode: "live hosted HTTP scan",
        startedAt: "2026-07-30T12:00:00.000Z",
        completedAt: "2026-07-30T12:00:01.000Z",
        target: "https://product.example/",
        sourceLocale: "en-GB",
        requestedLocales: ["de-DE", "ar-SA", "ja-JP", "pt-BR"],
        scope: {
          maxRoutes: 5,
          crawlDepth: 1,
          browserRendered: false,
          repositoryAccess: false,
          authenticated: false,
        },
        summary: {
          routesChecked: 2,
          stringsExtracted: 14,
          verifiedBlocking: 1,
          warnings: 1,
        },
        routes: [
          {
            url: "https://product.example/",
            route: "/",
            status: 200,
            contentType: "text/html",
            strings: 9,
            declaredLang: "en",
            declaredDir: null,
            title: "Product",
            issueCount: 0,
          },
          {
            url: "https://product.example/pricing",
            route: "/pricing",
            status: 200,
            contentType: "text/html",
            strings: 5,
            declaredLang: null,
            declaredDir: null,
            title: "Pricing",
            issueCount: 2,
          },
        ],
        issues: [
          {
            issueId: "web_missing_lang",
            scanId: "web-ui-contract",
            origin: "LIVE_PUBLIC_SCAN",
            category: "locale",
            ruleId: "missing-page-lang",
            severity: "blocking",
            confidence: "verified",
            locale: "en-GB",
            route: "/pricing",
            viewport: null,
            browser: "http",
            selector: "html",
            description: "The document does not declare an HTML language.",
            whyItMatters: "Assistive technology cannot determine the language.",
            evidence: { measurement: "lang is missing" },
            measuredEvidence: "lang is missing",
            screenshotBefore: null,
            sourceHint: null,
            recommendedAction: "Set html lang to en-GB.",
            deterministicPredicate: "html[lang] exists",
          },
          {
            issueId: "web_missing_alt",
            scanId: "web-ui-contract",
            origin: "LIVE_PUBLIC_SCAN",
            category: "accessibility",
            ruleId: "missing-image-alt",
            severity: "warning",
            confidence: "verified",
            locale: "en-GB",
            route: "/pricing",
            viewport: null,
            browser: "http",
            selector: "img:not([alt])",
            description: "1 image omits the alt attribute.",
            whyItMatters: "Screen-reader users may miss meaningful content.",
            evidence: { measurement: "img_without_alt=1" },
            measuredEvidence: "img_without_alt=1",
            screenshotBefore: null,
            sourceHint: null,
            recommendedAction: "Add localised alternative text.",
            deterministicPredicate: "every img has an alt attribute",
          },
        ],
        robots: {
          checked: true,
          policyUrl: "https://product.example/robots.txt",
          skippedRoutes: 0,
        },
        checksRun: [
          "SSRF, DNS and redirect validation",
          "same-origin internal-link discovery",
        ],
        notRun: [
          "JavaScript browser rendering",
          "visual overflow, clipping or overlap",
        ],
        limitations: [
          "This hosted scan checked 2 real HTML routes up to a hard limit of 5.",
        ],
      }),
    });
  });

  await page.goto("/scan/new");
  await expect(
    page.getByRole("heading", { name: "Check a real public website." }),
  ).toBeVisible();
  await page.locator(".locale-followup summary").click();
  await page.getByLabel("Custom BCP 47 target locale").fill("pt-br");
  await page.getByRole("button", { name: "Add locale" }).click();
  await expect(page.locator(".locale-followup summary")).toContainText("pt-BR");

  await page.getByPlaceholder("https://www.mozilla.org").fill(
    "https://product.example",
  );
  await page.getByRole("button", { name: "Run real scan →" }).click();
  await expect(page.getByText("LIVE_PUBLIC_SCAN · REAL HTTP RESPONSES")).toBeVisible();
  await expect(page.getByText("Routes actually fetched")).toBeVisible();
  await expect(page.getByRole("cell", { name: "/pricing" })).toBeVisible();
  await expect(page.getByText("missing page lang")).toBeVisible();
  await expect(page.getByText("JavaScript browser rendering")).toBeVisible();
  await expect(
    page.getByText("No blockers found — not a release guarantee"),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBe(0);
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(
    accessibility.violations.filter((violation) =>
      violation.impact === "critical" || violation.impact === "serious",
    ),
  ).toEqual([]);
  await page.getByRole("link", { name: "Open saved scan →" }).click();
  await expect(
    page.getByText("SCAN NOT AVAILABLE IN THIS BROWSER"),
  ).toHaveCount(0);
  await expect(page.getByText("LIVE_PUBLIC_SCAN", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Checks that ran" })).toBeVisible();
  await page.goto("/scan/web-ui-contract/report");
  await expect(page.getByText("SCAN-SPECIFIC EXPORTS")).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test("locked product routes, glossary persistence and motion lab are functional", async ({
  page,
}) => {
  const consoleErrors = collectConsoleErrors(page);
  for (const route of [
    "/scan/atlaspay-replay/overview",
    "/scan/atlaspay-replay/routes",
    "/scan/atlaspay-replay/accessibility",
    "/demo",
    "/integrations/cli",
    "/integrations/mcp",
    "/integrations/ci",
    "/trust",
    "/motion-lab",
  ]) {
    await page.goto(route);
    await expect(page.locator("main")).toBeVisible();
  }
  await page.goto("/motion-lab");
  await page.getByRole("button", { name: "Run motion checks" }).click();
  await expect(page.locator(".motion-ledger")).toHaveClass(/active/);
  await expect(page.locator(".motion-frame")).toHaveCSS("pointer-events", "none");

  await page.goto("/glossary");
  await page.getByRole("button", { name: "Add entry" }).click();
  const source = page.getByPlaceholder("Required source term").last();
  await source.fill("Beneficiary");
  await page.getByPlaceholder("Required approved form").last().fill("Begünstigter");
  await page.reload();
  await page.getByLabel("Search glossary").fill("Beneficiary");
  await expect(page.getByLabel(/Source term/).last()).toHaveValue("Beneficiary");
  await page.getByRole("button", { name: "Delete" }).click();

  await page.goto("/memory");
  await page.getByLabel("Search translation memory").fill("Available balance");
  await expect(page.getByText("الرصيد المتاح")).toBeVisible();
  await page.getByRole("button", { name: "Mark approved" }).click();
  await page.reload();
  await page.getByLabel("Search translation memory").fill("Available balance");
  await expect(page.getByRole("button", { name: "Human approved" })).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test("hosted scan API blocks loopback targets without fabricating a result", async ({
  request,
}) => {
  const response = await request.post("/api/scan", {
    data: {
      url: "http://127.0.0.1:3000",
      sourceLocale: "en-GB",
      locales: ["de-DE"],
      maxRoutes: 2,
    },
  });
  expect(response.status()).toBe(422);
  expect((await response.json()).error).toContain(
    "Private-network destinations are blocked",
  );
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
  await expect(downloads).toHaveCount(8);
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
      "SYNTHETIC_LOCALISATION_PREVIEW — NOT THE PRODUCTION WEBSITE",
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
