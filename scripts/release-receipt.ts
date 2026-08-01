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

function collectSpecTitles(node: {
  suites?: unknown[];
  specs?: Array<{ title: string; ok?: boolean }>;
}): Array<{ title: string; ok: boolean }> {
  const collected: Array<{ title: string; ok: boolean }> = [];
  for (const spec of node.specs ?? []) {
    collected.push({ title: spec.title, ok: spec.ok !== false });
  }
  for (const child of (node.suites ?? []) as typeof node[]) {
    collected.push(...collectSpecTitles(child));
  }
  return collected;
}

const browserSpecs = collectSpecTitles(playwright);
const browserProjects = [
  ...new Set(
    (playwright.config?.projects ?? []).map(
      (project: { name?: string }) => project.name ?? "unnamed",
    ),
  ),
];

const receipt = {
  schemaVersion: "2.0",
  generatedAt: new Date().toISOString(),
  // This receipt is the last step of the `verify` chain, which is joined by
  // `&&`. Reaching it therefore proves every preceding command exited zero —
  // that is the only claim made here, and it is why they are not re-run.
  commandChain: {
    basis: "reached as the final step of `pnpm verify`, an && chain",
    precedingCommands: [
      "lint",
      "typecheck",
      "test",
      "test:integration",
      "test:cli",
      "test:mcp",
      "build",
      "fixtures:clean",
      "fixtures:broken",
      "fixtures:failed",
      "pack:verify",
      "mcp:inspect",
      "mcpc:smoke",
      "test:e2e",
      "demo:reset",
      "demo:scan",
      "demo:repair",
      "demo:verify",
    ],
  },
  proof,
  browser: {
    expectedTests: expectedBrowserTests,
    unexpectedTests: unexpectedBrowserTests,
    projects: browserProjects,
    specs: browserSpecs,
    notMeasured: [
      "console error count across the browser suite",
      "hydration error count across the browser suite",
    ],
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
