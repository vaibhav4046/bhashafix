/**
 * View model for the published external-scan evidence.
 *
 * Every value below is read from a file under `public/evidence/`, which
 * `pnpm evidence:publish` copies verbatim out of a real CLI run. Nothing is
 * computed except list lengths and the joins between the three files that
 * describe the same run (`index.json`, `scan.json`, `renders.json`).
 *
 * This module is imported by a server component, so the JSON is read at build
 * time and only the fields rendered on the page reach the browser.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import evidenceIndex from "../../public/evidence/index.json";

/**
 * Read a published scan from disk at build time.
 *
 * These were static imports keyed by scan id, which meant regenerating the
 * evidence renamed the files and broke the build. Reading by the id the index
 * actually lists keeps the page valid for whatever `pnpm evidence:publish`
 * produced.
 */
function readPublished(scanId: string, file: "scan" | "renders"): unknown {
  const target = path.join(
    process.cwd(),
    "public",
    "evidence",
    "scans",
    scanId,
    `${file}.json`,
  );
  try {
    return JSON.parse(readFileSync(target, "utf8"));
  } catch (cause) {
    throw new Error(
      `public/evidence/index.json lists ${scanId}, but ${file}.json for it could not be read. Run \`pnpm evidence:publish\`.`,
      { cause },
    );
  }
}

type RawIssue = {
  issueId: string;
  ruleId: string;
  category: string;
  severity: string;
  confidence: string;
  locale: string;
  route: string;
  browser: string;
  viewport: { name: string; width: number; height: number };
  selector: string | null;
  sourceHint: string | null;
  description: string;
  whyItMatters: string;
  evidence: Record<string, unknown>;
  recommendedAction: string;
  deterministicPredicate: string;
  screenshotBefore: string | null;
  humanReviewRequired: boolean;
};

type RawRender = {
  route: string;
  locale: string;
  viewport: { name: string; width: number; height: number };
  theme: string;
  url: string;
  status: number;
  renderedAt: string;
  durationMs: number;
  measuredElements: number;
  consoleErrors: number;
  failedRequests: number;
  axeViolations: number;
  screenshot: string;
};

export type EvidenceRender = RawRender & {
  /** Site path of the published PNG, joined through the scan directory. */
  screenshotUrl: string;
  sha256: string | null;
  bytes: number | null;
};

export type EvidenceIssue = {
  issueId: string;
  ruleId: string;
  category: string;
  severity: string;
  confidence: string;
  locale: string;
  route: string;
  browser: string;
  viewport: { name: string; width: number; height: number };
  selector: string | null;
  sourceHint: string | null;
  description: string;
  whyItMatters: string;
  measurements: Array<{ label: string; value: string }>;
  recommendedAction: string;
  deterministicPredicate: string;
  /**
   * The run recorded an absolute path on the machine it ran on. Only the file
   * name is carried through and re-rooted at the published directory, so the
   * page never renders somebody's home directory.
   */
  screenshotUrl: string | null;
  /** Element rectangle, present only where the rule recorded one. */
  rect: { x: number; y: number; width: number; height: number } | null;
  humanReviewRequired: boolean;
};

export type EvidenceScan = {
  name: string;
  note: string;
  scanId: string;
  origin: string;
  status: string;
  target: string;
  engineVersion: string;
  startedAt: string;
  completedAt: string;
  routes: string[];
  locales: string[];
  viewports: Array<{ name: string; width: number; height: number }>;
  browsers: string[];
  themes: string[];
  crawl: { maxPages: number; maxDepth: number; rateLimitPerSecond: number };
  noAi: boolean;
  renders: EvidenceRender[];
  issues: EvidenceIssue[];
  screenshots: Array<{ file: string; url: string; bytes: number; sha256: string }>;
  /** Issue counts per route × locale, for the coverage matrix. */
  matrix: Array<{ route: string; locale: string; issues: number; rendered: boolean }>;
};

function fileName(value: string) {
  const parts = value.split(/[\\/]/);
  return parts[parts.length - 1] ?? value;
}

function measurements(evidence: Record<string, unknown>) {
  return Object.entries(evidence).map(([label, value]) => ({
    label,
    value: Array.isArray(value)
      ? value.length
        ? value.map((entry) => String(entry)).join(" · ")
        : "none"
      : value === null || value === undefined
        ? "not recorded"
        : typeof value === "object"
          ? JSON.stringify(value)
          : String(value),
  }));
}

