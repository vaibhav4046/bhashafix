import { spawnSync } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const workspace = path.join(root, "artifacts", "mcpc-smoke");
const home = path.join(workspace, "home");
const config = path.join(workspace, "mcp.json");
const session = "@bhashafix-release";
function requirePnpmEntry(): string {
  const value = process.env.npm_execpath;
  if (!value) {
    throw new Error("mcpc:smoke must be run through pnpm.");
  }
  return value;
}
const pnpmEntry = requirePnpmEntry();

if (!workspace.startsWith(path.join(root, "artifacts"))) {
  throw new Error("MCPC workspace escaped the project artifacts directory.");
}
await rm(workspace, { recursive: true, force: true });
await mkdir(home, { recursive: true });
await writeFile(
  config,
  `${JSON.stringify(
    {
      mcpServers: {
        bhashafix: {
          command: process.execPath,
          args: [path.join(root, "packages/mcp/dist/bin.js")],
        },
      },
    },
    null,
    2,
  )}\n`,
);

const environment = {
  ...process.env,
  MCPC_HOME_DIR: home,
};

function run(args: string[], expectJson = true) {
  const result = spawnSync(
    process.execPath,
    [pnpmEntry, "exec", "mcpc", ...args],
    {
      cwd: root,
      env: environment,
      encoding: "utf8",
      timeout: 60_000,
      windowsHide: true,
    },
  );
  if (result.status !== 0) {
    throw new Error(
      `mcpc ${args.join(" ")} failed (${result.status}): ${result.stderr || result.stdout}`,
    );
  }
  return expectJson ? JSON.parse(result.stdout) : result.stdout;
}

let connected = false;
try {
  run(["--json", "connect", `${config}:bhashafix`, session]);
  connected = true;

  const tools = run(["--json", session, "tools-list"]);
  const toolList = tools.tools ?? tools.result?.tools ?? tools;
  if (
    !Array.isArray(toolList) ||
    !toolList.some(
      (tool: { name?: string }) => tool.name === "bhashafix_run_scan",
    )
  ) {
    throw new Error("MCPC did not return the BhashaFix tool registry.");
  }

  const scan = run([
    "--json",
    session,
    "tools-call",
    "bhashafix_scan_project",
    JSON.stringify({ mode: "replay" }),
  ]);
  const content = scan.content ?? scan.result?.content;
  const text = content?.find(
    (item: { type?: string }) => item.type === "text",
  )?.text;
  if (typeof text !== "string") {
    throw new Error("MCPC scan result omitted structured text content.");
  }
  const scanResult = JSON.parse(text);
  if (scanResult.issues?.length !== 10) {
    throw new Error(
      `MCPC expected 10 genuine baseline issues; received ${scanResult.issues?.length ?? "none"}.`,
    );
  }

  const receipt = {
    client: "@apify/mcpc",
    transport: "STDIO",
    tools: toolList.length,
    scanId: scanResult.scanId,
    baselineBlocking: scanResult.issues.length,
    status: "PASS",
  };
  await writeFile(
    path.join(workspace, "receipt.json"),
    `${JSON.stringify(receipt, null, 2)}\n`,
  );
  console.log(
    `MCPC PASS (${receipt.tools} tools; ${receipt.baselineBlocking} baseline issues)`,
  );
} finally {
  if (connected) {
    run(["close", session], false);
  }
}
