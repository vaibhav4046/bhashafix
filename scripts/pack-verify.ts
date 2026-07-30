import { spawnSync } from "node:child_process";
import {
  mkdir,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const root = process.cwd();
const workspace = path.join(root, "artifacts", "pack-verify");
const packs = path.join(workspace, "packs");
const consumer = path.join(workspace, "consumer");
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
await rm(workspace, { recursive: true, force: true });
await mkdir(packs, { recursive: true });
await mkdir(consumer, { recursive: true });

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
  [pnpmEntry, "install", "--offline", "--ignore-scripts"],
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

const serverEntry = path.join(
  consumer,
  "node_modules",
  "@bhashafix",
  "mcp",
  "dist",
  "server.js",
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
  const receipt = {
    cleanConsumer: "artifacts/pack-verify/consumer",
    tarballs,
    cliHelp: "PASS",
    cliDoctor: "PASS",
    localeRegistry: registry.count,
    mcpTools: tools.tools.length,
    workspaceRuntimeDependencies: 0,
    status: "PASS",
  };
  await writeFile(
    path.join(workspace, "receipt.json"),
    `${JSON.stringify(receipt, null, 2)}\n`,
  );
  console.log(
    `PACK VERIFY PASS (CLI help/doctor/locales; MCP ${receipt.mcpTools} tools; clean temp install)`,
  );
} finally {
  await client.close().catch(() => undefined);
}
