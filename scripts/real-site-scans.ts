/**
 * Bounded operability scans against permitted public sites.
 *
 * These prove the engine works outside its own fixtures. They do NOT measure
 * precision: the targets carry no ground-truth labels, so the receipt records
 * what was found and explicitly declines to score it.
 *
 * Volume is deliberately small — a handful of routes, one viewport, low rate.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { runBrowserProjectScan } from "../packages/cli/src/browser-scan";

const root = process.cwd();

const TARGETS = [
  {
    name: "BhashaFix production",
    url: "https://bhashafix.vercel.app",
    routes: ["/", "/docs", "/trust"],
    locales: ["en-GB", "ar-SA"],
    note: "The product's own deployment.",
  },
  {
    name: "MDN Web Docs",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML",
    routes: [
      "/en-US/docs/Web/HTML",
      "/en-US/docs/Web/CSS",
      "/en-US/docs/Web/JavaScript",
    ],
    locales: ["en-GB", "de-DE"],
    note: "Mozilla property, three routes, single viewport.",
  },
  {
    name: "Wikipedia",
    url: "https://en.wikipedia.org/wiki/Localization",
    routes: ["/wiki/Localization", "/wiki/Internationalization_and_localization"],
    locales: ["en-GB", "he-IL"],
    note: "Two article routes, single viewport.",
  },
] as const;

const results = [];
for (const target of TARGETS) {
  console.log(`Scanning ${target.name} (${target.routes.length} routes)…`);
  const outcome = await runBrowserProjectScan({
    url: target.url,
    projectRoot: root,
    sourceLocale: "en-GB",
    locales: [...target.locales],
    routes: [...target.routes],
    viewports: ["mobile"],
  });
  const byRule: Record<string, number> = {};
  for (const issue of outcome.scan.issues) {
    byRule[issue.ruleId] = (byRule[issue.ruleId] ?? 0) + 1;
  }
  results.push({
    name: target.name,
    target: target.url,
    note: target.note,
    scanId: outcome.scan.scanId,
    origin: outcome.scan.origin,
    routes: outcome.scan.routesDiscovered,
    locales: outcome.scan.localesTested,
    renders: outcome.renderCount,
    screenshots: outcome.screenshots.length,
    issues: outcome.scan.issues.length,
    byRule,
    persistence: outcome.persistence,
  });
  console.log(
    `  ${outcome.scan.scanId} · ${outcome.renderCount} renders · ${outcome.scan.issues.length} issues`,
  );
}

const receipt = {
  generatedAt: new Date().toISOString(),
  purpose: "operability on real public sites",
  measuresPrecision: false,
  limitations: [
    "These targets carry no ground-truth labels, so no precision or recall figure is derived from them.",
    "Coverage is deliberately bounded: a handful of routes per site at one viewport.",
    "Only publicly reachable pages were requested; no authentication or access control was bypassed.",
  ],
  scans: results,
};

await mkdir(path.join(root, "artifacts"), { recursive: true });
await writeFile(
  path.join(root, "artifacts", "real-site-scans.json"),
  `${JSON.stringify(receipt, null, 2)}\n`,
);

console.log(
  `REAL-SITE SCANS ${results.length} targets; ${results.reduce((total, scan) => total + scan.renders, 0)} renders; ${results.reduce((total, scan) => total + scan.issues, 0)} issues`,
);
