import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, type Page } from "@playwright/test";
import { placeholderMismatch } from "@bhashafix/linguistic-engine";

type FixtureIssue = {
  issueId: string;
  origin: "LOCAL_REPOSITORY_SCAN";
  category: "locale" | "visual" | "linguistic" | "accessibility";
  ruleId: string;
  severity: "blocking";
  confidence: "verified";
  locale: string;
  route: "/";
  viewport: { width: 390; height: 844 };
  browser: "chromium";
  selector: string;
  description: string;
  whyItMatters: string;
  evidence: Record<string, unknown>;
  screenshotBefore: string;
  sourceHint: string;
  recommendedAction: string;
  deterministicPredicate: string;
};

const fixture = process.argv[2] ?? "clean";
const root = process.cwd();
const outputRoot = path.join(root, "artifacts", "fixtures");
await mkdir(outputRoot, { recursive: true });

function issue(
  ruleId: string,
  input: Omit<FixtureIssue, "issueId" | "origin" | "ruleId" | "severity" | "confidence" | "route" | "viewport" | "browser" | "screenshotBefore" | "sourceHint">,
): FixtureIssue {
  return {
    issueId: `fixture-${ruleId}`,
    origin: "LOCAL_REPOSITORY_SCAN",
    ruleId,
    severity: "blocking",
    confidence: "verified",
    route: "/",
    viewport: { width: 390, height: 844 },
    browser: "chromium",
    screenshotBefore: `artifacts/fixtures/${fixture}.png`,
    sourceHint: `fixtures/acceptance/${fixture}/index.html`,
    ...input,
  };
}

async function analyse(page: Page) {
  const measurements = await page.evaluate(() => {
    const arabic = document.querySelector<HTMLElement>("[data-locale='ar-SA']");
    const german = document.querySelector<HTMLElement>("[data-locale='de-DE']");
    const placeholder = document.querySelector<HTMLElement>(
      "[data-placeholder-source]",
    );
    const unnamed = document.querySelector<HTMLElement>(
      "[data-testid='icon-button']",
    );
    const visibleText = [...document.body.querySelectorAll("*")]
      .flatMap((element) =>
        [...element.childNodes]
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent?.trim() ?? ""),
      )
      .filter(Boolean);
    return {
      lang: document.documentElement.lang,
      arabicDir: arabic?.dir ?? "",
      germanClientWidth: german?.clientWidth ?? 0,
      germanScrollWidth: german?.scrollWidth ?? 0,
      rawKey: visibleText.find((text) =>
        /^(?:[a-z][a-z0-9_]*\.)+[a-z][a-z0-9_]*$/.test(text),
      ),
      placeholderSource: placeholder?.dataset.placeholderSource ?? "",
      placeholderTarget: placeholder?.textContent?.trim() ?? "",
      accessibleName:
        unnamed?.getAttribute("aria-label") ??
        unnamed?.getAttribute("title") ??
        unnamed?.textContent?.trim() ??
        "",
    };
  });
  const issues: FixtureIssue[] = [];
  if (measurements.lang !== "en-GB") {
    issues.push(issue("wrong-page-lang", {
      category: "locale", locale: "en-GB", selector: "html",
      description: "The source page declares en-US instead of en-GB.",
      whyItMatters: "Assistive technology and locale formatting can use the wrong regional language profile.",
      evidence: { actual: measurements.lang, expected: "en-GB" },
      recommendedAction: "Set html lang to en-GB.",
      deterministicPredicate: "document.documentElement.lang === 'en-GB'",
    }));
  }
  if (measurements.arabicDir !== "rtl") {
    issues.push(issue("wrong-arabic-direction", {
      category: "locale", locale: "ar-SA", selector: "[data-locale='ar-SA']",
      description: "The Arabic region is rendered left-to-right.",
      whyItMatters: "Reading order and navigation direction are confusing for Arabic users.",
      evidence: { actual: measurements.arabicDir, expected: "rtl" },
      recommendedAction: "Set direction from the locale profile.",
      deterministicPredicate: "element.dir === 'rtl'",
    }));
  }
  if (measurements.germanScrollWidth > measurements.germanClientWidth + 1) {
    issues.push(issue("german-cta-overflow", {
      category: "visual", locale: "de-DE", selector: "[data-locale='de-DE']",
      description: "The German CTA is wider than its fixed button box.",
      whyItMatters: "Users cannot read the complete action label.",
      evidence: { clientWidth: measurements.germanClientWidth, scrollWidth: measurements.germanScrollWidth },
      recommendedAction: "Allow the CTA to grow or wrap.",
      deterministicPredicate: "element.scrollWidth <= element.clientWidth + 1",
    }));
  }
  if (measurements.rawKey) {
    issues.push(issue("raw-translation-key", {
      category: "linguistic", locale: "en-GB", selector: "p",
      description: "A raw translation key is visible.",
      whyItMatters: "Users see internal implementation text instead of product copy.",
      evidence: { visibleText: measurements.rawKey },
      recommendedAction: "Provide the missing visible translation.",
      deterministicPredicate: "visible text does not match a raw key",
    }));
  }
  const parity = placeholderMismatch(
    measurements.placeholderSource,
    measurements.placeholderTarget,
  );
  if (!parity.valid) {
    issues.push(issue("placeholder-mismatch", {
      category: "linguistic", locale: "fr-FR", selector: "[data-placeholder-source]",
      description: "The French translation removed the {amount} placeholder.",
      whyItMatters: "Runtime values cannot be inserted safely.",
      evidence: parity,
      recommendedAction: "Restore the exact protected placeholder.",
      deterministicPredicate: "protectedTokens(source) === protectedTokens(target)",
    }));
  }
  if (!measurements.accessibleName) {
    issues.push(issue("missing-accessible-name", {
      category: "accessibility", locale: "en-GB", selector: "[data-testid='icon-button']",
      description: "The icon button has no accessible name.",
      whyItMatters: "Screen-reader users cannot identify the control.",
      evidence: { accessibleName: "" },
      recommendedAction: "Add a concise localised accessible name.",
      deterministicPredicate: "accessibleName.trim().length > 0",
    }));
  }
  return issues;
}

