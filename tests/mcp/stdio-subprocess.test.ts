import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const binEntry = path.join(root, "packages", "mcp", "dist", "bin.js");

type JsonRpcResponse = { jsonrpc: "2.0"; id: number; result?: unknown; error?: unknown };

/**
 * Drive the built MCP binary as a real external process over STDIO.
 *
 * The in-process InMemoryTransport suite cannot catch transport-level defects
 * such as a module that starts a second server when it is imported.
 */
async function callOverStdio(requests: Array<Record<string, unknown>>) {
  const child = spawn(process.execPath, [binEntry], {
    cwd: root,
    stdio: ["pipe", "pipe", "pipe"],
  });
  const responses: JsonRpcResponse[] = [];
  let buffer = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    buffer += chunk;
    let newline = buffer.indexOf("\n");
    while (newline >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) responses.push(JSON.parse(line) as JsonRpcResponse);
      newline = buffer.indexOf("\n");
    }
  });

  for (const request of requests) {
    child.stdin.write(`${JSON.stringify(request)}\n`);
  }

  await new Promise((resolve) => setTimeout(resolve, 2_500));
  child.kill();
  return responses;
}

describe("MCP STDIO subprocess", () => {
  it("answers each request exactly once", async () => {
    const responses = await callOverStdio([
      {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "bhashafix-test", version: "0.0.0" },
        },
      },
      { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
    ]);

    const initialise = responses.filter((response) => response.id === 1);
    const tools = responses.filter((response) => response.id === 2);

    // A duplicated server on the same pipe answers every id twice.
    expect(initialise).toHaveLength(1);
    expect(tools).toHaveLength(1);
    expect(tools[0]?.error).toBeUndefined();

    const listed = (tools[0]?.result as { tools?: Array<{ name: string }> })?.tools ?? [];
    expect(listed.length).toBeGreaterThan(10);
    expect(listed.map((tool) => tool.name)).toContain("bhashafix_inspect_project");
  }, 30_000);
});
