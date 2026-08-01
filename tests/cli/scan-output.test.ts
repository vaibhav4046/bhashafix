import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import type { RenderedRoute } from "../../packages/browser/src/index";
import { ScanSchema, type Issue, type Scan, type Severity } from "../../packages/shared/src/index";
import { displayPath } from "../../packages/cli/src/display-path";
import { resolveReport } from "../../packages/cli/src/open-report";
import { renderScanReportHtml } from "../../packages/cli/src/report-html";
import { deriveScanStages } from "../../packages/cli/src/scan-stages";
import { formatScanSummary } from "../../packages/cli/src/scan-summary";

const temporary: string[] = [];

async function workspace() {
  const directory = await mkdtemp(path.join(tmpdir(), "bhashafix-cli-output-"));
  temporary.push(directory);
  return directory;
}

afterAll(async () => {
  await Promise.all(
    temporary.map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

function render(overrides: {
  elements?: number;
  runAxe?: boolean;
  axeViolations?: number;
  screenshotPath?: string | null;
  status?: number;
  consoleErrors?: number;
  failedRequests?: number;
}): RenderedRoute {
  return {
    request: {
      url: "https://example.com/",
      route: "/",
      locale: "en-GB",
      viewport: { name: "mobile", width: 390, height: 844 },
      theme: "light",
      runAxe: overrides.runAxe ?? true,
    },
    measurement: {
      elements: Array.from({ length: overrides.elements ?? 3 }, () => ({})),
    },
    runtime: {
      status: overrides.status ?? 200,
      consoleErrors: Array.from({ length: overrides.consoleErrors ?? 0 }, () => "boom"),
      failedRequests: Array.from({ length: overrides.failedRequests ?? 0 }, () => ({
        url: "https://example.com/missing.css",
        failure: "net::ERR_FAILED",
      })),
      axeViolations: Array.from({ length: overrides.axeViolations ?? 0 }, () => ({
        id: "color-contrast",
        impact: "serious",
        help: "Elements must have sufficient colour contrast",
        nodes: ["p"],
      })),
    },
    screenshotPath:
      overrides.screenshotPath === undefined ? null : overrides.screenshotPath,
    domPath: null,
    engine: "chromium",
    renderedAt: "2026-08-01T00:00:00.000Z",
    durationMs: 1200,
  } as unknown as RenderedRoute;
}

function issue(severity: Severity, overrides: Partial<Issue> = {}): Issue {
  return {
    issueId: `issue-${severity}-${overrides.ruleId ?? "x"}`,
    scanId: "browser-test",
    origin: "LIVE_PUBLIC_BROWSER_SCAN",
    category: "locale",
    ruleId: "BF-LOC-LANG-MISMATCH",
    severity,
    confidence: "verified",
    locale: "de-DE",
    route: "/",
    viewport: { name: "mobile", width: 390, height: 844 },
    browser: "chromium",
    selector: "html",
    sourceHint: null,
    description: "The page was requested as de-DE but declares en.",
    whyItMatters: "The served document is not the language the user asked for.",
    evidence: { declaredLang: "en" },
    measuredEvidence: { declaredLang: "en" },
    screenshotBefore: null,
    recommendedAction: "Serve the de-DE document.",
    deterministicPredicate: "primarySubtag(lang) === primarySubtag(locale)",
    humanReviewRequired: false,
    ...overrides,
  };
}

function scanWith(issues: Issue[]): Scan {
  return ScanSchema.parse({
    scanId: "browser-test",
    origin: "LIVE_PUBLIC_BROWSER_SCAN",
    status: issues.length > 0 ? "completed_with_warnings" : "completed",
    startedAt: "2026-08-01T00:00:00.000Z",
    completedAt: "2026-08-01T00:00:05.000Z",
    config: {
      projectRoot: process.cwd(),
      url: "https://example.com/",
      sourceLocale: "en-GB",
      locales: ["en-GB", "de-DE"],
      routes: ["/"],
      viewports: [{ name: "mobile", width: 390, height: 844 }],
      browsers: ["chromium"],
      themes: ["light"],
      maxPages: 5,
      maxDepth: 1,
      rateLimitPerSecond: 2,
      noAi: true,
      hosted: false,
      allowLocalhost: true,
      allowlist: [],
    },
    issues,
    routesDiscovered: ["/"],
    localesTested: ["en-GB", "de-DE"],
    engineVersion: "0.2.0",
    mode: "live",
  });
}

describe("scan output paths", () => {
  it("prefers the relative form only when it is shorter than the absolute one", () => {
    const inside = path.join(process.cwd(), ".bhashafix", "scans", "abc", "report.html");
    expect(displayPath(inside)).toBe("./.bhashafix/scans/abc/report.html");
    expect(displayPath(path.join(process.cwd(), ".bhashafix"), { directory: true })).toBe(
      "./.bhashafix/",
    );
    const outside = path.resolve(tmpdir(), "elsewhere", "report.html");
    expect(displayPath(outside)).toBe(outside.split(path.sep).join("/"));
  });
});

describe("scan stages", () => {
  it("reports accessibility as skipped when axe did not run", async () => {
    const staged = await deriveScanStages({
      routesFromFlag: false,
      routes: ["/"],
      discoveredRoutes: 4,
      renders: [render({ runAxe: false }), render({ runAxe: false })],
      engine: "chromium",
      remote: false,
    });
    const axe = staged.stages.find((stage) => stage.name === "Accessibility checks");
    expect(axe?.status).toBe("skipped");
    expect(axe?.detail).toContain("did not run");
  });

  it("counts axe violations only from renders that requested axe", async () => {
    const staged = await deriveScanStages({
      routesFromFlag: false,
      routes: ["/"],
      discoveredRoutes: 1,
      renders: [render({ runAxe: true, axeViolations: 2 }), render({ runAxe: true })],
      engine: "chromium",
      remote: false,
    });
    const axe = staged.stages.find((stage) => stage.name === "Accessibility checks");
    expect(axe?.status).toBe("ok");
    expect(staged.axeRenders).toBe(2);
    expect(staged.axeViolations).toBe(2);
  });

  it("only counts screenshots that exist on disk", async () => {
    const directory = await workspace();
    const real = path.join(directory, "real.png");
    await writeFile(real, "not-really-a-png");
    const staged = await deriveScanStages({
      routesFromFlag: false,
      routes: ["/"],
      discoveredRoutes: 1,
      renders: [
        render({ screenshotPath: real }),
        render({ screenshotPath: path.join(directory, "missing.png") }),
      ],
      engine: "chromium",
      remote: false,
    });
    expect(staged.screenshotsOnDisk).toEqual([real]);
    const capture = staged.stages.find((stage) => stage.name === "Screenshot capture");
    expect(capture?.status).toBe("ok");
    expect(capture?.detail).toContain("1 PNG");
  });

  it("marks route discovery as skipped when routes were supplied", async () => {
    const staged = await deriveScanStages({
      routesFromFlag: true,
      routes: ["/", "/pricing"],
      discoveredRoutes: 2,
      renders: [render({})],
      engine: "chromium",
      remote: false,
    });
    const discovery = staged.stages.find((stage) => stage.name === "Route discovery");
    expect(discovery?.status).toBe("skipped");
    expect(discovery?.detail).toContain("--routes");
  });

  it("fails the measurement stage when nothing was measured", async () => {
    const staged = await deriveScanStages({
      routesFromFlag: false,
      routes: ["/"],
      discoveredRoutes: 1,
      renders: [render({ elements: 0 })],
      engine: "chromium",
      remote: false,
    });
    const measurement = staged.stages.find((stage) => stage.name === "DOM measurement");
    expect(measurement?.status).toBe("failed");
  });
});

describe("scan summary", () => {
  it("derives every count from the severities actually present", async () => {
    const scan = scanWith([
      issue("blocking"),
      issue("blocking", { issueId: "b2" }),
      issue("warning", { issueId: "w1" }),
      issue("review", { issueId: "r1", humanReviewRequired: true }),
    ]);
    const staged = await deriveScanStages({
      routesFromFlag: false,
      routes: ["/"],
      discoveredRoutes: 1,
      renders: [render({})],
      engine: "chromium",
      remote: false,
    });
    const summary = formatScanSummary({
      scan,
      stages: staged.stages,
      engine: "chromium",
      remote: false,
      reportPath: null,
      artifactDir: path.join(process.cwd(), ".bhashafix", "scans", "browser-test"),
      screenshots: [],
      exitCode: 1,
    });
    expect(summary).toContain("2 blocking issues");
    expect(summary).toContain("1 warning");
    expect(summary).toContain("1 review item");
    expect(summary).toContain("1 human review item");
    expect(summary).not.toContain("serious");
    expect(summary).toContain("Exit code: 1");
  });

  it("omits paths for files that were not written", async () => {
    const staged = await deriveScanStages({
      routesFromFlag: false,
      routes: ["/"],
      discoveredRoutes: 1,
      renders: [render({})],
      engine: "chromium",
      remote: false,
    });
    const summary = formatScanSummary({
      scan: scanWith([]),
      stages: staged.stages,
      engine: "chromium",
      remote: false,
      reportPath: null,
      artifactDir: path.join(process.cwd(), ".bhashafix", "scans", "browser-test"),
      screenshots: [],
      exitCode: 0,
    });
    expect(summary).toContain("No issues found");
    expect(summary).not.toContain("Report:");
    expect(summary).not.toContain("Screenshots:");
  });
});

describe("offline report", () => {
  const html = renderScanReportHtml({
    scan: scanWith([issue("blocking", { screenshotBefore: "/abs/dir/shot.png" })]),
    stages: [
      { name: "Browser rendering", status: "ok", detail: "1 render on chromium" },
      { name: "Accessibility checks", status: "skipped", detail: "axe-core did not run" },
    ],
    renders: [
      {
        route: "/",
        locale: "de-DE",
        viewport: "mobile",
        theme: "light",
        url: "https://example.com/?locale=de-DE",
        status: 200,
        durationMs: 1200,
        measuredElements: 3,
        consoleErrors: 0,
        failedRequests: 0,
        axeViolations: 0,
        screenshotFile: "shot.png",
        domFile: "shot.html",
      },
    ],
    generatedAt: "2026-08-01T00:00:05.000Z",
  });

  it("references artifacts beside it and nothing off the machine", () => {
    const references = [...html.matchAll(/(?:src|href)="([^"]*)"/g)].map(
      (match) => match[1],
    );
    expect(references).toContain("shot.png");
    expect(references.length).toBeGreaterThan(0);
    for (const reference of references) {
      expect(reference).not.toMatch(/^(https?:)?\/\//);
      expect(reference).not.toContain("/");
    }
    expect(html).not.toContain("<script");
    expect(html).toContain("<style>");
  });

  it("escapes issue text rather than injecting it", () => {
    const injected = renderScanReportHtml({
      scan: scanWith([
        issue("blocking", { description: '<img src=x onerror="alert(1)">' }),
      ]),
      stages: [],
      renders: [],
      generatedAt: "2026-08-01T00:00:05.000Z",
    });
    expect(injected).not.toContain('<img src=x onerror="alert(1)">');
    expect(injected).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });
});

describe("report resolution", () => {
  it("returns null when the project has no report", async () => {
    const directory = await workspace();
    expect(await resolveReport(directory)).toBeNull();
    expect(await resolveReport(directory, "browser-missing")).toBeNull();
  });

  it("falls back to the newest scan directory holding a report", async () => {
    const directory = await workspace();
    const scans = path.join(directory, ".bhashafix", "scans");
    await mkdir(path.join(scans, "browser-old"), { recursive: true });
    await mkdir(path.join(scans, "browser-new"), { recursive: true });
    // Only the newer directory carries a report, so it must win outright.
    await writeFile(path.join(scans, "browser-new", "report.html"), "<h1>ok</h1>");
    const resolved = await resolveReport(directory);
    expect(resolved?.scanId).toBe("browser-new");
    expect(resolved?.source).toBe("directory");
    expect(resolved?.reportPath).toBe(
      path.join(scans, "browser-new", "report.html"),
    );
  });

  it("honours an explicit scan id", async () => {
    const directory = await workspace();
    const scans = path.join(directory, ".bhashafix", "scans");
    await mkdir(path.join(scans, "browser-one"), { recursive: true });
    await writeFile(path.join(scans, "browser-one", "report.html"), "<h1>ok</h1>");
    const resolved = await resolveReport(directory, "browser-one");
    expect(resolved?.source).toBe("requested");
    expect(resolved?.scanId).toBe("browser-one");
  });
});
