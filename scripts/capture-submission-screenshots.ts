/**
 * Capture the submission screenshots from the running product.
 *
 * Every image here is a real Chromium capture of the built application at the
 * moment the deck is prepared. Nothing is drawn, mocked or reused from an
 * earlier design.
 */
import { mkdir, readdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, type Page } from "@playwright/test";

const root = process.cwd();
const outputDirectory = path.join(root, "submission", "screenshots");
const baseUrl = process.env.BHASHAFIX_CAPTURE_BASE_URL ?? "http://127.0.0.1:3000";

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

type Shot = {
  file: string;
  route: string;
  viewport: { width: number; height: number };
  theme: "light" | "dark";
  /** Wait for this to exist before capturing, so no shot is of a loading state. */
  waitFor?: string;
  prepare?: (page: Page) => Promise<void>;
};

const SHOTS: Shot[] = [
  { file: "01-landing-dark.png", route: "/", viewport: DESKTOP, theme: "dark", waitFor: "main" },
  { file: "02-landing-light.png", route: "/", viewport: DESKTOP, theme: "light", waitFor: "main" },
  { file: "03-landing-mobile.png", route: "/", viewport: MOBILE, theme: "dark", waitFor: "main" },
  {
    file: "04-scan-workspace.png",
    route: "/scan/atlaspay-replay",
    viewport: DESKTOP,
    theme: "dark",
    waitFor: "main",
  },
  {
    file: "05-proof-report.png",
    route: "/scan/atlaspay-replay/report",
    viewport: DESKTOP,
    theme: "dark",
    waitFor: "main",
  },
  {
    file: "06-bounded-repair.png",
    route: "/scan/atlaspay-replay/repairs",
    viewport: DESKTOP,
    theme: "dark",
    waitFor: "main",
  },
  {
    file: "07-issue-evidence.png",
    route: "/scan/atlaspay-replay/issues",
    viewport: DESKTOP,
    theme: "dark",
    waitFor: "main",
  },
  {
    file: "08-synthetic-preview.png",
    route: "/playground",
    viewport: DESKTOP,
    theme: "dark",
    waitFor: "main",
  },
];

await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch();
const captured: Array<{ file: string; bytes: number }> = [];
const consoleErrors: Array<{ route: string; message: string }> = [];

try {
  for (const shot of SHOTS) {
    const context = await browser.newContext({
      viewport: shot.viewport,
      colorScheme: shot.theme,
      locale: "en-GB",
    });
    // The product stores its theme in localStorage, so the context colour
    // scheme alone does not switch it. Seed it before the first paint.
    await context.addInitScript((theme: string) => {
      // This also runs inside the sandboxed preview iframe, which has no
      // same-origin access and throws on localStorage. Ignore it there.
      try {
        window.localStorage.setItem("bhashafix-theme", theme);
      } catch {
        /* sandboxed frame */
      }
    }, shot.theme);
    const page = await context.newPage();
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push({ route: shot.route, message: message.text().slice(0, 300) });
      }
    });
    page.on("pageerror", (error) => {
      consoleErrors.push({ route: shot.route, message: error.message.slice(0, 300) });
    });

    await page.goto(new URL(shot.route, baseUrl).href, { waitUntil: "domcontentloaded" });
    if (shot.waitFor) await page.waitForSelector(shot.waitFor, { timeout: 20_000 });
    await shot.prepare?.(page);
    await page.waitForTimeout(900);

    const file = path.join(outputDirectory, shot.file);
    await page.screenshot({ path: file, fullPage: false });
    const { size } = await stat(file);
    if (size < 10_000) {
      throw new Error(`${shot.file} is only ${size} bytes; the page probably did not render.`);
    }
    captured.push({ file: shot.file, bytes: size });
    await context.close();
  }
} finally {
  await browser.close();
}

// Remove images from earlier designs so the deck cannot pick up a stale frame.
const STALE = [
  "lab-mobile.png",
  "lab-verified.png",
  "landing-desktop.png",
  "landing-mobile.png",
  "report-comparison.png",
  "report-summary.png",
];
const present = new Set(await readdir(outputDirectory));
const removed: string[] = [];
for (const file of STALE) {
  if (!present.has(file)) continue;
  await unlink(path.join(outputDirectory, file));
  removed.push(file);
}

await writeFile(
  path.join(root, "artifacts", "screenshot-capture.json"),
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      baseUrl,
      captured,
      removedStale: removed,
      consoleErrors,
    },
    null,
    2,
  )}\n`,
);

if (consoleErrors.length > 0) {
  console.error(
    `Console errors during capture:\n${consoleErrors
      .map((entry) => `  ${entry.route}: ${entry.message}`)
      .join("\n")}`,
  );
  process.exit(1);
}

console.log(
  `SCREENSHOTS captured ${captured.length} real frames from ${baseUrl}; removed ${removed.length} stale file(s); console errors 0`,
);
