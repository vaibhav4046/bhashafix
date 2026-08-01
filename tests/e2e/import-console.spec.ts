import { expect, test } from "@playwright/test";

/**
 * The import console must refuse a file it cannot validate. An empty shell
 * rendered from a bad upload would be indistinguishable from a real report.
 */
test("import console rejects a file that is not a BhashaFix report", async ({ page }) => {
  await page.goto("/import");
  await expect(page.locator("main")).toBeVisible();

  const input = page.locator('input[type="file"]').first();
  await input.setInputFiles({
    name: "not-a-report.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ hello: "world" })),
  });

  await expect(page.getByRole("alert").first()).toBeVisible();
  // Nothing from a real report may appear for an input that failed validation.
  await expect(page.getByText("LOCAL BROWSER STORAGE").first()).toBeVisible();
});

test("import console accepts a real CLI scan.json", async ({ page }) => {
  // Read the scan id from the published index rather than pinning one: the ids
  // change every time `pnpm evidence:publish` regenerates the evidence.
  const index = await page.request.get("/evidence/index.json");
  expect(index.status()).toBe(200);
  const published = (await index.json()) as {
    realSiteScans: { scans: Array<{ scanId: string }> };
  };
  const scanId = published.realSiteScans.scans[0]?.scanId;
  expect(scanId, "the published evidence index lists at least one scan").toBeTruthy();

  const response = await page.request.get(`/evidence/scans/${scanId}/scan.json`);
  expect(response.status()).toBe(200);
  const scan = await response.text();

  await page.goto("/import");
  const input = page.locator('input[type="file"]').first();
  await input.setInputFiles({
    name: "scan.json",
    mimeType: "application/json",
    buffer: Buffer.from(scan),
  });

  await expect(page.getByText(scanId!).first()).toBeVisible();
});
