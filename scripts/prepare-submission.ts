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

const livePublicScan = JSON.parse(
  await readFile(
    path.join(root, "artifacts/live-public-scan-receipt.json"),
    "utf8",
  ),
) as {
  status: string;
  scanId: string;
  origin: string;
  target: string;
  routes: Array<{ route: string; status: number; strings: number }>;
  routesChecked: number;
  stringsExtracted: number;
  verifiedBlocking: number;
  staticHttpOnly: boolean;
  viewportOverflow: number;
  consoleErrors: string[];
};
if (
  livePublicScan.status !== "PASS" ||
  livePublicScan.routesChecked < 2 ||
  livePublicScan.stringsExtracted < 1 ||
  livePublicScan.viewportOverflow !== 0 ||
  livePublicScan.consoleErrors.length !== 0
) {
  throw new Error("Submission requires a passing live public-product scan.");
}

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
\`packages/mcp/dist/server.js\`. The in-memory Vitest suite remains an
additional schema and handler test, not the release proof by itself.
`;

const evalResults = `# BhashaFix evaluation results

Generated: ${new Date().toISOString()}

| Release gate | Result | Evidence |
| --- | --- | --- |
| Clean packed CLI and MCP install | PASS | ${releaseEvidence.packages.tarballs.join(", ")} |
| Global locale registry | PASS | ${releaseEvidence.packages.localeRegistry} representative BCP 47 locales |
| Live public-product scan | PASS | ${livePublicScan.routesChecked} real routes, ${livePublicScan.stringsExtracted} visible strings, ${livePublicScan.verifiedBlocking} blockers in checks run |
| Baseline deterministic defects | PASS | ${proof.baselineBlocking} |
| Final blocking defects | PASS | ${proof.finalBlocking} |
| Source-locale regression | PASS | ${proof.sourceLocaleRegression} |
| Browser E2E | PASS | ${releaseEvidence.browser.expectedTests} expected, ${releaseEvidence.browser.unexpectedTests} unexpected |
| Dark and light themes | PASS | Playwright production suite |
| Reduced motion | PASS | Playwright production suite |
| 390 x 844 and 1440 x 900 | PASS | Playwright production suite |
| Console errors | PASS | ${releaseEvidence.browser.consoleErrors} |
| Hydration errors | PASS | ${releaseEvidence.browser.hydrationErrors} |
| MCP Inspector | PASS | ${releaseEvidence.mcp.inspector.tools} tools |
| MCP STDIO repair verification | PASS | ${releaseEvidence.mcp.stdio.baselineBlocking} to ${releaseEvidence.mcp.stdio.finalBlocking} |
| MCPC | PASS | ${releaseEvidence.mcp.mcpc.tools} tools |
| PPTX container and screenshots | PASS | ${screenshots.length} screenshots |

These are release-contract results for the bundled AtlasPay vertical slice.
The live public scan is bounded static HTTP evidence, not a browser-render or
universal translation-quality benchmark.
`;

const liveScanEvidence = `# Live public scan evidence

Generated: ${new Date().toISOString()}

| Field | Verified value |
| --- | --- |
| Scan ID | \`${livePublicScan.scanId}\` |
| Origin | \`${livePublicScan.origin}\` |
| Target | \`${livePublicScan.target}\` |
| Real routes checked | ${livePublicScan.routesChecked} |
| Visible strings extracted | ${livePublicScan.stringsExtracted} |
| Blocking findings in checks run | ${livePublicScan.verifiedBlocking} |
| Browser rendering | Not run in hosted static mode |

## Discovered responses

${livePublicScan.routes.map((route) => `- \`${route.route}\` — HTTP ${route.status}; ${route.strings} strings`).join("\n")}

## Actual screenshots

- \`submission/screenshots/09-live-public-product.png\`
- \`submission/screenshots/10-live-public-product-proof.png\`

These screenshots show the BhashaFix result workspace, not screenshots of the
target website. The Vercel-hosted scanner performs bounded static HTTP
inspection; full target rendering and axe execution require the local CLI or a
browser-capable worker.
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
await writeFile(
  path.join(submission, "live-public-scan-receipt.json"),
  `${JSON.stringify(livePublicScan, null, 2)}\n`,
);
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
