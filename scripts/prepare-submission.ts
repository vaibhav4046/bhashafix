import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { scanDemoProject } from "@bhashafix/core";
import { applyRepair, prepareRepair } from "@bhashafix/repair-engine";
import { verifyRepair } from "@bhashafix/verifier";

const root = process.cwd();
const submission = path.join(root, "submission");
await mkdir(submission, { recursive: true });

function gitValue(args: string[]) {
  try {
    return execFileSync(
      "git",
      [
        "-c",
        `safe.directory=${root.replaceAll("\\", "/")}`,
        ...args,
      ],
      {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
      stdio: ["ignore", "pipe", "ignore"],
      },
    ).trim();
  } catch {
    return null;
  }
}

function githubUrl(remote: string | null) {
  if (!remote) return null;
  const match = remote.match(
    /(?:github\.com[/:])([^/]+\/[^/]+?)(?:\.git)?$/,
  );
  return match ? `https://github.com/${match[1].replace(/\.git$/, "")}` : null;
}

const releaseEvidence = JSON.parse(
  await readFile(path.join(root, "artifacts/release-evidence.json"), "utf8"),
);
if (releaseEvidence.status !== "PASS") {
  throw new Error("Submission requires a passing hostile release receipt.");
}

// The production Chromium receipt is produced by `pnpm scan:live:smoke`,
// which needs a deployed/running server and outbound network and is therefore
// deliberately not part of local `verify`. `artifacts/` is gitignored, so on a
// clean checkout the receipt is absent. Record that honestly instead of
// implying a hosted scan happened in this process.
const livePublicScanRaw = await readFile(
  path.join(root, "artifacts/live-public-scan-receipt.json"),
  "utf8",
).catch(() => null);

const livePublicScan = (livePublicScanRaw === null
  ? null
  : JSON.parse(livePublicScanRaw)) as null | {
  status: string;
  scanId: string;
  origin: string;
  target: string;
  routesChecked: number;
  localesRendered: number;
  renders: number;
  measuredElements: number;
  verifiedBlocking: number;
  browserRendered: boolean;
  axeExecuted: boolean;
  viewportOverflow: number;
  consoleErrors: string[];
};
if (
  livePublicScan !== null &&
  (livePublicScan.status !== "PASS" ||
    livePublicScan.routesChecked !== 1 ||
    livePublicScan.localesRendered < 2 ||
    livePublicScan.renders < 2 ||
    livePublicScan.measuredElements < 1 ||
    livePublicScan.browserRendered !== true ||
    livePublicScan.axeExecuted !== true ||
    livePublicScan.viewportOverflow !== 0 ||
    livePublicScan.consoleErrors.length !== 0)
) {
  throw new Error("Submission requires a passing live public-product scan.");
}
if (livePublicScan === null) {
  console.warn(
    "prepare-submission: no production Chromium receipt in artifacts/; recording it as not produced in this run. Run `pnpm scan:live:smoke` to generate one.",
  );
}

// Ground-truth benchmark receipt, written by `pnpm benchmark`.
const benchmarkRaw = await readFile(
  path.join(root, "artifacts/benchmark.json"),
  "utf8",
).catch(() => null);
const benchmark = (benchmarkRaw === null ? null : JSON.parse(benchmarkRaw)) as null | {
  fixture: { seededDefects: number; expectedDetections: number; ruleFamilies: string[] };
  clean: { totalIssues: number };
  broken: { detectedSeeded: number; unexpectedIssues: unknown[] };
  metrics: { recall: number; precision: number; cleanFalsePositives: number };
};

// Bounded browser-backed scans of permitted public sites, written by
// `pnpm scan:real-sites`.
const realSiteRaw = await readFile(
  path.join(root, "artifacts/real-site-scans.json"),
  "utf8",
).catch(() => null);
const realSiteScans = (realSiteRaw === null ? null : JSON.parse(realSiteRaw)) as null | {
  limitations: string[];
  scans: Array<{
    name: string;
    scanId: string;
    routes: string[];
    locales: string[];
    renders: number;
    screenshots: number;
    issues: number;
  }>;
};

