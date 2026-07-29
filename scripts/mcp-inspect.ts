import { copyFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer } from "../packages/mcp/src/server";

const root = process.cwd();
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
const server = createMcpServer(root);
const client = new Client({ name: "bhashafix-inspector", version: "0.2.0" });

function parseText(result: Awaited<ReturnType<Client["callTool"]>>) {
  const block = result.content.find((item) => item.type === "text");
  if (!block || block.type !== "text") throw new Error("MCP result omitted text.");
  return JSON.parse(block.text);
}

try {
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  const tools = await client.listTools();
  const resources = await client.listResources();
  const prompts = await client.listPrompts();
  const scan = parseText(
    await client.callTool({
      name: "bhashafix_scan_project",
      arguments: { mode: "live" },
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
  console.log(
    `MCP tools/list PASS (${tools.tools.length}); resources ${resources.resources.length}; prompts ${prompts.prompts.length}`,
  );
  console.log(
    `MCP scan invocation PASS (${scan.issues.length} issues); verification invocation PASS (${verification.finalBlocking} blocking)`,
  );
} finally {
  await client.close().catch(() => undefined);
  await server.close().catch(() => undefined);
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