function readRect(evidence: Record<string, unknown>) {
  const rect = evidence.rect;
  if (!rect || typeof rect !== "object") return null;
  const candidate = rect as Record<string, unknown>;
  const values = ["x", "y", "width", "height"].map((key) => candidate[key]);
  if (values.some((value) => typeof value !== "number")) return null;
  const [x, y, width, height] = values as number[];
  return { x, y, width, height };
}

function buildScan(
  entry: (typeof evidenceIndex)["realSiteScans"]["scans"][number],
  scan: {
    scanId: string;
    origin: string;
    status: string;
    startedAt: string;
    completedAt: string;
    engineVersion: string;
    config: {
      url?: string;
      viewports: Array<{ name: string; width: number; height: number }>;
      browsers: string[];
      themes: string[];
      maxPages: number;
      maxDepth: number;
      rateLimitPerSecond: number;
      noAi: boolean;
    };
    issues: RawIssue[];
  },
  renders: RawRender[],
): EvidenceScan {
  const hashes = new Map(
    entry.screenshots.map((shot) => [fileName(shot.file), shot]),
  );
  const issues: EvidenceIssue[] = scan.issues.map((issue) => {
    const shot = issue.screenshotBefore ? fileName(issue.screenshotBefore) : null;
    return {
      issueId: issue.issueId,
      ruleId: issue.ruleId,
      category: issue.category,
      severity: issue.severity,
      confidence: issue.confidence,
      locale: issue.locale,
      route: issue.route,
      browser: issue.browser,
      viewport: issue.viewport,
      selector: issue.selector,
      sourceHint: issue.sourceHint,
      description: issue.description,
      whyItMatters: issue.whyItMatters,
      measurements: measurements(issue.evidence),
      recommendedAction: issue.recommendedAction,
      deterministicPredicate: issue.deterministicPredicate,
      screenshotUrl:
        shot && hashes.has(shot) ? `${entry.path}/screenshots/${shot}` : null,
      rect: readRect(issue.evidence),
      humanReviewRequired: issue.humanReviewRequired,
    };
  });
  const matrix = entry.routes.flatMap((route) =>
    entry.locales.map((locale) => ({
      route,
      locale,
      issues: issues.filter(
        (issue) => issue.route === route && issue.locale === locale,
      ).length,
      rendered: renders.some(
        (render) => render.route === route && render.locale === locale,
      ),
    })),
  );
  return {
    name: entry.name,
    note: entry.note,
    scanId: scan.scanId,
    origin: scan.origin,
    status: scan.status,
    target: entry.target,
    engineVersion: scan.engineVersion,
    startedAt: scan.startedAt,
    completedAt: scan.completedAt,
    routes: entry.routes,
    locales: entry.locales,
    viewports: scan.config.viewports,
    browsers: scan.config.browsers,
    themes: scan.config.themes,
    crawl: {
      maxPages: scan.config.maxPages,
      maxDepth: scan.config.maxDepth,
      rateLimitPerSecond: scan.config.rateLimitPerSecond,
    },
    noAi: scan.config.noAi,
    renders: renders.map((render) => {
      const shot = hashes.get(fileName(render.screenshot));
      return {
        ...render,
        screenshotUrl: `${entry.path}/${render.screenshot}`,
        sha256: shot?.sha256 ?? null,
        bytes: shot?.bytes ?? null,
      };
    }),
    issues,
    screenshots: entry.screenshots.map((shot) => ({
      file: fileName(shot.file),
      url: `${entry.path}/${shot.file}`,
      bytes: shot.bytes,
      sha256: shot.sha256,
    })),
    matrix,
  };
}

export function realScanEvidence(): {
  generatedAt: string;
  limitations: string[];
  scans: EvidenceScan[];
} {
  const byId = new Map(
    evidenceIndex.realSiteScans.scans.map((entry) => [
      entry.scanId,
      {
        scan: readPublished(entry.scanId, "scan"),
        renders: readPublished(entry.scanId, "renders"),
      },
    ]),
  );
  return {
    generatedAt: evidenceIndex.realSiteScans.generatedAt,
    limitations: evidenceIndex.realSiteScans.limitations,
    scans: evidenceIndex.realSiteScans.scans.map((entry) => {
      const source = byId.get(entry.scanId);
      if (!source) {
        throw new Error(
          `public/evidence/index.json lists ${entry.scanId} but no scan.json was loaded for it.`,
        );
      }
      return buildScan(
        entry,
        source.scan as unknown as Parameters<typeof buildScan>[1],
        source.renders as unknown as RawRender[],
      );
    }),
  };
}
