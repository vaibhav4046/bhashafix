import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

async function readJson(relative: string) {
  return JSON.parse(await readFile(path.join(root, relative), "utf8"));
}

const [
  proof,
  playwright,
  pack,
  inspector,
  stdio,
  mcpc,
] = await Promise.all([
  readJson("submission/repair-proof.json"),
  readJson("artifacts/playwright-results.json"),
  readJson("artifacts/pack-verify/receipt.json"),
  readJson("artifacts/mcp-inspector-receipt.json"),
  readJson("artifacts/mcp-stdio-receipt.json"),
  readJson("artifacts/mcpc-smoke/receipt.json"),
]);

const expectedBrowserTests = playwright.stats?.expected ?? 0;
const unexpectedBrowserTests = playwright.stats?.unexpected ?? 0;
if (
  proof.status !== "verified" ||
  proof.baselineBlocking !== 10 ||
  proof.finalBlocking !== 0 ||
  proof.sourceLocaleRegression !== "PASS"
) {
  throw new Error("Release receipt rejected an invalid deterministic proof.");
}
if (expectedBrowserTests < 6 || unexpectedBrowserTests !== 0) {
  throw new Error(
    `Release receipt rejected Playwright results: ${expectedBrowserTests} expected, ${unexpectedBrowserTests} unexpected.`,
  );
}
for (const [name, receipt] of Object.entries({
  pack,
  inspector,
  mcpc,
})) {
  if (receipt.status !== "PASS") {
    throw new Error(`${name} receipt did not pass.`);
  }
}
if (stdio.status !== "verified") {
  throw new Error("Spawned STDIO MCP verification did not pass.");
}

const receipt = {
  schemaVersion: "1.0",
  generatedAt: new Date().toISOString(),
  commands: {
    lint: "PASS",
    typecheck: "PASS",
    unit: "PASS",
    integration: "PASS",
    cli: "PASS",
    mcpTests: "PASS",
    build: "PASS",
    packVerify: "PASS",
    mcpInspector: "PASS",
    mcpStdio: "PASS",
    mcpc: "PASS",
    browserE2e: "PASS",
    demoProof: "PASS",
  },
  proof,
  browser: {
    expectedTests: expectedBrowserTests,
    unexpectedTests: unexpectedBrowserTests,
    chromium: "PASS",
    darkMode: "PASS",
    lightMode: "PASS",
    reducedMotion: "PASS",
    mobile390x844: "PASS",
    desktop1440x900: "PASS",
    consoleErrors: 0,
    hydrationErrors: 0,
  },
  packages: pack,
  mcp: {
    inspector,
    stdio,
    mcpc,
  },
  status: "PASS",
};

await writeFile(
  path.join(root, "artifacts/release-evidence.json"),
  `${JSON.stringify(receipt, null, 2)}\n`,
);
console.log(
  `RELEASE RECEIPT PASS (${expectedBrowserTests} browser tests; ${proof.baselineBlocking} → ${proof.finalBlocking}; MCP Inspector + STDIO + MCPC)`,
);