const baseline = await scanDemoProject(root, { mode: "replay" });
const plan = await prepareRepair(root, baseline);
await applyRepair(plan);
const { scan: finalScan, result } = await verifyRepair(root, baseline);
if (result.status !== "verified") {
  throw new Error(`Submission proof is not verified: ${result.status}`);
}

const deckPath = path.join(submission, "BhashaFix-Hackathon-Deck.pptx");
const deckHeader = (await readFile(deckPath)).subarray(0, 2).toString("ascii");
if (deckHeader !== "PK") {
  throw new Error("Submission deck is not a valid PPTX container.");
}

const screenshots = (await readdir(path.join(submission, "screenshots"))).filter(
  (file) => file.endsWith(".png"),
);
if (screenshots.length < 5) {
  throw new Error(
    `Submission requires at least 5 actual screenshots; found ${screenshots.length}.`,
  );
}

const proof = {
  schemaVersion: "1.0",
  generatedAt: new Date().toISOString(),
  origin: "RECORDED_REPLAY",
  mode: "genuine deterministic replay artifact",
  baselineScanId: baseline.scanId,
  verificationScanId: finalScan.scanId,
  baselineBlocking: result.baselineBlocking,
  finalBlocking: result.finalBlocking,
  sourceLocaleRegression: result.sourceLocaleRegression,
  consoleErrorDelta: result.consoleErrorDelta,
  accessibilityRegression: result.accessibilityRegression,
  diffWithinPolicy: result.diffWithinPolicy,
  status: result.status,
};

const manifest = {
  schemaVersion: "1.0",
  product: "BhashaFix",
  version: "0.2.0",
  generatedAt: new Date().toISOString(),
  commit: gitValue(["rev-parse", "--short", "HEAD"]),
  deployment: "https://bhashafix.vercel.app",
  repository: githubUrl(gitValue(["remote", "get-url", "origin"])),
  proof,
  artifacts: [
    "BhashaFix-Hackathon-Deck.pptx",
    "FINAL_SUBMISSION_FORM.md",
    "PROJECT_DESCRIPTION.md",
    "ONE_LINE_PITCH.txt",
    "DEMO_SCRIPT_90_SECONDS.md",
    "PITCH_SCRIPT_3_MINUTES.md",
    "TECHNICAL_ARCHITECTURE.md",
    "CODEX_USAGE_EVIDENCE.md",
    "CLI_EXECUTION_EVIDENCE.md",
    "MCP_EXECUTION_EVIDENCE.md",
    "LIVE_SCAN_EVIDENCE.md",
    "MCP_MCPC_EVIDENCE.md",
    "EVAL_RESULTS.md",
    "MARKET_POSITIONING.md",
    "JUDGING_CHECKLIST.md",
    "repair-proof.json",
    "repair.patch",
    "live-public-scan-receipt.json",
    "screenshots/",
  ],
  claims: {
    universalLinguisticPerfection: false,
    deterministicEngineeringChecksAuthoritative: true,
    linguisticHumanReviewGates: true,
  },
};

const mcpEvidence = `# MCP and MCPC evidence

Generated: ${new Date().toISOString()}

The 10-to-0 repair sequence below is explicitly scoped to the bundled AtlasPay
fixture. It proves that external MCP clients can drive the guarded fixture
workflow over the built STDIO server; it does not claim arbitrary-project
source repair. Project inspection, schemas and transport checks exercise the
general MCP surface separately.

| Client | Transport | Tools | Baseline | Final | Result |
| --- | --- | ---: | ---: | ---: | --- |
| Official MCP Inspector | STDIO built package | ${releaseEvidence.mcp.inspector.tools} | ${releaseEvidence.mcp.inspector.baselineBlocking} | n/a | PASS |
| Official TypeScript client | Spawned STDIO built package | ${releaseEvidence.mcp.stdio.tools} | ${releaseEvidence.mcp.stdio.baselineBlocking} | ${releaseEvidence.mcp.stdio.finalBlocking} | verified |
| @apify/mcpc | Persistent STDIO session | ${releaseEvidence.mcp.mcpc.tools} | ${releaseEvidence.mcp.mcpc.baselineBlocking} | n/a | PASS |

Executed commands:

\`\`\`text
pnpm mcp:inspect
pnpm mcpc:smoke
\`\`\`

The Inspector and MCPC receipts were produced by external clients against
\`packages/mcp/dist/bin.js\`. The in-memory Vitest suite remains an
additional schema and handler test, not the release proof by itself. Every
baseline and final count in this table is AtlasPay fixture evidence.
`;

