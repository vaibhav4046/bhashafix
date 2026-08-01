import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
function requirePnpmEntry(): string {
  const value = process.env.npm_execpath;
  if (!value) {
    throw new Error("mcp:inspect must be run through pnpm.");
  }
  return value;
}
const pnpmEntry = requirePnpmEntry();
const target = ["node", "packages/mcp/dist/bin.js"];

function inspector(args: string[]) {
  const result = spawnSync(
    process.execPath,
    [
      pnpmEntry,
      "exec",
      "mcp-inspector",
      "--cli",
      ...target,
      "--format",
      "json",
      "--cwd",
      root,
      ...args,
    ],
    {
      cwd: root,
      encoding: "utf8",
      timeout: 60_000,
      windowsHide: true,
    },
  );
  if (result.status !== 0) {
    throw new Error(
      `MCP Inspector failed (${result.status}): ${result.stderr || result.stdout}`,
    );
  }
  return JSON.parse(result.stdout);
}

const listed = inspector(["--method", "tools/list"]);
const listedTools = listed.tools ?? listed.result?.tools ?? [];
if (
  !Array.isArray(listedTools) ||
  !listedTools.some(
    (tool: { name?: string }) => tool.name === "bhashafix_create_scan",
  )
) {
  throw new Error("MCP Inspector did not return the BhashaFix tool registry.");
}

const scan = inspector([
  "--method",
  "tools/call",
  "--tool-name",
  "bhashafix_scan_project",
  "--tool-args-json",
  JSON.stringify({ mode: "replay" }),
]);
const scanText =
  scan.content?.find((item: { type?: string }) => item.type === "text")?.text ??
  scan.result?.content?.find((item: { type?: string }) => item.type === "text")
    ?.text;
if (typeof scanText !== "string") {
  throw new Error("MCP Inspector scan result omitted structured text content.");
}
const scanResult = JSON.parse(scanText);
if (scanResult.issues?.length !== 10) {
  throw new Error(
    `MCP Inspector expected 10 genuine baseline issues; received ${scanResult.issues?.length ?? "none"}.`,
  );
}

const receipt = {
  client: "@modelcontextprotocol/inspector",
  transport: "STDIO",
  tools: listedTools.length,
  scanId: scanResult.scanId,
  baselineBlocking: scanResult.issues.length,
  status: "PASS",
};
await mkdir(path.join(root, "artifacts"), { recursive: true });
await writeFile(
  path.join(root, "artifacts/mcp-inspector-receipt.json"),
  `${JSON.stringify(receipt, null, 2)}\n`,
);
console.log(
  `MCP Inspector PASS (${receipt.tools} tools; ${receipt.baselineBlocking} baseline issues)`,
);
