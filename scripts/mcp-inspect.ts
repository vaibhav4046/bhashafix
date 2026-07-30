import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const root = process.cwd();
const serverEntry = path.join(root, "packages/mcp/dist/server.js");
const clientTransport = new StdioClientTransport({
  command: process.execPath,
  args: [serverEntry],
  cwd: root,
  stderr: "pipe",
});
const client = new Client({ name: "bhashafix-inspector", version: "0.2.0" });

async function resetDemo() {
  for (const file of [
    "layout.json",
    "locale-state.json",
    "translations.json",
    "glossary.json",
  ]) {
    await copyFile(
      path.join(root, "fixtures/multilingual-demo/baseline", file),
      path.join(root, "apps/demo-target/data", file),
    );
  }
}

function parseText(result: Awaited<ReturnType<Client["callTool"]>>) {
  const content = (result as { content?: unknown }).content;
  if (!Array.isArray(content)) throw new Error("MCP result omitted content.");
  const block = content.find(
    (item): item is { type: "text"; text: string } =>
      Boolean(
        item &&
          typeof item === "object" &&
          (item as { type?: unknown }).type === "text" &&
          typeof (item as { text?: unknown }).text === "string",
      ),
  );
  if (!block) throw new Error("MCP result omitted text.");
  return JSON.parse(block.text);
}

try {
  await resetDemo();
  await client.connect(clientTransport);
  const tools = await client.listTools();
  const resources = await client.listResources();
  const prompts = await client.listPrompts();
  const request = parseText(
    await client.callTool({
      name: "bhashafix_create_scan",
      arguments: {
        mode: "live",
        locales: ["ar-SA", "de-DE", "ja-JP", "hi-IN"],
      },
    }),
  );
  const scan = parseText(
    await client.callTool({
      name: "bhashafix_run_scan",
      arguments: { scanId: request.scanId },
    }),
  );
  const issueIds = scan.issues.map((issue: { issueId: string }) => issue.issueId);
  const plan = parseText(
    await client.callTool({
      name: "bhashafix_prepare_repair",
      arguments: { scanId: scan.scanId, issueIds },
    }),
  );
  parseText(
    await client.callTool({
      name: "bhashafix_apply_repair",
      arguments: {
        scanId: scan.scanId,
        issueIds,
        dryRun: false,
        confirmedDiffHash: plan.diffHash,
      },
    }),
  );
  const verification = parseText(
    await client.callTool({
      name: "bhashafix_verify_repair",
      arguments: { scanId: scan.scanId },
    }),
  );
  if (verification.status !== "verified") {
    throw new Error(`MCP verification failed: ${JSON.stringify(verification)}`);
  }
  const receipt = {
    transport: "spawned STDIO process",
    serverEntry: "packages/mcp/dist/server.js",
    tools: tools.tools.length,
    resources: resources.resources.length,
    prompts: prompts.prompts.length,
    baselineBlocking: scan.issues.length,
    finalBlocking: verification.finalBlocking,
    sourceLocaleRegression: verification.sourceLocaleRegression,
    status: verification.status,
  };
  await mkdir(path.join(root, "artifacts"), { recursive: true });
  await writeFile(
    path.join(root, "artifacts/mcp-stdio-receipt.json"),
    `${JSON.stringify(receipt, null, 2)}\n`,
  );
  console.log(
    `MCP tools/list PASS (${tools.tools.length}); resources ${resources.resources.length}; prompts ${prompts.prompts.length}`,
  );
  console.log(
    `MCP scan invocation PASS (${scan.issues.length} issues); verification invocation PASS (${verification.finalBlocking} blocking)`,
  );
} finally {
  await client.close().catch(() => undefined);
  await resetDemo();
}
