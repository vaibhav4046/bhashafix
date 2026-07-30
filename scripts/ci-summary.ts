import { appendFile, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const destination = process.env.GITHUB_STEP_SUMMARY;
if (!destination) {
  throw new Error("GITHUB_STEP_SUMMARY is unavailable.");
}
const release = JSON.parse(
  await readFile(path.join(root, "artifacts", "release-evidence.json"), "utf8"),
);
const fixture = JSON.parse(
  await readFile(
    path.join(root, "artifacts", "fixtures", "broken-report.json"),
    "utf8",
  ),
);
const proof = release.proof;
await appendFile(
  destination,
  `## BhashaFix localisation gate

- Severity threshold: \`${process.env.BHASHAFIX_FAIL_ON ?? "blocking"}\`
- Broken acceptance fixture: ${fixture.blocking} verified findings
- AtlasPay identical verification: ${proof.baselineBlocking} → ${proof.finalBlocking}
- Source-locale regression: ${proof.sourceLocaleRegression}
- Browser tests: ${release.browser.expectedTests} passed; ${release.browser.unexpectedTests} unexpected
- Themes and reduced motion: ${release.browser.darkMode}/${release.browser.lightMode}/${release.browser.reducedMotion}

Reports and genuine screenshots are attached to this run.
`,
  "utf8",
);
