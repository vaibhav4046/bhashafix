import { copyFile } from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer } from "../../packages/mcp/src/server";

const root = process.cwd();
const fixtureFiles = [
  "layout.json",
  "locale-state.json",
  "translations.json",
  "glossary.json",
];

async function reset() {
  await Promise.all(
    fixtureFiles.map((file) =>
      copyFile(
        path.join(root, "fixtures/multilingual-demo/baseline", file),
        path.join(root, "apps/demo-target/data", file),
      ),
    ),
  );
}

function parseText(result: Awaited<ReturnType<Client["callTool"]>>) {
  const content = (result as { content?: unknown }).content;
  if (!Array.isArray(content)) throw new Error("Missing result content.");
  const block = content.find(
    (item): item is { type: "text"; text: string } =>
      Boolean(
        item &&
          typeof item === "object" &&
          (item as { type?: unknown }).type === "text" &&
          typeof (item as { text?: unknown }).text === "string",
      ),
  );
  if (!block) throw new Error("Missing text result.");
  return JSON.parse(block.text);
}

describe("MCP server", () => {
  beforeAll(reset);
  afterAll(reset);

  it("lists strict tools and completes scan, repair and verification calls", async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createMcpServer(root);
    const client = new Client({ name: "bhashafix-test", version: "1.0.0" });
    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining([
        "bhashafix_inspect_project",
        "bhashafix_scan_project",
        "bhashafix_prepare_repair",
        "bhashafix_apply_repair",
        "bhashafix_verify_repair",
        "bhashafix_generate_report",
      ]),
    );
    expect(tools.tools).toHaveLength(15);

    const scan = parseText(
      await client.callTool({
        name: "bhashafix_scan_project",
        arguments: { mode: "live" },
      }),
    );
    expect(scan.issues).toHaveLength(10);
    const issueIds = scan.issues.map((issue: { issueId: string }) => issue.issueId);
    const plan = parseText(
      await client.callTool({
        name: "bhashafix_prepare_repair",
        arguments: { scanId: scan.scanId, issueIds },
      }),
    );
    expect(plan.diffHash).toMatch(/^[a-f0-9]{64}$/);
    const applied = parseText(
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
    expect(applied.applied).toBe(true);
    const verified = parseText(
      await client.callTool({
        name: "bhashafix_verify_repair",
        arguments: { scanId: scan.scanId },
      }),
    );
    expect(verified.status).toBe("verified");
    expect(verified.finalBlocking).toBe(0);
    expect(verified.sourceLocaleRegression).toBe("PASS");

    await client.close();
    await server.close();
  });
});
