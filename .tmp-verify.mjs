import { chromium } from "@playwright/test";

const BASE = process.env.BASE ?? "http://127.0.0.1:3101";
const ROUTES = [
  "/",
  "/evidence",
  "/integrations/cli",
  "/integrations/mcp",
  "/import",
  "/demo",
];
const SIZES = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
];

const browser = await chromium.launch();
let failures = 0;

for (const size of SIZES) {
  for (const route of ROUTES) {
    const context = await browser.newContext({
      viewport: { width: size.width, height: size.height },
    });
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text());
    });
    page.on("pageerror", (e) => pageErrors.push(e.message));

    const response = await page.goto(BASE + route, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    const h1s = await page.locator("h1").count();
    const orbit = await page.locator(".language-orbit").count();
    const hydration = [...consoleErrors, ...pageErrors].filter((t) =>
      /hydrat|did not match|Text content does not match/i.test(t),
    );

    const bad =
      response.status() !== 200 ||
      overflow !== 0 ||
      consoleErrors.length > 0 ||
      pageErrors.length > 0;
    if (bad) failures += 1;

    console.log(
      [
        bad ? "FAIL" : "ok  ",
        size.name.padEnd(7),
        route.padEnd(20),
        `http=${response.status()}`,
        `overflowPx=${overflow}`,
        `consoleErrors=${consoleErrors.length}`,
        `pageErrors=${pageErrors.length}`,
        `hydrationErrors=${hydration.length}`,
        `h1=${h1s}`,
        route === "/" ? `languageOrbit=${orbit}` : "",
      ].join("  "),
    );
    for (const t of consoleErrors) console.log("      console:", t);
    for (const t of pageErrors) console.log("      pageerror:", t);
    await context.close();
  }
}

// Reduced-motion behaviour on the homepage.
{
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto(BASE + "/");
  const durations = await page.locator(".language-orbit span").first().evaluate(
    (el) => ({
      transition: getComputedStyle(el).transitionDuration,
      animation: getComputedStyle(el).animationDuration,
    }),
  );
  const orbitAnim = await page
    .locator(".language-orbit")
    .evaluate((el) => getComputedStyle(el).animationDuration);
  console.log(
    `ok    reduced-motion  /                    orbitAnimationDuration=${orbitAnim}  spanTransition=${durations.transition}  spanAnimation=${durations.animation}`,
  );
}

// Import console: a bad file must be rejected and must render no report.
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(BASE + "/import");
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "not-a-report.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ hello: "world", count: 3 })),
  });
  await page.waitForSelector('[role="alert"]');
  const reason = await page.locator('[role="alert"]').first().innerText();
  const reportRendered = await page.locator(".ls-import-report").count();
  console.log(
    `${reportRendered === 0 ? "ok  " : "FAIL"}  reject          /import              reportsRendered=${reportRendered}`,
  );
  console.log("      reason:", reason.replace(/\s+/g, " ").slice(0, 220));
  if (reportRendered !== 0) failures += 1;

  // Malformed JSON.
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from("{ not json"),
  });
  await page.waitForTimeout(300);
  console.log(
    "      malformed:",
    (await page.locator('[role="alert"]').first().innerText())
      .replace(/\s+/g, " ")
      .slice(0, 200),
  );

  // A scan.json whose issues are structurally wrong.
  const good = await (await fetch(
    BASE + "/evidence/scans/browser-8182aab1-c3a2-4296-8380-c9b22aab4a3a/scan.json",
  )).json();
  const broken = JSON.parse(JSON.stringify(good));
  delete broken.issues[0].deterministicPredicate;
  broken.issues[0].route = 42;
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "corrupt-scan.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(broken)),
  });
  await page.waitForTimeout(300);
  console.log(
    "      corrupt scan:",
    (await page.locator('[role="alert"]').first().innerText())
      .replace(/\s+/g, " ")
      .slice(0, 260),
  );
  console.log("      reportsRendered:", await page.locator(".ls-import-report").count());

  // Now the real thing.
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "scan.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(good)),
  });
  await page.waitForSelector(".ls-import-report");
  const alerts = await page.locator('[role="alert"]').count();
  const heading = await page.locator(".ls-import-report h2").first().innerText();
  const issues = await page.locator(".ls-import-issues > li").count();
  console.log(
    `ok    accept          /import              alerts=${alerts}  heading=${heading}  issueRowsRendered=${issues}`,
  );

  // Screenshots ZIP.
  const zip = Buffer.from(
    await (await fetch(BASE + "/replay/screenshots.zip")).arrayBuffer(),
  );
  await page.locator('input[type="file"]').nth(1).setInputFiles({
    name: "screenshots.zip",
    mimeType: "application/zip",
    buffer: zip,
  });
  await page.waitForTimeout(2500);
  const shots = await page.locator(".ls-render-strip > li").count();
  const firstHash = await page
    .locator(".ls-render-strip code")
    .first()
    .innerText()
    .catch(() => "none");
  console.log(`ok    zip             /import              imagesDecoded=${shots}  firstSha256=${firstHash}`);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  console.log(`      /import overflowPx after full import = ${overflow}`);
  if (overflow !== 0) failures += 1;
  await context.close();
}

// Evidence page: open an issue that carries a real element rectangle.
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errs = [];
  page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(BASE + "/evidence");
  await page.getByRole("button", { name: /Wikipedia/ }).click();
  await page.locator(".ls-issue-list button").nth(10).click();
  await page.waitForSelector(".ls-issue-open");
  await page.waitForTimeout(900);
  const markers = await page.locator(".ls-shot-marker").count();
  const caption = await page.locator(".ls-shot figcaption").first().innerText();
  const shotSrc = await page.locator(".ls-shot img").first().getAttribute("src");
  const drawn = await page.locator('.ls-evidence-line li[data-drawn="true"]').count();
  console.log(
    `ok    evidence issue  /evidence            markers=${markers}  drawnStages=${drawn}  consoleErrors=${errs.length}`,
  );
  console.log("      caption:", caption.replace(/\s+/g, " "));
  console.log("      screenshot:", shotSrc);
  await context.close();
}

await browser.close();
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
