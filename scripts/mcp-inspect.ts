import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const root = process.cwd();
const serverEntry = path.join(root, "packages/mcp/dist/bin.js");
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

function redactPaths(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replaceAll(root, "<PROJECT_ROOT>").replaceAll(
      root.replaceAll("\\", "/"),
      "<PROJECT_ROOT>",
    );
  }
  if (Array.isArray(value)) return value.map(redactPaths);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, redactPaths(item)]),
    );
  }
  return value;
}

try {
  await resetDemo();
  await client.connect(clientTransport);
  const tools = await client.listTools();
  const resources = await client.listResources();
  const prompts = await client.listPrompts();
  const inspectProject = parseText(
    await client.callTool({
      name: "bhashafix_inspect_project",
      arguments: { projectRoot: root },
    }),
  );
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
  const issues = parseText(
    await client.callTool({
      name: "bhashafix_list_issues",
      arguments: { scanId: scan.scanId },
    }),
  );
  const report = parseText(
    await client.callTool({
      name: "bhashafix_generate_report",
      arguments: {
        scanId: scan.scanId,
        outputDirectory: "submission/mcp-output/report",
      },
    }),
  );
  const plan = parseText(
    await client.callTool({
      name: "bhashafix_prepare_repair",
      arguments: { scanId: scan.scanId, issueIds },
    }),
  );
  const dryRun = parseText(
    await client.callTool({
      name: "bhashafix_apply_repair",
      arguments: {
        scanId: scan.scanId,
        issueIds,
        dryRun: true,
      },
    }),
  );
  const application = parseText(
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
    serverEntry: "packages/mcp/dist/bin.js",
    tools: tools.tools.length,
    resources: resources.resources.length,
    prompts: prompts.prompts.length,
    baselineBlocking: scan.issues.length,
    issueListCount: issues.issues.length,
    reportFiles: report.files.length,
    dryRunApplied: dryRun.applied,
    finalBlocking: verification.finalBlocking,
    sourceLocaleRegression: verification.sourceLocaleRegression,
    status: verification.status,
  };
  const outputRoot = path.join(root, "submission", "mcp-output");
  await mkdir(path.join(root, "artifacts"), { recursive: true });
  await mkdir(outputRoot, { recursive: true });
  const outputs: Record<string, unknown> = {
    "00-tools.json": {
      tools: tools.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
      })),
      resources: resources.resources,
      prompts: prompts.prompts,
    },
    "01-inspect-project.json": inspectProject,
    "02-create-scan.json": request,
    "03-run-scan.json": scan,
    "04-list-issues.json": issues,
    "05-generate-report.json": report,
    "06-repair-dry-run.json": dryRun,
    "07-apply-repair.json": application,
    "08-verify-repair.json": verification,
  };
  await Promise.all(
    Object.entries(outputs).map(([file, value]) =>
      writeFile(
        path.join(outputRoot, file),
        `${JSON.stringify(redactPaths(value), null, 2)}\n`,
      ),
    ),
  );
  await writeFile(
    path.join(root, "artifacts/mcp-stdio-receipt.json"),
    `${JSON.stringify(receipt, null, 2)}\n`,
  );
  await writeFile(
    path.join(root, "submission", "MCP_EXECUTION_EVIDENCE.md"),
    `# MCP execution evidence

Generated: ${new Date().toISOString()}

This evidence was produced by an independent MCP TypeScript client connected to
the built \`@bhashafix/mcp\` server over a spawned STDIO process.

The 10-to-0 scan, repair and verification counts below are explicitly scoped
to the bundled AtlasPay fixture. They prove the built STDIO transport, schemas,
explicit-ID repair guardrails and fixture workflow; they do not claim
arbitrary-project source repair.

| Operation | Result |
| --- | --- |
| Tools/list | PASS · ${tools.tools.length} tools |
| Project inspection | PASS · ${inspectProject.framework} |
| Create scan | PASS · ${request.scanId} |
| Run scan | PASS · ${scan.issues.length} verified issues |
| Issue listing | PASS · ${issues.issues.length} issues |
| Report generation | PASS · ${report.files.length} files |
| Repair dry run | PASS · applied=${dryRun.applied} |
| Explicit repair application | PASS · applied=${application.applied} |
| Identical verification | ${verification.status} · ${verification.finalBlocking} blocking · source locale ${verification.sourceLocaleRegression} |

Structured, redacted outputs are stored in \`submission/mcp-output/\`. Local
absolute project paths are replaced with \`<PROJECT_ROOT>\`.
`,
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
