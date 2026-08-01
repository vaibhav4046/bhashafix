/**
 * Write the GitHub Actions job summary.
 *
 * This step runs with `if: always()`, so it must survive a failed verify run
 * and report what is actually on disk rather than crashing on a missing
 * artifact and masking the real failure.
 */
import { appendFile, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const destination = process.env.GITHUB_STEP_SUMMARY;
if (!destination) {
  throw new Error("GITHUB_STEP_SUMMARY is unavailable.");
}

async function readJson<T>(relative: string): Promise<T | null> {
  const raw = await readFile(path.join(root, relative), "utf8").catch(() => null);
  return raw === null ? null : (JSON.parse(raw) as T);
}

const release = await readJson<{
  proof: {
    baselineBlocking: number;
    finalBlocking: number;
    sourceLocaleRegression: string;
  };
  browser: { expectedTests: number; unexpectedTests: number; projects: string[] };
}>("artifacts/release-evidence.json");
const fixture = await readJson<{ blocking: number }>(
  "artifacts/fixtures/broken-report.json",
);
const benchmark = await readJson<{
  fixture: {
    seededDefects: number;
    expectedDetections: number;
    ruleFamilies: string[];
    locales: string[];
  };
  metrics: { recall: number; precision: number; cleanFalsePositives: number };
}>("artifacts/benchmark.json");

const lines = [
  "## BhashaFix localisation gate",
  "",
  `- Severity threshold: \`${process.env.BHASHAFIX_FAIL_ON ?? "blocking"}\``,
];

if (benchmark) {
  lines.push(
    `- Ground-truth benchmark: ${benchmark.fixture.seededDefects} labelled defects, ${benchmark.fixture.ruleFamilies.length} rule families, ${benchmark.fixture.locales.length} locales`,
    `- Recall ${(benchmark.metrics.recall * 100).toFixed(1)}% of ${benchmark.fixture.expectedDetections} expected detections; precision ${(benchmark.metrics.precision * 100).toFixed(1)}%; clean-variant false positives ${benchmark.metrics.cleanFalsePositives}`,
  );
} else {
  lines.push("- Ground-truth benchmark: did not run in this job");
}

if (fixture) {
  lines.push(`- Broken acceptance fixture: ${fixture.blocking} verified findings`);
} else {
  lines.push("- Broken acceptance fixture: did not run in this job");
}

if (release) {
  lines.push(
    `- Identical verification: ${release.proof.baselineBlocking} → ${release.proof.finalBlocking}`,
    `- Source-locale regression: ${release.proof.sourceLocaleRegression}`,
    `- Browser tests: ${release.browser.expectedTests} passed, ${release.browser.unexpectedTests} unexpected (${release.browser.projects.join(", ")})`,
  );
} else {
  lines.push(
    "- Release receipt: not produced, so the verify chain did not reach its final step",
  );
}

lines.push(
  "",
  "Reports and screenshots produced by this run are attached as artifacts.",
  "",
);

await appendFile(destination, lines.join("\n"), "utf8");
console.log("CI summary written.");