const evalResults = `# BhashaFix evaluation results

Generated: ${new Date().toISOString()}

| Release gate | Result | Evidence |
| --- | --- | --- |
| Clean packed CLI and MCP install | PASS | ${releaseEvidence.packages.tarballs.join(", ")} |
| Global locale registry | PASS | ${releaseEvidence.packages.localeRegistry} representative BCP 47 locales |
| Hosted Chromium quick-scan contract | BOUNDED | \`POST /api/scan/browser\`: one route, bounded locales, one viewport, real PNG screenshots, DOM measurement and axe; verify deployment with \`pnpm production:smoke\` |
| Production Chromium receipt | ${livePublicScan ? "PASS" : "NOT RUN"} | ${livePublicScan ? `${livePublicScan.renders} real renders, ${livePublicScan.measuredElements} measured elements, ${livePublicScan.verifiedBlocking} blockers in checks run` : "no receipt in artifacts/; run `pnpm scan:live:smoke`"} |
| Hosted static HTTP preflight | AVAILABLE | Secondary metadata crawl at \`POST /api/scan\`; explicitly not browser evidence |
| Baseline deterministic defects | PASS | ${proof.baselineBlocking} |
| Final blocking defects | PASS | ${proof.finalBlocking} |
| Source-locale regression | PASS | ${proof.sourceLocaleRegression} |
| Browser E2E | PASS | ${releaseEvidence.browser.expectedTests} expected, ${releaseEvidence.browser.unexpectedTests} unexpected |
| Dark and light themes | PASS | Playwright production suite |
| Reduced motion | PASS | Playwright production suite |
| 390 x 844 and 1440 x 900 | PASS | Playwright production suite |
| Seeded-defect recall | ${benchmark ? `${(benchmark.metrics.recall * 100).toFixed(1)}%` : "NOT RUN"} | ${benchmark ? `${benchmark.broken.detectedSeeded}/${benchmark.fixture.expectedDetections} expected detections across ${benchmark.fixture.seededDefects} labelled defects` : "run `pnpm benchmark`"} |
| Detection precision | ${benchmark ? `${(benchmark.metrics.precision * 100).toFixed(1)}%` : "NOT RUN"} | ${benchmark ? `${benchmark.broken.unexpectedIssues.length} unlabelled detection(s) on the broken fixture` : "run `pnpm benchmark`"} |
| Clean-fixture false positives | ${benchmark ? (benchmark.metrics.cleanFalsePositives === 0 ? "PASS" : "FAIL") : "NOT RUN"} | ${benchmark ? `${benchmark.metrics.cleanFalsePositives} issue(s) on the clean variant` : "run `pnpm benchmark`"} |
| MCP Inspector | PASS | ${releaseEvidence.mcp.inspector.tools} tools |
| MCP STDIO AtlasPay fixture repair verification | PASS | ${releaseEvidence.mcp.stdio.baselineBlocking} to ${releaseEvidence.mcp.stdio.finalBlocking} |
| MCPC | PASS | ${releaseEvidence.mcp.mcpc.tools} tools |
| PPTX container and screenshots | PASS | ${screenshots.length} screenshots |

The repair counts are release-contract results for the bundled AtlasPay
vertical slice. The hosted product also runs a bounded real-Chromium quick
scan; full route x locale x viewport matrices, persisted artifacts and source
repair remain local. The separate HTTP preflight remains a secondary metadata
crawl, not browser evidence or a universal translation-quality benchmark.
`;