if (fixture === "blocked") {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  let failure = "";
  try {
    await page.goto("http://127.0.0.1:1", { timeout: 2_000 });
  } catch (error) {
    failure = error instanceof Error ? error.message.split("\n")[0] : String(error);
  }
  await browser.close();
  if (!failure) throw new Error("Blocked fixture unexpectedly became reachable.");
  const receipt = {
    scanId: "fixture-blocked",
    origin: "LOCAL_REPOSITORY_SCAN",
    status: "failed",
    target: "http://127.0.0.1:1",
    reportGenerated: false,
    retryAvailable: true,
    error: failure,
  };
  await writeFile(
    path.join(outputRoot, "blocked-failure.json"),
    `${JSON.stringify(receipt, null, 2)}\n`,
  );
  console.log("FIXTURE blocked truthful failure; reportGenerated=false; retryAvailable=true");
  process.exit(0);
}

if (!["clean", "broken"].includes(fixture)) {
  throw new Error("Usage: fixture-acceptance.ts clean|broken|blocked");
}

const html = await readFile(
  path.join(root, "fixtures", "acceptance", fixture, "index.html"),
);
const server = createServer((request, response) => {
  if (request.url === "/" || request.url === "/index.html") {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(html);
    return;
  }
  response.writeHead(404);
  response.end("Not found");
});
await new Promise<void>((resolve) =>
  server.listen(0, "127.0.0.1", () => resolve()),
);
const address = server.address();
if (!address || typeof address === "string") throw new Error("Fixture server failed.");
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`http://127.0.0.1:${address.port}`, { waitUntil: "networkidle" });
  const issues = await analyse(page);
  await page.screenshot({
    path: path.join(outputRoot, `${fixture}.png`),
    fullPage: true,
  });
  const expected = fixture === "clean"
    ? []
    : [
        "wrong-page-lang",
        "wrong-arabic-direction",
        "german-cta-overflow",
        "raw-translation-key",
        "placeholder-mismatch",
        "missing-accessible-name",
      ];
  const actual = issues.map((item) => item.ruleId);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${fixture} fixture mismatch: expected ${expected.join(",")}; got ${actual.join(",")}`,
    );
  }
  const report = {
    schemaVersion: "1.0",
    scanId: `fixture-${fixture}`,
    origin: "LOCAL_REPOSITORY_SCAN",
    status: issues.length ? "completed_with_warnings" : "completed",
    target: `fixtures/acceptance/${fixture}`,
    routesDiscovered: ["/"],
    screenshots: [`artifacts/fixtures/${fixture}.png`],
    blocking: issues.length,
    issues,
  };
  await writeFile(
    path.join(outputRoot, `${fixture}-report.json`),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(
    `FIXTURE ${fixture} PASS; blocking=${issues.length}; rules=${actual.join(",") || "none"}`,
  );
} finally {
  await browser.close();
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}
