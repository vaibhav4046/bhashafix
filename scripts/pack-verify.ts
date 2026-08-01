import { spawnSync } from "node:child_process";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const root = process.cwd();
const workspace = path.join(root, "artifacts", "pack-verify");
const packs = path.join(workspace, "packs");
const consumer = await mkdtemp(path.join(tmpdir(), "bhashafix-pack-verify-"));
function requirePnpmEntry(): string {
  const value = process.env.npm_execpath;
  if (!value) {
    throw new Error(
      "pack:verify must be run through pnpm so its executable is known.",
    );
  }
  return value;
}
const pnpmEntry = requirePnpmEntry();

if (!workspace.startsWith(path.join(root, "artifacts"))) {
  throw new Error("Package verification workspace escaped project artifacts.");
}
if (!consumer.startsWith(path.resolve(tmpdir()))) {
  throw new Error("Package consumer escaped the operating-system temp directory.");
}
await rm(workspace, { recursive: true, force: true });
await mkdir(packs, { recursive: true });

function run(
  command: string,
  args: string[],
  cwd: string,
  options: { allowFailure?: boolean } = {},
) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    timeout: 120_000,
    windowsHide: true,
  });
  if (!options.allowFailure && result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed (${result.status}): ${result.stderr || result.stdout}`,
    );
  }
  return result;
}

for (const packageDirectory of ["packages/cli", "packages/mcp"]) {
  run(
    process.execPath,
    [pnpmEntry, "pack", "--pack-destination", packs],
    path.join(root, packageDirectory),
  );
}

const tarballs = (await readdir(packs))
  .filter((file) => file.endsWith(".tgz"))
  .sort();
if (tarballs.length !== 2) {
  throw new Error(`Expected two package tarballs; found ${tarballs.length}.`);
}
const cliTarball = tarballs.find((file) => file.includes("cli"));
const mcpTarball = tarballs.find((file) => file.includes("mcp"));
if (!cliTarball || !mcpTarball) {
  throw new Error(`Could not identify CLI and MCP tarballs: ${tarballs.join(", ")}`);
}

await writeFile(
  path.join(consumer, "package.json"),
  `${JSON.stringify(
    {
      name: "bhashafix-clean-consumer",
      version: "1.0.0",
      private: true,
      type: "module",
      dependencies: {
        "@bhashafix/cli": `file:${path.join(packs, cliTarball)}`,
        "@bhashafix/mcp": `file:${path.join(packs, mcpTarball)}`,
      },
    },
    null,
    2,
  )}\n`,
);
await writeFile(
  path.join(consumer, "pnpm-workspace.yaml"),
  "packages: []\n",
);
run(
  process.execPath,
  [pnpmEntry, "install", "--prefer-offline", "--ignore-scripts"],
  consumer,
);

const binary = path.join(
  consumer,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "bhashafix.cmd" : "bhashafix",
);
await readFile(binary);
const cliEntry = path.join(
  consumer,
  "node_modules",
  "@bhashafix",
  "cli",
  "dist",
  "cli.js",
);
await readFile(cliEntry);
const resolvedCliEntry = await realpath(cliEntry);
const help = run(process.execPath, [resolvedCliEntry, "--help"], consumer);
if (!help.stdout.includes("translate-preview") || !help.stdout.includes("locales")) {
  throw new Error("Packed CLI help omitted winner-grade commands.");
}
const locales = run(
  process.execPath,
  [resolvedCliEntry, "locales", "--json"],
  consumer,
);
const registry = JSON.parse(locales.stdout);
if (registry.count !== 17) {
  throw new Error(`Packed CLI expected 17 registry locales; received ${registry.count}.`);
}
const doctor = run(
  process.execPath,
  [resolvedCliEntry, "doctor", "--json"],
  consumer,
);
const doctorResult = JSON.parse(doctor.stdout);
if (!doctorResult.nodeSupported || !doctorResult.noAiReady) {
  throw new Error("Packed CLI doctor did not pass.");
}

const fixtureRoot = path.join(consumer, "fixture");
await mkdir(path.join(fixtureRoot, "apps", "demo-target"), { recursive: true });
await mkdir(path.join(fixtureRoot, "fixtures", "multilingual-demo"), {
  recursive: true,
});
await cp(
  path.join(root, "fixtures", "multilingual-demo", "baseline"),
  path.join(fixtureRoot, "apps", "demo-target", "data"),
  { recursive: true },
);
await cp(
  path.join(root, "fixtures", "multilingual-demo", "predicates.json"),
  path.join(fixtureRoot, "fixtures", "multilingual-demo", "predicates.json"),
);
const baselineScan = run(
  process.execPath,
  [resolvedCliEntry, "scan", "--project", fixtureRoot, "--json"],
  consumer,
  { allowFailure: true },
);
if (baselineScan.status !== 1) {
  throw new Error(
    `Packed CLI baseline scan expected verified-issue exit 1; received ${baselineScan.status}: ${baselineScan.stderr}`,
  );
}
const baselineResult = JSON.parse(baselineScan.stdout);
if (
  baselineResult.origin !== "LOCAL_REPOSITORY_SCAN" ||
  baselineResult.issues.length !== 10
) {
  throw new Error("Packed CLI baseline scan returned unexpected evidence.");
}
run(
  process.execPath,
  [resolvedCliEntry, "repair", "--project", fixtureRoot, "--apply", "--quiet"],
  consumer,
);
const repairedScan = run(
  process.execPath,
  [resolvedCliEntry, "scan", "--project", fixtureRoot, "--json"],
  consumer,
);
const repairedResult = JSON.parse(repairedScan.stdout);
if (repairedResult.issues.length !== 0) {
  throw new Error(
    `Packed CLI repaired fixture expected 0 issues; received ${repairedResult.issues.length}.`,
  );
}

const serverEntry = path.join(
  consumer,
  "node_modules",
  "@bhashafix",
  "mcp",
  "dist",
  "bin.js",
);
await readFile(serverEntry);
const resolvedServerEntry = await realpath(serverEntry);
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [resolvedServerEntry],
  cwd: consumer,
  stderr: "pipe",
});
const client = new Client({
  name: "bhashafix-pack-verifier",
  version: "1.0.0",
});
try {
  await client.connect(transport);
  const tools = await client.listTools();
  if (
    tools.tools.length !== 18 ||
    !tools.tools.some((tool) => tool.name === "bhashafix_generate_virtual_preview")
  ) {
    throw new Error(
      `Packed MCP expected 18 strict tools; received ${tools.tools.length}.`,
    );
  }
  const consumerManifest = JSON.parse(
    await readFile(
      path.join(consumer, "node_modules", "@bhashafix", "cli", "package.json"),
      "utf8",
    ),
  ) as { dependencies?: Record<string, string> };
  const consumerLock = consumerManifest.dependencies ?? {};
  const receipt = {
    cleanConsumer: "fresh operating-system temporary directory outside the repository",
    tarballs,
    cliHelp: help.status === 0 ? "PASS" : "FAIL",
    cliDoctor: doctor.status === 0 && doctorResult.nodeSupported ? "PASS" : "FAIL",
    cliBrowserAvailable: doctorResult.browser?.available === true,
    cliFixtureBaselineExit: baselineScan.status,
    cliFixtureBaselineIssues: baselineResult.issues.length,
    cliFixtureRepairedExit: repairedScan.status,
    cliFixtureRepairedIssues: repairedResult.issues.length,
    localeRegistry: registry.count,
    mcpTools: tools.tools.length,
    consumerRuntimeDependencies: Object.keys(consumerLock).length,
    status: "PASS",
  };
  await writeFile(
    path.join(workspace, "receipt.json"),
    `${JSON.stringify(receipt, null, 2)}\n`,
  );
  await mkdir(path.join(root, "submission"), { recursive: true });
  await writeFile(
    path.join(root, "submission", "CLI_EXECUTION_EVIDENCE.md"),
    `# CLI packaged execution evidence

Generated: ${new Date().toISOString()}

The \`@bhashafix/cli\` tarball was installed in a fresh operating-system
temporary directory outside the monorepo. Commands executed the resolved
installed package entry, not TypeScript source.

| Command | Exit code | Result |
| --- | ---: | --- |
| \`bhashafix --help\` | ${help.status} | PASS |
| \`bhashafix doctor --json\` | ${doctor.status} | PASS · Node ${doctorResult.node} |
| \`bhashafix locales --json\` | ${locales.status} | PASS · ${registry.count} locales |
| \`bhashafix scan --project <fixture> --json\` | ${baselineScan.status} | Expected verified-issue gate · ${baselineResult.issues.length} issues |
| \`bhashafix repair --project <fixture> --apply\` | 0 | PASS · bounded fixture repair |
| \`bhashafix scan --project <fixture> --json\` | ${repairedScan.status} | PASS · ${repairedResult.issues.length} issues |

Scan origin: \`${baselineResult.origin}\`
Baseline scan ID: \`${baselineResult.scanId}\`

Exit code 1 is the documented successful execution outcome when verified
blocking issues exceed the configured threshold; the repaired fixture exits 0.
`,
  );
  console.log(
    `PACK VERIFY PASS (CLI help/doctor/locales/fixture 10→0; MCP ${receipt.mcpTools} tools; clean temp install outside repository)`,
  );
} finally {
  await client.close().catch(() => undefined);
}
