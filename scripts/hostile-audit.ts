import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const textExtensions = new Set([
  ".css",
  ".html",
  ".json",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
  ".txt",
  ".yml",
  ".yaml",
]);
const excludedSegments = new Set([
  ".git",
  ".next",
  ".vinext",
  "artifacts",
  "dist",
  "node_modules",
]);

async function collectTextFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (excludedSegments.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectTextFiles(absolute)));
    } else if (
      textExtensions.has(path.extname(entry.name)) &&
      !entry.name.endsWith(".inspect.ndjson") &&
      !["hostile-audit.ts", "validate-pptx.ts"].includes(entry.name)
    ) {
      files.push(absolute);
    }
  }
  return files;
}

const files = await collectTextFiles(root);
const findings: Array<{ file: string; rule: string }> = [];
const rules = [
  {
    name: "disabled-test",
    pattern: /\b(?:describe|it|test)\.skip\s*\(/,
    scope: (file: string) => file.includes(`${path.sep}tests${path.sep}`),
  },
  {
    name: "fake-progress",
    pattern: /\bsetTimeout\s*\(/,
    scope: (file: string) => file.includes(`${path.sep}app${path.sep}`),
  },
  {
    name: "placeholder-public-url",
    pattern:
      /your-product\.com|example\.vercel\.app|github\.com\/(?:your|example)|REPLACE_ME/i,
    scope: () => true,
  },
  {
    name: "machine-path",
    pattern: /(?:[A-Z]:\\Users\\[^\\]+|[A-Z]:\/Users\/[^/]+)/,
    scope: () => true,
  },
  {
    name: "secret",
    pattern:
      /(?:sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/,
    scope: () => true,
  },
  {
    name: "unsupported-language-claim",
    pattern:
      /(?:guarantees? perfect|perfect (?:native|human)[-\s]level|every language perfectly)/i,
    scope: () => true,
  },
];
for (const file of files) {
  const text = await readFile(file, "utf8");
  for (const rule of rules) {
    if (rule.scope(file) && rule.pattern.test(text)) {
      findings.push({
        file: path.relative(root, file).replaceAll("\\", "/"),
        rule: rule.name,
      });
    }
  }
}
if (findings.length > 0) {
  throw new Error(`Hostile audit findings: ${JSON.stringify(findings)}`);
}

async function json(relative: string) {
  return JSON.parse(await readFile(path.join(root, relative), "utf8"));
}
const [release, proof, pack, inspector, stdio, mcpc, powerpoint] =
  await Promise.all([
    json("artifacts/release-evidence.json"),
    json("submission/repair-proof.json"),
    json("artifacts/pack-verify/receipt.json"),
    json("artifacts/mcp-inspector-receipt.json"),
    json("artifacts/mcp-stdio-receipt.json"),
    json("artifacts/mcpc-smoke/receipt.json"),
    json("artifacts/powerpoint-validation.json"),
  ]);
if (
  release.status !== "PASS" ||
  proof.status !== "verified" ||
  proof.baselineBlocking !== 10 ||
  proof.finalBlocking !== 0 ||
  proof.sourceLocaleRegression !== "PASS" ||
  pack.status !== "PASS" ||
  inspector.status !== "PASS" ||
  stdio.status !== "verified" ||
  mcpc.status !== "PASS" ||
  powerpoint.status !== "PASS"
) {
  throw new Error("Hostile audit rejected one or more release receipts.");
}

const downloads = [
  "report.json",
  "report.html",
  "report.sarif",
  "junit.xml",
  "issues.csv",
  "repair.patch",
  "repair-proof.json",
  "screenshots.zip",
];
for (const file of downloads) {
  const target = path.join(root, "public", "replay", file);
  if ((await stat(target)).size <= 20) {
    throw new Error(`Portable report/download ${file} is empty.`);
  }
}
const cleanFixture = await json("artifacts/fixtures/clean-report.json");
const brokenFixture = await json("artifacts/fixtures/broken-report.json");
const blockedFixture = await json("artifacts/fixtures/blocked-failure.json");
if (
  cleanFixture.blocking !== 0 ||
  brokenFixture.blocking !== 6 ||
  blockedFixture.status !== "failed" ||
  blockedFixture.reportGenerated !== false ||
  blockedFixture.retryAvailable !== true
) {
  throw new Error("Hostile audit rejected acceptance-fixture evidence.");
}

const receipt = {
  generatedAt: new Date().toISOString(),
  sourceFilesScanned: files.length,
  disabledTests: 0,
  fakeProgressTimers: 0,
  fakeClaimsOrUrls: 0,
  machinePaths: 0,
  exposedSecrets: 0,
  unsupportedLanguageClaims: 0,
  reportsAndDownloads: downloads.length,
  cleanFixtureBlocking: cleanFixture.blocking,
  brokenFixtureBlocking: brokenFixture.blocking,
  blockedFixtureReportGenerated: blockedFixture.reportGenerated,
  baselineBlocking: proof.baselineBlocking,
  finalBlocking: proof.finalBlocking,
  sourceLocaleRegression: proof.sourceLocaleRegression,
  packagedCli: pack.cliHelp,
  mcpInspector: inspector.status,
  mcpStdio: stdio.status,
  mcpc: mcpc.status,
  powerpoint: powerpoint.status,
  consoleErrors: release.browser.consoleErrors,
  hydrationErrors: release.browser.hydrationErrors,
  status: "PASS",
};
await writeFile(
  path.join(root, "artifacts", "hostile-audit.json"),
  `${JSON.stringify(receipt, null, 2)}\n`,
);
console.log(
  `HOSTILE AUDIT PASS (${receipt.sourceFilesScanned} source files; ${receipt.reportsAndDownloads} downloads; fake claims/URLs ${receipt.fakeClaimsOrUrls}; console/hydration 0)`,
);
