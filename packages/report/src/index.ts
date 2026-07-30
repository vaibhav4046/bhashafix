import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Scan, VerificationResult } from "@bhashafix/shared";

function escapeHtml(value: unknown) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function portableScan(scan: Scan): Scan {
  return {
    ...scan,
    config: {
      ...scan.config,
      projectRoot: ".",
    },
  };
}

export function buildJsonReport(
  scan: Scan,
  verification?: VerificationResult,
) {
  return {
    schemaVersion: "1.0",
    generatedAt: new Date().toISOString(),
    claim:
      "Deterministic engineering checks are authoritative. Linguistic judgements include confidence levels and human-review gates.",
    scan: portableScan(scan),
    verification: verification ?? null,
  };
}

export function buildHtmlReport(
  scan: Scan,
  verification?: VerificationResult,
) {
  const rows = scan.issues
    .map(
      (issue) => `<tr>
<td>${escapeHtml(issue.issueId)}</td>
<td>${escapeHtml(issue.locale)}</td>
<td>${escapeHtml(issue.route)}</td>
<td>${escapeHtml(issue.ruleId)}</td>
<td>${escapeHtml(issue.severity)}</td>
<td>${escapeHtml(issue.description)}</td>
<td><code>${escapeHtml(issue.deterministicPredicate)}</code></td>
</tr>`,
    )
    .join("");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>BhashaFix report ${escapeHtml(scan.scanId)}</title>
<style>body{font:16px/1.5 system-ui;margin:40px;color:#1a1025;background:#fbf8ff}table{border-collapse:collapse;width:100%}th,td{padding:12px;border:1px solid #d8b4fe;text-align:left}th{background:#f1e8ff}code{font-size:12px}.pass{color:#166534}.fail{color:#9f1239}</style></head>
<body><h1>BhashaFix release report</h1>
<p>Scan <code>${escapeHtml(scan.scanId)}</code> · origin <strong>${escapeHtml(scan.origin)}</strong> · ${scan.issues.length} open issue(s)</p>
<p class="${verification?.status === "verified" ? "pass" : "fail"}">Verification: ${escapeHtml(verification?.status ?? "unverified")} · source-locale regression ${escapeHtml(verification?.sourceLocaleRegression ?? "not run")}</p>
<table><thead><tr><th>Issue</th><th>Locale</th><th>Route</th><th>Category</th><th>Severity</th><th>Evidence</th><th>Predicate</th></tr></thead><tbody>${rows}</tbody></table>
<p><small>Deterministic engineering checks are authoritative. Linguistic judgements require confidence and human review where indicated.</small></p>
</body></html>`;
}

export function buildSarif(scan: Scan) {
  return {
    version: "2.1.0",
    $schema:
      "https://json.schemastore.org/sarif-2.1.0.json",
    runs: [
      {
        tool: {
          driver: {
            name: "BhashaFix",
            version: scan.engineVersion,
            rules: scan.issues.map((issue) => ({
              id: issue.ruleId,
              shortDescription: { text: issue.description },
            })),
          },
        },
        results: scan.issues.map((issue) => ({
          ruleId: issue.ruleId,
          level: issue.severity === "blocking" ? "error" : "warning",
          message: { text: issue.description },
          ...(issue.sourceHint
            ? {
                locations: [
                  {
                    physicalLocation: {
                      artifactLocation: { uri: issue.sourceHint },
                    },
                  },
                ],
              }
            : {}),
          properties: {
            issueId: issue.issueId,
            locale: issue.locale,
            route: issue.route,
            confidence: issue.confidence,
            origin: issue.origin,
            category: issue.category,
          },
        })),
      },
    ],
  };
}

export function buildJunit(scan: Scan) {
  const cases = scan.issues
    .map(
      (issue) =>
        `<testcase classname="${escapeHtml(issue.ruleId)}" name="${escapeHtml(issue.issueId)}"><failure message="${escapeHtml(issue.description)}">${escapeHtml(issue.deterministicPredicate)}</failure></testcase>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><testsuite name="BhashaFix" tests="${scan.issues.length}" failures="${scan.issues.length}">${cases}</testsuite>`;
}

export function buildCsv(scan: Scan) {
  const header = [
    "issueId",
    "locale",
    "route",
    "category",
    "ruleId",
    "severity",
    "confidence",
    "description",
  ];
  const rows = scan.issues.map((issue) =>
    [
      issue.issueId,
      issue.locale,
      issue.route,
      issue.category,
      issue.ruleId,
      issue.severity,
      issue.confidence,
      issue.description,
    ]
      .map(csvCell)
      .join(","),
  );
  return [header.map(csvCell).join(","), ...rows].join("\n");
}

export async function writeReportBundle(
  outputDirectory: string,
  scan: Scan,
  verification?: VerificationResult,
) {
  await mkdir(outputDirectory, { recursive: true });
  const files = {
    "report.json": JSON.stringify(buildJsonReport(scan, verification), null, 2),
    "report.html": buildHtmlReport(scan, verification),
    "report.sarif": JSON.stringify(buildSarif(scan), null, 2),
    "junit.xml": buildJunit(scan),
    "issues.csv": buildCsv(scan),
  };
  await Promise.all(
    Object.entries(files).map(([name, contents]) =>
      writeFile(path.join(outputDirectory, name), `${contents}\n`, "utf8"),
    ),
  );
  return Object.keys(files).map((name) => path.join(outputDirectory, name));
}
