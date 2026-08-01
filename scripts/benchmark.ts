/**
 * Ground-truth benchmark for the browser scan engine.
 *
 * Serves the generated fixture site, scans both variants in a real browser and
 * scores the result against the labelled defects in fixtures/site/generate.ts.
 * Every number in the receipt is computed here; none are asserted.
 */
import { createServer } from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { runBrowserScan } from "@bhashafix/browser";
import { DEFAULT_VIEWPORTS, type Issue } from "@bhashafix/shared";
import {
  FIXTURE_LOCALES,
  FIXTURE_ROUTES,
  SEEDED_DEFECTS,
  buildPage,
  type SeededDefect,
  type Variant,
} from "../fixtures/site/generate";

const root = process.cwd();
const viewports = [...DEFAULT_VIEWPORTS];

function startFixtureServer(variant: Variant) {
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const segments = url.pathname.split("/").filter(Boolean);
    const locale = segments[0] ?? "";
    if (!FIXTURE_LOCALES.includes(locale)) {
      response.writeHead(404, { "content-type": "text/plain" });
      response.end("Unknown locale");
      return;
    }
    const route = `/${segments.slice(1).join("/")}`.replace(/\/$/, "") || "/";
    if (!FIXTURE_ROUTES.includes(route)) {
      response.writeHead(404, { "content-type": "text/plain" });
      response.end("Unknown route");
      return;
    }
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(buildPage(variant, route, locale));
  });
  return new Promise<{ origin: string; close: () => Promise<void> }>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Fixture server failed.");
      resolve({
        origin: `http://127.0.0.1:${address.port}`,
        close: () =>
          new Promise<void>((done, fail) =>
            server.close((error) => (error ? fail(error) : done())),
          ),
      });
    });
  });
}

async function scanVariant(variant: Variant) {
  const server = await startFixtureServer(variant);
  try {
    const result = await runBrowserScan({
      scanId: `benchmark-${variant}`,
      origin: "LOCAL_REPOSITORY_SCAN",
      target: server.origin,
      routes: FIXTURE_ROUTES,
      locales: FIXTURE_LOCALES,
      viewports,
      artifactDir: null,
      runAxe: false,
      localeUrl: (target, route, locale) =>
        new URL(`/${locale}${route === "/" ? "" : route}`, target).href,
    });
    return result.issues;
  } finally {
    await server.close();
  }
}

/** A detection matches a seeded defect on rule, place, locale and viewport. */
function matches(issue: Issue, defect: SeededDefect) {
  return (
    issue.ruleId === defect.ruleId &&
    issue.route === defect.route &&
    issue.locale === defect.locale &&
    defect.viewports.includes(issue.viewport.name) &&
    (defect.selector === issue.selector ||
      // Document-scoped rules report `html`/`title` rather than an element.
      (issue.selector !== null && defect.selector.endsWith(issue.selector)))
  );
}

const expectedDetections = SEEDED_DEFECTS.flatMap((defect) =>
  defect.viewports.map((viewport) => ({ defect, viewport })),
);

console.log(
  `Scanning clean and broken variants: ${FIXTURE_ROUTES.length} routes × ${FIXTURE_LOCALES.length} locales × ${viewports.length} viewports.`,
);

const cleanIssues = await scanVariant("clean");
const brokenIssues = await scanVariant("broken");

const missed = expectedDetections.filter(
  ({ defect, viewport }) =>
    !brokenIssues.some(
      (issue) => matches(issue, defect) && issue.viewport.name === viewport,
    ),
);
const detected = expectedDetections.length - missed.length;
const unexpected = brokenIssues.filter(
  (issue) => !SEEDED_DEFECTS.some((defect) => matches(issue, defect)),
);

const recall = expectedDetections.length === 0 ? 1 : detected / expectedDetections.length;
const precision =
  brokenIssues.length === 0 ? 1 : (brokenIssues.length - unexpected.length) / brokenIssues.length;

const receipt = {
  generatedAt: new Date().toISOString(),
  fixture: {
    routes: FIXTURE_ROUTES,
    locales: FIXTURE_LOCALES,
    viewports: viewports.map((viewport) => viewport.name),
    seededDefects: SEEDED_DEFECTS.length,
    ruleFamilies: [...new Set(SEEDED_DEFECTS.map((defect) => defect.ruleId))].sort(),
    expectedDetections: expectedDetections.length,
  },
  clean: {
    totalIssues: cleanIssues.length,
    blockingIssues: cleanIssues.filter((issue) => issue.severity === "blocking").length,
    falsePositives: cleanIssues.map((issue) => ({
      ruleId: issue.ruleId,
      route: issue.route,
      locale: issue.locale,
      viewport: issue.viewport.name,
      selector: issue.selector,
    })),
  },
  broken: {
    totalIssues: brokenIssues.length,
    detectedSeeded: detected,
    missedSeeded: missed.map(({ defect, viewport }) => ({
      id: defect.id,
      ruleId: defect.ruleId,
      route: defect.route,
      locale: defect.locale,
      viewport,
    })),
    unexpectedIssues: unexpected.map((issue) => ({
      ruleId: issue.ruleId,
      route: issue.route,
      locale: issue.locale,
      viewport: issue.viewport.name,
      selector: issue.selector,
    })),
  },
  metrics: {
    recall: Number(recall.toFixed(4)),
    precision: Number(precision.toFixed(4)),
    cleanFalsePositives: cleanIssues.length,
  },
};

await mkdir(path.join(root, "artifacts"), { recursive: true });
await writeFile(
  path.join(root, "artifacts", "benchmark.json"),
  `${JSON.stringify(receipt, null, 2)}\n`,
);

console.log(
  [
    `BENCHMARK seeded=${SEEDED_DEFECTS.length} expectedDetections=${expectedDetections.length}`,
    `recall=${(recall * 100).toFixed(1)}% (${detected}/${expectedDetections.length})`,
    `precision=${(precision * 100).toFixed(1)}%`,
    `cleanFalsePositives=${cleanIssues.length}`,
    `unexpectedOnBroken=${unexpected.length}`,
  ].join(" · "),
);

if (missed.length > 0) {
  console.log("\nMissed seeded defects:");
  for (const { defect, viewport } of missed) {
    console.log(`  - ${defect.id} ${defect.ruleId} ${defect.locale} ${defect.route} @${viewport}`);
  }
}
if (cleanIssues.length > 0) {
  console.log("\nFalse positives on the clean variant:");
  for (const issue of cleanIssues) {
    console.log(
      `  - ${issue.ruleId} ${issue.locale} ${issue.route} @${issue.viewport.name} ${issue.selector ?? "-"}`,
    );
  }
}
if (unexpected.length > 0) {
  console.log("\nUnlabelled detections on the broken variant:");
  for (const issue of unexpected.slice(0, 40)) {
    console.log(
      `  - ${issue.ruleId} ${issue.locale} ${issue.route} @${issue.viewport.name} ${issue.selector ?? "-"}`,
    );
  }
}