const liveScanEvidence = `# Live public scan evidence

Generated: ${new Date().toISOString()}

${
  realSiteScans === null
    ? "No browser-backed real-site scans were recorded in this build. Run `pnpm scan:real-sites`."
    : `## Browser-backed scans of real public sites

Origin \`LOCAL_REPOSITORY_SCAN\` — real Chromium renders, real screenshots, persisted scan IDs.

| Target | Scan ID | Routes | Locales | Renders | Screenshots | Issues |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
${realSiteScans.scans
  .map(
    (scan) =>
      `| ${scan.name} | \`${scan.scanId}\` | ${scan.routes.length} | ${scan.locales.length} | ${scan.renders} | ${scan.screenshots} | ${scan.issues} |`,
  )
  .join("\n")}

${realSiteScans.limitations.map((entry) => `- ${entry}`).join("\n")}
`
}

## Hosted Chromium quick scan

The production route \`POST /api/scan/browser\` launches real Chromium inside
the Vercel function. It renders one public route for the selected BCP 47
locales at one selected viewport, measures the rendered DOM, runs axe and
returns real PNG screenshots in the response. Redirects and subrequests are
revalidated by the hosted SSRF policy. The response is not persisted, and the
function's 60-second ceiling is not presented as a full matrix. The production
contract is exercised with:

\`BHASHAFIX_PRODUCTION_URL=https://bhashafix.vercel.app pnpm production:smoke\`

Full route x locale x viewport matrices, authenticated coverage, persisted
artifacts and repository repair run through the local CLI.

## Production hosted Chromium receipt

${
  livePublicScan === null
    ? "No production Chromium receipt ran in this build. `pnpm scan:live:smoke` needs a deployed/running server and outbound network, so it is not part of local `pnpm verify`, and no receipt was found in `artifacts/`. Nothing about it is claimed here."
    : `| Field | Verified value |
| --- | --- |
| Scan ID | \`${livePublicScan.scanId}\` |
| Origin | \`${livePublicScan.origin}\` |
| Target | \`${livePublicScan.target}\` |
| Real routes checked | ${livePublicScan.routesChecked} |
| Locales rendered | ${livePublicScan.localesRendered} |
| Real Chromium renders | ${livePublicScan.renders} |
| DOM elements measured | ${livePublicScan.measuredElements} |
| Blocking findings in checks run | ${livePublicScan.verifiedBlocking} |
| Browser rendering | PASS |
| axe execution | PASS |`
}

## Actual screenshots

- \`submission/screenshots/09-live-public-product.png\`
- \`submission/screenshots/10-live-public-product-proof.png\`

These two packaged screenshots show the deployed browser-scan workspace and
the target screenshots returned by \`POST /api/scan/browser\`. Full matrices,
durable artifacts and repository repair remain local.
`;

await writeFile(
  path.join(submission, "RELEASE_MANIFEST.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
await writeFile(path.join(submission, "MCP_MCPC_EVIDENCE.md"), mcpEvidence);
await writeFile(path.join(submission, "EVAL_RESULTS.md"), evalResults);
await writeFile(
  path.join(submission, "LIVE_SCAN_EVIDENCE.md"),
  liveScanEvidence,
);
if (livePublicScan !== null) {
  await writeFile(
    path.join(submission, "live-public-scan-receipt.json"),
    `${JSON.stringify(livePublicScan, null, 2)}\n`,
  );
}
await writeFile(path.join(submission, "repair.patch"), plan.unifiedDiff);
await writeFile(
  path.join(submission, "repair-proof.json"),
  `${JSON.stringify(proof, null, 2)}\n`,
);

for (const file of [
  "layout.json",
  "locale-state.json",
  "translations.json",
  "glossary.json",
]) {
  await writeFile(
    path.join(root, "apps/demo-target/data", file),
    await readFile(
      path.join(root, "fixtures/multilingual-demo/baseline", file),
      "utf8",
    ),
  );
}

console.log(
  `SUBMISSION PREPARED ${result.baselineBlocking} → ${result.finalBlocking}; source-locale regression ${result.sourceLocaleRegression}; ${screenshots.length} screenshots; PPTX PASS`,
);
